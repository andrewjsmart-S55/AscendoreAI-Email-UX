// Test sync-messages endpoint after deployment
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

async function testSync() {
  console.log('🔐 Authenticating...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, 'andrew@boxzero.io', 'Churchwhit2023$');
  const token = await cred.user.getIdToken();
  console.log('✅ Authenticated');

  // Get accounts first
  console.log('\n📧 Fetching linked accounts...');
  const accountsResp = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const accounts = accountsResp.data;
  console.log(`Found ${accounts.length} accounts:`);
  accounts.forEach((a, i) => console.log(`  ${i + 1}. ${a.externalEmail} (${a.accountId})`));

  // Test with the smallest account (andrew@boxzero.io has fewer emails)
  const targetAccount = accounts.find(a => a.externalEmail === 'andrew@boxzero.io') || accounts[2];
  console.log(`\n🔄 Testing sync for: ${targetAccount.externalEmail} (${targetAccount.accountId})`);

  try {
    console.log('Calling sync-messages endpoint (waiting up to 5 minutes)...');
    const startTime = Date.now();
    const syncResp = await axios.post(
      `${API_BASE_URL}/api/auth/linked-accounts/${targetAccount.accountId}/sync-messages`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 300000 // 5 minutes
      }
    );
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Sync completed in ${duration}s`);
    console.log('Response:', JSON.stringify(syncResp.data, null, 2));
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️ Sync is still running (request timed out but sync continues on server)');
    } else {
      console.error('❌ Sync error:', error.response?.status, error.response?.data || error.message);
    }
  }

  // Now check if any messages were synced by checking the messages endpoint
  console.log('\n📊 Checking if messages exist in database...');
  try {
    const foldersResp = await axios.get(
      `${API_BASE_URL}/api/messages/accounts/${targetAccount.accountId}/folders`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const folders = foldersResp.data;
    console.log(`Found ${folders.length} folders:`);

    let totalMessages = 0;
    for (const folder of folders) {
      if (folder.messageCount > 0) {
        console.log(`  ✅ ${folder.name}: ${folder.messageCount} messages (messageFolderId: ${folder.messageFolderId || 'none'})`);
        totalMessages += folder.messageCount;
      }
    }

    if (totalMessages === 0) {
      console.log('  📭 No messages in database yet - sync may still be processing');
    } else {
      console.log(`\n📊 Total messages in database: ${totalMessages}`);
    }
  } catch (error) {
    console.error('❌ Error checking messages:', error.response?.status, error.response?.data || error.message);
  }
}

testSync().catch(console.error);
