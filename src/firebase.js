import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

let auth = null
let db   = null

try {
  const app = initializeApp({
    apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId:      import.meta.env.VITE_FIREBASE_APP_ID,
  })
  auth = getAuth(app)
  db   = getFirestore(app)
} catch (e) {
  console.warn('[firebase] init failed:', e.message)
}

export { auth, db }
