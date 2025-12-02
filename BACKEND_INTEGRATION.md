# BoxZero Backend Integration Guide

## Overview
This document outlines the integration between BoxZero NG V2 frontend and the BoxZero backend API, including Firebase authentication setup and API service architecture.

## 🔧 Configuration

### Environment Variables
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=boxzero-4926b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=boxzero-4926b
NEXT_PUBLIC_FIREBASE_APP_ID=1:213043555636:web:163e547b02c40a5fb88961

# BoxZero API Configuration
NEXT_PUBLIC_API_BASE_URL=https://boxzero-api-dev.azurewebsites.net
NEXT_PUBLIC_API_VERSION=v1
```

## 🏗️ Architecture

### 1. Authentication Flow
- **Firebase Authentication**: Used for user identity management
- **JWT Tokens**: Firebase ID tokens are automatically attached to API requests
- **Protected Routes**: All email client routes require authentication

### 2. API Service Layer
Located in `src/lib/api.ts` - centralized service for all backend interactions:

```typescript
class APIService {
  // Automatic token injection
  // Request/response interceptors
  // Error handling
  // Typed responses
}
```

### 3. React Query Integration
- **Data Fetching**: Automatic caching and synchronization
- **Mutations**: Optimistic updates and error handling
- **Background Refetching**: Keep data fresh

## 📂 Key Files Created

### Authentication
- `src/lib/firebase.ts` - Firebase configuration
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/components/Auth/LoginForm.tsx` - Login/signup UI
- `src/components/Auth/ProtectedRoute.tsx` - Route protection

### API Integration
- `src/lib/api.ts` - Main API service class
- `src/hooks/useEmails.ts` - Email-related React Query hooks
- `src/hooks/useAIActions.ts` - AI actions React Query hooks
- `src/contexts/QueryProvider.tsx` - React Query configuration

### Updated Components
- `src/app/layout.tsx` - Added providers (Auth, Query)
- `src/app/page.tsx` - Added protected route wrapper
- `src/components/EmailClient/UserProfile.tsx` - Integrated logout functionality

## 🔌 API Endpoints

The API service provides methods for:

### Email Operations
- `getEmails(params)` - Fetch email list with filtering
- `getEmailThread(threadId)` - Fetch specific thread
- `sendEmail(emailData)` - Send new email
- `markEmailAsRead(emailId)` - Mark as read
- `markEmailAsStarred(emailId, starred)` - Star/unstar
- `archiveEmail(emailId)` - Archive email
- `deleteEmail(emailId)` - Delete email

### Account Management
- `getAccounts()` - Fetch user's email accounts
- `addEmailAccount(accountData)` - Add new email account
- `getFolders(accountId)` - Fetch folders for account

### AI Features
- `getAIActions(threadId)` - Get AI-generated actions
- `approveAIAction(actionId)` - Approve AI action
- `generateAIResponse(prompt, context)` - Generate AI responses

### Search
- `searchEmails(query, filters)` - Search with advanced filters

## 🚀 Next Steps

### To Complete Integration:

1. **Replace Mock Data** - Update components to use real API calls:
   ```typescript
   // In ThreadView.tsx
   const { data: emails, isLoading } = useEmails({
     folder: selectedFolder,
     account: selectedAccount,
     search: searchQuery
   })
   ```

2. **Error Handling** - Implement proper error boundaries and fallbacks

3. **Loading States** - Add skeleton loaders and loading indicators

4. **Real-time Updates** - Consider WebSocket integration for live email updates

5. **Caching Strategy** - Fine-tune React Query cache configuration

### Example Usage:
```typescript
// In a component
import { useEmails, useSendEmail } from '@/hooks/useEmails'

function EmailComponent() {
  const { data: emails, isLoading } = useEmails({ folder: 'inbox' })
  const sendMutation = useSendEmail()

  const handleSend = (emailData) => {
    sendMutation.mutate(emailData)
  }

  // Component logic...
}
```

## 🔒 Security Considerations

1. **Token Management**: Firebase handles token refresh automatically
2. **API Authorization**: All requests include Bearer tokens
3. **Environment Variables**: Sensitive data in environment files
4. **Error Handling**: No sensitive information in client-side errors

## 📱 Authentication Features

- Email/password authentication
- Google OAuth integration
- Automatic token refresh
- Protected route handling
- User profile management
- Secure logout functionality

## 🎯 Current Status

✅ **Completed:**
- Firebase authentication setup
- API service layer created
- React Query integration
- Authentication UI components
- Protected route implementation
- Logout functionality

⏳ **Pending:**
- Replace mock data with API calls in components
- Add comprehensive error handling
- Implement loading states
- Add real-time features

The foundation is complete and ready for full API integration!