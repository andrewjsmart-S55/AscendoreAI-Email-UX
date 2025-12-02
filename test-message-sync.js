// Test script to find working message sync endpoints
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

async function testMessageSync() {
  console.log('🔄 Testing Message Synchronization Endpoints');
  console.log('=' .repeat(60));

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
    const accounts = accountsResponse.data;
    const firstAccount = accounts[0];

    console.log(`✅ Using account: ${firstAccount.externalEmail} (${firstAccount.accountId})`);

    // Test potential message sync endpoints
    const syncEndpoints = [
      // Message-specific sync
      `/api/auth/linked-accounts/${firstAccount.accountId}/fetch-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/load-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/refresh-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/pull-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/import-messages`,

      // General sync (might include messages)
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/refresh`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync-all`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/full-sync`,

      // Alternative patterns
      `/api/messages/accounts/${firstAccount.accountId}/sync`,
      `/api/messages/accounts/${firstAccount.accountId}/fetch`,
      `/api/accounts/${firstAccount.accountId}/sync-messages`,
      `/api/accounts/${firstAccount.accountId}/fetch-messages`,
    ];

    console.log('\n🧪 Testing POST sync endpoints...');
    for (const endpoint of syncEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {}, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 30000 // Longer timeout for sync operations
        });

        console.log(`✅ POST ${endpoint} (${response.status})`);
        if (response.data) {
          console.log(`   → Response keys: ${Object.keys(response.data).join(', ')}`);
          if (response.data.message) {
            console.log(`   → Message: ${response.data.message}`);
          }
        }

        // If sync succeeded, test getting messages immediately
        console.log('   → Testing message retrieval after sync...');
        await testMessageRetrieval(firstAccount.accountId, idToken);

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          // Don't log 404s to reduce noise
          continue;
        } else if (status === 405) {
          console.log(`🔄 POST ${endpoint} (405 - Method not allowed)`);
        } else if (status >= 500) {
          console.log(`❌ POST ${endpoint} (${status} - Server Error)`);
        } else {
          console.log(`❓ POST ${endpoint} (${status || 'Error'})`);
          if (error.response?.data) {
            console.log(`   → Error: ${JSON.stringify(error.response.data)}`);
          }
        }
      }
    }

    console.log('\n📁 Testing folder-specific sync...');
    // Get folders first
    const foldersResponse = await axios.post(
      `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/fetch-folders`, {},
      { headers: { 'Authorization': `Bearer ${idToken}` } }
    );

    if (foldersResponse.data && foldersResponse.data.folders) {
      const folders = foldersResponse.data.folders.slice(0, 3); // Test first 3 folders

      for (const folder of folders) {
        const folderSyncEndpoints = [
          `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folder.folder_id}/sync`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folder.folder_id}/fetch`,
          `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folder.folder_id}/refresh`,
          `/api/messages/accounts/${firstAccount.accountId}/folders/${folder.folder_id}/sync`,
        ];

        console.log(`\n   📂 Testing sync for folder: ${folder.name} (${folder.folder_id})`);

        for (const endpoint of folderSyncEndpoints) {
          try {
            const response = await axios.post(`${API_BASE_URL}${endpoint}`, {}, {
              headers: { 'Authorization': `Bearer ${idToken}` },
              timeout: 30000
            });

            console.log(`      ✅ POST ${endpoint} (${response.status})`);

            // Test message retrieval for this folder after sync
            await testFolderMessages(firstAccount.accountId, folder.folder_id, idToken);

          } catch (error) {
            const status = error.response?.status;
            if (status !== 404) {
              console.log(`      ❓ POST ${endpoint} (${status || 'Error'})`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Message sync test failed:', error.message);
  }
}

async function testMessageRetrieval(accountId, token) {
  // Try different message endpoints
  const messageEndpoints = [
    `/api/messages/accounts/${accountId}/messages`,
    `/api/auth/linked-accounts/${accountId}/messages`,
    `/api/accounts/${accountId}/messages`,
  ];

  for (const endpoint of messageEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      console.log(`      ✅ GET ${endpoint} (${response.status})`);
      if (response.data && response.data.messages) {
        console.log(`         → Found ${response.data.messages.length} messages`);
      }
      return; // Found working endpoint, exit

    } catch (error) {
      // Continue trying other endpoints
    }
  }
  console.log(`      ⚠️ No working message endpoints found`);
}

async function testFolderMessages(accountId, folderId, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      }
    );

    console.log(`         → Messages after sync: ${response.data?.messages?.length || 0} found`);

  } catch (error) {
    console.log(`         → Message retrieval failed: ${error.response?.status || 'Error'}`);
  }
}

testMessageSync();