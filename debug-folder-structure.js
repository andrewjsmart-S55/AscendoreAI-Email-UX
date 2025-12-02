// Debug the exact folder structure returned by BoxZero API
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

async function debugFolderStructure() {
  console.log('🔍 DEBUGGING FOLDER STRUCTURE')
  console.log('=' .repeat(50))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Test with one account
    const accountId = '6727f555-6c73-435e-8c9b-fd9bf8b8a904' // andrewj.smart@outlook.com
    console.log(`\n📁 Getting folders for: andrewj.smart@outlook.com`)
    console.log(`   Account ID: ${accountId}`)

    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    console.log(`\n📊 Found ${folders.length} folders`)

    // Show first few folders with all their properties
    console.log(`\n🔍 DETAILED FOLDER STRUCTURE:`)
    folders.slice(0, 5).forEach((folder, idx) => {
      console.log(`\n   Folder ${idx + 1}:`)
      console.log(`   ${JSON.stringify(folder, null, 6)}`)
    })

    // Find inbox specifically
    const inboxFolder = folders.find(f =>
      f.name?.toLowerCase().includes('inbox') ||
      f.displayName?.toLowerCase().includes('inbox')
    )

    if (inboxFolder) {
      console.log(`\n📥 INBOX FOLDER DETAILS:`)
      console.log(JSON.stringify(inboxFolder, null, 2))

      // Try all possible ID fields
      const possibleIds = [
        inboxFolder.id,
        inboxFolder.folderId,
        inboxFolder.folder_id,
        inboxFolder.external_id,
        inboxFolder.externalId,
        inboxFolder.messageId,
        inboxFolder.boxzero_id,
        inboxFolder.internal_id
      ].filter(id => id)

      console.log(`\n🔑 POSSIBLE ID FIELDS:`)
      possibleIds.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`)
      })

      // Test each possible ID
      console.log(`\n🧪 TESTING MESSAGE FETCH WITH EACH ID:`)
      for (let i = 0; i < possibleIds.length; i++) {
        const testId = possibleIds[i]
        console.log(`\n   Test ${i + 1}: Using ID "${testId}"`)
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${testId}/messages?limit=1`,
            { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
          )
          console.log(`   ✅ SUCCESS: ${response.data.messages?.length || 0} messages (total: ${response.data.total})`)

          if (response.data.messages?.length > 0) {
            console.log(`   📧 Sample message: "${response.data.messages[0].subject}"`)
          }
        } catch (error) {
          console.log(`   ❌ FAILED: ${error.response?.status} - ${error.response?.data?.error || error.message}`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugFolderStructure()