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

export interface BrandColorOption {
  name: string;
  hex: string;
  tag: string;
}

export const QUICK_BRAND_COLORS: BrandColorOption[] = [
  { name: 'Royal Indigo', hex: '#6366f1', tag: 'โมเดิร์นคลาสสิก' },
  { name: 'Vintage Amber', hex: '#d97706', tag: 'วินเทจบาร์เบอร์' },
  { name: 'Emerald Jade', hex: '#10b981', tag: 'ธรรมชาติ มินิมอล' },
  { name: 'Rose Quartz', hex: '#f43f5e', tag: 'ซาลอนหรูหรา' },
  { name: 'Ocean Sapphire', hex: '#0284c7', tag: 'สดใส โปร่งสบาย' },
  { name: 'Amethyst Purple', hex: '#9333ea', tag: 'นีออน ล้ำสมัย' },
  { name: 'Crimson Ruby', hex: '#dc2626', tag: 'ทรงพลัง ดึงดูด' },
  { name: 'Teal Lagoon', hex: '#0d9488', tag: 'พรีเมียมรีแลกซ์' },
  { name: 'Warm Copper', hex: '#b45309', tag: 'ไม้ธรรมชาติ อบอุ่น' },
  { name: 'Sunset Coral', hex: '#f97316', tag: 'สดชื่น มีชีวิตชีวา' },
  { name: 'Midnight Charcoal', hex: '#475569', tag: 'สโมกกี้ เรียบเท่' },
  { name: 'Electric Pink', hex: '#ec4899', tag: 'แฟชั่น โดดเด่น' },
];

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return { h: 239, s: 84, l: 67 }; // fallback indigo
  }
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return { h: 239, s: 84, l: 67 };
  }

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function generateShade(baseHex: string, targetLightness: number): string {
  try {
    const { h, s } = hexToHsl(baseHex);
    return `hsl(${h}, ${s}%, ${targetLightness}%)`;
  } catch (e) {
    return baseHex;
  }
}

export interface ShadeStep {
  shade: number;
  lightness: number;
  color: string;
  label: string;
}

export function getShadePalette(baseHex: string): ShadeStep[] {
  const steps = [
    { shade: 50, lightness: 97, label: '50 (พื้นหลังอ่อนสุด)' },
    { shade: 100, lightness: 92, label: '100 (ป้ายกำกับ/การ์ดรอง)' },
    { shade: 200, lightness: 84, label: '200 (เส้นขอบอ่อน)' },
    { shade: 300, lightness: 72, label: '300 (เส้นแบ่ง/ไฮไลท์)' },
    { shade: 400, lightness: 60, label: '400 (ไอคอน/ปุ่มรอง)' },
    { shade: 500, lightness: 50, label: '500 (สีหลักสว่าง)' },
    { shade: 600, lightness: 42, label: '600 (สีหลักมาตรฐาน / Primary)' },
    { shade: 700, lightness: 35, label: '700 (สีหลักเมื่อชี้เมาส์)' },
    { shade: 800, lightness: 26, label: '800 (หัวข้อเข้ม)' },
    { shade: 900, lightness: 18, label: '900 (ตัวหนังสือสำคัญ)' },
    { shade: 950, lightness: 10, label: '950 (พื้นหลังเข้มสุด)' },
  ];

  return steps.map(step => ({
    shade: step.shade,
    lightness: step.lightness,
    color: step.shade === 600 && /^#[0-9A-Fa-f]{6}$/.test(baseHex) ? baseHex : generateShade(baseHex, step.lightness),
    label: step.label
  }));
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
