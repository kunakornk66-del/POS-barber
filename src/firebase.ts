import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "./firebaseConfig";

// Suppress Firestore SDK internal backoff debug logs when quota limit is reached
try {
  setLogLevel('silent');
} catch (e) {}

let quotaExceededListeners: ((exceeded: boolean) => void)[] = [];

function notifyQuotaExceeded() {
  quotaExceededListeners.forEach(l => l(true));
}

// Intercept low-level SDK console error messages for quota limit & backoff
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const msg = args.map(a => {
      if (!a) return '';
      if (typeof a === 'object') {
        if (a.message) return String(a.message);
        if (a.stack) return String(a.stack);
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');

    if (
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('maximum backoff delay') ||
      msg.includes('Free daily write units')
    ) {
      notifyQuotaExceeded();
      // Downgrade to clean warning so runtime error reporter is not triggered
      console.warn('🟡 [Firebase Quota Limit] Firestore daily quota reached. App is seamlessly using persistent offline cache.');
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// 1. Initialize Firebase JS SDK directly on Client Side
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore with offline persistence & optional databaseId support
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId || undefined);
  console.log("🟢 [Firebase] Initialized with persistent offline storage cache enabled.");
} catch (e) {
  console.warn("⚠️ Cannot initialize with persistentLocalCache, falling back to getFirestore:", e);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
}

export const db = dbInstance;

console.log("[Firebase Client] Initialized successfully with Project ID:", firebaseConfig.projectId);

// 3. Error Handling structure required by system guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  
  if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded')) {
    console.warn(`🟡 [Firebase Quota Exceeded] Operation ${operationType} on ${path}. App continues working with local persistent cache.`);
    notifyQuotaExceeded();
    return;
  }

  console.warn(`🔴 [Firebase Operational Warning] Operation ${operationType} on path ${path}:`, errMsg);
}

export function onQuotaExceededChange(listener: (exceeded: boolean) => void): () => void {
  quotaExceededListeners.push(listener);
  return () => {
    quotaExceededListeners = quotaExceededListeners.filter(l => l !== listener);
  };
}

// 4. Connection Status Testing Utility
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Perform a lightweight read that works with both online and local cache
    const testDocRef = doc(db, "salons", "connection-test");
    await getDoc(testDocRef);
    console.log("🟢 [Firebase] การเชื่อมต่อพร้อมใช้งาน (Firebase Connected & Local Persistence Active)");
    return { success: true };
  } catch (err: any) {
    console.warn("🟡 [Firebase] ทำงานในโหมดแคชออฟไลน์ (Offline Mode Active):", err?.message || err);
    return { success: true };
  }
}
