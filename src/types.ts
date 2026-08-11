export interface Barber {
  id: string;
  name: string;
  isWorking: boolean; // มาทำงานรึป่าว
  realName?: string;  // ชื่อจริง-นามสกุลจริง
  position?: string;  // ตำแหน่ง เช่น Branch Manager, Hairdresser
  baseSalary?: number; // ฐานเงินเดือนช่าง
}

export interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean; // ปิดสถานะสินค้า ในกรณี ของหมดหรือไม่ขายแล้ว
}

export interface Promotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // 10 for 10%
  isActive: boolean;
}

export interface Voucher {
  id: string;
  value: number; // e.g., 20, 50
  isActive: boolean;
}

export interface ChemicalPromo {
  id: string;
  name: string; // e.g., "ดัดผมเกาหลี ยืดผม ดีดฟรอย"
  originalPrice: number; // e.g., 2200
  discountedPrice: number; // e.g., 1590
  isActive: boolean;
}

export interface ShareConfig {
  haircutBarberPct: number; // e.g. 50%
  chemicalBarberPct: number; // e.g. 40%
  productBarberPct: number; // e.g. 10% (editable)
  showPromoDiscount?: boolean; // toggle showing promo discount
  promoDiscountPct?: number; // custom promotion discount percent
  defaultChemicalDiscountValue?: number;
  defaultChemicalDiscountType?: 'fixed' | 'percentage';
  showChemicalDiscountInPos?: boolean;
  enableChemicalService?: boolean; // toggle to enable/disable chemical service
  enableProductSales?: boolean; // toggle to enable/disable product sales
  enableMemberSystem?: boolean; // toggle to enable/disable member system
}

export interface MemberPackage {
  id: string;
  name: string; // e.g. "Package VIP Diamond (20,000)"
  price: number; // ราคาจ่ายจริง เช่น 18000
  credit: number; // เครดิตที่ได้รับ เช่น 20000
  bonusCredit: number; // credit - price เช่น 2000
  description?: string;
  badgeColor?: 'amber' | 'indigo' | 'emerald' | 'purple' | 'rose' | 'slate';
  isActive: boolean;
}

export interface MemberPackagePurchase {
  id: string;
  packageId?: string;
  packageName: string;
  pricePaid: number;
  creditAdded?: number;
  creditReceived?: number;
  timestamp?: string; // ISO String
  purchaseDate?: string;
  paymentMethod: 'cash' | 'transfer' | 'split';
  barberId?: string;
  barberName?: string;
  notes?: string;
}

export interface MemberUsageLog {
  id: string;
  saleId?: string;
  saleRecordId?: string;
  amount: number; // จำนวนเครดิตที่หักใช้หรือเติม
  type?: 'usage' | 'topup' | 'adjustment';
  description?: string;
  serviceSummary?: string; // e.g. "ตัดผม + ไดร์"
  timestamp?: string; // ISO String
  date?: string;
  remainingCredit?: number; // เครดิตคงเหลือหลังหัก
  balanceAfter?: number;
}

export interface Member {
  id: string;
  memberCode: string; // e.g. M-001 หรือ เบอร์โทร
  name: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  phone: string;
  creditBalance: number; // ยอดเครดิตคงเหลือ
  totalSpentCredit?: number; // ยอดเครดิตสะสมที่เคยใช้ไป
  totalTopUpAmount?: number; // ยอดเงินสด/โอนที่เคยเติมจริง
  notes?: string;
  createdAt: string;
  updatedAt: string;
  packageHistory?: MemberPackagePurchase[];
  packagePurchases?: MemberPackagePurchase[];
  usageHistory?: MemberUsageLog[];
}

export function formatMemberDisplayName(m?: { name?: string; firstName?: string; lastName?: string; nickname?: string } | null): string {
  if (!m) return '';
  const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  const nick = m.nickname ? ` (${m.nickname})` : '';
  if (fullName) {
    return `${fullName}${nick}`;
  }
  return m.name || '';
}

