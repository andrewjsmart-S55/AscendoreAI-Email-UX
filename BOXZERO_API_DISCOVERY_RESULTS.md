# BoxZero API Endpoint Discovery Results

## Overview

This document summarizes the comprehensive API endpoint discovery performed on the BoxZero API (`https://boxzero-api-dev.azurewebsites.net`) on 2025-09-17.

## Authentication

- **Working**: Firebase Authentication with email/password
- **Test Account**: andrew@boxzero.io / Churchwhit2023$
- **Token Type**: Firebase ID Token (passed as Bearer token)

## Working Endpoints ✅

### Account Management
- `GET /api/auth/linked-accounts` - Returns linked email accounts
  - **Response**: Array of account objects with `accountId`, `provider`, `externalEmail`, `status`, `lastSyncedAt`
  - **Sample**: 3 Microsoft accounts found for test user

### Folder Operations
- `POST /api/auth/linked-accounts/{accountId}/fetch-folders` - Fetches folders for an account
  - **Response**: Object with `message` and `folders` array
  - **Test Result**: Successfully fetched 25 folders for first account

### Real-time/WebSocket
- `GET /api/auth/linked-accounts/{accountId}/pubsub-url` - Returns pubsub URL
  - **Response**: Object with `pubsubUrl` property

## Not Implemented Endpoints ❌ (All return 404)

### Authentication & User Management
- `/api/auth/user`
- `/api/auth/me`
- `/api/user`
- `/api/me`
- `/api/profile`
- `/api/auth/profile`
- `/api/auth/token`
- `/api/auth/refresh`
- `/api/auth/logout`

### Email & Message Retrieval
- `/api/emails`
- `/api/messages`
- `/api/mail`
- `/api/inbox`
- `/api/email/list`
- `/api/message/list`
- `/api/emails/inbox`
- `/api/messages/inbox`
- `/api/emails/all`
- `/api/messages/all`
- `/api/v1/emails`
- `/api/v1/messages`

### Account-Specific Email Endpoints
- `/api/accounts/{accountId}/messages`
- `/api/accounts/{accountId}/emails`
- `/api/linked-accounts/{accountId}/messages`
- `/api/linked-accounts/{accountId}/emails`
- `/api/auth/accounts/{accountId}/messages`
- `/api/auth/linked-accounts/{accountId}/messages`
- `/api/auth/linked-accounts/{accountId}/emails`
- `/api/auth/linked-accounts/{accountId}/mail`
- `/api/auth/linked-accounts/{accountId}/inbox`

### Folder-Specific Message Endpoints
- `/api/auth/linked-accounts/{accountId}/folders/{folderId}/messages`
  - Tested with real folder IDs, all return 404

### OAuth & Account Addition
- `/api/auth/oauth/microsoft`
- `/api/auth/oauth/google`
- `/api/oauth/microsoft`
- `/api/oauth/google`
- `/api/auth/callback`
- `/api/oauth/callback`
- `/api/auth/connect`
- `/api/connect`

### Search
- `/api/search`
- `/api/search/emails`
- `/api/search/messages`
- `/api/email/search`
- `/api/message/search`
- `/api/find`

### Sync & Operations
- `/api/sync`
- `/api/sync/messages`
- `/api/sync/folders`
- `/api/auth/linked-accounts/{accountId}/sync`
- `/api/auth/linked-accounts/{accountId}/sync-messages`
- `/api/auth/linked-accounts/{accountId}/sync-folders`
- `/api/auth/linked-accounts/{accountId}/fetch-folders` (GET - only POST works)
- `/api/auth/linked-accounts/{accountId}/refresh`

## Frontend Adaptations Made

### API Service Updates
1. **OAuth Functions**: Modified to throw errors explaining endpoints are not available
2. **Search Functions**: Modified to throw errors explaining endpoints are not available
3. **Working Endpoints**: Kept functional for linked accounts and folder fetching

### Account Settings Component
1. **Add Account Functionality**: Updated to show alert that OAuth endpoints are not implemented
2. **Account Display**: Continues to work with real linked account data
3. **Account Management**: Real accounts from API are properly displayed

### Data Flow
1. **Settings | Accounts**: Shows real Microsoft accounts from `/api/auth/linked-accounts`
2. **Email View**: Falls back to mock data since message endpoints return 404
3. **Authentication**: Works with real Firebase integration

## Recommendations

### For API Development
1. **High Priority**: Implement email/message retrieval endpoints
   - `/api/auth/linked-accounts/{accountId}/messages`
   - `/api/auth/linked-accounts/{accountId}/folders/{folderId}/messages`

2. **Medium Priority**: Implement OAuth endpoints for account addition
   - `/api/auth/oauth/microsoft`
   - `/api/auth/oauth/google`
   - `/api/auth/oauth/callback`

3. **Low Priority**: Implement search functionality
   - `/api/search`
   - `/api/search/messages`

### For Frontend Development
1. **Current State**: Application works with real authentication and account display
2. **Missing Functionality**: Email content display (requires server-side implementation)
3. **Workaround**: Mock data fallback maintains UI functionality

## Test Scripts Created

1. **`discover-api-endpoints.js`** - Comprehensive endpoint discovery
2. **`test-email-endpoints.js`** - Focused email endpoint testing
3. **`test-frontend-data.js`** - Data transformation verification

## Conclusion

The BoxZero API currently supports:
- ✅ Authentication (Firebase)
- ✅ Linked account management
- ✅ Folder operations
- ✅ WebSocket/PubSub URLs

Missing critical functionality:
- ❌ Email/message content retrieval
- ❌ OAuth account addition
- ❌ Search capabilities

The frontend has been adapted to work with available endpoints while providing clear feedback about missing functionality.