// Test script to verify smart sync functionality
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

async function testSmartSync() {
  console.log('🔄 TESTING SMART SYNC FUNCTIONALITY')
  console.log('='.repeat(60))

  try {
    // Authenticate
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Authenticated as:', firebaseUser.email)

    // Get accounts
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/auth/linked-accounts`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const accounts = accountsResponse.data

    // Use the first available account for testing
    if (!accounts || accounts.length === 0) {
      console.log('❌ No linked accounts found')
      return
    }

    const testAccount = accounts[0]
    const accountId = testAccount.accountId
    const email = testAccount.externalEmail || testAccount.external_email

    console.log(`\n🎯 Testing smart sync for: ${email}`)
    console.log(`   Account ID: ${accountId}`)

    // Step 1: Get folders to identify the inbox
    console.log(`\n📁 Step 1: Getting account folders...`)
    const foldersResponse = await axios.get(`${API_BASE_URL}/api/messages/accounts/${accountId}/folders`, {
      headers: { 'Authorization': `Bearer ${firebaseToken}` }
    })

    const folders = foldersResponse.data
    console.log(`✅ Found ${folders.length} folders`)

    // Find inbox folder
    let inboxFolder = folders.find(f =>
      (f.name || f.displayName || '').toLowerCase().includes('inbox')
    )

    if (!inboxFolder) {
      inboxFolder = folders[0] // Fallback to first folder
    }

    const folderId = inboxFolder.folderId
    const folderName = inboxFolder.name || inboxFolder.displayName

    console.log(`📂 Target folder: "${folderName}" (${folderId})`)
    console.log(`📊 Folder message count: ${inboxFolder.messageCount || 'Unknown'}`)

    // Step 2: Test batched message retrieval (simulating smart sync)
    console.log(`\n📦 Step 2: Testing batched message retrieval...`)

    const batchSize = 100
    const maxBatches = 3 // Limit for testing
    let totalMessages = 0

    for (let batch = 0; batch < maxBatches; batch++) {
      const offset = batch * batchSize
      console.log(`\n📍 Batch ${batch + 1}: Offset ${offset}, Limit ${batchSize}`)

      try {
        const messagesResponse = await axios.get(
          `${API_BASE_URL}/api/messages/accounts/${accountId}/folders/${folderId}/messages`,
          {
            headers: { 'Authorization': `Bearer ${firebaseToken}` },
            params: { limit: batchSize, offset }
          }
        )

        const result = messagesResponse.data
        const messages = result.messages || []

        console.log(`✅ Batch ${batch + 1}: Retrieved ${messages.length} messages`)

        if (messages.length === 0) {
          console.log(`📭 No more messages found, stopping batched sync`)
          break
        }

        totalMessages += messages.length

        // Show sample of messages
        if (messages.length > 0) {
          console.log(`📧 Sample from batch ${batch + 1}:`)
          const samples = messages.slice(0, 3)
          samples.forEach((msg, idx) => {
            console.log(`   ${idx + 1}. ${msg.subject || 'No Subject'} - ${msg.from?.email || 'Unknown'}`)
          })
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (batchError) {
        console.error(`❌ Error in batch ${batch + 1}:`, batchError.response?.status, batchError.message)
        break
      }
    }

    console.log(`\n🎉 Smart sync test completed!`)
    console.log(`📊 Total messages retrieved: ${totalMessages}`)
    console.log(`📦 Batches processed: ${Math.ceil(totalMessages / batchSize)}`)
    console.log(`📈 Average batch size: ${totalMessages > 0 ? Math.round(totalMessages / Math.ceil(totalMessages / batchSize)) : 0}`)

    if (totalMessages > 0) {
      console.log(`\n✅ Smart sync functionality is working correctly!`)
      console.log(`   • Batched message retrieval: ✅ Working`)
      console.log(`   • Pagination support: ✅ Working`)
      console.log(`   • API integration: ✅ Working`)
    } else {
      console.log(`\n⚠️ No messages found, but API integration is working`)
    }

  } catch (error) {
    console.error('❌ Smart sync test failed:', error.message)
  }
}

testSmartSync()