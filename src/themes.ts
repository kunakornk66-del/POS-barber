export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  previewColors: string[];
  bodyBg: string; // CSS background for body/root
  cardBg?: string; // Optional card container tint
  isDark?: boolean;
  cssExtra?: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'indigo',
    name: 'Modern Indigo (อินดิโก้ สไตล์โมเดิร์น)',
    description: 'โทนสีอินดิโก้ เรียบหรู คลีน สบายตา โทนมาตรฐานของแอปพลิเคชัน',
    primaryColor: '#6366f1',
    previewColors: ['#6366f1', '#4f46e5', '#312e81', '#f8fafc'],
    bodyBg: '#f8fafc',
    isDark: false
  },
  {
    id: 'vintage',
    name: 'Barber Vintage Gold (วินเทจ บาร์เบอร์)',
    description: 'โทนสีน้ำตาลคลาสสิก ทองคำ อบอุ่น สไตล์ร้านบาร์เบอร์ย้อนยุคพรีเมียม',
    primaryColor: '#d97706',
    previewColors: ['#d97706', '#b45309', '#78350f', '#fefce8'],
    bodyBg: '#fdfbf7',
    isDark: false
  },
  {
    id: 'emerald',
    name: 'Emerald Botanical (เขียวมรกต ธรรมชาติ)',
    description: 'โทนสีเขียวสปา มรกต ผ่อนคลาย สะอาดตา มินิมอล',
    primaryColor: '#10b981',
    previewColors: ['#10b981', '#059669', '#064e3b', '#f0fdf4'],
    bodyBg: '#f4fbf7',
    isDark: false
  },
  {
    id: 'rose',
    name: 'Rose Gold Elegance (โรสโกลด์ หรูหรา)',
    description: 'โทนสีชมพูโรสโกลด์ ละมุน หรูหรา เหมาะสำหรับซาลอนสไตล์พรีเมียม',
    primaryColor: '#f43f5e',
    previewColors: ['#f43f5e', '#e11d48', '#881337', '#fff1f2'],
    bodyBg: '#fff5f6',
    isDark: false
  },
  {
    id: 'dark',
    name: 'Midnight Obsidian Gold (มืดหรูหรา ดำทอง)',
    description: 'โทนสีเข้ม ลักชัวรี ดำทองคำ ถนอมสายตาสำหรับใช้งานในที่แสงน้อย',
    primaryColor: '#f59e0b',
    previewColors: ['#f59e0b', '#d97706', '#0f172a', '#1e293b'],
    bodyBg: '#0f172a',
    isDark: true,
    cssExtra: `
      body, #root {
        background-color: #0f172a !important;
        color: #f8fafc !important;
      }
      .bg-white {
        background-color: #1e293b !important;
        color: #f8fafc !important;
        border-color: #334155 !important;
      }
      .bg-slate-50, .bg-slate-50\\/50, .bg-slate-100 {
        background-color: #0f172a !important;
        color: #cbd5e1 !important;
      }
      .text-slate-800, .text-slate-900, .text-slate-700 {
        color: #f1f5f9 !important;
      }
      .text-slate-600, .text-slate-500 {
        color: #94a3b8 !important;
      }
      .border-slate-100, .border-slate-200 {
        border-color: #334155 !important;
      }
    `
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon (นีออน ไซเบอร์พังก์)',
    description: 'โทนสีม่วงนีออน ล้ำสมัย สดใส มีพลังและเอกลักษณ์โดดเด่น',
    primaryColor: '#a855f7',
    previewColors: ['#a855f7', '#9333ea', '#581c87', '#faf5ff'],
    bodyBg: '#faf7ff',
    isDark: false
  },
  {
    id: 'ocean',
    name: 'Oceanic Deep Blue (น้ำเงินคราม ทะเลลึก)',
    description: 'โทนสีฟ้าคราม สดใส ให้ความรู้สึกโปร่ง สะอาด มั่นคง ปลอดโปร่ง',
    primaryColor: '#0284c7',
    previewColors: ['#0284c7', '#0369a1', '#0c4a6e', '#f0f9ff'],
    bodyBg: '#f2f9ff',
    isDark: false
  }
];

export function getThemePreset(themeId?: string): ThemePreset {
  const found = THEME_PRESETS.find(t => t.id === themeId);
  return found || THEME_PRESETS[0]; // Default to Indigo
}
