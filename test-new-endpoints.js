#!/usr/bin/env node

// Test script to discover new BoxZero API endpoints
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
            console.log('   Response preview:', JSON.stringify(parsed).substring(0, 200) + '...');
          } catch (e) {
            console.log('   Response:', data.substring(0, 200));
          }
        } else if (data && data.length < 500) {
          console.log('   Error:', data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${method} ${path}: ERROR - ${error.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${method} ${path}: TIMEOUT`);
      req.destroy();
      resolve();
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function discoverEndpoints() {
  console.log('🔍 Discovering BoxZero API Endpoints...\n');

  try {
    // Authenticate with Firebase
    console.log('Authenticating with Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    const firebaseUser = userCredential.user;
    const firebaseToken = await getIdToken(firebaseUser);
    console.log('✅ Firebase authentication successful\n');

    // Test known working endpoint first
    console.log('=== Testing Known Working Endpoint ===');
    await testEndpoint('/api/auth/linked-accounts', firebaseToken);

    // Test message-related endpoints
    console.log('\n=== Testing Message/Email Endpoints ===');
    const testPaths = [
      // Variations of message endpoints
      '/api/messages',
      '/api/emails',
      '/api/mail',
      '/api/inbox',

      // With account ID (use real account ID from linked-accounts)
      '/api/messages/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904',
      '/api/messages/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/messages',
      '/api/messages/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/folders',

      // Alternative patterns
      '/api/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/messages',
      '/api/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/emails',
      '/api/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/mail',

      // User-based endpoints
      '/api/users/me',
      '/api/users/me/messages',
      '/api/users/me/emails',
      '/api/users/me/inbox',

      // Auth-based endpoints
      '/api/auth/messages',
      '/api/auth/emails',
      '/api/auth/inbox',

      // Folders endpoint variations
      '/api/folders',
      '/api/auth/folders',
      '/api/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/folders',

      // Sync endpoints
      '/api/sync',
      '/api/sync/messages',
      '/api/auth/sync',
      '/api/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/sync'
    ];

    for (const path of testPaths) {
      await testEndpoint(path, firebaseToken);
    }

    // Test folder-specific message endpoints
    console.log('\n=== Testing Folder-Specific Message Endpoints ===');
    const folders = ['inbox', 'INBOX', 'sent', 'drafts', 'trash', 'all'];
    for (const folder of folders) {
      await testEndpoint(`/api/messages/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/folders/${folder}`, firebaseToken);
      await testEndpoint(`/api/messages/accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/folders/${folder}/messages`, firebaseToken);
    }

    // Test POST endpoints that might work
    console.log('\n=== Testing POST Endpoints ===');
    await testEndpoint('/api/auth/linked-accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/sync', firebaseToken, 'POST');
    await testEndpoint('/api/auth/linked-accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/sync-messages', firebaseToken, 'POST');
    await testEndpoint('/api/auth/linked-accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/fetch-messages', firebaseToken, 'POST');
    await testEndpoint('/api/auth/linked-accounts/6727f555-6c73-435e-8c9b-fd9bf8b8a904/refresh', firebaseToken, 'POST');

    // Test search endpoints
    console.log('\n=== Testing Search Endpoints ===');
    await testEndpoint('/api/search', firebaseToken);
    await testEndpoint('/api/search/messages', firebaseToken);
    await testEndpoint('/api/search/emails', firebaseToken);

    // Test ask/AI endpoints
    console.log('\n=== Testing AI/Ask Endpoints ===');
    await testEndpoint('/api/ask', firebaseToken);
    await testEndpoint('/api/ai', firebaseToken);
    await testEndpoint('/api/chat', firebaseToken);

    // Test with POST and query
    await testEndpoint('/api/ask', firebaseToken, 'POST', { query: 'test' });

    // Test profile endpoints
    console.log('\n=== Testing Profile Endpoints ===');
    await testEndpoint('/api/profile', firebaseToken);
    await testEndpoint('/api/auth/profile', firebaseToken);
    await testEndpoint('/api/users/profile', firebaseToken);

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

// Run discovery
discoverEndpoints().then(() => {
  console.log('\n🎯 API endpoint discovery completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});