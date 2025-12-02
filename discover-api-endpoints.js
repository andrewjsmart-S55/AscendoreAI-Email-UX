// Comprehensive API endpoint discovery for BoxZero
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

async function discoverAPIEndpoints() {
  console.log('🔍 BoxZero API Endpoint Discovery');
  console.log('=' .repeat(60));

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const idToken = await userCredential.user.getIdToken();

    // Get linked accounts first
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    const accounts = accountsResponse.data;
    const firstAccount = accounts[0];
    const secondAccount = accounts[1];

    console.log(`✅ Authenticated. Found ${accounts.length} accounts`);
    console.log(`Using account: ${firstAccount.externalEmail} (${firstAccount.accountId})`);

    // Test various endpoint patterns
    const endpointGroups = [
      {
        name: 'Authentication & User',
        endpoints: [
          '/api/auth/user',
          '/api/auth/me',
          '/api/user',
          '/api/me',
          '/api/profile',
          '/api/auth/profile',
          '/api/auth/token',
          '/api/auth/refresh',
          '/api/auth/logout',
        ]
      },
      {
        name: 'Account Management',
        endpoints: [
          '/api/accounts',
          '/api/auth/accounts',
          '/api/auth/linked-accounts',
          '/api/linked-accounts',
          '/api/accounts/list',
          '/api/accounts/all',
        ]
      },
      {
        name: 'Email & Messages - General',
        endpoints: [
          '/api/emails',
          '/api/messages',
          '/api/mail',
          '/api/inbox',
          '/api/email/list',
          '/api/message/list',
          '/api/emails/inbox',
          '/api/messages/inbox',
          '/api/emails/all',
          '/api/messages/all',
          '/api/v1/emails',
          '/api/v1/messages',
        ]
      },
      {
        name: 'Folders',
        endpoints: [
          '/api/folders',
          '/api/mail/folders',
          '/api/email/folders',
          '/api/mailboxes',
          '/api/directories',
        ]
      },
      {
        name: 'Search',
        endpoints: [
          '/api/search',
          '/api/search/emails',
          '/api/search/messages',
          '/api/email/search',
          '/api/message/search',
          '/api/find',
        ]
      },
      {
        name: 'Account-Specific Messages',
        endpoints: [
          `/api/accounts/${firstAccount.accountId}/messages`,
          `/api/accounts/${firstAccount.accountId}/emails`,
          `/api/accounts/${firstAccount.accountId}/mail`,
          `/api/accounts/${firstAccount.accountId}/inbox`,
          `/api/linked-accounts/${firstAccount.accountId}/messages`,
          `/api/linked-accounts/${firstAccount.accountId}/emails`,
          `/api/linked-accounts/${firstAccount.accountId}/mail`,
          `/api/auth/accounts/${firstAccount.accountId}/messages`,
          `/api/auth/accounts/${firstAccount.accountId}/emails`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/messages`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/emails`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/mail`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/inbox`,
        ]
      },
      {
        name: 'OAuth Endpoints',
        endpoints: [
          '/api/auth/oauth/microsoft',
          '/api/auth/oauth/google',
          '/api/oauth/microsoft',
          '/api/oauth/google',
          '/api/auth/callback',
          '/api/oauth/callback',
          '/api/auth/connect',
          '/api/connect',
        ]
      },
      {
        name: 'Sync & Operations',
        endpoints: [
          '/api/sync',
          '/api/sync/messages',
          '/api/sync/folders',
          `/api/auth/linked-accounts/${firstAccount.accountId}/sync`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/sync-messages`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/sync-folders`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/fetch-folders`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/refresh`,
        ]
      },
      {
        name: 'WebSocket & Real-time',
        endpoints: [
          `/api/auth/linked-accounts/${firstAccount.accountId}/pubsub-url`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/websocket`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/stream`,
          '/api/pubsub',
          '/api/websocket',
          '/api/stream',
        ]
      }
    ];

    // Test each group
    for (const group of endpointGroups) {
      console.log(`\n📂 ${group.name}`);
      console.log('-'.repeat(40));

      for (const endpoint of group.endpoints) {
        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
            timeout: 10000
          });

          console.log(`✅ ${endpoint} (${response.status})`);

          if (response.data) {
            if (Array.isArray(response.data)) {
              console.log(`   → Array with ${response.data.length} items`);
              if (response.data.length > 0 && typeof response.data[0] === 'object') {
                console.log(`   → Sample keys: ${Object.keys(response.data[0]).slice(0, 5).join(', ')}`);
              }
            } else if (typeof response.data === 'object') {
              const keys = Object.keys(response.data);
              console.log(`   → Object with keys: ${keys.slice(0, 5).join(', ')}`);
              if (keys.length > 5) console.log(`   → ... and ${keys.length - 5} more`);
            }
          }

        } catch (error) {
          const status = error.response?.status;
          if (status === 404) {
            console.log(`⚠️ ${endpoint} (404 - Not Found)`);
          } else if (status === 401) {
            console.log(`🔒 ${endpoint} (401 - Auth Required)`);
          } else if (status === 403) {
            console.log(`🚫 ${endpoint} (403 - Forbidden)`);
          } else if (status === 500) {
            console.log(`❌ ${endpoint} (500 - Server Error)`);
          } else if (status === 405) {
            console.log(`🔄 ${endpoint} (405 - Method Not Allowed, try POST?)`);
          } else {
            console.log(`❓ ${endpoint} (${status || 'Error'})`);
          }
        }
      }
    }

    // Test POST endpoints that might be different
    console.log(`\n📤 Testing POST Endpoints`);
    console.log('-'.repeat(40));

    const postEndpoints = [
      '/api/auth/oauth/microsoft',
      '/api/auth/oauth/google',
      '/api/search',
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/fetch-folders`,
      '/api/messages/search',
      '/api/emails/search',
    ];

    for (const endpoint of postEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`,
          endpoint.includes('search') ? { query: 'test' } : {},
          {
            headers: { 'Authorization': `Bearer ${idToken}` },
            timeout: 15000
          }
        );

        console.log(`✅ POST ${endpoint} (${response.status})`);
        if (response.data && typeof response.data === 'object') {
          console.log(`   → Response keys: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`⚠️ POST ${endpoint} (404)`);
        } else if (status === 405) {
          console.log(`🔄 POST ${endpoint} (405 - Maybe GET only?)`);
        } else if (status >= 500) {
          console.log(`❌ POST ${endpoint} (${status} - Server Error)`);
        } else {
          console.log(`❓ POST ${endpoint} (${status || 'Error'})`);
        }
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 API Discovery Complete!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

discoverAPIEndpoints();