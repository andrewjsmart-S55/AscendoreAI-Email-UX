// Test BoxZero API with dev credentials to see if different endpoints are available
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
const DEV_EMAIL = 'dev@boxzero.io';
const DEV_PASSWORD = '6eV*gt-H_YYs';

async function testDevCredentials() {
  console.log('🔧 Testing BoxZero API with Dev Credentials');
  console.log('=' .repeat(60));

  try {
    // Authenticate with dev credentials
    console.log('1. Authenticating with dev credentials...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, DEV_EMAIL, DEV_PASSWORD);
    const idToken = await userCredential.user.getIdToken();

    console.log(`✅ Successfully authenticated as: ${DEV_EMAIL}`);
    console.log(`   Token type: Firebase ID Token`);
    console.log(`   Token preview: ${idToken.substring(0, 50)}...`);

    // Test basic endpoints
    console.log('\n2. Testing basic endpoints...');

    // Test linked accounts
    try {
      const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      console.log(`✅ Linked accounts: Found ${accountsResponse.data.length} accounts`);

      accountsResponse.data.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.externalEmail} (${account.provider}) - Status: ${account.status}`);
      });

      // If we have accounts, test with first one
      if (accountsResponse.data.length > 0) {
        const firstAccount = accountsResponse.data[0];

        console.log('\n3. Testing endpoints with dev account...');

        // Test folders
        try {
          const foldersResponse = await axios.get(
            `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/folders`,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
          );
          console.log(`✅ Folders: Found ${foldersResponse.data.length} folders`);
        } catch (error) {
          console.log(`❌ Folders: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        }

        // Test messages (all the patterns we know might not work)
        const messageEndpoints = [
          `/api/auth/linked-accounts/${firstAccount.accountId}/messages`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/emails`,
          `/api/messages`,
          `/api/emails`,
          `/api/inbox`,
          `/api/user/messages`,
          `/api/me/messages`,
        ];

        console.log('\n   Testing message endpoints...');
        for (const endpoint of messageEndpoints) {
          try {
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
              headers: { 'Authorization': `Bearer ${idToken}` },
              timeout: 10000
            });
            console.log(`   ✅ ${endpoint}: SUCCESS (${response.status}) - ${Array.isArray(response.data) ? response.data.length + ' items' : 'Object'}`);

            // If successful, show sample data
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
              const firstItem = response.data[0];
              console.log(`      → Sample keys: ${Object.keys(firstItem).slice(0, 8).join(', ')}`);
            }
          } catch (error) {
            const status = error.response?.status;
            if (status === 404) {
              console.log(`   ⚠️ ${endpoint}: Not Found (404)`);
            } else if (status === 401) {
              console.log(`   🔒 ${endpoint}: Unauthorized (401)`);
            } else if (status === 403) {
              console.log(`   🚫 ${endpoint}: Forbidden (403)`);
            } else {
              console.log(`   ❓ ${endpoint}: Error ${status}`);
            }
          }
        }

        // Test OAuth endpoints
        console.log('\n   Testing OAuth endpoints...');
        const oauthEndpoints = [
          '/api/auth/oauth/microsoft',
          '/api/auth/oauth/google',
          '/api/oauth/microsoft',
          '/api/oauth/google',
        ];

        for (const endpoint of oauthEndpoints) {
          try {
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
              headers: { 'Authorization': `Bearer ${idToken}` },
              timeout: 10000
            });
            console.log(`   ✅ ${endpoint}: SUCCESS (${response.status})`);
          } catch (error) {
            const status = error.response?.status;
            console.log(`   ⚠️ ${endpoint}: ${status === 404 ? 'Not Found' : 'Error ' + status} (${status})`);
          }
        }

        // Test admin endpoints (since this is a dev account)
        console.log('\n   Testing admin/dev endpoints...');
        const adminEndpoints = [
          '/api/admin',
          '/api/admin/accounts',
          '/api/admin/users',
          '/api/dev',
          '/api/debug',
          '/api/internal',
          '/api/system',
        ];

        for (const endpoint of adminEndpoints) {
          try {
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
              headers: { 'Authorization': `Bearer ${idToken}` },
              timeout: 10000
            });
            console.log(`   ✅ ${endpoint}: SUCCESS (${response.status})`);
            if (response.data && typeof response.data === 'object') {
              console.log(`      → Keys: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
            }
          } catch (error) {
            const status = error.response?.status;
            if (status !== 404) {
              console.log(`   ❓ ${endpoint}: Error ${status}`);
            }
          }
        }
      }

    } catch (error) {
      console.log(`❌ Failed to get linked accounts: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🔧 DEV CREDENTIALS TEST COMPLETE!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Dev credentials test failed:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error('   → The dev@boxzero.io account does not exist in Firebase');
    } else if (error.code === 'auth/wrong-password') {
      console.error('   → The password for dev@boxzero.io is incorrect');
    } else if (error.code === 'auth/invalid-email') {
      console.error('   → The email dev@boxzero.io is not valid');
    }
  }
}

testDevCredentials();