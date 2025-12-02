// Additional comprehensive API endpoint discovery for BoxZero
// This script tests more endpoint patterns that might exist in the Swagger docs

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

async function discoverAdditionalEndpoints() {
  console.log('🔍 Additional BoxZero API Endpoint Discovery');
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

    console.log(`✅ Authenticated. Found ${accounts.length} accounts`);
    console.log(`Using account: ${firstAccount.externalEmail} (${firstAccount.accountId})`);

    // Test additional endpoint patterns that might exist
    const additionalEndpointGroups = [
      {
        name: 'Alternative Email Endpoints',
        endpoints: [
          // Different API versions
          '/api/v2/emails',
          '/api/v2/messages',
          '/api/v3/emails',
          '/api/v3/messages',

          // GraphQL style
          '/graphql',
          '/api/graphql',

          // Different naming conventions
          '/api/mail-messages',
          '/api/email-messages',
          '/api/correspondence',
          '/api/communications',

          // RESTful patterns
          '/api/mailboxes/messages',
          '/api/inboxes/messages',
          '/api/accounts/messages',

          // Microsoft Graph style
          '/api/me/messages',
          '/api/me/mailFolders/inbox/messages',
          '/api/users/me/messages',

          // Alternative auth patterns
          `/api/users/${firstAccount.accountId}/messages`,
          `/api/users/${firstAccount.accountId}/emails`,
          `/api/user/${firstAccount.accountId}/messages`,
        ]
      },
      {
        name: 'Folder & Message Hierarchy',
        endpoints: [
          // Get folders first, then messages
          `/api/auth/linked-accounts/${firstAccount.accountId}/folders`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/mailboxes`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/directories`,

          // Alternative folder endpoints
          `/api/folders/${firstAccount.accountId}`,
          `/api/mailboxes/${firstAccount.accountId}`,
          `/api/accounts/${firstAccount.accountId}/folders`,

          // Nested message endpoints
          `/api/folders/inbox/messages`,
          `/api/mailboxes/inbox/messages`,
          `/api/auth/folders/inbox/messages`,
        ]
      },
      {
        name: 'Alternative OAuth Patterns',
        endpoints: [
          // Different OAuth structures
          '/api/v1/auth/oauth/microsoft',
          '/api/v1/auth/oauth/google',
          '/api/v2/auth/oauth/microsoft',
          '/api/v2/auth/oauth/google',

          // Alternative OAuth paths
          '/api/auth/microsoft/oauth',
          '/api/auth/google/oauth',
          '/api/microsoft/auth',
          '/api/google/auth',

          // Connect patterns
          '/api/connect/microsoft',
          '/api/connect/google',
          '/api/providers/microsoft/connect',
          '/api/providers/google/connect',

          // Authorization patterns
          '/api/authorize/microsoft',
          '/api/authorize/google',
          '/api/auth/authorize',
        ]
      },
      {
        name: 'Sync & Real-time Alternatives',
        endpoints: [
          // Different sync patterns
          `/api/sync/accounts/${firstAccount.accountId}`,
          `/api/accounts/${firstAccount.accountId}/sync`,
          `/api/v1/sync/${firstAccount.accountId}`,

          // Real-time alternatives
          `/api/websocket/${firstAccount.accountId}`,
          `/api/stream/${firstAccount.accountId}`,
          `/api/live/${firstAccount.accountId}`,

          // Webhook patterns
          `/api/webhooks/${firstAccount.accountId}`,
          `/api/callbacks/${firstAccount.accountId}`,
          `/api/notifications/${firstAccount.accountId}`,
        ]
      },
      {
        name: 'Search & Query Alternatives',
        endpoints: [
          // Search variations
          '/api/v1/search',
          '/api/v2/search',
          '/api/query',
          '/api/find',
          '/api/lookup',

          // Account-specific search
          `/api/search/${firstAccount.accountId}`,
          `/api/query/${firstAccount.accountId}`,
          `/api/accounts/${firstAccount.accountId}/search`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/search`,
        ]
      },
      {
        name: 'Admin & Management',
        endpoints: [
          // Admin endpoints
          '/api/admin/accounts',
          '/api/admin/users',
          '/api/management/accounts',

          // Health & status
          '/api/health',
          '/api/status',
          '/api/ping',
          '/api/version',

          // Configuration
          '/api/config',
          '/api/settings',
          '/api/preferences',
        ]
      }
    ];

    // Test each group
    for (const group of additionalEndpointGroups) {
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
          } else if (status === 405) {
            console.log(`🔄 ${endpoint} (405 - Method Not Allowed, try POST?)`);
          } else if (status === 500) {
            console.log(`❌ ${endpoint} (500 - Server Error)`);
          } else {
            console.log(`❓ ${endpoint} (${status || 'Error'})`);
          }
        }
      }
    }

    // Test POST endpoints for discovered patterns
    console.log(`\n📤 Testing POST on Alternative Patterns`);
    console.log('-'.repeat(40));

    const postTestEndpoints = [
      '/api/v1/search',
      '/api/query',
      '/api/find',
      `/api/sync/accounts/${firstAccount.accountId}`,
      `/api/accounts/${firstAccount.accountId}/sync`,
      '/api/v1/auth/oauth/microsoft',
      '/api/v2/auth/oauth/microsoft',
      '/api/connect/microsoft',
      '/api/authorize/microsoft',
    ];

    for (const endpoint of postTestEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`,
          endpoint.includes('search') || endpoint.includes('query') || endpoint.includes('find')
            ? { query: 'test' }
            : {},
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
    console.log('🎯 Additional API Discovery Complete!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Additional discovery failed:', error.message);
  }
}

discoverAdditionalEndpoints();