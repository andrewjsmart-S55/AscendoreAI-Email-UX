// Test the current authentication state in the browser
const { initializeApp } = require('firebase/app')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

const firebaseConfig = {
  apiKey: 'AIzaSyDdVq9b-x-qQKwAfN5TQfqMvPxeWzdMuLs',
  authDomain: 'boxzero-4926b.firebaseapp.com',
  projectId: 'boxzero-4926b',
  appId: '1:213043555636:web:163e547b02c40a5fb88961',
}

const TEST_EMAIL = 'andrew@boxzero.io'
const TEST_PASSWORD = 'Churchwhit2023$'

async function testAuthState() {
  console.log('🔐 TESTING AUTHENTICATION STATE')
  console.log('='.repeat(50))

  try {
    // Test Firebase authentication
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)

    console.log('🔥 Testing Firebase authentication...')
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const firebaseUser = userCredential.user
    const firebaseToken = await firebaseUser.getIdToken()

    console.log('✅ Firebase authentication successful!')
    console.log('   User:', firebaseUser.email)
    console.log('   Token type: Firebase ID Token')
    console.log('   Token length:', firebaseToken.length)
    console.log('   Token starts with:', firebaseToken.substring(0, 20) + '...')

    // Check if token is valid (should be a JWT)
    const tokenParts = firebaseToken.split('.')
    console.log('   Token parts (JWT structure):', tokenParts.length)

    if (tokenParts.length === 3) {
      console.log('   ✅ Valid JWT structure detected')
    } else {
      console.log('   ❌ Invalid JWT structure')
    }

  } catch (error) {
    console.log('❌ Firebase authentication failed:', error.message)
    console.log('   This means the frontend will fall back to mock authentication')
    console.log('   Mock tokens look like: mock-token-' + Date.now())
    console.log('   BoxZero API rejects mock tokens, causing useAccounts to fail')
  }
}

testAuthState()