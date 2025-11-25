/**
 * Azure AD Disable User Action
 *
 * Disables a user account in Azure Active Directory by setting accountEnabled to false.
 * This prevents the user from signing in and accessing resources.
 */

/**
 * Helper function to disable a user account
 * @param {string} userPrincipalName - The user principal name
 * @param {string} address - Azure AD base URL
 * @param {string} authToken - Azure AD access token
 * @returns {Promise<Object>} API response
 */
async function disableUserAccount(userPrincipalName, address, authToken) {
  // Remove trailing slash from address if present
  const cleanAddress = address.endsWith('/') ? address.slice(0, -1) : address;

  // URL encode the user principal name to prevent injection
  const encodedUpn = encodeURIComponent(userPrincipalName);
  const url = `${cleanAddress}/v1.0/users/${encodedUpn}`;

  // Ensure token has proper Bearer prefix
  const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;

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

export default {
  /**
   * Main execution handler - disables the specified user account
   * @param {Object} params - Job input parameters
   * @param {string} params.userPrincipalName - User Principal Name (email) to disable
   * @param {string} params.address - The Azure AD API base URL (e.g., https://graph.microsoft.com)
   * @param {Object} context - Execution context with env, secrets, outputs
   * @param {string} context.environment.ADDRESS - Default Azure AD API base URL
   * @param {string} context.secrets.BEARER_AUTH_TOKEN - Bearer token for Azure AD API authentication
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

    const authToken = context.secrets?.BEARER_AUTH_TOKEN;

    if (!authToken) {
      throw new Error('BEARER_AUTH_TOKEN secret is required');
    }

    console.log(`Disabling user account: ${params.userPrincipalName}`);

    // Call Azure AD API to disable the account
    const response = await disableUserAccount(
      params.userPrincipalName,
      address,
      authToken
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