#!/usr/bin/env node

// Test script to diagnose BoxZero API authentication issues
// This will help identify why no real data is appearing

const https = require('https');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, getIdToken } = require('firebase/auth');

// Firebase configuration (from your .env.local)
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
const BOXZERO_API_BASE = 'https://boxzero-api-dev.azurewebsites.net';

async function testBoxZeroAuthentication() {
  console.log('🔐 Testing BoxZero Authentication Chain...\n');

  try {
    // Step 1: Authenticate with Firebase
    console.log('Step 1: Authenticating with Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    const firebaseUser = userCredential.user;
    console.log('✅ Firebase authentication successful:', firebaseUser.email);

    // Step 2: Get Firebase ID token
    console.log('\nStep 2: Getting Firebase ID token...');
    const firebaseToken = await getIdToken(firebaseUser);
    console.log('✅ Firebase ID token obtained (length:', firebaseToken.length, ')');
    console.log('Token preview:', firebaseToken.substring(0, 50) + '...');

    // Step 3: Test BoxZero API endpoints
    console.log('\nStep 3: Testing BoxZero API endpoints...\n');

    // Test linked accounts endpoint
    await testEndpoint('/api/auth/linked-accounts', firebaseToken, 'Linked Accounts');

    // Test folders endpoint
    await testEndpoint('/api/auth/folders', firebaseToken, 'Folders');

    // Test user profile endpoint
    await testEndpoint('/api/auth/user', firebaseToken, 'User Profile');

    // Test messages endpoint with real account data
    console.log('\n🔍 Testing messages endpoints...');

    // First get linked accounts to get account IDs
    if (firebaseToken) {
      try {
        const linkedAccountsResponse = await fetch('https://boxzero-api-dev.azurewebsites.net/api/auth/linked-accounts', {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        });

        if (linkedAccountsResponse.ok) {
          const accounts = await linkedAccountsResponse.json();
          console.log('Found accounts for message testing:', accounts.length);

          // Test messages endpoint for first account
          if (accounts.length > 0) {
            const firstAccount = accounts[0];
            const accountId = firstAccount.accountId;
            console.log(`Testing messages for account: ${accountId}`);

            // Try different folder IDs (inbox is usually 'inbox' or 'INBOX')
            const testFolders = ['inbox', 'INBOX', 'Inbox'];
            for (const folderId of testFolders) {
              const messagesPath = `/api/messages/accounts/${accountId}/folders/${folderId}/messages?limit=10&offset=0`;
              await testEndpoint(messagesPath, firebaseToken, `Messages: ${folderId} folder`);
            }
          }
        }
      } catch (error) {
        console.log('Error getting accounts for message testing:', error.message);
      }
    }

    // Additional endpoints to discover
    console.log('\n🔍 Testing additional API discovery...');
    const testPaths = ['/api/v1/emails', '/v1/emails', '/api/accounts', '/api/v1/accounts'];
    for (const path of testPaths) {
      await testEndpoint(path, firebaseToken, `Discovery: ${path}`);
    }

  } catch (error) {
    console.error('❌ Authentication failed:', error.message);

    if (error.code === 'auth/invalid-credential') {
      console.log('\n🔍 Falling back to mock authentication test...');
      await testWithMockToken();
    }
  }
}

async function testEndpoint(path, token, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'boxzero-api-dev.azurewebsites.net',
      port: 443,
      path: path,
      method: 'GET',
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
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ ${description}: SUCCESS (${res.statusCode})`);
            console.log(`   Data preview:`, JSON.stringify(parsed).substring(0, 200) + '...');
          } catch (e) {
            console.log(`✅ ${description}: SUCCESS (${res.statusCode}) - Raw response`);
            console.log(`   Response:`, data.substring(0, 200) + '...');
          }
        } else {
          console.log(`❌ ${description}: FAILED (${res.statusCode})`);
          console.log(`   Error:`, data.substring(0, 300));
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description}: ERROR - ${error.message}`);
      resolve();
    });

    req.setTimeout(10000, () => {
      console.log(`❌ ${description}: TIMEOUT`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function testWithMockToken() {
  console.log('Testing with mock token to check API availability...');
  const mockToken = 'mock-token-for-testing';
  await testEndpoint('/api/auth/linked-accounts', mockToken, 'Mock Token Test');
}

// Run the test
testBoxZeroAuthentication().then(() => {
  console.log('\n🎯 Authentication test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});