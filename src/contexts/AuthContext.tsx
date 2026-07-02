import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, isConfigured, assertFirebaseConfigured } from '@/lib/firebase';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());

async function fetchOrCreateUserDoc(firebaseUser: FirebaseUser, attempt = 0): Promise<User> {
  const ref = doc(db, 'users', firebaseUser.uid);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      return fetchOrCreateUserDoc(firebaseUser, attempt + 1);
    }
    throw e;
  }
  const email = (firebaseUser.email || '').toLowerCase();
  const isEmailAdmin = ADMIN_EMAILS.includes(email);

  if (snap.exists()) {
    const data = snap.data();
    const shouldPromoteToAdmin = isEmailAdmin && data.role !== 'admin';
    try {
      await updateDoc(ref, {
        lastLoginAt: serverTimestamp(),
        ...(shouldPromoteToAdmin ? { role: 'admin' } : {}),
      });
    } catch {
      // Non-fatal — user doc exists, just couldn't update lastLoginAt
    }

    const effectiveRole = shouldPromoteToAdmin
      ? 'admin'
      : (isEmailAdmin ? 'admin' : (data.role || 'student'));

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role: effectiveRole,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastLoginAt: new Date(),
      streak: data.streak || 0,
      totalLessonsCompleted: data.totalLessonsCompleted || 0,
      bookmarks: data.bookmarks || [],
    };
  }

  const isAdmin = isEmailAdmin;
  const newUser: Omit<User, 'uid'> = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    role: isAdmin ? 'admin' : 'student',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    streak: 0,
    totalLessonsCompleted: 0,
    bookmarks: [],
  };

  await setDoc(ref, {
    ...newUser,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  return { uid: firebaseUser.uid, ...newUser };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  const refreshUser = useCallback(async () => {
    if (!firebaseUser) return;
    const u = await fetchOrCreateUserDoc(firebaseUser);
    setUser(u);
  }, [firebaseUser]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const u = await fetchOrCreateUserDoc(fbUser);
          setUser(u);
        } catch (e) {
          console.error('Failed to fetch user doc', e);
          // Fall back to minimal user from Firebase Auth so the session is not lost
          const email = (fbUser.email || '').toLowerCase();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            role: ADMIN_EMAILS.includes(email) ? 'admin' : 'student',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            streak: 0,
            totalLessonsCompleted: 0,
            bookmarks: [],
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    assertFirebaseConfigured();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    assertFirebaseConfigured();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
  };

  const signInWithGoogle = async () => {
    assertFirebaseConfigured();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups for this site and try again.');
      }
      throw e;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const resetPassword = async (email: string) => {
    assertFirebaseConfigured();
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isAdmin: user?.role === 'admin',
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
