// Test folder-specific message endpoints with real folder IDs
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

async function testFolderMessages() {
  console.log('📁 Testing Folder-Specific Message Endpoints');
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

    // Get folders for this account
    console.log('\n📂 Getting folders...');
    const foldersResponse = await axios.get(
      `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/folders`,
      { headers: { 'Authorization': `Bearer ${idToken}` } }
    );

    const folders = foldersResponse.data;
    console.log(`✅ Found ${folders.length} folders`);

    // Show all folders
    console.log('\n📋 All available folders:');
    folders.forEach((folder, index) => {
      console.log(`   ${index + 1}. ${folder.name} (ID: ${folder.folder_id}, Type: ${folder.type})`);
    });

    // Test various message endpoint patterns for each folder
    console.log('\n📧 Testing message endpoints for each folder...');

    const messageEndpointPatterns = [
      // Standard patterns
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/folders/${folderId}/messages`,
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/folders/${folderId}/emails`,
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/folders/${folderId}/mail`,

      // Alternative patterns
      (accountId, folderId) => `/api/folders/${folderId}/messages`,
      (accountId, folderId) => `/api/folders/${folderId}/emails`,
      (accountId, folderId) => `/api/accounts/${accountId}/folders/${folderId}/messages`,
      (accountId, folderId) => `/api/linked-accounts/${accountId}/folders/${folderId}/messages`,

      // GET parameters instead of path
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/messages?folder=${folderId}`,
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/emails?folder=${folderId}`,
      (accountId, folderId) => `/api/auth/linked-accounts/${accountId}/messages?folderId=${folderId}`,

      // Query parameters
      (accountId, folderId) => `/api/messages?account=${accountId}&folder=${folderId}`,
      (accountId, folderId) => `/api/emails?account=${accountId}&folder=${folderId}`,
    ];

    // Test with first few folders (to avoid too much output)
    for (let i = 0; i < Math.min(folders.length, 5); i++) {
      const folder = folders[i];
      const folderName = folder.name || folder.display_name || folder.folder_id;

      console.log(`\n   📁 Testing folder: "${folderName}" (${folder.folder_id})`);

      let foundWorkingEndpoint = false;

      for (const patternFunc of messageEndpointPatterns) {
        const endpoint = patternFunc(firstAccount.accountId, folder.folder_id);

        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
            timeout: 15000
          });

          console.log(`      ✅ ${endpoint} (${response.status})`);
          foundWorkingEndpoint = true;

          if (response.data) {
            if (Array.isArray(response.data)) {
              console.log(`         → Array with ${response.data.length} items`);
              if (response.data.length > 0) {
                const firstMessage = response.data[0];
                console.log(`         → First message keys: ${Object.keys(firstMessage).join(', ')}`);
                if (firstMessage.subject || firstMessage.Subject) {
                  console.log(`         → Sample: "${firstMessage.subject || firstMessage.Subject}"`);
                }
              }
            } else if (typeof response.data === 'object') {
              console.log(`         → Object with keys: ${Object.keys(response.data).join(', ')}`);
            }
          }

          // If we found a working endpoint, break to avoid spam
          break;

        } catch (error) {
          const status = error.response?.status;
          if (status !== 404) {
            console.log(`      ❓ ${endpoint} (${status || 'Error'})`);
          }
        }
      }

      if (!foundWorkingEndpoint) {
        console.log(`      ⚠️ No working message endpoints found for "${folderName}"`);
      }
    }

    // Test POST endpoints for message operations
    console.log('\n📤 Testing POST endpoints for message operations...');

    const postEndpoints = [
      // Sync/fetch messages
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/fetch-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/load-messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/refresh-messages`,

      // Folder-specific sync
      `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folders[0].folder_id}/sync`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folders[0].folder_id}/fetch`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folders[0].folder_id}/refresh`,
    ];

    for (const endpoint of postEndpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, {}, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 15000
        });

        console.log(`   ✅ POST ${endpoint} (${response.status})`);
        if (response.data && typeof response.data === 'object') {
          console.log(`      → Response keys: ${Object.keys(response.data).slice(0, 5).join(', ')}`);
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ⚠️ POST ${endpoint} (404)`);
        } else if (status === 405) {
          console.log(`   🔄 POST ${endpoint} (405 - Maybe GET only?)`);
        } else if (status >= 500) {
          console.log(`   ❌ POST ${endpoint} (${status} - Server Error)`);
        } else if (status !== 404) {
          console.log(`   ❓ POST ${endpoint} (${status || 'Error'})`);
        }
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📁 FOLDER MESSAGE ENDPOINTS TEST COMPLETE!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Folder message test failed:', error.message);
  }
}

testFolderMessages();