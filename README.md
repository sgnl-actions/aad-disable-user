# Azure AD Disable User Action

This SGNL action disables a user account in Azure Active Directory by setting `accountEnabled` to false, preventing the user from signing in and accessing resources.

## Overview

The Azure AD Disable User action integrates with Microsoft Graph API to disable user accounts in your Azure AD tenant. This is commonly used in automated workflows for offboarding, security incidents, or compliance-driven account management.

## Prerequisites

- Azure AD tenant with appropriate permissions
- Service principal or application with `User.ReadWrite.All` permission
- Azure AD access token (Bearer token)

## Configuration

### Authentication

This action supports two OAuth2 authentication methods:

#### OAuth2 Authorization Code Flow

**Required Secrets:**
- **`OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN`**: OAuth2 access token

**Required Environment Variables:**
- **`OAUTH2_AUTHORIZATION_CODE_CLIENT_ID`**: OAuth2 client ID
- **`OAUTH2_AUTHORIZATION_CODE_TOKEN_URL`**: Token endpoint URL

**Optional Environment Variables:**
- **`OAUTH2_AUTHORIZATION_CODE_AUTH_STYLE`**: Authentication style (`InHeader`, `InParams`, or `AutoDetect`)
- **`OAUTH2_AUTHORIZATION_CODE_AUTH_URL`**: Authorization endpoint URL
- **`OAUTH2_AUTHORIZATION_CODE_SCOPE`**: OAuth2 scope
- **`OAUTH2_AUTHORIZATION_CODE_REDIRECT_URI`**: OAuth2 redirect URI

#### OAuth2 Client Credentials Flow

**Required Secrets:**
- **`OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET`**: OAuth2 client secret

**Required Environment Variables:**
- **`OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL`**: Token endpoint URL
- **`OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID`**: OAuth2 client ID

**Optional Environment Variables:**
- **`OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE`**: Authentication style (`InHeader`, `InParams`, or `AutoDetect`)
- **`OAUTH2_CLIENT_CREDENTIALS_SCOPE`**: OAuth2 scope
- **`OAUTH2_CLIENT_CREDENTIALS_AUDIENCE`**: OAuth2 audience

### Required Environment Variables

- **`ADDRESS`**: Azure AD API base URL (e.g., `https://graph.microsoft.com`)

### Input Parameters

- **`userPrincipalName`** (required): The user principal name (UPN) of the user to disable (e.g., "user@example.com")
- **`address`** (optional): The Azure AD API base URL (overrides `ADDRESS` environment variable)

### Output Schema

```json
{
  "status": "success",
  "userPrincipalName": "user@example.com", 
  "accountEnabled": false
}
```

## Usage Examples

### Basic Usage

```json
{
  "script_inputs": {
    "userPrincipalName": "john.doe@company.com"
  }
}
```

### With Custom Tenant URL

```json
{
  "environment": {
    "AZURE_AD_TENANT_URL": "https://graph.microsoft.com/beta"
  },
  "script_inputs": {
    "userPrincipalName": "user@company.com"
  }
}
```

## API Integration

This action uses the Microsoft Graph API PATCH endpoint:

```
PATCH /users/{userPrincipalName}
Content-Type: application/json
Authorization: Bearer {token}

{
  "accountEnabled": false
}
```

### Response Handling

- **204 No Content**: Standard success response (account disabled successfully)
- **200 OK**: Success with response body containing user details
- **400 Bad Request**: Invalid request or user not found
- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limiting (automatically retried)

## Error Handling

The action implements comprehensive error handling with automatic retry logic:

### Retryable Errors

- **429 Too Many Requests**: Rate limiting - automatically retried with backoff
- **502 Bad Gateway**: Temporary server issue - automatically retried
- **503 Service Unavailable**: Service temporarily down - automatically retried  
- **504 Gateway Timeout**: Request timeout - automatically retried

### Fatal Errors (No Retry)

- **401 Unauthorized**: Invalid authentication credentials
- **403 Forbidden**: Insufficient permissions  
- **400 Bad Request**: Invalid user principal name or request format

### Error Handler

The action includes an error handler that:
- Classifies errors as retryable vs fatal
- Automatically retries temporary failures
- Prevents retry loops for authentication/permission errors
- Logs error details for troubleshooting

## Security Considerations

- User principal names are URL-encoded to prevent injection attacks
- Bearer tokens are handled securely and never logged
- Token prefix is automatically added if not present
- All API calls use HTTPS encryption
- No sensitive data is included in log outputs

## Testing

Run the test suite to verify functionality:

```bash
# Run all tests
npm test

# Run with coverage report  
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="disable user successfully"
```

### Test Coverage

Tests cover:
- Successful user disabling (204 and 200 responses)
- URL encoding for special characters in UPNs
- Bearer token prefix handling
- Input validation and error cases
- Retry logic for different error types
- Response parsing and field handling

## Development

### Local Testing

```bash
# Test with sample parameters
npm run dev -- --params '{"userPrincipalName": "test@example.com"}'

# Watch mode during development
npm run test:watch
```

### Build Process

```bash
# Lint code
npm run lint

# Build distribution bundle
npm run build

# Validate configuration
npm run validate
```

## Troubleshooting

### Common Issues

**"userPrincipalName is required"**
- Ensure the input parameter is provided and not empty

**"BEARER_AUTH_TOKEN secret is required"**
- Verify the secret is configured in your environment
- Check token has not expired

**"Failed to disable user: 401 Unauthorized"**
- Token may be expired or invalid
- Verify service principal has correct permissions

**"Failed to disable user: 403 Forbidden"**
- Service principal lacks `User.ReadWrite.All` permission
- Check Azure AD role assignments

**"Failed to disable user: 400 Bad Request"**
- User principal name may be invalid or user doesn't exist
- Verify UPN format (user@domain.com)

### Debugging

Enable debug logging by setting:
```json
{
  "environment": {
    "LOG_LEVEL": "debug"
  }
}
```

## API Reference

### Microsoft Graph API Documentation

- [Update User](https://docs.microsoft.com/en-us/graph/api/user-update)
- [User Resource Type](https://docs.microsoft.com/en-us/graph/api/resources/user)
- [Permissions Reference](https://docs.microsoft.com/en-us/graph/permissions-reference)

### Required Graph API Permissions

- `User.ReadWrite.All`: Required to modify user account enabled status

## Changelog

### v1.0.0
- Initial release with Azure AD user account disabling
- Support for Microsoft Graph API v1.0
- Comprehensive error handling and retry logic
- URL encoding and security features
- Full test coverage