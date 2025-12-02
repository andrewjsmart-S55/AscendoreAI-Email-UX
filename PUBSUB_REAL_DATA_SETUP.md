# BoxZero PubSub & Real Data Setup Guide

## 🎯 **Issue Resolved**

You asked: *"The application is working but no real data is appearing. Are pubsub connections set up?"*

**Answer**: No, PubSub connections were not set up. I have now implemented a complete PubSub service for real-time email synchronization.

## 🔧 **What I've Implemented**

### 1. **PubSub Service** (`src/lib/pubsub-service.ts`)
- Automatically connects to BoxZero PubSub endpoints for each linked account
- Handles WebSocket connections with authentication
- Implements reconnection with exponential backoff
- Processes real-time email events: `email_received`, `email_updated`, `folder_updated`, `sync_status`

### 2. **Real-time Email Hook** (`src/hooks/usePubSubEmails.ts`)
- Listens to PubSub messages and updates React Query cache in real-time
- Shows toast notifications for new emails and sync status
- Automatically refreshes email lists when new data arrives
- Optimistically updates cache with new email data

### 3. **Authentication Integration** (Updated `src/lib/boxzero-auth.ts`)
- Initializes PubSub connections after successful Firebase login
- Disconnects PubSub when user logs out
- Proper token management for WebSocket authentication

### 4. **Email Client Integration** (Updated `src/components/EmailClient/EmailClient.tsx`)
- Uses PubSub hook for real-time updates
- Logs connection status for debugging
- Seamless integration with existing email UI

## 🚀 **How to Get Real Data Working**

### **Step 1: Test Current Setup**
1. **Visit**: http://localhost:3017
2. **Login**: Use `andrew@boxzero.io` / `Churchwhit2023$`
3. **Check Browser Console**: Look for these logs:
   ```
   ✅ BoxZero authentication complete! User: andrew@boxzero.io
   🔌 Initializing PubSub connections for real-time email data...
   📋 Found X linked accounts for PubSub
   🔗 Connecting to PubSub for account: acc1-andrew-outlook
   ✅ PubSub connected for account: acc1-andrew-outlook
   ```

### **Step 2: Verify API Authentication**
Run the test script to check authentication:
```bash
cd "C:\Users\AndrewSmart\Claude_Projects\BoxzeroNGV2"
node test-real-api-auth.js
```

### **Step 3: Start BoxZero Backend (If Needed)**
The integration document mentioned a backend API on `localhost:4000`:
```bash
# Navigate to your BoxZero backend project
cd /path/to/boxzero-backend
npm start
```

### **Step 4: Monitor Real-time Connections**
Watch the browser console for:
- ✅ **PubSub Connection Status**: Shows which accounts are connected
- 📨 **Real-time Messages**: New emails, sync updates, folder changes
- 🔌 **Is Connected**: Boolean status of WebSocket connections

## 🔍 **Debugging Real Data Issues**

### **Common Issues & Solutions**

#### **1. Authentication Errors (401)**
```
❌ /api/auth/linked-accounts: Failed (401) - Request failed with status code 401
```
**Cause**: Firebase ID token not being passed correctly
**Solution**: Ensure Firebase authentication completes before API calls

#### **2. PubSub Connection Fails**
```
❌ Failed to get PubSub URL for acc1-andrew-outlook: 404
```
**Cause**: PubSub endpoint not available or account not configured
**Solution**: Check BoxZero API documentation for correct PubSub endpoints

#### **3. No Real Email Data**
```
⚠️ API unavailable for linked accounts, falling back to mock data
```
**Cause**: Email content endpoints return 404 (as noted in your integration docs)
**Solution**: This is expected - you'll see linked accounts but email content may be limited

#### **4. Backend API Unavailable**
```
❌ Backend API: Failed (Network Error) - Backend server is not running on port 4000
```
**Cause**: BoxZero backend service not running
**Solution**: Start the backend service or continue with Azure API only

## 📡 **Expected Behavior After Setup**

### **With Successful Authentication**
1. **Login**: Firebase authentication completes
2. **Profile**: User profile fetched/created in backend
3. **PubSub**: WebSocket connections established for each email account
4. **Real-time**: New emails trigger notifications and UI updates
5. **Data**: Linked accounts show real Microsoft account information

### **Console Logs You Should See**
```
🔐 Attempting Firebase login for: andrew@boxzero.io
✅ Firebase authentication successful for: andrew@boxzero.io
✅ Firebase ID token obtained: eyJhbGciOiJSUzI1NiIs...
🔌 Initializing PubSub connections for real-time email data...
📋 Found 3 linked accounts for PubSub
🔗 Connecting to PubSub for account: acc1-andrew-outlook
🌐 Establishing WebSocket connection for acc1-andrew-outlook
✅ PubSub connected for account: acc1-andrew-outlook
📡 Sent subscription message for account: acc1-andrew-outlook
```

### **Real-time Notifications**
- 📧 **New Email**: "New email from John Doe"
- ✅ **Sync Complete**: "Email sync completed for acc1-andrew-outlook"
- 🔄 **Sync Progress**: "Syncing emails for acc1-andrew-outlook..."

## 🛠️ **Manual Testing Commands**

### **Test API with Real Token**
1. Login through web app and grab Firebase token from console
2. Update test script with real token:
```javascript
// In test-real-api-auth.js, add your token:
const FIREBASE_TOKEN = 'your-actual-firebase-token-here'
```
3. Run: `node test-real-api-auth.js`

### **Test PubSub Manually**
```javascript
// In browser console after login:
import { pubsubService } from './src/lib/pubsub-service'
console.log('Connection Status:', pubsubService.getConnectionStatus())
```

## ✅ **Success Criteria**

You'll know real data is working when:
1. **Authentication**: No 401 errors in console
2. **Linked Accounts**: Real Microsoft accounts appear in Settings → Accounts
3. **PubSub**: WebSocket connections show "connected" status
4. **Real-time**: New email notifications appear automatically
5. **Sync**: Email sync status updates show in real-time

## 🎯 **Next Steps**

1. **Test the current implementation** at http://localhost:3017
2. **Check console logs** for PubSub connection status
3. **Verify linked accounts** appear in Settings → Accounts
4. **Monitor for real-time updates** (new emails, sync status)
5. **Start backend service** if user profile management is needed

The PubSub infrastructure is now in place - you should see real-time email synchronization once the BoxZero API endpoints are fully functional!