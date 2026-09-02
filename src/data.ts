import { Barber, Product, ShareConfig, SaleRecord, ShopConfig, ChemicalPromo, MemberPackage, Member, Booking } from './types';

export const INITIAL_BARBERS: Barber[] = [
  { id: '1', name: 'เสือ', isWorking: true, realName: 'สมศักดิ์ พรหมรักษา', position: 'Branch Manager' },
  { id: '2', name: 'แทน', isWorking: true, realName: 'ปกรณ์ ดีเลิศ', position: 'Hairdresser' },
  { id: '3', name: 'บอม', isWorking: false, realName: 'ธีรพล เจริญสุข', position: 'Hairdresser' }
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'แว็กซ์เซ็ตผมวินเทจ (Pomade)', price: 250, isActive: true },
  { id: 'p2', name: 'สเปรย์จัดแต่งทรงฝุ่น', price: 180, isActive: true },
  { id: 'p3', name: 'แชมพูสูตรเย็นป้องกันผมร่วง', price: 320, isActive: true },
  { id: 'p4', name: 'ครีมนวดบำรุงเส้นผมสูตรเข้มข้น', price: 280, isActive: false } // ปิดสถานะ
];

export const INITIAL_CHEMICAL_PROMOS: ChemicalPromo[] = [
  { id: 'cp1', name: 'ดัดผมเกาหลี ยืดผม ดีดฟรอย', originalPrice: 2200, discountedPrice: 1590, isActive: true },
  { id: 'cp2', name: 'Downperm (ดาวน์เปิร์ม)', originalPrice: 1200, discountedPrice: 900, isActive: true },
  { id: 'cp3', name: 'Upperm (อัพเปิร์ม)', originalPrice: 900, discountedPrice: 600, isActive: true }
];

export const INITIAL_MEMBER_PACKAGES: MemberPackage[] = [
  {
    id: 'pkg-1',
    name: 'Package Starter (1,000)',
    price: 1000,
    credit: 1100,
    bonusCredit: 100,
    description: 'จ่ายเพียง 1,000 บาท รับเครดิตตัดผมทันที 1,100 บาท (ฟรีโบนัส +100 บ.)',
    badgeColor: 'emerald',
    isActive: true
  },
  {
    id: 'pkg-2',
    name: 'Package Bronze (3,000)',
    price: 3000,
    credit: 3400,
    bonusCredit: 400,
    description: 'จ่ายเพียง 3,000 บาท รับเครดิตทันที 3,400 บาท (ประหยัด +400 บ.)',
    badgeColor: 'amber',
    isActive: true
  },
  {
    id: 'pkg-3',
    name: 'Package Silver (5,000)',
    price: 5000,
    credit: 5800,
    bonusCredit: 800,
    description: 'จ่ายเพียง 5,000 บาท รับเครดิตทันที 5,800 บาท (ประหยัด +800 บ.)',
    badgeColor: 'indigo',
    isActive: true
  },
  {
    id: 'pkg-4',
    name: 'Package Gold (10,000)',
    price: 10000,
    credit: 11800,
    bonusCredit: 1800,
    description: 'จ่ายเพียง 10,000 บาท รับเครดิตทันที 11,800 บาท (โบนัสพิเศษ +1,800 บ.)',
    badgeColor: 'rose',
    isActive: true
  },
  {
    id: 'pkg-5',
    name: 'Package VIP Diamond (18,000)',
    price: 18000,
    credit: 20000,
    bonusCredit: 2000,
    description: 'แพ็กเกจยอดฮิตสุดคุ้ม! จ่ายเพียง 18,000 บาท ได้รับเครดิตเต็ม 20,000 บาท (ประหยัดไปถึง 2,000 บาท)',
    badgeColor: 'purple',
    isActive: true
  }
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    memberCode: 'M-001',
    name: 'คุณกิตติศักดิ์ พรหมมินทร์',
    phone: '081-234-5678',
    creditBalance: 20000,
    totalSpentCredit: 0,
    totalTopUpAmount: 18000,
    notes: 'ลูกค้า VIP สมัครแพ็กเกจ VIP Diamond 20,000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    packageHistory: [
      {
        id: 'pkghist-1',
        packageId: 'pkg-5',
        packageName: 'Package VIP Diamond (18,000)',
        pricePaid: 18000,
        creditAdded: 20000,
        timestamp: new Date().toISOString(),
        paymentMethod: 'transfer',
        barberName: 'เสือ'
      }
    ],
    usageHistory: []
  },
  {
    id: 'mem-2',
    memberCode: 'M-002',
    name: 'คุณพิชญ์พงศ์ เดชะ',
    phone: '089-987-6543',
    creditBalance: 3400,
    totalSpentCredit: 0,
    totalTopUpAmount: 3000,
    notes: 'สมาชิก Bronze Package',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    packageHistory: [
      {
        id: 'pkghist-2',
        packageId: 'pkg-2',
        packageName: 'Package Bronze (3,000)',
        pricePaid: 3000,
        creditAdded: 3400,
        timestamp: new Date().toISOString(),
        paymentMethod: 'cash',
        barberName: 'แทน'
      }
    ],
    usageHistory: []
  }
];

