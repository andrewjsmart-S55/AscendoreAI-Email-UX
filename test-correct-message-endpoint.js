// Test message endpoint with correct external_id
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

async function testCorrectMessageEndpoint() {
  console.log('🎯 Testing Message Endpoints with Correct Folder IDs');
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
    const accounts = accountsResponse.data;
    const firstAccount = accounts[0];
    console.log(`✅ Using account: ${firstAccount.externalEmail}`);

    // Get folders
    const foldersResponse = await axios.post(
      `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/fetch-folders`, {},
      { headers: { 'Authorization': `Bearer ${idToken}` } }
    );
    const folders = foldersResponse.data.folders;

    // Test different message endpoint patterns with external_id
    console.log('\n📧 Testing message endpoints with external_id...');

    // Focus on Inbox first (most likely to have messages)
    const inbox = folders.find(f => f.type === 'inbox');
    if (!inbox) {
      console.log('❌ No inbox folder found');
      return;
    }

    console.log(`\n📥 Testing Inbox folder:`);
    console.log(`   Name: ${inbox.name}`);
    console.log(`   External ID: ${inbox.external_id}`);
    console.log(`   Type: ${inbox.type}`);

    // Test various endpoint patterns
    const endpointPatterns = [
      // Using external_id instead of folder_id
      `/api/messages/accounts/${firstAccount.accountId}/folders/${inbox.external_id}/messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${inbox.external_id}/messages`,
      `/api/accounts/${firstAccount.accountId}/folders/${inbox.external_id}/messages`,

      // URL encode the external_id (it has special characters)
      `/api/messages/accounts/${firstAccount.accountId}/folders/${encodeURIComponent(inbox.external_id)}/messages`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/folders/${encodeURIComponent(inbox.external_id)}/messages`,

      // Alternative patterns
      `/api/messages/${firstAccount.accountId}/${inbox.external_id}`,
      `/api/emails/${firstAccount.accountId}/${inbox.external_id}`,

      // Query parameter approach
      `/api/messages/accounts/${firstAccount.accountId}?folder=${encodeURIComponent(inbox.external_id)}`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/messages?folder=${encodeURIComponent(inbox.external_id)}`,
    ];

    for (const endpoint of endpointPatterns) {
      try {
        console.log(`\n🧪 Testing: ${endpoint.substring(0, 100)}${endpoint.length > 100 ? '...' : ''}`);

        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 15000
        });

        console.log(`✅ SUCCESS! Status: ${response.status}`);
        console.log(`   Response type: ${typeof response.data}`);

        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`   📊 Array with ${response.data.length} messages`);
            if (response.data.length > 0) {
              const sample = response.data[0];
              console.log(`   📄 Sample message keys: ${Object.keys(sample).join(', ')}`);
              if (sample.subject) console.log(`   📝 Sample subject: "${sample.subject}"`);
            }
          } else if (typeof response.data === 'object') {
            console.log(`   📊 Object with keys: ${Object.keys(response.data).join(', ')}`);
            if (response.data.messages) {
              console.log(`   📧 Contains ${response.data.messages.length} messages`);
              if (response.data.messages.length > 0) {
                const sample = response.data.messages[0];
                console.log(`   📄 Sample message keys: ${Object.keys(sample).join(', ')}`);
                if (sample.subject) console.log(`   📝 Sample subject: "${sample.subject}"`);
              }
            }
          }
        }

        // If we found a working endpoint, also test with other folders
        console.log('\n🔄 Testing same endpoint with other key folders...');
        const testFolders = folders.filter(f => ['sentitems', 'drafts', 'custom'].includes(f.type)).slice(0, 3);

        for (const folder of testFolders) {
          try {
            const folderEndpoint = endpoint.replace(inbox.external_id, encodeURIComponent(folder.external_id));
            const folderResponse = await axios.get(`${API_BASE_URL}${folderEndpoint}`, {
              headers: { 'Authorization': `Bearer ${idToken}` },
              timeout: 10000
            });

            const messageCount = Array.isArray(folderResponse.data) ?
              folderResponse.data.length :
              (folderResponse.data?.messages?.length || 0);

            console.log(`   ✅ ${folder.name}: ${messageCount} messages`);

          } catch (err) {
            console.log(`   ❌ ${folder.name}: ${err.response?.status || 'Error'}`);
          }
        }

        break; // Found working endpoint, stop testing

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ❌ 404 Not Found`);
        } else if (status === 400) {
          console.log(`   ⚠️ 400 Bad Request - ${error.response?.data?.message || 'Invalid parameters'}`);
        } else if (status >= 500) {
          console.log(`   💥 ${status} Server Error`);
        } else {
          console.log(`   ❓ ${status || 'Network Error'}`);
        }
      }
    }

    console.log('\n🔄 Testing potential sync endpoints...');
    // Test sync endpoints that might make messages available
    const syncEndpoints = [
      `/api/auth/linked-accounts/${firstAccount.accountId}/sync`,
      `/api/auth/linked-accounts/${firstAccount.accountId}/refresh`,
      `/api/messages/accounts/${firstAccount.accountId}/sync`,
      `/api/accounts/${firstAccount.accountId}/sync`,
    ];

    for (const syncEndpoint of syncEndpoints) {
      try {
        console.log(`\n🔄 POST ${syncEndpoint}`);
        const response = await axios.post(`${API_BASE_URL}${syncEndpoint}`, {}, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 30000
        });

        console.log(`   ✅ Sync successful: ${response.status}`);
        if (response.data?.message) {
          console.log(`   💬 Message: ${response.data.message}`);
        }

        // After successful sync, retry message fetch
        console.log(`   🔄 Retrying message fetch after sync...`);
        try {
          const retryResponse = await axios.get(
            `${API_BASE_URL}/api/messages/accounts/${firstAccount.accountId}/folders/${encodeURIComponent(inbox.external_id)}/messages`,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
          );

          const messageCount = Array.isArray(retryResponse.data) ?
            retryResponse.data.length :
            (retryResponse.data?.messages?.length || 0);

          console.log(`   📧 Messages after sync: ${messageCount}`);

        } catch (retryError) {
          console.log(`   ❌ Retry failed: ${retryError.response?.status}`);
        }

      } catch (error) {
        const status = error.response?.status;
        if (status !== 404) {
          console.log(`   ❌ ${status || 'Error'}: ${error.response?.data?.message || error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Error response:', error.response.data);
    }
  }
}

testCorrectMessageEndpoint();