import { initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

// .env 파일의 VITE_ 접두사 환경변수로 Firebase 설정 (API 키가 코드에 직접 노출되지 않도록)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig)

// ignoreUndefinedProperties: true — 객체 안의 undefined 필드를 무시하고 저장 (함수 props 혼입 방지)
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
