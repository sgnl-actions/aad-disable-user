// SGNL Job Script - Auto-generated bundle
'use strict';

/**
 * Azure AD Disable User Action
 *
 * Disables a user account in Azure Active Directory by setting accountEnabled to false.
 * This prevents the user from signing in and accessing resources.
 */

/**
 * Get OAuth2 access token using client credentials flow
 * @param {Object} config - OAuth2 configuration
 * @returns {Promise<string>} Access token
 */
async function getClientCredentialsToken(config) {
  const { tokenUrl, clientId, clientSecret, scope, audience, authStyle } = config;

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');

  if (scope) {
    params.append('scope', scope);
  }

  if (audience) {
    params.append('audience', audience);
  }

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  };

  if (authStyle === 'InParams') {
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
  } else {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body: params.toString()
  });

  if (!response.ok) {
    let errorText;
    try {
      const errorData = await response.json();
      errorText = JSON.stringify(errorData);
    } catch {
      errorText = await response.text();
    }
    throw new Error(
      `OAuth2 token request failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('No access_token in OAuth2 response');
  }

  return data.access_token;
}

/**
 * Helper function to disable a user account
 * @param {string} userPrincipalName - The user principal name
 * @param {string} address - Azure AD base URL
 * @param {string} accessToken - OAuth2 access token
 * @returns {Promise<Object>} API response
 */
async function disableUserAccount(userPrincipalName, address, accessToken) {
  // Remove trailing slash from address if present
  const cleanAddress = address.endsWith('/') ? address.slice(0, -1) : address;

  // URL encode the user principal name to prevent injection
  const encodedUpn = encodeURIComponent(userPrincipalName);
  const url = `${cleanAddress}/v1.0/users/${encodedUpn}`;

  // Ensure token has proper Bearer prefix
  const authHeader = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountEnabled: false
    })
  });

  return response;
}

var script = {
  /**
   * Main execution handler - disables the specified user account
   * @param {Object} params - Job input parameters
   * @param {string} params.userPrincipalName - User Principal Name (email) to disable
   * @param {string} params.address - The Azure AD API base URL (e.g., https://graph.microsoft.com)
   * @param {Object} context - Execution context with env, secrets, outputs
   * @param {string} context.environment.ADDRESS - Default Azure AD API base URL
   *
   * The configured auth type will determine which of the following environment variables and secrets are available
   * @param {string} context.secrets.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_SCOPE
   * @param {string} context.environment.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL
   *
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_AUTHORIZATION_CODE
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_CLIENT_SECRET
   * @param {string} context.secrets.OAUTH2_AUTHORIZATION_CODE_REFRESH_TOKEN
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_AUTH_STYLE
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_AUTH_URL
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_CLIENT_ID
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_LAST_TOKEN_ROTATION_TIMESTAMP
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_REDIRECT_URI
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_SCOPE
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_TOKEN_LIFETIME_FREQUENCY
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_TOKEN_ROTATION_FREQUENCY
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_TOKEN_ROTATION_INTERVAL
   * @param {string} context.environment.OAUTH2_AUTHORIZATION_CODE_TOKEN_URL
   *
   * @returns {Object} Job results
   */
  invoke: async (params, context) => {
    // Validate required parameters
    if (!params.userPrincipalName) {
      throw new Error('userPrincipalName is required');
    }

    // Determine the URL to use
    const address = params.address || context.environment?.ADDRESS;
    if (!address) {
      throw new Error('No URL specified. Provide either address parameter or ADDRESS environment variable');
    }

    let accessToken;

    if (context.secrets?.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN) {
      accessToken = context.secrets.OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN;
    } else if (context.secrets?.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET) {
      const tokenUrl = context.environment?.OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL;
      const clientId = context.environment?.OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID;
      const clientSecret = context.secrets.OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET;

      if (!tokenUrl || !clientId || !clientSecret) {
        throw new Error('OAuth2 Client Credentials flow requires TOKEN_URL, CLIENT_ID, and CLIENT_SECRET');
      }

      accessToken = await getClientCredentialsToken({
        tokenUrl,
        clientId,
        clientSecret,
        scope: context.environment?.OAUTH2_CLIENT_CREDENTIALS_SCOPE,
        audience: context.environment?.OAUTH2_CLIENT_CREDENTIALS_AUDIENCE,
        authStyle: context.environment?.OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE
      });
    } else {
      throw new Error('OAuth2 authentication is required. Configure either Authorization Code or Client Credentials flow.');
    }

    console.log(`Disabling user account: ${params.userPrincipalName}`);

    // Call Azure AD API to disable the account
    const response = await disableUserAccount(
      params.userPrincipalName,
      address,
      accessToken
    );

    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to disable user: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    // For PATCH operations, a 204 No Content is success
    let accountEnabled = false;
    if (response.status !== 204) {
      // If there's a response body, parse it
      const result = await response.json();
      accountEnabled = result.accountEnabled ?? false;
    }

    console.log(`Successfully disabled user account: ${params.userPrincipalName}`);

    return {
      status: 'success',
      userPrincipalName: params.userPrincipalName,
      accountEnabled: accountEnabled
    };
  },

  /**
   * Error recovery handler - handles retryable errors
   * @param {Object} params - Original params plus error information
   * @param {Object} context - Execution context
   * @returns {Object} Recovery results
   */
  error: async (params, _context) => {
    const { error } = params;

    // Check for rate limiting (429) or temporary server errors (502, 503, 504)
    if (error.message.includes('429') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      console.log('Retryable error detected, requesting retry...');
      return { status: 'retry_requested' };
    }

    // Fatal errors (401, 403) should not retry
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error(error.message); // Re-throw to mark as fatal
    }

    // Default: let framework retry
    return { status: 'retry_requested' };
  },

  /**
   * Graceful shutdown handler - cleanup on halt
   * @param {Object} params - Original params plus halt reason
   * @param {Object} context - Execution context
   * @returns {Object} Cleanup results
   */
  halt: async (params, _context) => {
    const { reason } = params;
    console.log(`User disable operation halted: ${reason}`);

    return {
      status: 'halted',
      userPrincipalName: params.userPrincipalName || 'unknown',
      reason: reason
    };
  }
};

module.exports = script;
