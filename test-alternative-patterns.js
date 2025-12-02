#!/usr/bin/env node

// Test alternative BoxZero API patterns
const https = require('https');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, getIdToken } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs",
  authDomain: "boxzero-4926b.firebaseapp.com",
  projectId: "boxzero-4926b",
  appId: "1:213043555636:web:163e547b02c40a5fb88961"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Your credentials
const EMAIL = 'andrew@boxzero.io';
const PASSWORD = 'Churchwhit2023$';

async function testEndpoint(path, token, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'boxzero-api-dev.azurewebsites.net',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`${res.statusCode === 200 ? '✅' : '❌'} ${method} ${path}: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('   Response:', JSON.stringify(parsed).substring(0, 300) + '...');
            resolve({ success: true, data: parsed });
          } catch (e) {
            console.log('   Response:', data.substring(0, 300));
            resolve({ success: true, data });
          }
        } else {
          console.log('   Error:', data.substring(0, 200));
          resolve({ success: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${method} ${path}: ERROR - ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${method} ${path}: TIMEOUT`);
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testAlternativePatterns() {
  console.log('🔍 Testing Alternative BoxZero API Patterns...\n');

  try {
    // Authenticate with Firebase
    console.log('Authenticating with Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    const firebaseUser = userCredential.user;
    const firebaseToken = await getIdToken(firebaseUser);
    console.log('✅ Firebase authentication successful\n');

    // Get linked accounts first
    console.log('=== Getting Account Info ===');
    const accountsResult = await testEndpoint('/api/auth/linked-accounts', firebaseToken);

    if (!accountsResult.success || !accountsResult.data.length) {
      console.log('❌ No accounts found');
      return;
    }

    const accountId = accountsResult.data[0].accountId;
    console.log(`Using account: ${accountId}\n`);

    // Get folders for this account
    console.log('=== Getting Folders ===');
    const foldersResult = await testEndpoint(`/api/messages/accounts/${accountId}/folders`, firebaseToken);

    let folderId = 'inbox';
    if (foldersResult.success && foldersResult.data.length > 0) {
      // Find inbox folder
      const inboxFolder = foldersResult.data.find(f =>
        f.name?.toLowerCase() === 'inbox' ||
        f.displayName?.toLowerCase() === 'inbox'
      );
      if (inboxFolder) {
        folderId = inboxFolder.folderId;
        console.log(`Found inbox folder ID: ${folderId}\n`);
      }
    }

    // Test alternative message patterns
    console.log('=== Testing Alternative Message Patterns ===\n');

    // Pattern 1: /api/auth/linked-accounts/{id}/messages with query params
    await testEndpoint(`/api/auth/linked-accounts/${accountId}/messages?folder=${folderId}&limit=10`, firebaseToken);

    // Pattern 2: /api/auth/linked-accounts/{id}/messages without folder
    await testEndpoint(`/api/auth/linked-accounts/${accountId}/messages?limit=10`, firebaseToken);

    // Pattern 3: /api/auth/linked-accounts/{id}/folders/{folderId}/messages
    await testEndpoint(`/api/auth/linked-accounts/${accountId}/folders/${folderId}/messages`, firebaseToken);

    // Pattern 4: /api/auth/linked-accounts/{id}/inbox
    await testEndpoint(`/api/auth/linked-accounts/${accountId}/inbox`, firebaseToken);

    // Pattern 5: Try with actual folder ID from the folders response
    if (folderId !== 'inbox') {
      await testEndpoint(`/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=10`, firebaseToken);
    }

    // Pattern 6: Try sync first then fetch
    console.log('\n=== Testing Sync Then Fetch Pattern ===');
    const syncResult = await testEndpoint(`/api/auth/linked-accounts/${accountId}/sync-messages`, firebaseToken, 'POST');

    if (syncResult.success || syncResult.status === 202) {
      console.log('Waiting 3 seconds for sync to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try fetching after sync
      await testEndpoint(`/api/auth/linked-accounts/${accountId}/messages`, firebaseToken);
      await testEndpoint(`/api/messages/accounts/${accountId}/folders/${folderId}/messages`, firebaseToken);
    }

    // Pattern 7: Try different folder names
    console.log('\n=== Testing Different Folder Names ===');
    const folderNames = ['Inbox', 'INBOX', 'inbox', folderId];
    for (const folder of folderNames) {
      await testEndpoint(`/api/messages/accounts/${accountId}/folders/${folder}/messages?limit=5`, firebaseToken);
    }

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

// Run tests
testAlternativePatterns().then(() => {
  console.log('\n🎯 Alternative pattern testing completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});