export interface SaleRecord {
  id: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
  barberId: string;
  barberName: string;
  customerName?: string; // ชื่อลูกค้า
  haircutPrice: number;
  chemicalPrice: number;
  productId: string | null;
  productName: string | null;
  productPrice: number;
  productQty?: number; // จำนวนสินค้าที่ขาย
  tip: number;
  paymentMethod: 'cash' | 'transfer' | 'split' | 'member_credit'; // เงินสด, เงินโอน, ผสม, เครดิตสมาชิก
  cashAmount?: number; // จำนวนเงินสด
  transferAmount?: number; // จำนวนเงินโอน
  memberCreditAmount?: number; // จำนวนเครดิตสมาชิกที่ใช้ชำระ
  useDiscountPct10: boolean; // 10% discount
  useVoucherValue: number; // 0, 20, 50
  
  // Chemical discount addition
  chemicalDiscountValue?: number;
  chemicalDiscountType?: 'fixed' | 'percentage';
  chemicalDiscountAmount?: number;
  chemicalPromoId?: string | null;
  chemicalPromoName?: string | null;
  notes?: string;
  
  // Member Integration
  memberId?: string;
  memberName?: string;
  memberCode?: string;
  memberCreditUsed?: number;

  // Package selling transaction indicator
  isPackagePurchase?: boolean;
  packageId?: string;
  packageName?: string;

  // Financial summaries
  subtotal: number; // Before discount/voucher
  discountAmount: number;
  customerPaid: number; // subtotal - discountAmount
  
  // Barber vs Shop calculation (after-hours/behind-doors)
  barberHaircutShare: number;
  barberChemicalShare: number;
  barberProductShare: number;
  barberTotalShare: number; // total for the barber (including tips)
  shopTotalShare: number; // total retained by shop (with discount absorbed by shop)
  
  // Grouped / Linked Payments (Option 2)
  groupPaymentId?: string; // รหัสกลุ่มบิลที่จ่ายร่วมกันด้วยยอดโอนเดียว
  groupPaymentCode?: string; // ชื่ออ้างอิงหรือป้ายกำกับสำหรับยอดโอนร่วม เช่น "คุณพ่อ + คุณลูก"
}

export interface ShopConfig {
  shopName: string;
  pinCode?: string;      // รหัสผ่าน 4 หรือ 6 หลัก
  isPinLocked?: boolean; // เปิดใช้งานการล็อคด้วย PIN
  logoUrl?: string;      // URL/Base64 รูปโลโก้ร้าน
  billingCutoffDay?: number; // วันตัดยอดของแต่ละเดือน (ค่าเริ่มต้นคือ 1 หมายถึงเริ่มนับวันที่ 1 ของทุกเดือน)
  primaryColor?: string;  // สีหลักของแบรนด์ เช่น #6366f1
  enableCashCounter?: boolean; // เปิดใช้งานระบบนับเงินสด
  enablePayslips?: boolean; // เปิดใช้งานระบบสลิปเงินเดือน
}

export interface Payslip {
  id: string;
  timestamp: string; // ISO String
  month: string; // YYYY-MM
  barberId: string;
  barberName: string;
  baseSalary: number;
  overtime: number;
  positionAllowance?: number; // ค่าตำแหน่ง
  deductions: number;
  socialSecurity: number;
  taxRate: number; // e.g. 3 for 3%
  note: string;
  
  // Static snapshot of calculations copied at issuance time
  haircutCommission: number;
  chemicalCommission: number;
  productCommission: number;
  tips: number;
  totalEarnings: number; // baseSalary + OT + commission + tips
  totalDeductions: number; // deductions + socialSecurity + withholding tax
  netPaid: number; // totalEarnings - totalDeductions
}

export interface Expense {
  id: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
  amount: number;
  category: 'supplies' | 'utilities' | 'rent' | 'marketing' | 'salary' | 'loans' | 'other'; // ประเภทรายจ่าย
  notes: string;
  payee: string; // ผู้เบิก / ผู้รับเงิน
  isFromDrawer?: boolean; // จ่ายด้วยเงินสดจากกะหรือเก๊ะเงินเครื่อง
}

export interface CashCounterState {
  counts: Record<string, number>;
  openingFloat: number;
  withdrawnAmount: number;
  systemSalesSource: 'today' | 'all' | 'custom';
  customExpectedSales: number;
  updatedAt?: string;
}

export interface CustomerSubscription {
  email: string;
  shopName?: string;
  status: 'approved' | 'suspended' | 'pending';
  isOnline?: boolean;
  lastActiveAt?: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}


