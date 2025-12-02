// Comprehensive test of all possible message endpoint variations
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const axios = require('axios');

const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
};

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';
const TEST_EMAIL = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testAllMessageVariations() {
  console.log('🎯 Comprehensive Message Endpoint Testing');
  console.log('=' .repeat(50));

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const idToken = await userCredential.user.getIdToken();

    // Get linked accounts
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    const firstAccount = accountsResponse.data[0];
    console.log(`✅ Account: ${firstAccount.externalEmail} (${firstAccount.accountId})`);

    // Test general message endpoints (no folder specified)
    console.log('\n📧 Testing general message endpoints (no folder)...');
    const generalEndpoints = [
      `/api/messages`,
      `/api/emails`,
      `/api/mail`,
      `/api/inbox`,
      `/api/messages/all`,
      `/api/emails/all`,
      `/api/messages/${firstAccount.accountId}`,
      `/api/emails/${firstAccount.accountId}`,
      `/api/messages/accounts/${firstAccount.accountId}`,
      `/api/emails/accounts/${firstAccount.accountId}`,
      `/api/accounts/${firstAccount.accountId}/messages`,
      `/api/accounts/${firstAccount.accountId}/emails`,
      `/api/accounts/${firstAccount.accountId}/mail`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/emails`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/mail`,
      `/api/users/me/messages`,
      `/api/users/me/emails`,
      `/api/users/messages`,
      `/api/users/emails`,
      `/api/me/messages`,
      `/api/me/emails`,
    ];

    let workingEndpoints = [];

    for (const endpoint of generalEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 10000
        });

        console.log(`✅ ${endpoint} (${response.status})`);
        workingEndpoints.push(endpoint);

        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`   📊 Array with ${response.data.length} messages`);
          } else if (typeof response.data === 'object') {
            const keys = Object.keys(response.data);
            console.log(`   📊 Object with keys: ${keys.join(', ')}`);
            if (response.data.messages) {
              console.log(`   📧 Contains ${response.data.messages.length} messages`);
            }
          }
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 500) {
          console.log(`💥 ${endpoint} (500 - Server Error)`);
        } else if (status === 405) {
          console.log(`🔄 ${endpoint} (405 - Method Not Allowed, try POST?)`);
        } else if (status !== 404) {
          console.log(`❓ ${endpoint} (${status || 'Error'})`);
        }
      }
    }

    if (workingEndpoints.length > 0) {
      console.log(`\n🎉 Found ${workingEndpoints.length} working endpoints!`);
      workingEndpoints.forEach(endpoint => console.log(`   ✅ ${endpoint}`));
    } else {
      console.log('\n❌ No general message endpoints working');
    }

    // Test POST endpoints that might return messages
    console.log('\n📤 Testing POST endpoints for messages...');
    const postEndpoints = [
      `/api/messages/fetch`,
      `/api/emails/fetch`,
      `/api/messages/get`,
      `/api/emails/get`,
      `/api/messages/list`,
      `/api/emails/list`,
      `/api/messages/search`,
      `/api/emails/search`,
      `/api/accounts/${firstAccount.accountId}/messages/fetch`,
      `/api/accounts/${firstAccount.accountId}/emails/fetch`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/messages/fetch`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/emails/fetch`,
    ];

    for (const endpoint of postEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {}, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 15000
        });

        console.log(`✅ POST ${endpoint} (${response.status})`);
        if (response.data) {
          console.log(`   📊 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 500) {
          console.log(`💥 POST ${endpoint} (500 - Server Error)`);
        } else if (status !== 404) {
          console.log(`❓ POST ${endpoint} (${status || 'Error'})`);
        }
      }
    }

    // Test query parameters for filtering
    console.log('\n🔍 Testing endpoints with query parameters...');
    const queryEndpoints = [
      `/api/messages?limit=10`,
      `/api/emails?limit=10`,
      `/api/messages?account=${firstAccount.accountId}`,
      `/api/emails?account=${firstAccount.accountId}`,
      `/api/messages?accountId=${firstAccount.accountId}`,
      `/api/emails?accountId=${firstAccount.accountId}`,
      `/api/messages?folder=inbox`,
      `/api/emails?folder=inbox`,
      `/api/messages?type=inbox`,
      `/api/emails?type=inbox`,
    ];

    for (const endpoint of queryEndpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 10000
        });

        console.log(`✅ ${endpoint} (${response.status})`);
        if (response.data) {
          const messageCount = Array.isArray(response.data) ?
            response.data.length :
            (response.data.messages?.length || 0);
          console.log(`   📧 ${messageCount} messages found`);
        }

      } catch (error) {
        const status = error.response?.status;
        if (status !== 404 && status !== 400) {
          console.log(`❓ ${endpoint} (${status || 'Error'})`);
        }
      }
    }

    // Test endpoints that might need a specific content type
    console.log('\n📋 Testing with different headers...');
    const headerTests = [
      { endpoint: `/api/messages`, headers: { 'Content-Type': 'application/json' } },
      { endpoint: `/api/emails`, headers: { 'Content-Type': 'application/json' } },
      { endpoint: `/api/messages`, headers: { 'Accept': 'application/json' } },
      { endpoint: `/api/emails`, headers: { 'Accept': 'application/json' } },
    ];

    for (const test of headerTests) {
      try {
        const response = await axios.get(`${API_BASE_URL}${test.endpoint}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            ...test.headers
          },
          timeout: 10000
        });

        console.log(`✅ ${test.endpoint} with ${JSON.stringify(test.headers)} (${response.status})`);

      } catch (error) {
        const status = error.response?.status;
        if (status !== 404) {
          console.log(`❓ ${test.endpoint} with headers (${status || 'Error'})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllMessageVariations();