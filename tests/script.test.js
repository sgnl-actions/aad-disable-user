import { jest } from '@jest/globals';
import script from '../src/script.mjs';

// Mock fetch for all tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Azure AD Disable User Action', () => {
  const mockContext = {
    environment: {
      ADDRESS: 'https://graph.microsoft.com'
    },
    secrets: {
      OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN: 'test-access-token-12345'
    }
  };

  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  describe('invoke handler', () => {
    test('should disable user successfully with 204 No Content response', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      const result = await script.invoke(params, mockContext);

      expect(result.status).toBe('success');
      expect(result.userPrincipalName).toBe('user@example.com');
      expect(result.accountEnabled).toBe(false);

      // Verify the API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user%40example.com',
        {
          method: 'PATCH',
          headers: {
            'Authorization': 'Bearer test-access-token-12345',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accountEnabled: false
          })
        }
      );
    });

    test('should disable user successfully with 200 OK response body', async () => {
      const mockResponseData = {
        id: '12345-67890',
        userPrincipalName: 'user@example.com',
        accountEnabled: false
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(mockResponseData)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      const result = await script.invoke(params, mockContext);

      expect(result.status).toBe('success');
      expect(result.userPrincipalName).toBe('user@example.com');
      expect(result.accountEnabled).toBe(false);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('should handle URL encoding for special characters in userPrincipalName', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user+test@example.com'
      };

      await script.invoke(params, mockContext);

      // Verify URL encoding happened correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/users/user%2Btest%40example.com',
        expect.any(Object)
      );
    });

    test('should handle Bearer token prefix correctly when not present', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      await script.invoke(params, mockContext);

      // Verify Bearer prefix was added
      const call = mockFetch.mock.calls[0];
      expect(call[1].headers.Authorization).toBe('Bearer test-access-token-12345');
    });

    test('should handle Bearer token prefix correctly when already present', async () => {
      const contextWithBearerToken = {
        ...mockContext,
        secrets: {
          OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN: 'Bearer existing-bearer-token'
        }
      };

      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content'
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      await script.invoke(params, contextWithBearerToken);

      // Verify Bearer prefix was not duplicated
      const call = mockFetch.mock.calls[0];
      expect(call[1].headers.Authorization).toBe('Bearer existing-bearer-token');
    });

    test('should throw error when userPrincipalName is missing', async () => {
      const params = {};

      await expect(script.invoke(params, mockContext))
        .rejects
        .toThrow('userPrincipalName is required');
    });

    test('should throw error when OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN is missing', async () => {
      const contextWithoutToken = {
        environment: mockContext.environment,
        secrets: {}
      };

      const params = {
        userPrincipalName: 'user@example.com'
      };

      await expect(script.invoke(params, contextWithoutToken))
        .rejects
        .toThrow('No authentication configured');
    });

    test('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValue('{"error": {"code": "Request_BadRequest", "message": "Invalid request"}}')
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      await expect(script.invoke(params, mockContext))
        .rejects
        .toThrow('Failed to disable user: 400 Bad Request. Details: {"error": {"code": "Request_BadRequest", "message": "Invalid request"}}');

      expect(mockResponse.text).toHaveBeenCalled();
    });

    test('should handle response with accountEnabled field in body', async () => {
      const mockResponseData = {
        userPrincipalName: 'user@example.com',
        accountEnabled: false
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(mockResponseData)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      const result = await script.invoke(params, mockContext);

      expect(result.accountEnabled).toBe(false);
    });

    test('should handle response with no accountEnabled field in body', async () => {
      const mockResponseData = {
        userPrincipalName: 'user@example.com'
        // No accountEnabled field
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue(mockResponseData)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const params = {
        userPrincipalName: 'user@example.com'
      };

      const result = await script.invoke(params, mockContext);

      // Should default to false when not present
      expect(result.accountEnabled).toBe(false);
    });
  });

  describe('error handler', () => {
    test('should re-throw error and let framework handle retries', async () => {
      const errorObj = new Error('Failed to disable user: 429 Too Many Requests');
      const params = {
        userPrincipalName: 'test@example.com',
        error: errorObj
      };

      await expect(script.error(params, mockContext)).rejects.toThrow(errorObj);
      expect(console.error).toHaveBeenCalledWith(
        'User disable failed for test@example.com: Failed to disable user: 429 Too Many Requests'
      );
    });

    test('should re-throw server errors', async () => {
      const errorObj = new Error('Failed to disable user: 502 Bad Gateway');
      const params = {
        userPrincipalName: 'test@example.com',
        error: errorObj
      };

      await expect(script.error(params, mockContext)).rejects.toThrow(errorObj);
    });

    test('should re-throw authentication errors', async () => {
      const errorObj = new Error('Failed to disable user: 401 Unauthorized');
      const params = {
        userPrincipalName: 'test@example.com',
        error: errorObj
      };

      await expect(script.error(params, mockContext)).rejects.toThrow(errorObj);
    });

    test('should re-throw any error', async () => {
      const errorObj = new Error('Some other network error');
      const params = {
        userPrincipalName: 'test@example.com',
        error: errorObj
      };

      await expect(script.error(params, mockContext)).rejects.toThrow(errorObj);
    });
  });

  describe('halt handler', () => {
    test('should handle graceful shutdown with user principal name', async () => {
      const params = {
        userPrincipalName: 'user@example.com',
        reason: 'timeout'
      };

      const result = await script.halt(params, mockContext);

      expect(result.status).toBe('halted');
      expect(result.userPrincipalName).toBe('user@example.com');
      expect(result.reason).toBe('timeout');
    });

    test('should handle halt without userPrincipalName', async () => {
      const params = {
        reason: 'system_shutdown'
      };

      const result = await script.halt(params, mockContext);

      expect(result.status).toBe('halted');
      expect(result.userPrincipalName).toBe('unknown');
      expect(result.reason).toBe('system_shutdown');
    });

    test('should handle halt with empty reason', async () => {
      const params = {
        userPrincipalName: 'user@example.com'
      };

      const result = await script.halt(params, mockContext);

      expect(result.status).toBe('halted');
      expect(result.userPrincipalName).toBe('user@example.com');
      expect(result.reason).toBeUndefined();
    });
  });
});