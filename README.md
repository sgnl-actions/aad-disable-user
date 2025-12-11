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

#### Option 1: OAuth2 Client Credentials
| Secret/Environment | Required | Description |
|-------------------|----------|-------------|
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET` | Yes | OAuth2 client secret |
| `OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID` | Yes | OAuth2 client ID |
| `OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL` | Yes | OAuth2 token endpoint URL |
| `OAUTH2_CLIENT_CREDENTIALS_SCOPE` | No | OAuth2 scope |
| `OAUTH2_CLIENT_CREDENTIALS_AUDIENCE` | No | OAuth2 audience |
| `OAUTH2_CLIENT_CREDENTIALS_AUTH_STYLE` | No | OAuth2 auth style |

#### Option 2: OAuth2 Authorization Code
| Secret | Required | Description |
|--------|----------|-------------|
| `OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN` | Yes | OAuth2 access token |

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ADDRESS` | Yes | Default Azure AD API base URL | `https://graph.microsoft.com` |

### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `userPrincipalName` | string | Yes | User Principal Name (UPN) of the user to disable | `user@example.com` |
| `address` | string | No | Optional Azure AD API base URL override | `https://graph.microsoft.com` |

### Output Structure

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Operation result (success, failed, etc.) |
| `userPrincipalName` | string | User Principal Name that was processed |
| `accountEnabled` | boolean | The account enabled status (should be false) |
| `address` | string | The Azure AD API base URL used |

## Usage Examples

### Basic Usage

```json
{
  "script_inputs": {
    "userPrincipalName": "john.doe@company.com"
  }
}
```

### With OAuth2 Client Credentials

```json
{
  "script_inputs": {
    "userPrincipalName": "john.doe@company.com"
  },
  "environment": {
    "ADDRESS": "https://graph.microsoft.com",
    "OAUTH2_CLIENT_CREDENTIALS_TOKEN_URL": "https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token",
    "OAUTH2_CLIENT_CREDENTIALS_CLIENT_ID": "your-client-id",
    "OAUTH2_CLIENT_CREDENTIALS_SCOPE": "https://graph.microsoft.com/.default"
  },
  "secrets": {
    "OAUTH2_CLIENT_CREDENTIALS_CLIENT_SECRET": "your-client-secret"
  }
}
```

### With OAuth2 Authorization Code

```json
{
  "script_inputs": {
    "userPrincipalName": "john.doe@company.com"
  },
  "environment": {
    "ADDRESS": "https://graph.microsoft.com"
  },
  "secrets": {
    "OAUTH2_AUTHORIZATION_CODE_ACCESS_TOKEN": "your-access-token"
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