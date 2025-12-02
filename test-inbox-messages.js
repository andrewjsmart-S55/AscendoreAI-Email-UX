// Test specific inbox folder for andrewj.smart@outlook.com
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

async function testInboxMessages() {
  console.log('🔍 TESTING INBOX FOLDER FOR ANDREWJ.SMART@OUTLOOK.COM')
  console.log('=' .repeat(70))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Target account: andrewj.smart@outlook.com
    const targetAccountId = '6727f555-6c73-435e-8c9b-fd9bf8b8a904'

    console.log(`\n📁 Getting ALL folders for andrewj.smart@outlook.com:`)
    const foldersResponse = await axios.get(
      `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders`,
      { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
    )

    const folders = foldersResponse.data
    console.log(`Found ${folders.length} folders:`)

    // Find inbox folder
    const inboxFolder = folders.find(f =>
      f.name?.toLowerCase().includes('inbox') ||
      f.displayName?.toLowerCase().includes('inbox') ||
      f.type === 'inbox'
    )

    if (inboxFolder) {
      console.log(`\n✅ FOUND INBOX FOLDER:`)
      console.log(`   Name: ${inboxFolder.name}`)
      console.log(`   Display Name: ${inboxFolder.displayName}`)
      console.log(`   Folder ID: ${inboxFolder.folderId}`)
      console.log(`   Type: ${inboxFolder.type}`)
      console.log(`   Total Items: ${inboxFolder.totalItemCount}`)
      console.log(`   Unread Items: ${inboxFolder.unreadItemCount}`)

      // Test messages in this inbox
      console.log(`\n📨 TESTING MESSAGES IN INBOX:`)
      try {
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${targetAccountId}/folders/${inboxFolder.folderId}/messages?limit=10`,
          { headers: { 'Authorization': `Bearer ${firebaseToken}` } }
        )

        console.log(`✅ Messages API Response:`)
        console.log(`   Status: ${messagesResponse.status}`)
        console.log(`   Messages Count: ${messagesResponse.data.messages?.length || 0}`)
        console.log(`   Total: ${messagesResponse.data.total}`)

        if (messagesResponse.data.messages && messagesResponse.data.messages.length > 0) {
          console.log(`\n📧 FIRST MESSAGE SAMPLE:`)
          const firstMsg = messagesResponse.data.messages[0]
          console.log(`   ID: ${firstMsg.id}`)
          console.log(`   Subject: ${firstMsg.subject}`)
          console.log(`   From: ${firstMsg.from?.email || firstMsg.sender}`)
          console.log(`   Date: ${firstMsg.receivedAt || firstMsg.date}`)
        }

        console.log(`\n🔍 FULL API RESPONSE:`)
        console.log(JSON.stringify(messagesResponse.data, null, 2))

      } catch (msgError) {
        console.log(`❌ Messages API failed: ${msgError.response?.status} - ${msgError.message}`)
        if (msgError.response?.data) {
          console.log('   Error details:', JSON.stringify(msgError.response.data, null, 2))
        }
      }
    } else {
      console.log(`❌ No inbox folder found. Available folders:`)
      folders.forEach((folder, i) => {
        console.log(`   ${i + 1}. "${folder.name}" (${folder.folderId})`)
        console.log(`      Type: ${folder.type || 'custom'}`)
        console.log(`      Items: ${folder.totalItemCount || 0}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', error.response.data)
    }
  }
}

testInboxMessages()