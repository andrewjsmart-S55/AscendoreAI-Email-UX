// Test available email endpoints for real accounts
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const axios = require('axios');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
};

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net';
const TEST_EMAIL = 'andrew@boxzero.io';
const TEST_PASSWORD = 'Churchwhit2023$';

async function testEmailEndpoints() {
  console.log('📧 Testing Email Endpoints for Real Accounts');
  console.log('=' .repeat(60));

  try {
    // Step 1: Authenticate and get accounts
    console.log('1. Authenticating and getting linked accounts...');
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const idToken = await userCredential.user.getIdToken();

    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });

    const accounts = accountsResponse.data;
    console.log(`✅ Found ${accounts.length} linked accounts`);

    // Step 2: Test various email endpoints
    console.log('\n2. Testing email-related endpoints...');

    const emailEndpoints = [
      // General email endpoints
      { name: 'All Emails', path: '/api/emails' },
      { name: 'Messages', path: '/api/messages' },
      { name: 'Mail', path: '/api/mail' },
      { name: 'Inbox', path: '/api/inbox' },

      // Search endpoints
      { name: 'Search', path: '/api/search' },
      { name: 'Search Messages', path: '/api/search/messages' },

      // User-specific endpoints
      { name: 'User Emails', path: '/api/user/emails' },
      { name: 'User Messages', path: '/api/user/messages' },
      { name: 'User Mail', path: '/api/user/mail' },

      // Alternative paths
      { name: 'V1 Emails', path: '/api/v1/emails' },
      { name: 'V1 Messages', path: '/api/v1/messages' },
    ];

    for (const endpoint of emailEndpoints) {
      try {
        console.log(`   Testing ${endpoint.name}...`);
        const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          timeout: 10000
        });

        console.log(`   ✅ ${endpoint.name}: SUCCESS (${response.status})`);
        if (response.data) {
          if (Array.isArray(response.data)) {
            console.log(`      → Array with ${response.data.length} items`);
            if (response.data.length > 0) {
              console.log(`      → First item keys: ${Object.keys(response.data[0]).join(', ')}`);
            }
          } else if (typeof response.data === 'object') {
            console.log(`      → Object with keys: ${Object.keys(response.data).join(', ')}`);
          }
        }

      } catch (error) {
        const status = error.response?.status;
        if (status === 404) {
          console.log(`   ⚠️ ${endpoint.name}: Not implemented (404)`);
        } else if (status === 401) {
          console.log(`   🔒 ${endpoint.name}: Authentication required (401)`);
        } else {
          console.log(`   ❌ ${endpoint.name}: Error ${status}`);
        }
      }
    }

    // Step 3: Test account-specific email endpoints
    console.log('\n3. Testing account-specific email endpoints...');

    for (let i = 0; i < Math.min(accounts.length, 2); i++) {
      const account = accounts[i];
      console.log(`\n   Account: ${account.externalEmail} (${account.accountId})`);

      const accountEmailEndpoints = [
        { name: 'Account Messages', path: `/api/auth/linked-accounts/${account.accountId}/messages` },
        { name: 'Account Emails', path: `/api/auth/linked-accounts/${account.accountId}/emails` },
        { name: 'Account Mail', path: `/api/auth/linked-accounts/${account.accountId}/mail` },
        { name: 'Account Inbox', path: `/api/auth/linked-accounts/${account.accountId}/inbox` },
        { name: 'Account Folders Messages', path: `/api/auth/linked-accounts/${account.accountId}/folders/messages` },
      ];

      for (const endpoint of accountEmailEndpoints) {
        try {
          console.log(`     Testing ${endpoint.name}...`);
          const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
            headers: { 'Authorization': `Bearer ${idToken}` },
            timeout: 15000
          });

          console.log(`     ✅ ${endpoint.name}: SUCCESS (${response.status})`);
          if (response.data) {
            if (Array.isArray(response.data)) {
              console.log(`        → Array with ${response.data.length} items`);
              if (response.data.length > 0) {
                const firstItem = response.data[0];
                console.log(`        → First item keys: ${Object.keys(firstItem).join(', ')}`);

                // Show sample email data
                if (firstItem.subject || firstItem.Subject) {
                  console.log(`        → Sample: "${firstItem.subject || firstItem.Subject}"`);
                  console.log(`        → From: ${firstItem.from || firstItem.From || 'Unknown'}`);
                }
              }
            } else if (typeof response.data === 'object') {
              console.log(`        → Object with keys: ${Object.keys(response.data).join(', ')}`);
            }
          }

        } catch (error) {
          const status = error.response?.status;
          if (status === 404) {
            console.log(`     ⚠️ ${endpoint.name}: Not implemented (404)`);
          } else if (status === 401) {
            console.log(`     🔒 ${endpoint.name}: Authentication required (401)`);
          } else if (status === 500) {
            console.log(`     ❌ ${endpoint.name}: Server error (500)`);
          } else {
            console.log(`     ❌ ${endpoint.name}: Error ${status}`);
          }
        }
      }
    }

    // Step 4: Test specific folder message endpoints
    console.log('\n4. Testing folder-specific message endpoints...');

    const firstAccount = accounts[0];
    console.log(`   Using account: ${firstAccount.externalEmail}`);

    // Get folders for this account
    try {
      const foldersResponse = await axios.get(
        `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/folders`,
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );

      const folders = foldersResponse.data;
      console.log(`   Found ${folders.length} folders`);

      // Test messages from first few folders
      for (let i = 0; i < Math.min(folders.length, 3); i++) {
        const folder = folders[i];
        const folderName = folder.name || folder.display_name || folder.folder_id;

        try {
          console.log(`     Testing messages from folder: ${folderName}...`);
          const messagesResponse = await axios.get(
            `${API_BASE_URL}/api/auth/linked-accounts/${firstAccount.accountId}/folders/${folder.folder_id}/messages`,
            { headers: { 'Authorization': `Bearer ${idToken}` }, timeout: 15000 }
          );

          console.log(`     ✅ Folder "${folderName}": ${messagesResponse.data.length} messages`);
          if (messagesResponse.data.length > 0) {
            const firstMessage = messagesResponse.data[0];
            console.log(`        → Sample: "${firstMessage.subject || firstMessage.Subject || 'No subject'}"`);
          }

        } catch (error) {
          const status = error.response?.status;
          console.log(`     ⚠️ Folder "${folderName}": Error ${status}`);
        }
      }

    } catch (error) {
      console.log('   ❌ Could not get folders for testing folder messages');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📧 EMAIL ENDPOINTS TEST COMPLETE!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Email endpoints test failed:', error.message);
  }
}

testEmailEndpoints();