# Master Prompt: Hair Salon Commission POS & Dashboard System (ระบบตัดยอดและปันส่วนแบ่งช่างทำผม)

หากคุณต้องการนำโครงสร้างและสเปกของโปรแกรมนี้ทั้งหมดไปเริ่มสร้างใหม่จากศูนย์บน AI Studio หรือแช็ตแนะนำบอทอื่น ๆ คุณสามารถคัดลอก **Master Prompt** ข้างล่างนี้ไปสั่งงานได้ทันทีครับ โดยจะคงประสิทธิภาพ เงื่อนไขทางคณิตศาสตร์ และดีไซน์ระดับสากลตรงตามโปรแกรมนี้ 100%

---

## 📋 Master Prompt (ภาษาไทย / Thai Version)

```markdown
คุณคือสุดยอดนักพ่นโค้ด Full-Stack Developer หน้าที่ของคุณคือสร้างเว็บแอปพลิเคชันจัดการบันทึกบิลหน้าร้าน (POS), ปันส่วนแบ่งค่าแรงคอมมิชชันช่างตัดผม, และรายงานสรุปแผงควบคุมหลังบ้านวิเคราะห์รายได้ (Dashboard & Financial Analysis) สำหรับร้านตัดผมพรีเมียม (Hair Salon & Barber Shop) โดยใช้เทคโนโลยี React (TypeScript), Tailwind CSS และ Lucide Icons

โปรดทำงานด้วยความละเอียดประณีตสูงสุด ตกแต่งหน้าตาให้ออกมาในสไตล์ "Modern Minimalist" ผนวกกับระบบจัดเก็บข้อมูลในเครื่องของผู้ใช้ (Local Storage) เพื่อเสถียรภาพในการใช้งานออฟไลน์

### 1. โครงสร้างข้อมูลหลัก (Data Types)
- **Barber (ช่างตัดผม)**: ประกอบด้วย id, name, isWorking (สถานะการมาทำงานของช่างวันนี้)
- **Product (รายการสินค้าในร้าน)**: ประกอบด้วย id, name, price, isActive (สถานะพร้อมขาย/หมด)
- **Voucher (บัตรกิฟต์การ์ดส่วนลด)**: ประกอบด้วย id, value (20 บาท, 50 บาท เป็นต้น), isActive
- **ShareConfig (สัดส่วนปันผล)**:
  - ค่าบริการตัดผม (% ช่าง เช่น เริ่มต้น 50%)
  - ค่าบริการทางเคมี ยืด/ดัด/ทำสี (% ช่าง เช่น เริ่มต้น 40%)
  - ค่าคอมขายสินค้า (% ช่าง เช่น เริ่มต้น 10%)
  - ตัวเลือกสวิตช์เปิด-ปิด โปรโมชั่นส่วนลด (showPromoDiscount) และ อัตราส่วนลดโปรโมชั่น (promoDiscountPct เช่น ส่วนลดตัดผม 10%)
- **SaleRecord (ประวัติการขาย)**: ประกอบด้วย id, timestamp, date, barberId, barberName, haircutPrice, chemicalPrice, productId, productName, productPrice, tip, paymentMethod ('cash'/'transfer'), useDiscountPct10 (boolean), useVoucherValue (number), subtotal, discountAmount, customerPaid, barberTotalShare, shopTotalShare

### 2. กฎเหล็กทางบัญชีที่ต้องถูกต้อง 100% (Critical Accounting Logic)
- **กฎการซับส่วนลด (Shop Absorbs Discounts)**: ร้านค้าจัดทำระบบโปรโมชั่นส่งเสริมการขายเพื่อช่วยเหลือช่าง ดังนั้น "ส่วนลดโปรโมชั่น % (เฉพาะส่วนลดที่คำนวณจากค่าตัดผม)" และ "คูปอง Gift Voucher" ร้านค้าจะเป็นผู้รับผิดชอบค่าใช้จ่ายส่วนนี้เองทั้งหมด (หกสุทธิจากฝั่งร้าน)
- **การคำนวณส่วนแบ่งการบริการ (Original Split Calculation)**: ส่วนแบ่งสะสมของช่างแต่ละส่วน (ค่าตัดผม, ค่าเคมี, ค่าคอมสินค้า) จะต้องคำนวณจากราคาดั้งเดิมเต็มจํานวนหน้าร้าน (Original price) ก่อนหักส่วนลดใดๆ ช่างจะยังการันตีได้รับค่าแรงเต็มสัดส่วน เปรียบเหมือนไม่มีการลดราคาเกิดขึ้น
- **ยอดลูกค้าสุทธิ (Payable Amount)**: `Payable = (ค่าตัดผม + ค่าเคมี + ค่าสินค้า) - ส่วนลดโปรโมชั่น % (คิดจากค่าตัดผมอย่างเดียว) - บัตรของขวัญ`
- **ยอดลูกค้าจ่ายจริง + ทิป (Grand Total)**: `GrandTotal = Payable + ทิปให้ช่าง`
- **ยอดส่วนแบ่งช่าง (Barber Earnings)**:
  - `Barber haircut part = Original Haircut Price * haircutBarberPct / 100`
  - `Barber chemical part = Original Chemical Price * chemicalBarberPct / 100`
  - `Barber product part = Original Product Price * productBarberPct / 100`
  - `Barber Total Net = (haircut part + chemical part + product part) + ทิปช่างเต็มจำนวน` (ช่างจะได้รับทิปเต็มๆ 100% เสมอ)
- **ยอดรายได้คงเหลือร้าน (Shop Net Revenue)**: `Shop Net = Payable - (Barber haircut part + Barber chemical part + Barber product part)`

### 3. ส่วนหน้าจอและแท็บการทำงานหลัก (Tabs Configuration - Single Page)
ออกแบบแถบนำทาง (Tabs Navigation) ด้านบน แฝงความพรีเมียมด้วยฟอนต์ซานส์สากลลื่นไหล และไอคอนที่ลงตัว:

#### แท็บเดอะบิล (Sales / Checkout Tab)
- **เลือกช่างตัดผม (Select Barber)**: แสดงรูปการ์ดชื่อช่างแบบปุ่มสลับกรอบเงาสีเข้มเมื่อเลือก เฉพาะช่างทำตัดผมที่ "มาทำงานจริงวันนี้" เท่านั้น
- **กรอกราคาค่าบริการ**:
  - `ค่าบริการตัดผม (บาท)` (ช่องกรอกพร้อมสัญลักษณ์ ฿)
  - `ค่าบริการเคมี ยืด/ดัด/ทำสี (บาท)`
  - `ขายสินค้าในร้าน` ดรอปดาวน์เลือกผลิตภัณฑ์สินค้า พร้อมแสดงราคาอัตโนมัติ
- **กรอกค่าทิปช่าง**: ช่องใส่เงินทิปให้ช่าง
- **ระบบส่วนลดขั้นสูง (Discounts & Vouchers)**:
  - ช่องติ๊กรับส่วนลดโปรโมชั่นร้าน (คิดเฉพาะค่าตัดผมตาม % ที่กำหนดในระบบ)
  - ดรอปดาวน์เลือก Gift Voucher (20/50 ฯลฯ)
- **ช่องทางชำระเงิน**: ปุ่มสลับเลือกเงินสด (💵 Cash) หรือเงินโอนสแกนคิวอาร์ (📱 Bank Transfer) พร้อมแสดงแถบรายละเอียดสีที่สะท้อนอาร์กติคสวยงาม
- **ผลลัพธ์การคำนวณแบบ Real-time**: แสดงผลยอดรวมลูกค้าพึงจ่าย และรายละเอียดส่วนปันผลช่าง/ร้าน ทันที และมีปุ่ม "บันทึกตัดบิลและรับชำระเงิน" รวดเร็ว

#### แท็บแผงควบคุม (Dashboard Tab)
- **KPI Cards สุดเท่**:
  - ยอดชำระสะสมรวม (ทั้งหมด)
  - รายได้สุทธิทางร้าน (ที่หักสัดส่วนช่างแล้ว)
  - จำนวนหัวสะสมรวม (เฉลี่ยปริมาณลูกค้าต่อวันบริการ)
  - ชำระเงินสดสะสม
  - ชำระเงินสแกนโอนสะสม
- **บัตรสรุปเงินเดือนช่าง (Barber Salary Sheet / Payroll)**: ตารางคลาสสิกแผ่กว้าง แสดงรายชื่อช่าง, จำนวนหัวที่บริการ, ผลรวมรายได้สะสมเฉพาะทางของช่างแต่ละชิ้น, จำนวนทิป, และสลีปยอดที่ต้องจ่ายโอนพนักงานช่างจริงประจำงวดสะสม
- **ประวัติธุรกรรมย้อนหลัง (Recent Billing History)**: ตารางแสดงรายการประวัติบิลเรียงราย แยกสถานะด้วยแท็กช่องทางโอน มีปุ่มลบ (Trash) บิลผิดพลาดรายรายการได้เรียลไทม์
- **ระบบส่งออกรายงานสำรองข้อมูล (Monthly Backup/Export)**: มีปุ่มส่งออกข้อมูลจำลองในรูปแบบสวยงามครบ ได้แก่
  - ดึงเป็น Excel (.xlsx) สำหรับทำบัญชีของจริง
  - ดึงส่งรายงานรายเดือน Word (.docx)
  - สร้างไฟล์ PDF สำหรับพิมพ์
  - ถ่ายรูปหน้ารายงานรวมเป็นภาพ (.png) เพื่อส่งสลิปหลักฐานทาง LINE ของพนักงาน

#### แท็บตั้งค่าระบบ (Configuration Tab)
- **จัดการรายชื่อช่างตัดผม (Manage Barbers)**: เพิ่มชื่อช่าง สลับปุ่มเปิด/ปิดทำงานวันนี้ (isWorking) เพื่อควบคุมการแสดงผลในหน้าตัดฝั่งลูกค้า
- **จัดการสินค้าพรีเมียม (Manage Products)**: เพิ่ม แก้ไขราคาสินค้า เปิด-ปิดสถานะสินค้าพร้อมขาย
- **ตั้งค่าสัดส่วนคอมมิชชันปันเงิน (% Commission Setup)**:
  - กรอกตัวเลขได้อิสระ ปรับเปอร์เซ็นต์ค่าตัดผม ร้าน/ช่าง (% Barber), ค่าเคมี (% Barber) และ ค่าบริการสินค้าคอมมิชชัน
- **ตั้งค่าสัดส่วนลดโปรโมชั่น (Promo settings)**:
  - สวิตช์ปิด/เปิดไม่แสดงปุ่มเลือกส่วนลดในหน้าชักหลัก
  - กำหนดตัวเลขสเปก % ลดราคาได้อิสระ (เริ่มต้น 10%)
- **ระบบถอนลบข้อมูลระบบและรีเซ็ต (Database & Reset Manager)**:
  - ปุ่มที่ 1: ล้างพาร์ทประวัติการขายบิลหน้าร้านสะสมทั้งหมดให้เริ่มนับใหม่เป็น 0 บิล (แต่คงค่าชื่อช่างตั้งต้น สินค้า และคูปองไว้ครบถ้วนเหมือนเดิม เหมาะสำหรับเริ่มตั้งแผงเปิดร้านรอบจริงวันนี้)
  - ปุ่มที่ 2: รีเซ็ตระบบกลับคืนค่าจากโรงงานทั้งหมด (Factory Reset / Full Reset) คืนค่าดีฟอลต์ทั้งหมด

### 4. สไตล์ความหรูหรา และ UX/UI
- เลี่ยงสีสลิงสีฉูดฉาดแบบเกมเมอร์ ให้เน้นการจับคู่สีขาวเทานวล (Soft-slate background) ตัดขอบหรูด้วยเส้นกั้นบางเฉียบสะท้อนแสง มี Negative space กว้างขวางน่ามอง สบายตา
- ตัวเลขอัตราการคำนวณเงิน ให้เลือกฟอนต์โมโนสากลตัวหนา (JetBrains Mono / Code Mono) สีใบไม้ (Emerald/Teal) หรือทองคำสัมฤทธิ์
- ทุกครั้งที่กดประมวลผล สลักเสร็จสิ้น ให้มี Micro-interaction บันทึกเสียงพรีเมียมเตือนในตัวและหน่วงเวลาการตอบสนองเชิงฟิสิกส์เล็กน้อยเพื่อการทำงานที่เสถียร
```

