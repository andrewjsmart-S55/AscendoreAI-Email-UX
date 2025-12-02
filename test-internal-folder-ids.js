// Test using internal folder IDs instead of external ones
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

async function testInternalFolderIds() {
  console.log('🔍 TESTING INTERNAL vs EXTERNAL FOLDER IDs')
  console.log('=' .repeat(70))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Test with one account first
    const accountId = '6727f555-6c73-435e-8c9b-fd9bf8b8a904' // andrewj.smart@outlook.com
    console.log(`\n🎯 Testing account: andrewj.smart@outlook.com`)
    console.log(`   Account ID: ${accountId}`)

    // Get folders
    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    console.log(`📁 Found ${folders.length} folders`)

    // Find inbox folder and get both IDs
    const inboxFolder = folders.find(f =>
      f.name?.toLowerCase().includes('inbox') ||
      f.displayName?.toLowerCase().includes('inbox')
    )

    if (!inboxFolder) {
      console.log('❌ No inbox folder found')
      return
    }

    const internalId = inboxFolder.id          // BoxZero internal UUID
    const externalId = inboxFolder.external_id || inboxFolder.externalId // Microsoft's ID

    console.log(`\n📥 Found Inbox folder:`)
    console.log(`   Name: "${inboxFolder.name || inboxFolder.displayName}"`)
    console.log(`   Internal ID: ${internalId}`)
    console.log(`   External ID: ${externalId}`)

    // Test 1: Using external ID (what we've been doing - fails)
    console.log(`\n❌ Test 1: Using External ID (current broken approach):`)
    try {
      const response1 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${externalId}/messages?limit=3`,
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )
      console.log(`   ✅ SUCCESS: ${response1.data.messages?.length || 0} messages`)
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.response?.status} - ${error.response?.data?.error || error.message}`)
    }

    // Test 2: Using internal ID (what should work)
    console.log(`\n✅ Test 2: Using Internal ID (correct approach):`)
    try {
      const response2 = await axios.get(
        `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${internalId}/messages?limit=3`,
        { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
      )
      console.log(`   ✅ SUCCESS: ${response2.data.messages?.length || 0} messages`)

      if (response2.data.messages?.length > 0) {
        console.log(`\n📧 RECENT EMAILS USING INTERNAL ID:`)
        response2.data.messages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. "${msg.subject || 'No Subject'}"`)
          console.log(`      From: ${msg.from?.email || msg.sender?.email || 'Unknown'}`)
        })
      }
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.response?.status} - ${error.response?.data?.error || error.message}`)
    }

    // Test other folders with internal IDs
    console.log(`\n🔍 Testing other folders with Internal IDs:`)
    const testFolders = folders.slice(0, 5).filter(f => f.id !== internalId)

    for (const folder of testFolders) {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folder.id}/messages?limit=1`,
          { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
        )
        const count = response.data.messages?.length || 0
        console.log(`   📁 ${folder.name || folder.displayName}: ${count} messages (total: ${response.data.total})`)
      } catch (error) {
        console.log(`   📁 ${folder.name || folder.displayName}: Error ${error.response?.status}`)
      }
    }

  } catch (error) {
    console.error('❌ Authentication error:', error.message)
  }
}

testInternalFolderIds()