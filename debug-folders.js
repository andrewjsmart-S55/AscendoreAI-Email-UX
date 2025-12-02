// Debug script to check actual folder structure
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

async function debugFolders() {
  console.log('🔍 Debugging Folder Structure');
  console.log('=' .repeat(40));

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
    console.log(`   Account ID: ${firstAccount.accountId}`);

    // Get folders with fetch-folders
    console.log('\n📁 Fetching folders...');
    const foldersResponse = await axios.post(
      `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/fetch-folders`, {},
      { headers: { 'Authorization': `Bearer ${idToken}` } }
    );

    console.log('\n📋 Full folder response structure:');
    console.log(JSON.stringify(foldersResponse.data, null, 2));

    if (foldersResponse.data && foldersResponse.data.folders) {
      console.log('\n📂 Individual folders:');
      foldersResponse.data.folders.forEach((folder, index) => {
        console.log(`${index + 1}. Name: "${folder.name || folder.display_name || 'No name'}"`);
        console.log(`   ID: ${folder.folder_id || folder.id || 'No ID'}`);
        console.log(`   Type: ${folder.type || 'No type'}`);
        console.log(`   Keys: ${Object.keys(folder).join(', ')}`);
        console.log('');
      });

      // Test message endpoint with actual folder structure
      const testFolder = foldersResponse.data.folders[0];
      if (testFolder && (testFolder.folder_id || testFolder.id)) {
        const folderId = testFolder.folder_id || testFolder.id;
        console.log(`\n💬 Testing messages with folder ID: ${folderId}`);

        try {
          const messagesResponse = await axios.get(
            `${API_BASE_URL}/api/messages/accounts/${firstAccount.accountId}/folders/${folderId}/messages`,
            { headers: { 'Authorization': `Bearer ${idToken}` } }
          );
          console.log('✅ Message endpoint response:');
          console.log(JSON.stringify(messagesResponse.data, null, 2));
        } catch (error) {
          console.log(`❌ Message endpoint failed: ${error.response?.status} - ${error.response?.statusText}`);
          if (error.response?.data) {
            console.log('Error data:', JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response?.data) {
      console.error('Error response:', error.response.data);
    }
  }
}

debugFolders();