---

## 📋 Comprehensive Specification & Architecture (English Version for Recreating)

If you need to seed this project onto another platform or reset/re-prompt Gemini:

```markdown
Build a premium, highly responsive single-page responsive Point of Sale (POS), barber commission calculator, and financial reporting dashboard app tailored for hair salons. Use React 18 with TypeScript, Tailwind CSS, and Lucide icons. Persist all state in standard Client LocalStorage for reliable offline usage with pre-seeded data for the first view.

### A. DATA MODELS
1. Barber: `id: string, name: string, isWorking: boolean`
2. Product: `id: string, name: string, price: number, isActive: boolean`
3. ShareConfig: `haircutBarberPct: number, chemicalBarberPct: number, productBarberPct: number, showPromoDiscount: boolean, promoDiscountPct: number`
4. SaleRecord: `id, timestamp, date (YYYY-MM-DD), barberId, barberName, haircutPrice, chemicalPrice, productId, productName, productPrice, tip, paymentMethod ('cash'|'transfer'), useDiscountPct10, useVoucherValue, subtotal, discountAmount, customerPaid, barberTotalShare, shopTotalShare`

### B. CALCULATIONS AND SPLITS (CRITICAL LOGIC)
- The salon operates on a philosophy that "The shop absorbs promotional discounts". Under this logic, any shop-promoted discount or gift vouchers are absorbed exclusively by the salon's share.
- Barber earnings are ALWAYS calculated based on the original face value prices (Original Service Prices before discounts). This guarantees commission stability for barbers, which is a major incentive.
- Formulas:
  - `PayableAmount = (originalHaircutPrice + originalChemicalPrice + productPrice) - promotionDiscountAmount - voucherValue`
  - `GrandTotal = PayableAmount + tips`
  - `BarberEarningParts = (haircutPrice * Config.haircutPct / 100) + (chemicalPrice * Config.chemicalPct / 100) + (productPrice * Config.productPct / 100)`
  - `BarberTotalPaid = BarberEarningParts + Tips` (100% of tips go directly to the barber)
  - `ShopNetRevenue = PayableAmount - BarberEarningParts`

### C. VISUAL DESIGN LAYOUT & TABS
The color palette must be elegant Slate/Indigo light theme with deep charcoal highlights. Code numbers and currency amounts should render in prominent `font-mono` emerald weights.

1. **Checkout Tab (Billing Page)**:
   - High-contrast visual cards for selecting active "checked-in" barbers.
   - Elegant numerical input forms for Haircut price, Chemical perming/straightening/coloring services, and a dropdown list of products.
   - Gift Voucher/coupon selector and promotional discount toggle (reactive to global setup config).
   - Instant visual total breakdown cards with clear designations of what the customer owes versus how much the barber receives.

2. **Dashboard Tab**:
   - Polished KPI grid showing: Total Income (Gross customer payments), Net Salon Revenue (post-barber division), Total Cut counts, aggregate Cash receipts, and Transfer scanner counts.
   - A fully detailed tabular "Payroll & Barber Salary Sheets" breaking down individual barber cuts, subtotal commissions, tip summaries, and finalize payable balances.
   - Interactive transaction ledger of previous order records with single-line instant void (delete) controls.
   - Mock export download suite for .xlsx (Excel), .docx (Word), .pdf (PDF), or .png (Image slip) for record verification.

3. **Configurations Tab**:
   - Full master panel to create/delete barbers and toggle their active attendance.
   - Manage physical merchandise, active stocks, and modify retail base prices.
   - Custom form inputs to calibrate commission percentages dynamically for Haircuts, Chemicals, and Product lines.
   - DB Controls: 
     - Option A: Clear "Billing History Only" -- Resets transaction arrays to empty for a fresh salon launch today while retaining menu selections and custom barber lists.
     - Option B: Full Factory Reset -- Re-populates system arrays with initial setup templates.
```
