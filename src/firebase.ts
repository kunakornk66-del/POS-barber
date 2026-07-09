import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch,
  getDocFromServer,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "./firebaseConfig";

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
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
  
  console.error(`🔴 [Firebase Error] Operation: ${operationType} on path: ${path} failed! Error:`, errMsg);
  throw new Error(JSON.stringify(errInfo));
}

// 4. Connection Status Testing Utility
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to perform a direct light-weight read to verify network alignment with Firestore
    const testDocRef = doc(db, "salons", "connection-test");
    await getDocFromServer(testDocRef);
    console.log("🟢 [Firebase] การเชื่อมต่อระดับเครือข่ายสำเร็จ (Connected Successfully)");
    return { success: true };
  } catch (err: any) {
    console.error("🔴 [Firebase] การเปิดใช้งานไม่สำเร็จ/ออฟไลน์ (Offline/Wrong Config):", err.message);
    return { success: false, error: err.message };
  }
}
