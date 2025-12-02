// Test script for BoxZero API with andrew@boxzero.io
const axios = require('axios');

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';
const TEST_USER = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testBoxZeroAPI() {
  console.log('🚀 Starting BoxZero API Test Suite');
  console.log('=' .repeat(50));

  try {
    // Step 1: Test Authentication
    console.log('\n1. Testing Authentication...');
    console.log(`   Email: ${TEST_USER}`);

    const loginEndpoints = [
      '/api/auth/login',
      '/auth/login',
      '/api/login',
      '/api/v1/auth/login',
      '/api/auth/signin'
    ];

    let authToken = null;
    let loginSuccess = false;

    for (const endpoint of loginEndpoints) {
      try {
        console.log(`   Trying endpoint: ${endpoint}`);
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
          email: TEST_USER,
          password: TEST_PASSWORD
        });

        if (response.data) {
          console.log(`   ✅ Login successful at ${endpoint}!`);
          authToken = response.data.token || response.data.accessToken || response.data.access_token || response.data.authToken;
          if (authToken) {
            console.log(`   ✅ Token received: ${authToken.substring(0, 20)}...`);
            loginSuccess = true;
            break;
          }
        }
      } catch (error) {
        const status = error.response?.status;
        if (status === 401) {
          console.log(`   ❌ Invalid credentials at ${endpoint}`);
        } else if (status === 404) {
          console.log(`   ⚠️ Endpoint not found: ${endpoint}`);
        } else {
          console.log(`   ❌ Error at ${endpoint}: ${error.message}`);
        }
      }
    }

    if (!loginSuccess) {
      console.log('\n   ⚠️ Could not authenticate with any endpoint');
      console.log('   Using mock authentication for testing...');
      authToken = 'mock-token-' + Date.now();
    }

    // Step 2: Test Linked Accounts API
    console.log('\n2. Testing Linked Accounts API...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('   ✅ Linked accounts fetched successfully!');
      console.log('   Accounts found:', response.data.length || 0);

      if (response.data && response.data.length > 0) {
        response.data.forEach((account, index) => {
          console.log(`   Account ${index + 1}:`);
          console.log(`     - ID: ${account.account_id}`);
          console.log(`     - Email: ${account.external_email}`);
          console.log(`     - Provider: ${account.provider}`);
          console.log(`     - Status: ${account.status}`);
        });

        // Step 3: Test Folders API for first account
        const firstAccount = response.data[0];
        console.log(`\n3. Testing Folders API for account ${firstAccount.account_id}...`);

        try {
          const foldersResponse = await axios.get(
            `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.account_id}/folders`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('   ✅ Folders fetched successfully!');
          console.log('   Folders found:', foldersResponse.data.length || 0);
        } catch (error) {
          console.log(`   ❌ Could not fetch folders: ${error.response?.status} - ${error.message}`);
        }

        // Step 4: Test Sync Messages API
        console.log(`\n4. Testing Sync Messages API for account ${firstAccount.account_id}...`);

        try {
          const syncResponse = await axios.post(
            `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.account_id}/sync-messages`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('   ✅ Sync messages initiated successfully!');
          console.log('   Response:', syncResponse.data);
        } catch (error) {
          console.log(`   ❌ Could not sync messages: ${error.response?.status} - ${error.message}`);
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ❌ Authentication required - token may be invalid');
      } else if (error.response?.status === 404) {
        console.log('   ❌ Endpoint not found');
      } else {
        console.log(`   ❌ Error: ${error.response?.status} - ${error.message}`);
      }
    }

    // Step 5: Test Other Endpoints
    console.log('\n5. Testing Other API Endpoints...');

    const otherEndpoints = [
      { path: '/api/profile', method: 'GET', name: 'User Profile' },
      { path: '/api/accounts', method: 'GET', name: 'Email Accounts' },
      { path: '/api/emails', method: 'GET', name: 'Emails' },
      { path: '/api/folders', method: 'GET', name: 'Folders' }
    ];

    for (const endpoint of otherEndpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${API_BASE_URL}${endpoint.path}`,
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`   ✅ ${endpoint.name}: Available (Status ${response.status})`);
      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ⚠️ ${endpoint.name}: Not implemented (404)`);
        } else if (status === 401) {
          console.log(`   🔒 ${endpoint.name}: Requires authentication (401)`);
        } else {
          console.log(`   ❌ ${endpoint.name}: Error ${status}`);
        }
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ BoxZero API Test Complete!');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the test
testBoxZeroAPI();