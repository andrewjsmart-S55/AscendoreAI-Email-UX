// Test retrieving real data from BoxZero API
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const axios = require('axios');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
};

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';
const TEST_EMAIL = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testRealDataRetrieval() {
  console.log('📊 Testing Real Data Retrieval from BoxZero API');
  console.log('=' .repeat(60));

  try {
    // Step 1: Authenticate and get token
    console.log('1. Authenticating...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const idToken = await userCredential.user.getIdToken();
    console.log('✅ Authentication successful');

    // Step 2: Get linked accounts (we know this works)
    console.log('\n2. Retrieving linked accounts...');
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });

    const accounts = accountsResponse.data;
    console.log(`✅ Found ${accounts.length} linked accounts:`);

    accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. Account ID: ${account.accountId}`);
      console.log(`      Provider: ${account.provider}`);
      console.log(`      Email: ${account.externalEmail || 'Not set'}`);
      console.log(`      Status: ${account.status}`);
      console.log(`      Last Synced: ${account.lastSyncedAt}`);
      console.log(`      Created: ${account.createdAt}`);
      console.log('');
    });

    // Step 3: Test all available endpoints for each account
    console.log('3. Testing account-specific endpoints...');

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n   Account ${i + 1} (${account.accountId}):`);

      const accountEndpoints = [
        { name: 'Folders', path: `/api/auth/linked-accounts/${account.accountId}/folders` },
        { name: 'Messages', path: `/api/auth/linked-accounts/${account.accountId}/messages` },
        { name: 'Sync Messages', path: `/api/auth/linked-accounts/${account.accountId}/sync-messages`, method: 'POST' },
        { name: 'Fetch Folders', path: `/api/auth/linked-accounts/${account.accountId}/fetch-folders`, method: 'POST' },
        { name: 'PubSub URL', path: `/api/auth/linked-accounts/${account.accountId}/pubsub-url` }
      ];

      for (const endpoint of accountEndpoints) {
        try {
          const method = endpoint.method || 'GET';
          console.log(`     Testing ${endpoint.name} (${method})...`);

          const response = await axios({
            method,
            url: `${API_BASE_URL}${endpoint.path}`,
            headers: { 'Authorization': `Bearer ${idToken}` },
            timeout: 15000
          });

          console.log(`     ✅ ${endpoint.name}: SUCCESS (${response.status})`);

          if (response.data) {
            if (Array.isArray(response.data)) {
              console.log(`        → Array with ${response.data.length} items`);
              if (response.data.length > 0) {
                const firstItem = response.data[0];
                console.log(`        → First item keys: ${Object.keys(firstItem).join(', ')}`);

                // Show sample data for folders
                if (endpoint.name === 'Folders' && response.data.length > 0) {
                  console.log(`        → Sample folders:`);
                  response.data.slice(0, 3).forEach(folder => {
                    console.log(`          - ${folder.name || folder.displayName || folder.id} (${folder.messageCount || 0} messages)`);
                  });
                }

                // Show sample data for messages
                if (endpoint.name === 'Messages' && response.data.length > 0) {
                  console.log(`        → Sample messages:`);
                  response.data.slice(0, 2).forEach(message => {
                    console.log(`          - ${message.subject || message.Subject || 'No subject'}`);
                    console.log(`            From: ${message.from || message.From || 'Unknown'}`);
                    console.log(`            Date: ${message.date || message.ReceivedDateTime || 'Unknown'}`);
                  });
                }
              }
            } else if (typeof response.data === 'object') {
              console.log(`        → Object with keys: ${Object.keys(response.data).join(', ')}`);

              // Show PubSub URL
              if (endpoint.name === 'PubSub URL' && response.data.url) {
                console.log(`        → PubSub URL: ${response.data.url.substring(0, 50)}...`);
              }
            } else {
              console.log(`        → Data: ${response.data}`);
            }
          }

        } catch (error) {
          const status = error.response?.status;
          const message = error.response?.data?.message || error.message;

          if (status === 404) {
            console.log(`     ⚠️ ${endpoint.name}: Not implemented (404)`);
          } else if (status === 401) {
            console.log(`     🔒 ${endpoint.name}: Authentication required (401)`);
          } else if (status === 500) {
            console.log(`     ❌ ${endpoint.name}: Server error (500) - ${message}`);
          } else {
            console.log(`     ❌ ${endpoint.name}: Error ${status} - ${message}`);
          }
        }
      }
    }

    // Step 4: Test other potential endpoints
    console.log('\n4. Testing other potential endpoints...');

    const otherEndpoints = [
      { name: 'User Profile', path: '/api/user' },
      { name: 'User Info', path: '/api/auth/user' },
      { name: 'Me', path: '/api/me' },
      { name: 'Dashboard', path: '/api/dashboard' },
      { name: 'Settings', path: '/api/settings' },
      { name: 'Search', path: '/api/search?q=test' },
      { name: 'Stats', path: '/api/stats' }
    ];

    for (const endpoint of otherEndpoints) {
      try {
        console.log(`   Testing ${endpoint.name}...`);
        const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 10000
        });

        console.log(`   ✅ ${endpoint.name}: SUCCESS (${response.status})`);
        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`      → Array with ${response.data.length} items`);
          } else if (typeof response.data === 'object') {
            console.log(`      → Object with keys: ${Object.keys(response.data).join(', ')}`);
          }
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ⚠️ ${endpoint.name}: Not implemented (404)`);
        } else if (status === 401) {
          console.log(`   🔒 ${endpoint.name}: Authentication required (401)`);
        } else {
          console.log(`   ❌ ${endpoint.name}: Error ${status}`);
        }
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 REAL DATA RETRIEVAL TEST COMPLETE!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Real data test failed:', error.message);
  }
}

testRealDataRetrieval();