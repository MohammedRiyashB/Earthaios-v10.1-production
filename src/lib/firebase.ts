import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, onSnapshot, memoryLocalCache, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence non-critical Firestore logs (like offline connection attempts)
setLogLevel('silent');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, updateProfile };
export type { User };
