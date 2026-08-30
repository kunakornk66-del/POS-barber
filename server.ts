import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Firebase JS SDK
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";

// Types and Seed Data
import { Barber, Product, ShareConfig, SaleRecord, ShopConfig, Voucher } from "./src/types.ts";
import { 
  INITIAL_BARBERS, 
  INITIAL_PRODUCTS, 
  DEFAULT_SHARE_CONFIG, 
  DEFAULT_SHOP_CONFIG, 
  getSeededSales 
} from "./src/data.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// Load Firebase configuration
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let db: any;

try {
  const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log(`[Firebase] Initialized Firestore successfully using database: ${firebaseConfig.firestoreDatabaseId}`);
} catch (err) {
  console.error("[Firebase] Error loading Firebase configuration:", err);
}

// Ensure database is active
function getDB() {
  if (!db) {
    throw new Error("Firestore is not initialized. Please configure database.");
  }
  return db;
}

// Helper to extract email from request headers
const getEmail = (req: express.Request): string => {
  return (req.headers["x-user-email"] as string) || "guest@gmail.com";
};

// ------------------------------------------
// API ENDPOINTS (Multi-Tenant with Cloud Firestore)
// ------------------------------------------

// 1. Get all data at once
app.get("/api/data", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    
    // 1. Fetch salon master configuration document
    const salonDocRef = doc(firestoreDb, "salons", email);
    const salonDocSnap = await getDoc(salonDocRef);
    
    let salonData: any = null;
    if (salonDocSnap.exists()) {
      salonData = salonDocSnap.data();
    } else {
      // Seed data if doesn't exist to begin with
      const isGuest = email === "guest@gmail.com";
      salonData = {
        shopName: isGuest ? DEFAULT_SHOP_CONFIG.shopName : "ระบบร้านบาร์เบอร์ POS ของคุณ",
        shareConfig: DEFAULT_SHARE_CONFIG,
        shopConfig: {
          shopName: isGuest ? DEFAULT_SHOP_CONFIG.shopName : "ระบบร้านบาร์เบอร์ POS ของคุณ",
          pinCode: "1234",
          isPinLocked: true
        },
        barbers: isGuest ? INITIAL_BARBERS : [
          { id: "b-guide", name: "ช่างตัวอย่างสาธิต (Guide Barber)", isWorking: true, realName: "จิรภัทร รักสยาม", position: "Hairdresser" }
        ],
        products: isGuest ? INITIAL_PRODUCTS : [
          { id: "p-guide", name: "สินค้าวินเทจจัดทรงผม (Guide Product)", price: 120, isActive: true }
        ],
        vouchers: isGuest ? [
          { id: "v1", value: 20, isActive: true },
          { id: "v2", value: 50, isActive: true }
        ] : [
          { id: "v-guide", value: 50, isActive: true }
        ],
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(salonDocRef, salonData);
      
      // If guest, seed initial sales history atomically
      if (isGuest) {
        const seededSales = getSeededSales();
        const batch = writeBatch(firestoreDb);
        seededSales.forEach(sale => {
          const sRef = doc(firestoreDb, "salons", email, "sales", sale.id);
          batch.set(sRef, sale);
        });
        await batch.commit();
      }
    }
    
    // 2. Fetch sales records from subcollection
    const salesColRef = collection(firestoreDb, "salons", email, "sales");
    const salesSnap = await getDocs(salesColRef);
    const sales: SaleRecord[] = [];
    salesSnap.forEach((docSnap) => {
      sales.push(docSnap.data() as SaleRecord);
    });
    
    // Sort in memory by timestamp descending 
    sales.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    res.json({
      shopName: salonData.shopName,
      barbers: salonData.barbers || [],
      products: salonData.products || [],
      shareConfig: salonData.shareConfig || DEFAULT_SHARE_CONFIG,
      shopConfig: salonData.shopConfig || {
        shopName: salonData.shopName,
        pinCode: "1234",
        isPinLocked: true
      },
      vouchers: salonData.vouchers || [],
      payslips: salonData.payslips || [],
      sales: sales
    });
  } catch (error: any) {
    console.error("[API] Error loading server data:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Save a new sale record
app.post("/api/sales", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const newRecord = req.body;
    
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    
    const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullyQualifiedRecord = {
      ...newRecord,
      id: newRecord.id || saleId,
      timestamp: newRecord.timestamp || now.toISOString(),
      date: newRecord.date || formattedDate
    };
    
    // Write atomically to Firestore subcollection
    const saleDocRef = doc(firestoreDb, "salons", email, "sales", fullyQualifiedRecord.id);
    await setDoc(saleDocRef, fullyQualifiedRecord);
    
    // Retrieve latest consolidated list of sales to match client anticipation
    const salesColRef = collection(firestoreDb, "salons", email, "sales");
    const salesSnap = await getDocs(salesColRef);
    const sales: SaleRecord[] = [];
    salesSnap.forEach((docSnap) => {
      sales.push(docSnap.data() as SaleRecord);
    });
    
    sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({ success: true, record: fullyQualifiedRecord, sales });
  } catch (error: any) {
    console.error("[API] Error saving sale record:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2.5. Delete a specific sale record
app.delete("/api/sales/:id", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const saleId = req.params.id;

    const saleDocRef = doc(firestoreDb, "salons", email, "sales", saleId);
    await deleteDoc(saleDocRef);

    // Retrieve latest consolidated list of sales to match client anticipation
    const salesColRef = collection(firestoreDb, "salons", email, "sales");
    const salesSnap = await getDocs(salesColRef);
    const sales: SaleRecord[] = [];
    salesSnap.forEach((docSnap) => {
      sales.push(docSnap.data() as SaleRecord);
    });
    
    sales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, message: "Sale deleted", sales });
  } catch (error: any) {
    console.error("[API] Error deleting sale record:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Clear sales records
app.post("/api/sales/clear", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    
    // List and batch delete records from Firestore subcollection
    const salesColRef = collection(firestoreDb, "salons", email, "sales");
    const salesSnap = await getDocs(salesColRef);
    
    const batch = writeBatch(firestoreDb);
    salesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    
    res.json({ success: true, message: "Sales cleared", sales: [] });
  } catch (error: any) {
    console.error("[API] Error clearing sales records:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Update Barbers list
app.post("/api/barbers", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { barbers } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { barbers, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, barbers });
  } catch (error: any) {
    console.error("[API] Error saving barbers:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Update Products list
app.post("/api/products", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { products } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { products, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, products });
  } catch (error: any) {
    console.error("[API] Error saving products:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Share Configuration
app.post("/api/share-config", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { shareConfig } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { shareConfig, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, shareConfig });
  } catch (error: any) {
    console.error("[API] Error saving share config:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Update Shop Config
app.post("/api/shop-config", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { shopConfig } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { shopConfig, shopName: shopConfig.shopName, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, shopConfig });
  } catch (error: any) {
    console.error("[API] Error saving shop config:", error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Update Vouchers
app.post("/api/vouchers", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { vouchers } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { vouchers, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, vouchers });
  } catch (error: any) {
    console.error("[API] Error saving vouchers:", error);
    res.status(500).json({ error: error.message });
  }
});

// 8.1 Save or Update Payslips list
app.post("/api/payslips", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const { payslips } = req.body;
    
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, { payslips, updatedAt: new Date().toISOString() }, { merge: true });
    
    res.json({ success: true, payslips });
  } catch (error: any) {
    console.error("[API] Error saving payslips:", error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Full Factory Reset
app.post("/api/reset", async (req, res) => {
  try {
    const firestoreDb = getDB();
    const email = getEmail(req).trim().toLowerCase();
    const isGuest = email === "guest@gmail.com";
    
    const freshData = {
      shopName: isGuest ? DEFAULT_SHOP_CONFIG.shopName : "ระบบร้านบาร์เบอร์ POS ของคุณ",
      shareConfig: DEFAULT_SHARE_CONFIG,
      shopConfig: {
        shopName: isGuest ? DEFAULT_SHOP_CONFIG.shopName : "ระบบร้านบาร์เบอร์ POS ของคุณ",
        pinCode: "1234",
        isPinLocked: true
      },
      barbers: isGuest ? INITIAL_BARBERS : [
        { id: "b-guide", name: "ช่างตัวอย่างสาธิต (Guide Barber)", isWorking: true, realName: "จิรภัทร รักสยาม", position: "Hairdresser" }
      ],
      products: isGuest ? INITIAL_PRODUCTS : [
        { id: "p-guide", name: "สินค้าวินเทจจัดทรงผม (Guide Product)", price: 120, isActive: true }
      ],
      vouchers: isGuest ? [
        { id: "v1", value: 20, isActive: true },
        { id: "v2", value: 50, isActive: true }
      ] : [
        { id: "v-guide", value: 50, isActive: true }
      ],
      updatedAt: new Date().toISOString()
    };
    
    // Set master configuration document
    const salonDocRef = doc(firestoreDb, "salons", email);
    await setDoc(salonDocRef, freshData);
    
    // Clear sales records atomically
    const salesColRef = collection(firestoreDb, "salons", email, "sales");
    const salesSnap = await getDocs(salesColRef);
    
    const batch = writeBatch(firestoreDb);
    salesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    
    // Re-seed original demo sales if guest
    if (isGuest) {
      const seededSales = getSeededSales();
      seededSales.forEach(sale => {
        const sRef = doc(firestoreDb, "salons", email, "sales", sale.id);
        batch.set(sRef, sale);
      });
    }
    
    await batch.commit();
    
    res.json({ success: true, ...freshData, sales: isGuest ? getSeededSales() : [] });
  } catch (error: any) {
    console.error("[API] Error doing factory reset:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
