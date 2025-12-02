# What to Look for in boxzero-web-html Repository

Since you have access to the private repository, please look for these key items:

## 1. API Endpoint Definitions
Look for files that define API endpoints, usually in:
- `src/api/` or `src/services/`
- `api.js`, `api.ts`, `apiService.js`
- `endpoints.js`, `config.js`

**Key things to find:**
- Base URL configuration
- Email/message endpoint paths
- Authentication endpoints
- OAuth flow implementations

## 2. Authentication Implementation
Look for:
- How they authenticate (Firebase, custom tokens, etc.)
- Login/signup flow
- Token management
- Files like: `auth.js`, `authentication.js`, `firebase.js`

## 3. Email/Message Data Fetching
Look for code that:
- Fetches email lists
- Gets message content
- Handles folders
- Files like: `emails.js`, `messages.js`, `inbox.js`

## 4. Configuration Files
Check for:
- `.env.example` or `.env.development`
- `config.js` or `config.json`
- `package.json` (for dependencies)
- Any Firebase configuration

## 5. Example API Calls
Look for actual API call implementations:
```javascript
// Example patterns to look for:
fetch('/api/...',
axios.get('/api/...',
apiClient.get('...',
```

## Specific Questions to Answer:

1. **What's the base API URL?**
   - Is it the same `https://boxzero-api-dev.azurewebsites.net`?
   - Or something different?

2. **What are the actual email endpoints?**
   - How do they fetch messages?
   - What's the exact path pattern?

3. **How do they handle authentication?**
   - Firebase or something else?
   - How are tokens passed?

4. **How do they add new email accounts?**
   - OAuth implementation details
   - Callback URLs

5. **What data structures are used?**
   - Message format
   - Account format
   - Folder structure

## Files to Share (if possible):

If you can, please share the contents of:
1. Main API service file
2. Authentication implementation
3. Email/message fetching code
4. Configuration or environment variables (with sensitive data removed)
5. Package.json

This will help us understand exactly how the BoxZero API is meant to be used and update our implementation accordingly.