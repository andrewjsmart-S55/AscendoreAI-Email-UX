#!/usr/bin/env node

// Test to verify we're using correct parameter order
const https = require('https');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, getIdToken } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs",
  authDomain: "boxzero-4926b.firebaseapp.com",
  projectId: "boxzero-4926b",
  appId: "1:213043555636:web:163e547b02c40a5fb88961"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const EMAIL = 'andrew@boxzero.io';
const PASSWORD = 'Churchwhit2023$';

async function testParameterOrder() {
  console.log('🔍 Testing Parameter Order...\n');

  try {
    // Authenticate
    const userCredential = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    const firebaseUser = userCredential.user;
    const firebaseToken = await getIdToken(firebaseUser);

    // Get accounts
    console.log('=== Getting Account Info ===');
    const accountsResponse = await fetch('https://boxzero-api-dev.azurewebsites.net/api/auth/linked-accounts', {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    });
    const accounts = await accountsResponse.json();
    const accountId = accounts[0].accountId;

    console.log(`✅ Account ID: ${accountId}`);

    // Get folders
    console.log('\n=== Getting Folders ===');
    const foldersResponse = await fetch(`https://boxzero-api-dev.azurewebsites.net/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    });
    const folders = await foldersResponse.json();
    const folderId = folders[0].folderId;

    console.log(`✅ Folder ID: ${folderId}`);

    // Test different parameter orders
    console.log('\n=== Testing Parameter Orders ===');

    // CORRECT ORDER: /api/messages/accounts/{accountId}/folders/{folderId}/messages
    console.log('\n1. Testing CORRECT order: /api/messages/accounts/ACCOUNT_ID/folders/FOLDER_ID/messages');
    const url1 = `https://boxzero-api-dev.azurewebsites.net/api/messages/accounts/${accountId}/folders/${folderId}/messages`;
    console.log(`   URL: ${url1}`);

    const response1 = await fetch(url1, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    });
    console.log(`   Response: ${response1.status} - ${response1.ok ? 'SUCCESS' : 'FAILED'}`);
    if (response1.ok) {
      const data = await response1.json();
      console.log(`   Data: ${JSON.stringify(data)}`);
    } else {
      const error = await response1.text();
      console.log(`   Error: ${error.substring(0, 100)}`);
    }

    // WRONG ORDER: /api/messages/accounts/{folderId}/folders/{accountId}/messages (swapped)
    console.log('\n2. Testing WRONG order: /api/messages/accounts/FOLDER_ID/folders/ACCOUNT_ID/messages');
    const url2 = `https://boxzero-api-dev.azurewebsites.net/api/messages/accounts/${folderId}/folders/${accountId}/messages`;
    console.log(`   URL: ${url2}`);

    const response2 = await fetch(url2, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    });
    console.log(`   Response: ${response2.status} - ${response2.ok ? 'SUCCESS' : 'FAILED'}`);
    if (!response2.ok) {
      const error = await response2.text();
      console.log(`   Error: ${error.substring(0, 100)}`);
    }

    // Test with first few folders to see if any have messages
    console.log('\n=== Testing Multiple Folders ===');
    for (let i = 0; i < Math.min(folders.length, 3); i++) {
      const folder = folders[i];
      console.log(`\n3.${i+1} Testing folder: "${folder.name}" (ID: ${folder.folderId})`);

      const urlTest = `https://boxzero-api-dev.azurewebsites.net/api/messages/accounts/${accountId}/folders/${folder.folderId}/messages`;
      const responseTest = await fetch(urlTest, {
        headers: { 'Authorization': `Bearer ${firebaseToken}` }
      });
      console.log(`   Response: ${responseTest.status} - ${responseTest.ok ? 'SUCCESS' : 'FAILED'}`);

      if (responseTest.ok) {
        const data = await responseTest.json();
        console.log(`   Messages: ${data.messages?.length || 0}, Total: ${data.total || 0}`);
        if (data.messages?.length > 0) {
          console.log(`   🎉 FOUND MESSAGES! First message: ${data.messages[0].subject || 'No subject'}`);
        }
      } else {
        const error = await responseTest.text();
        console.log(`   Error: ${error.substring(0, 100)}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testParameterOrder().then(() => {
  console.log('\n🎯 Parameter order test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test error:', error);
  process.exit(1);
});