export const INITIAL_BOOKINGS: Booking[] = [];

export const DEFAULT_SHARE_CONFIG: ShareConfig = {
  haircutBarberPct: 50, // ช่าง 50% ร้าน 50%
  chemicalBarberPct: 40, // ช่าง 40% ร้าน 60%
  productBarberPct: 10,   // ช่าง 10% ร้าน 90% (เผื่อเป็นค่าคอมสำหรับช่างที่แนะนำสินค้า)
  showPromoDiscount: true,
  promoDiscountPct: 10,
  enableChemicalService: true,
  enableProductSales: true,
  enableMemberSystem: true,
};

export const DEFAULT_SHOP_CONFIG: ShopConfig = {
  shopName: 'Barber POS',
  primaryColor: '#6366f1',
  enableCashCounter: true,
  enablePayslips: true,
  enableBookings: true,
  pinCode: '1234',
  isPinLocked: true,
};

// Seed 30 past sales records spanning June 1st to June 9th, 2026
// This makes the Dashboard beautiful and extremely useful for accountants right away!
export function getSeededSales(): SaleRecord[] {
  const records: SaleRecord[] = [];
  
  // Let's model a series of sales
  const salesTemplates = [
    { day: 1, barberId: '1', barberName: 'เสือ', haircut: 350, chem: 0, prodId: 'p1', prodName: 'แว็กซ์เซ็ตผมวินเทจ (Pomade)', prodPrice: 250, tip: 40, pay: 'transfer', disc: false, vouch: 0 },
    { day: 1, barberId: '2', barberName: 'แทน', haircut: 350, chem: 800, prodId: null, prodName: null, prodPrice: 0, tip: 50, pay: 'cash', disc: true, vouch: 0 },
    
    { day: 2, barberId: '1', barberName: 'เสือ', haircut: 300, chem: 1200, prodId: null, prodName: null, prodPrice: 0, tip: 100, pay: 'transfer', disc: false, vouch: 20 },
    { day: 2, barberId: '2', barberName: 'แทน', haircut: 350, chem: 0, prodId: 'p2', prodName: 'สเปรย์จัดแต่งทรงฝุ่น', prodPrice: 180, tip: 20, pay: 'cash', disc: false, vouch: 50 },
    
    { day: 3, barberId: '1', barberName: 'เสือ', haircut: 350, chem: 0, prodId: null, prodName: null, prodPrice: 0, tip: 0, pay: 'cash', disc: true, vouch: 0 },
    { day: 3, barberId: '2', barberName: 'แทน', haircut: 350, chem: 1500, prodId: 'p1', prodName: 'แว็กซ์เซ็ตผมวินเทจ (Pomade)', prodPrice: 250, tip: 100, pay: 'transfer', disc: false, vouch: 0 },
    
    { day: 4, barberId: '1', barberName: 'เสือ', haircut: 400, chem: 600, prodId: null, prodName: null, prodPrice: 0, tip: 50, pay: 'transfer', disc: false, vouch: 0 },
    { day: 4, barberId: '2', barberName: 'แทน', haircut: 300, chem: 0, prodId: 'p3', prodName: 'แชมพูสูตรเย็นป้องกันผมร่วง', prodPrice: 320, tip: 20, pay: 'cash', disc: false, vouch: 20 },
    
    { day: 5, barberId: '1', barberName: 'เสือ', haircut: 350, chem: 900, prodId: 'p2', prodName: 'สเปรย์จัดแต่งทรงฝุ่น', prodPrice: 180, tip: 60, pay: 'transfer', disc: true, vouch: 50 },
    { day: 5, barberId: '2', barberName: 'แทน', haircut: 350, chem: 1000, prodId: null, prodName: null, prodPrice: 0, tip: 80, pay: 'cash', disc: false, vouch: 0 },
    
    { day: 6, barberId: '1', barberName: 'เสือ', haircut: 300, chem: 0, prodId: null, prodName: null, prodPrice: 0, tip: 10, pay: 'transfer', disc: false, vouch: 0 },
    { day: 6, barberId: '2', barberName: 'แทน', haircut: 400, chem: 2000, prodId: 'p1', prodName: 'แว็กซ์เซ็ตผมวินเทจ (Pomade)', prodPrice: 250, tip: 150, pay: 'transfer', disc: true, vouch: 0 },
    
    { day: 7, barberId: '1', barberName: 'เสือ', haircut: 350, chem: 800, prodId: null, prodName: null, prodPrice: 0, tip: 50, pay: 'transfer', disc: false, vouch: 50 },
    { day: 7, barberId: '2', barberName: 'แทน', haircut: 350, chem: 0, prodId: null, prodName: null, prodPrice: 0, tip: 40, pay: 'cash', disc: false, vouch: 0 },
    
    { day: 8, barberId: '1', barberName: 'เสือ', haircut: 300, chem: 0, prodId: 'p3', prodName: 'แชมพูสูตรเย็นป้องกันผมร่วง', prodPrice: 320, tip: 30, pay: 'cash', disc: false, vouch: 20 },
    { day: 8, barberId: '2', barberName: 'แทน', haircut: 350, chem: 500, prodId: null, prodName: null, prodPrice: 0, tip: 50, pay: 'transfer', disc: true, vouch: 0 },
    
    // TODAY (June 9th)
    { day: 9, barberId: '1', barberName: 'เสือ', haircut: 350, chem: 0, prodId: 'p1', prodName: 'แว็กซ์เซ็ตผมวินเทจ (Pomade)', prodPrice: 250, tip: 50, pay: 'cash', disc: false, vouch: 0 },
    { day: 9, barberId: '2', barberName: 'แทน', haircut: 350, chem: 1200, prodId: null, prodName: null, prodPrice: 0, tip: 80, pay: 'transfer', disc: false, vouch: 20 },
    { day: 9, barberId: '1', barberName: 'เสือ', haircut: 400, chem: 800, prodId: 'p2', prodName: 'สเปรย์จัดแต่งทรงฝุ่น', prodPrice: 180, tip: 100, pay: 'transfer', disc: true, vouch: 50 },
    { day: 9, barberId: '2', barberName: 'แทน', haircut: 300, chem: 0, prodId: null, prodName: null, prodPrice: 0, tip: 20, pay: 'cash', disc: false, vouch: 0 }
  ];

  salesTemplates.forEach((t, index) => {
    const subtotal = t.haircut + t.chem + t.prodPrice;
    const discountAmount = (t.disc ? (t.haircut * (DEFAULT_SHARE_CONFIG.promoDiscountPct ?? 10)) / 100 : 0) + t.vouch;
    const customerPaid = Math.max(0, subtotal - discountAmount) + t.tip; // dynamic cost customer pays inclusive of tip

    // Original commissions before discount (absorbing by the shop)
    const barberHaircutShare = (t.haircut * DEFAULT_SHARE_CONFIG.haircutBarberPct) / 100;
    const barberChemicalShare = (t.chem * DEFAULT_SHARE_CONFIG.chemicalBarberPct) / 100;
    const barberProductShare = (t.prodPrice * DEFAULT_SHARE_CONFIG.productBarberPct) / 100;
    const barberTotalShare = barberHaircutShare + barberChemicalShare + barberProductShare + t.tip;
    
    // Shop total share = Customer total paid - Barber portion (shop absorbs the entire discount amount)
    // Wait, let's verify if the customer total paid includes tips. Tips are fully passed to barber.
    // So Customer Paid (to register) = Subtotal - Discounts.
    // The total amount collected is (CustomerPaid). Let's say:
    // Shop collected amount = CustomerPaid - Tip. (Tip is handed 100% to barber).
    // Shop Net = CustomerPaid - Tip - Barber Haircut Share - Barber Chemical Share - Barber Product Share.
    // Shop total share = (CustomerPaid - Tip) - (BarberHaircutShare + BarberChemicalShare + BarberProductShare).
    const shopTotalShare = (Math.max(0, subtotal - discountAmount)) - (barberHaircutShare + barberChemicalShare + barberProductShare);

    const dateStr = `2026-06-0${t.day}`;
    const timestamp = `${dateStr}T${10 + (index % 8)}:${30 + (index % 25)}:00Z`;

    records.push({
      id: `seed-sale-${index}`,
      timestamp,
      date: dateStr,
      barberId: t.barberId,
      barberName: t.barberName,
      haircutPrice: t.haircut,
      chemicalPrice: t.chem,
      productId: t.prodId,
      productName: t.prodName,
      productPrice: t.prodPrice,
      tip: t.tip,
      paymentMethod: t.pay as 'cash' | 'transfer',
      useDiscountPct10: t.disc,
      useVoucherValue: t.vouch,
      subtotal,
      discountAmount,
      customerPaid,
      barberHaircutShare,
      barberChemicalShare,
      barberProductShare,
      barberTotalShare,
      shopTotalShare
    });
  });

  return records;
}
