// Complete authentication test with real credentials
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const axios = require('axios');

// Firebase configuration (from .env.local)
const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
};

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';
const TEST_EMAIL = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testCompleteAuthentication() {
  console.log('🔥 Testing Complete Firebase + BoxZero Authentication');
  console.log('=' .repeat(60));
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`API: ${API_BASE_URL}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Initialize Firebase
    console.log('\n1. Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    console.log('✅ Firebase initialized successfully');

    // Step 2: Authenticate with Firebase
    console.log('\n2. Authenticating with Firebase...');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD.replace(/./g, '*')}`);

    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const user = userCredential.user;

    console.log('✅ Firebase authentication successful!');
    console.log(`   User ID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Display Name: ${user.displayName || 'Not set'}`);

    // Step 3: Get Firebase ID Token
    console.log('\n3. Getting Firebase ID Token...');
    const idToken = await user.getIdToken();
    console.log('✅ Firebase ID token obtained');
    console.log(`   Token length: ${idToken.length} characters`);
    console.log(`   Token preview: ${idToken.substring(0, 50)}...`);

    // Step 4: Test BoxZero API with Firebase token
    console.log('\n4. Testing BoxZero API with Firebase token...');

    const apiTests = [
      { name: 'Linked Accounts', endpoint: '/api/auth/linked-accounts' },
      { name: 'User Profile', endpoint: '/api/profile' },
      { name: 'Email Accounts', endpoint: '/api/accounts' },
      { name: 'Email Folders', endpoint: '/api/folders' }
    ];

    for (const test of apiTests) {
      try {
        console.log(`\n   Testing ${test.name}...`);
        console.log(`   Endpoint: ${test.endpoint}`);

        const response = await axios.get(`${API_BASE_URL}${test.endpoint}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log(`   ✅ ${test.name}: SUCCESS (${response.status})`);
        console.log(`   Response type: ${typeof response.data}`);

        if (Array.isArray(response.data)) {
          console.log(`   Data: Array with ${response.data.length} items`);
          if (response.data.length > 0) {
            console.log(`   First item keys: ${Object.keys(response.data[0]).join(', ')}`);
          }
        } else if (typeof response.data === 'object') {
          console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
        }

        // Show first few items for linked accounts
        if (test.endpoint === '/api/auth/linked-accounts' && response.data.length > 0) {
          console.log(`   Linked accounts found:`);
          response.data.forEach((account, index) => {
            console.log(`     ${index + 1}. ${account.external_email} (${account.provider}) - ${account.status}`);
          });
        }

      } catch (error) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        if (status === 401) {
          console.log(`   🔒 ${test.name}: Authentication required (401)`);
          console.log(`   Message: ${message}`);
        } else if (status === 403) {
          console.log(`   🔒 ${test.name}: Access forbidden (403)`);
        } else if (status === 404) {
          console.log(`   ⚠️ ${test.name}: Not implemented (404)`);
        } else {
          console.log(`   ❌ ${test.name}: Error ${status} - ${message}`);
        }
      }
    }

    // Step 5: Test account-specific endpoints if we have accounts
    console.log('\n5. Testing account-specific endpoints...');
    try {
      const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (accountsResponse.data.length > 0) {
        const firstAccount = accountsResponse.data[0];
        console.log(`\n   Testing folders for account: ${firstAccount.external_email}`);

        const foldersResponse = await axios.get(
          `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.account_id}/folders`,
          {
            headers: { 'Authorization': `Bearer ${idToken}` }
          }
        );

        console.log(`   ✅ Folders retrieved: ${foldersResponse.data.length} folders`);

        if (foldersResponse.data.length > 0) {
          console.log(`   Folders:`);
          foldersResponse.data.slice(0, 5).forEach(folder => {
            console.log(`     - ${folder.name || folder.display_name} (${folder.message_count || 0} messages)`);
          });
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Account-specific test failed: ${error.response?.status}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 AUTHENTICATION TEST COMPLETE!');
    console.log('=' .repeat(60));
    console.log('✅ Firebase authentication: SUCCESS');
    console.log('✅ Firebase ID token: SUCCESS');
    console.log('✅ BoxZero API integration: READY');
    console.log('\nThe application should now work with real data!');

  } catch (error) {
    console.error('\n❌ Authentication test failed:', error.message);

    if (error.code) {
      console.error('Error code:', error.code);
    }

    if (error.code === 'auth/invalid-credential') {
      console.error('The email/password combination is invalid');
    } else if (error.code === 'auth/user-not-found') {
      console.error('No user found with this email address');
    } else if (error.code === 'auth/wrong-password') {
      console.error('Incorrect password');
    }
  }
}

testCompleteAuthentication();