import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseEnvVarNames: Record<keyof typeof firebaseConfig, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const missingFirebaseEnv = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value === 'undefined')
  .map(([key]) => key);

const isConfigured = missingFirebaseEnv.length === 0;

if (!isConfigured) {
  console.error(
    [
      'Firebase is not fully configured.',
      'Set the missing Vite env vars and restart the dev server:',
      ...missingFirebaseEnv.map((key) => `- ${firebaseEnvVarNames[key as keyof typeof firebaseConfig]}`),
    ].join('\n')
  );
}

const app = initializeApp(
  isConfigured
    ? firebaseConfig
    : {
      apiKey: 'missing',
      authDomain: 'missing.firebaseapp.com',
      projectId: 'missing-project',
      storageBucket: 'missing.appspot.com',
      messagingSenderId: '0',
      appId: '1:0:web:0',
    }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use emulators in development if VITE_USE_EMULATORS=true
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export function assertFirebaseConfigured() {
  if (isConfigured) return;

  throw new Error(
    `Firebase config missing. Please set ${missingFirebaseEnv
      .map((key) => firebaseEnvVarNames[key as keyof typeof firebaseConfig])
      .join(', ')} in your environment.`
  );
}

export { isConfigured };
export default app;
