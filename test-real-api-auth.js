#!/usr/bin/env node

/**
 * Test script to verify BoxZero API authentication and real data retrieval
 * This script will authenticate with Firebase and test the actual API endpoints
 */

const axios = require('axios');

// BoxZero API Configuration
const BOXZERO_API_URL = 'https://boxzero-api-dev.azurewebsites.net';
const BACKEND_API_URL = 'http://localhost:4000';

// Test credentials
const TEST_EMAIL = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testFirebaseAuth() {
  console.log('🔐 Testing Firebase Authentication...');

  try {
    // This would normally use Firebase Admin SDK or client SDK
    // For now, let's test if we can get a token from the frontend
    console.log('⚠️  Firebase authentication requires frontend integration');
    console.log('   You need to login through the web app first to get a valid Firebase ID token');
    return null;
  } catch (error) {
    console.error('❌ Firebase auth failed:', error.message);
    return null;
  }
}

async function testBoxZeroAPI(token) {
  console.log('\n📡 Testing BoxZero API endpoints...');

  const headers = token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/api/auth/linked-accounts',
    '/api/auth/folders',
    '/api/ask',
    '/api/users/me'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${BOXZERO_API_URL}${endpoint}`);
      const response = await axios.get(`${BOXZERO_API_URL}${endpoint}`, { headers });
      console.log(`✅ ${endpoint}: Success (${response.status})`);
      console.log(`   Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
      const status = error.response?.status || 'Network Error';
      const message = error.response?.data?.message || error.message;
      console.log(`❌ ${endpoint}: Failed (${status}) - ${message}`);
    }
  }
}

async function testBackendAPI(token) {
  console.log('\n🏠 Testing Backend API (user management)...');

  const headers = token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };

  try {
    console.log(`🔍 Testing: ${BACKEND_API_URL}/api/users/me`);
    const response = await axios.get(`${BACKEND_API_URL}/api/users/me`, { headers });
    console.log(`✅ Backend API: Success (${response.status})`);
    console.log(`   User:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    const message = error.response?.data?.message || error.message;
    console.log(`❌ Backend API: Failed (${status}) - ${message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Backend server is not running on port 4000');
      console.log('   💡 Start it with: cd /path/to/boxzero-backend && npm start');
    }
  }
}

async function testPubSubConnections(token) {
  console.log('\n📨 Testing PubSub connections...');

  if (!token) {
    console.log('⚠️  Cannot test PubSub without valid Firebase token');
    return;
  }

  try {
    // First get linked accounts to get account IDs
    const accountsResponse = await axios.get(`${BOXZERO_API_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const accounts = accountsResponse.data;
    console.log(`📋 Found ${accounts.length} linked accounts`);

    // Test PubSub URL for each account
    for (const account of accounts) {
      const accountId = account.account_id || account.accountId;
      try {
        console.log(`\n🔗 Testing PubSub for account: ${accountId}`);
        const pubsubResponse = await axios.get(
          `${BOXZERO_API_URL}/api/auth/linked-accounts/${accountId}/pubsub-url`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        console.log(`✅ PubSub URL obtained for ${accountId}`);
        console.log(`   URL: ${pubsubResponse.data.url || 'URL in response'}`);

        // Here you would normally establish WebSocket/PubSub connection
        console.log(`   💡 Next step: Establish WebSocket connection to this URL`);

      } catch (error) {
        const status = error.response?.status || 'Network Error';
        console.log(`❌ PubSub failed for ${accountId}: ${status}`);
      }
    }

  } catch (error) {
    console.log(`❌ Could not get linked accounts for PubSub test: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 BoxZero API Real Data Test');
  console.log('=====================================\n');

  // Test Firebase authentication
  const firebaseToken = await testFirebaseAuth();

  // Test BoxZero API endpoints
  await testBoxZeroAPI(firebaseToken);

  // Test Backend API
  await testBackendAPI(firebaseToken);

  // Test PubSub connections
  await testPubSubConnections(firebaseToken);

  console.log('\n📋 Summary:');
  console.log('1. Login through the web app (http://localhost:3017) with your credentials');
  console.log('2. Check browser console for Firebase ID token');
  console.log('3. Update this script with the token to test real API calls');
  console.log('4. Ensure BoxZero backend is running on port 4000 for user management');
  console.log('5. Establish PubSub connections for real-time email data');
}

if (require.main === module) {
  main().catch(console.error);
}