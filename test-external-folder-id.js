// Test using external_id instead of BoxZero's internal folderId
const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')
const axios = require('axios')

const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
}

const API_BASE_URL = 'https://boxzero-api-dev.azurewebsites.net'
const TEST_EMAIL = 'andrew@boxzero.io'
const TEST_PASSWORD = 'Churchwhit2023$'

async function testExternalFolderId() {
  console.log('🔑 TESTING EXTERNAL FOLDER ID vs INTERNAL FOLDER ID')
  console.log('=' .repeat(70))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Target account: andrewj.smart@outlook.com (has 110k+ emails)
    const targetAccountId = '6727f555-6c73-435e-8c9b-fd9bf8b8a904'

    // BoxZero internal folder ID (what we've been using)
    const internalFolderId = '29e5d265-d471-4a7b-a47e-ca79eae314d4'

    // Microsoft external folder ID (from fetch-folders response)
    const externalInboxId = 'AQMkADAwATM3ZmYAZS1iNDAwAC1hZTY1LTAwAi0wMAoALgAAA_b1XjzMbx5AkpidgUKK5YoBAN8qn4hx8VNHtbQLXDjxFC4AAAIBDAAAAA=='

    console.log(`\n🎯 Account: andrewj.smart@outlook.com`)
    console.log(`   Account ID: ${targetAccountId}`)
    console.log(`   Internal Folder ID: ${internalFolderId}`)
    console.log(`   External Folder ID: ${externalInboxId.substring(0, 50)}...`)

    // Test 1: Using BoxZero internal folder ID (our current approach)
    console.log(`\n1️⃣ TESTING WITH INTERNAL FOLDER ID:`)
    try {
      const response1 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${internalFolderId}/messages?limit=5`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ Status: ${response1.status}`)
      console.log(`   📊 Messages: ${response1.data.messages?.length || 0}`)
      console.log(`   🔢 Total: ${response1.data.total}`)
      if (response1.data.messages?.length > 0) {
        console.log(`   🎉 SUCCESS WITH INTERNAL ID!`)
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 2: Using Microsoft external folder ID
    console.log(`\n2️⃣ TESTING WITH EXTERNAL FOLDER ID:`)
    try {
      const response2 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${externalInboxId}/messages?limit=5`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ Status: ${response2.status}`)
      console.log(`   📊 Messages: ${response2.data.messages?.length || 0}`)
      console.log(`   🔢 Total: ${response2.data.total}`)
      if (response2.data.messages?.length > 0) {
        console.log(`   🎉 SUCCESS WITH EXTERNAL ID!`)
        const msg = response2.data.messages[0]
        console.log(`   📧 First message: "${msg.subject}" from ${msg.from?.email || msg.sender}`)
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.response?.status} - ${error.message}`)
    }

    // Test 3: Try other folders with external IDs
    console.log(`\n3️⃣ TESTING OTHER FOLDERS WITH EXTERNAL IDs:`)

    const testFolders = [
      { name: 'Sent Items', external_id: 'AQMkADAwATM3ZmYAZS1iNDAwAC1hZTY1LTAwAi0wMAoALgAAA_b1XjzMbx5AkpidgUKK5YoBAN8qn4hx8VNHtbQLXDjxFC4AAAIBCQAAAA==' },
      { name: 'Drafts', external_id: 'AQMkADAwATM3ZmYAZS1iNDAwAC1hZTY1LTAwAi0wMAoALgAAA_b1XjzMbx5AkpidgUKK5YoBAN8qn4hx8VNHtbQLXDjxFC4AAAIBDwAAAA==' },
      { name: 'Archive', external_id: 'AQMkADAwATM3ZmYAZS1iNDAwAC1hZTY1LTAwAi0wMAoALgAAA_b1XjzMbx5AkpidgUKK5YoBAN8qn4hx8VNHtbQLXDjxFC4AApfNKuEAAAA=' }
    ]

    for (const folder of testFolders) {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${folder.external_id}/messages?limit=1`,
          {
            headers: { 'Authorization': `Bearer ${firebaseToken}` }
          }
        )
        const count = response.data.messages?.length || 0
        console.log(`   📁 ${folder.name}: ${count} messages (total: ${response.data.total})`)
        if (count > 0) {
          console.log(`   🎉 FOUND MESSAGES in ${folder.name} using external ID!`)
        }
      } catch (error) {
        console.log(`   📁 ${folder.name}: Error ${error.response?.status}`)
      }
    }

    // Test 4: Check if BoxZero API expects a different URL format
    console.log(`\n4️⃣ TESTING DIFFERENT URL FORMATS:`)

    // Try with /external-folders/ endpoint if it exists
    try {
      const response4 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/external-folders/${externalInboxId}/messages?limit=5`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ External-folders endpoint: ${response4.status} - ${response4.data.messages?.length || 0} messages`)
    } catch (error) {
      console.log(`   ❌ External-folders endpoint: ${error.response?.status}`)
    }

    // Try URL encoding the external ID
    const encodedExternalId = encodeURIComponent(externalInboxId)
    try {
      const response5 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${encodedExternalId}/messages?limit=5`,
        {
          headers: { 'Authorization': `Bearer ${firebaseToken}` }
        }
      )
      console.log(`   ✅ URL-encoded external ID: ${response5.status} - ${response5.data.messages?.length || 0} messages`)
      if (response5.data.messages?.length > 0) {
        console.log(`   🎉 SUCCESS WITH URL-ENCODED EXTERNAL ID!`)
      }
    } catch (error) {
      console.log(`   ❌ URL-encoded external ID: ${error.response?.status}`)
    }

  } catch (error) {
    console.error('❌ Authentication error:', error.message)
  }
}

testExternalFolderId()