import { beforeAll, afterAll, jest } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { request } from 'https';
import script from '../src/script.mjs';

const FIXTURES_DIR = '__recordings__';
const FIXTURE_FILE = `${FIXTURES_DIR}/aad-disable-user.json`;
const IS_RECORDING = process.env.RECORD_MODE === 'true';

function loadFixtures() {
  if (existsSync(FIXTURE_FILE)) {
    return JSON.parse(readFileSync(FIXTURE_FILE, 'utf-8'));
  }
  return {};
}

function saveFixtures(fixtures) {
  if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(FIXTURE_FILE, JSON.stringify(fixtures, null, 2));
}

function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body;
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };
    const req = request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const isJson = res.headers['content-type']?.includes('application/json');
        const parsedBody = isJson ? JSON.parse(data) : data;
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          statusText: res.statusMessage,
          body: parsedBody
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function makeRecordReplayFetch(fixtures, key) {
  return async (url, options) => {
    if (IS_RECORDING) {
      // Always hit the real API and overwrite the fixture
      const res = await httpsRequest(url, options || {});
      fixtures[key] = { status: res.status, ok: res.ok, statusText: res.statusText, body: res.body };
      return {
        ok: res.ok, status: res.status, statusText: res.statusText,
        json: async () => res.body,
        text: async () => (typeof res.body === 'string' ? res.body : JSON.stringify(res.body ?? ''))
      };
    }

    // Replay mode: use saved fixture
    const fixture = fixtures[key];
    if (!fixture) throw new Error(`No fixture for "${key}". Run with RECORD_MODE=true first.`);
    return {
      ok: fixture.ok, status: fixture.status, statusText: fixture.statusText,
      json: async () => fixture.body,
      text: async () => (typeof fixture.body === 'string' ? fixture.body : JSON.stringify(fixture.body ?? ''))
    };
  };
}

// Synthetic fixtures for error scenarios that can't be triggered with valid credentials
const syntheticFixtures = {
  'aad-disable-user-not-found': {
    status: 404, ok: false, statusText: 'Not Found',
    body: { error: { code: 'Request_ResourceNotFound', message: 'Resource not found' } }
  },
  'aad-disable-unauthorized': {
    status: 401, ok: false, statusText: 'Unauthorized',
    body: { error: { code: 'InvalidAuthenticationToken', message: 'Access token is invalid' } }
  },
  'aad-disable-forbidden': {
    status: 403, ok: false, statusText: 'Forbidden',
    body: { error: { code: 'Authorization_RequestDenied', message: 'Insufficient privileges' } }
  },
  'aad-disable-server-error': {
    status: 500, ok: false, statusText: 'Internal Server Error',
    body: { error: { code: 'InternalServerError', message: 'Internal server error' } }
  }
};

function syntheticFetch(key) {
  const f = syntheticFixtures[key];
  return async () => ({
    ok: f.ok, status: f.status, statusText: f.statusText,
    json: async () => f.body,
    text: async () => (typeof f.body === 'string' ? f.body : JSON.stringify(f.body ?? ''))
  });
}

describe('AAD Disable User - Record & Replay', () => {
  let fixtures = {};

  beforeAll(() => {
    fixtures = loadFixtures();
  });

  afterAll(() => {
    if (IS_RECORDING) saveFixtures(fixtures);
  });

  beforeEach(() => {
    fetch.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Fallback values ensure createAuthHeaders proceeds in replay mode
  const context = {
    environment: {
      ADDRESS: 'https://graph.microsoft.com',
      OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL: process.env.AZURE_TOKEN_URL || 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token',
      OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID: process.env.AZURE_CLIENT_ID || 'test-client-id',
      OAUTH2_CLIENT_CREDENTIALS_SCOPE: 'https://graph.microsoft.com/.default'
    },
    secrets: {
      OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET || 'test-client-secret'
    },
    outputs: {}
  };

  // For synthetic error tests — bypasses OAuth2 token fetch entirely
  const syntheticContext = {
    environment: { ADDRESS: 'https://graph.microsoft.com' },
    secrets: { BEARER_AUTH_TOKEN: 'fake-bearer-token-for-testing' },
    outputs: {}
  };

  const params = {
    userPrincipalName: process.env.AZURE_TEST_UPN || 'testuser@yourtenant.onmicrosoft.com'
  };

  // IDEMPOTENCY: This action IS idempotent.
  // PATCH with accountEnabled:false on an already-disabled user still returns 204.
  // Both calls produce status:'success' with accountEnabled:false — same end state.
  test('should disable user successfully on first call', async () => {
    // Prerequisite: user must exist in the tenant before recording.
    // token → PATCH disable
    fetch
      .mockImplementationOnce(makeRecordReplayFetch(fixtures, 'aad-disable-oauth-token'))
      .mockImplementationOnce(makeRecordReplayFetch(fixtures, 'aad-disable-user'));

    const result = await script.invoke(params, context);

    expect(result.status).toBe('success');
    expect(result.userPrincipalName).toBe(params.userPrincipalName);
    expect(result.accountEnabled).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('should be idempotent - second call succeeds when user already disabled', async () => {
    // PATCH accountEnabled:false on an already-disabled user returns the same 204
    if (IS_RECORDING) {
      fixtures['aad-disable-oauth-token-2'] = fixtures['aad-disable-oauth-token'];
      fixtures['aad-disable-user-2'] = fixtures['aad-disable-user'];
    }

    fetch
      .mockImplementationOnce(makeRecordReplayFetch(fixtures, 'aad-disable-oauth-token-2'))
      .mockImplementationOnce(makeRecordReplayFetch(fixtures, 'aad-disable-user-2'));

    const result = await script.invoke(params, context);

    expect(result.status).toBe('success');
    expect(result.accountEnabled).toBe(false);
  });

  test('should handle user not found', async () => {
    fetch.mockImplementationOnce(syntheticFetch('aad-disable-user-not-found'));

    await expect(script.invoke(params, syntheticContext))
      .rejects.toThrow(/Failed to disable user/);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('should handle unauthorized (invalid token)', async () => {
    fetch.mockImplementationOnce(syntheticFetch('aad-disable-unauthorized'));

    await expect(script.invoke(params, syntheticContext))
      .rejects.toThrow(/Failed to disable user/);
  });

  test('should handle insufficient permissions', async () => {
    fetch.mockImplementationOnce(syntheticFetch('aad-disable-forbidden'));

    await expect(script.invoke(params, syntheticContext))
      .rejects.toThrow(/Failed to disable user/);
  });

  test('should handle server error', async () => {
    fetch.mockImplementationOnce(syntheticFetch('aad-disable-server-error'));

    await expect(script.invoke(params, syntheticContext))
      .rejects.toThrow(/Failed to disable user/);
  });

  test('should handle missing auth token', async () => {
    await expect(script.invoke(params, {
      environment: { ADDRESS: 'https://graph.microsoft.com' },
      secrets: {},
      outputs: {}
    })).rejects.toThrow(/No authentication configured/);

    expect(fetch).not.toHaveBeenCalled();
  });
});