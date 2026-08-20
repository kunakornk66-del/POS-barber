import React, { useState } from 'react';
import { Member, MemberPackage, Barber, formatMemberDisplayName } from '../types';
import { formatBaht, formatThaiDate } from '../utils';
import { 
  Users, 
  Crown, 
  Plus, 
  Search, 
  CreditCard, 
  TrendingUp, 
  Phone, 
  Calendar, 
  History, 
  Edit3, 
  Trash2, 
  Check, 
  Sparkles, 
  Gift, 
  ShieldCheck, 
  DollarSign, 
  PackageCheck,
  ChevronRight,
  Info,
  X,
  UserPlus,
  Award,
  Star,
  Zap,
  CheckCircle2,
  Layers,
  Flame
} from 'lucide-react';

export const PACKAGE_PRESETS = [
  {
    name: 'Package VIP Diamond (18,000)',
    price: 18000,
    credit: 20000,
    color: 'amber' as const,
    desc: '👑 ระดับสูงสุด: ซื้อ 18,000 รับเครดิตเต็ม 20,000 บ. (ประหยัด 2,000 บ.) • สิทธิ์จองคิว VIP • บริการเครื่องดื่มพรีเมียม',
    tierLabel: 'VIP DIAMOND'
  },
  {
    name: 'Package Gold Elite (10,000)',
    price: 10000,
    credit: 11500,
    color: 'purple' as const,
    desc: '🥇 ซื้อ 10,000 รับเครดิต 11,500 บ. (โบนัส +1,500 บ.) • สิทธิ์เลือกช่างตัดผมประจำ • ฟรีเซ็ททรง',
    tierLabel: 'GOLD ELITE'
  },
  {
    name: 'Package Silver Executive (5,000)',
    price: 5000,
    credit: 5500,
    color: 'indigo' as const,
    desc: '🥈 ซื้อ 5,000 รับเครดิต 5,500 บ. (โบนัส +500 บ.) เหมาะสำหรับลูกค้าประจำ',
    tierLabel: 'SILVER EXECUTIVE'
  },
  {
    name: 'Package Titanium Supreme (30,000)',
    price: 30000,
    credit: 35000,
    color: 'slate' as const,
    desc: '🖤 ระดับพรีเมียมเอกสิทธิ์: เติม 30,000 รับเครดิต 35,000 บ. (โบนัสพิเศษ +5,000 บ.) • ไม่จำกัดวันหมดอายุ',
    tierLabel: 'TITANIUM BLACK'
  },
  {
    name: 'Package Classic Starter (3,000)',
    price: 3000,
    credit: 3200,
    color: 'emerald' as const,
    desc: '🟢 เติม 3,000 รับเครดิต 3,200 บ. (โบนัส +200 บ.) เริ่มต้นเข้าสู่ระบบสมาชิก',
    tierLabel: 'CLASSIC MEMBER'
  }
];

export const QUICK_PRIVILEGES = [
  '✂️ ตัดผม & เซ็ททรงพรีเมียม',
  '☕ Welcome Drink พิเศษ',
  '📅 จองคิว VIP ล่วงหน้า',
  '💆 นวดสปาศีรษะผ่อนคลาย',
  '🎁 ส่วนลดทรีทเมนต์ 10%',
  '🎂 ของขวัญวันเกิดสุดพิเศษ',
  '💈 ฟรีผลิตภัณฑ์จัดแต่งทรงผม',
  '♾️ ไม่จำกัดวันหมดอายุ'
];

interface MembersTabProps {
  members: Member[];
  memberPackages: MemberPackage[];
  barbers: Barber[];
  onUpdateMembers: (newMembers: Member[]) => void;
  onUpdateMemberPackages: (newPackages: MemberPackage[]) => void;
  onSellPackageToMember: (memberId: string, pkg: MemberPackage, barberId: string, paymentMethod: 'cash' | 'transfer', notes?: string) => void;
}

export default function MembersTab({
  members,
  memberPackages,
  barbers,
  onUpdateMembers,
  onUpdateMemberPackages,
  onSellPackageToMember
}: MembersTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'packages'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedMemberForTopUp, setSelectedMemberForTopUp] = useState<Member | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMemberForHistory, setSelectedMemberForHistory] = useState<Member | null>(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<Member | null>(null);

  // Package modal state
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MemberPackage | null>(null);
  const [deletePackageConfirm, setDeletePackageConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletePkgHistoryConfirm, setDeletePkgHistoryConfirm] = useState<{
    targetMember: Member;
    idxToDelete: number;
    packageName: string;
    creditToSub: number;
    priceToSub: number;
  } | null>(null);
  const [deleteUsageHistoryConfirm, setDeleteUsageHistoryConfirm] = useState<{
    targetMember: Member;
    idxToDelete: number;
    title: string;
    amount: number;
    isTopUp: boolean;
  } | null>(null);

  // New Member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberFirstName, setNewMemberFirstName] = useState('');
  const [newMemberLastName, setNewMemberLastName] = useState('');
  const [newMemberNickname, setNewMemberNickname] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');
  const [initialPackageId, setInitialPackageId] = useState<string>('');
  const [initialBarberId, setInitialBarberId] = useState<string>('');
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<'cash' | 'transfer'>('transfer');

  // TopUp Package selection form state
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [topUpBarberId, setTopUpBarberId] = useState<string>('');
  const [topUpPaymentMethod, setTopUpPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [topUpNotes, setTopUpNotes] = useState('');

  // Edit Member form state
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberFirstName, setEditMemberFirstName] = useState('');
  const [editMemberLastName, setEditMemberLastName] = useState('');
  const [editMemberNickname, setEditMemberNickname] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberCode, setEditMemberCode] = useState('');
  const [editMemberCredit, setEditMemberCredit] = useState<number | ''>('');
  const [editMemberNotes, setEditMemberNotes] = useState('');

  // History Log Editing state
  const [editingPkgIdx, setEditingPkgIdx] = useState<number | null>(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgPrice, setEditPkgPrice] = useState<number | ''>('');
  const [editPkgCredit, setEditPkgCredit] = useState<number | ''>('');

  const [editingUsageIdx, setEditingUsageIdx] = useState<number | null>(null);
  const [editUsageSummary, setEditUsageSummary] = useState('');
  const [editUsageAmount, setEditUsageAmount] = useState<number | ''>('');

  // Package Form state
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState<number | ''>('');
  const [pkgCredit, setPkgCredit] = useState<number | ''>('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgColor, setPkgColor] = useState<'amber' | 'indigo' | 'emerald' | 'purple' | 'rose' | 'slate'>('purple');

  // Stats
  const totalMembers = members.length;
  const totalCreditInSystem = members.reduce((sum, m) => sum + (m.creditBalance || 0), 0);
  const activePackagesCount = memberPackages.filter(p => p.isActive).length;

  // Search filtered members
  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const displayName = formatMemberDisplayName(m).toLowerCase();
    return (
      displayName.includes(q) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.firstName && m.firstName.toLowerCase().includes(q)) ||
      (m.lastName && m.lastName.toLowerCase().includes(q)) ||
      (m.nickname && m.nickname.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.memberCode && m.memberCode.toLowerCase().includes(q))
    );
  });

  // Auto generate member code e.g. M-003
  const generateMemberCode = () => {
    const num = members.length + 1;
    return `M-${String(num).padStart(3, '0')}`;
  };

  // Open add member modal with clean inputs
  const handleOpenAddMemberModal = () => {
    setNewMemberName('');
    setNewMemberFirstName('');
    setNewMemberLastName('');
    setNewMemberNickname('');
    setNewMemberPhone('');
    setNewMemberCode(generateMemberCode());
    setNewMemberNotes('');
    setInitialPackageId('');
    setInitialBarberId(barbers.find(b => b.isWorking)?.id || barbers[0]?.id || '');
    setInitialPaymentMethod('transfer');
    setShowAddMemberModal(true);
  };

  // Submit Add New Member
  const handleSaveNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = newMemberFirstName.trim();
    const lastName = newMemberLastName.trim();
    const nickname = newMemberNickname.trim();
    const formattedName = formatMemberDisplayName({ firstName, lastName, nickname }) || newMemberName.trim();

    if (!formattedName && !newMemberFirstName.trim() && !newMemberName.trim()) {
      alert('กรุณากรอกชื่อสมาชิก');
      return;
    }

    const memberId = `mem-${Date.now()}`;
    const cleanCode = newMemberCode.trim() || generateMemberCode();
    const selectedPkg = initialPackageId ? memberPackages.find(p => p.id === initialPackageId) : undefined;

    const newMem: Member = {
      id: memberId,
      memberCode: cleanCode,
      name: formattedName,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      nickname: nickname || undefined,
      phone: newMemberPhone.trim(),
      creditBalance: 0,
      totalSpentCredit: 0,
      totalTopUpAmount: 0,
      notes: newMemberNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      packagePurchases: [],
      usageHistory: []
    };

    const updatedList = [newMem, ...members];
    onUpdateMembers(updatedList);

    // Record POS sale record if initial package was purchased
    if (selectedPkg) {
      onSellPackageToMember(
        memberId,
        selectedPkg,
        initialBarberId,
        initialPaymentMethod,
        `สมัครสมาชิกใหม่พร้อมซื้อ ${selectedPkg.name}`
      );
    }

    setShowAddMemberModal(false);
  };

  // Open top-up modal for selected member
  const handleOpenTopUp = (mem: Member) => {
    setSelectedMemberForTopUp(mem);
    setSelectedPackageId(memberPackages.find(p => p.isActive)?.id || '');
    setTopUpBarberId(barbers.find(b => b.isWorking)?.id || barbers[0]?.id || '');
    setTopUpPaymentMethod('transfer');
    setTopUpNotes('');
    setShowTopUpModal(true);
  };

  // Submit Top-Up Package to Member
  const handleConfirmTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForTopUp || !selectedPackageId) {
      alert('กรุณาเลือกแพ็กเกจที่ต้องการเติม');
      return;
    }

    const pkg = memberPackages.find(p => p.id === selectedPackageId);
    if (!pkg) return;

    onSellPackageToMember(
      selectedMemberForTopUp.id,
      pkg,
      topUpBarberId,
      topUpPaymentMethod,
      topUpNotes.trim() || `เติมแพ็กเกจสมาชิก ${pkg.name}`
    );

    setShowTopUpModal(false);
    setSelectedMemberForTopUp(null);
  };

  // Delete Member
  const handleDeleteMember = (id: string, name: string) => {
    setDeleteMemberConfirm({ id, name });
  };

  const confirmDeleteMember = () => {
    if (!deleteMemberConfirm) return;
    const updated = members.filter(m => m.id !== deleteMemberConfirm.id);
    onUpdateMembers(updated);
    if (selectedMemberForHistory?.id === deleteMemberConfirm.id) {
      setSelectedMemberForHistory(null);
      setShowHistoryModal(false);
    }
    setDeleteMemberConfirm(null);
  };

  // Open Edit Member Modal
  const handleOpenEditMember = (mem: Member) => {
    setSelectedMemberForEdit(mem);
    setEditMemberName(mem.name);
    setEditMemberFirstName(mem.firstName || '');
    setEditMemberLastName(mem.lastName || '');
    setEditMemberNickname(mem.nickname || '');
    setEditMemberPhone(mem.phone || '');
    setEditMemberCode(mem.memberCode);
    setEditMemberCredit(mem.creditBalance || 0);
    setEditMemberNotes(mem.notes || '');
    setShowEditMemberModal(true);
  };

  // Submit Edit Member
  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForEdit) return;

    const firstName = editMemberFirstName.trim();
    const lastName = editMemberLastName.trim();
    const nickname = editMemberNickname.trim();
    const formattedName = formatMemberDisplayName({ firstName, lastName, nickname }) || editMemberName.trim();

    if (!formattedName) {
      alert('กรุณากรอกชื่อสมาชิก');
      return;
    }

    const updated = members.map(m => {
      if (m.id === selectedMemberForEdit.id) {
        return {
          ...m,
          name: formattedName,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          nickname: nickname || undefined,
          phone: editMemberPhone.trim(),
          memberCode: editMemberCode.trim() || m.memberCode,
          creditBalance: typeof editMemberCredit === 'number' ? editMemberCredit : m.creditBalance,
          notes: editMemberNotes.trim() || undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    setShowEditMemberModal(false);
    setSelectedMemberForEdit(null);
  };

  // Delete a package purchase history entry (e.g. if subscribed twice by accident)
  const handleDeletePackagePurchaseItem = (targetMember: Member, idxToDelete: number) => {
    const pkgList = [...(targetMember.packagePurchases || targetMember.packageHistory || [])];
    if (idxToDelete < 0 || idxToDelete >= pkgList.length) return;

    const item = pkgList[idxToDelete];
    const creditToSub = item.creditReceived ?? item.creditAdded ?? 0;
    const priceToSub = item.pricePaid ?? 0;

    setDeletePkgHistoryConfirm({
      targetMember,
      idxToDelete,
      packageName: item.packageName || 'แพ็กเกจ',
      creditToSub,
      priceToSub
    });
  };

  const confirmDeletePackagePurchaseItem = () => {
    if (!deletePkgHistoryConfirm) return;
    const { targetMember, idxToDelete, creditToSub, priceToSub } = deletePkgHistoryConfirm;

    const pkgList = [...(targetMember.packagePurchases || targetMember.packageHistory || [])];
    const newPkgList = pkgList.filter((_, idx) => idx !== idxToDelete);
    const newCreditBalance = Math.max(0, (targetMember.creditBalance || 0) - creditToSub);
    const newTotalTopUp = Math.max(0, (targetMember.totalTopUpAmount || 0) - priceToSub);

    const updatedMember: Member = {
      ...targetMember,
      creditBalance: newCreditBalance,
      totalTopUpAmount: newTotalTopUp,
      packagePurchases: newPkgList,
      packageHistory: newPkgList,
      updatedAt: new Date().toISOString()
    };

    const updatedMembers = members.map(m => m.id === targetMember.id ? updatedMember : m);
    onUpdateMembers(updatedMembers);
    setSelectedMemberForHistory(updatedMember);
    setDeletePkgHistoryConfirm(null);
  };

  // Start Editing Package Purchase
  const handleStartEditPackagePurchase = (ph: any, idx: number) => {
    setEditingPkgIdx(idx);
    setEditPkgName(ph.packageName || '');
    setEditPkgPrice(ph.pricePaid ?? '');
    setEditPkgCredit(ph.creditReceived ?? ph.creditAdded ?? '');
  };

  // Save Edited Package Purchase Entry
  const handleSaveEditPackagePurchase = (targetMember: Member, idxToEdit: number) => {
    const pkgList = [...(targetMember.packagePurchases || targetMember.packageHistory || [])];
    if (idxToEdit < 0 || idxToEdit >= pkgList.length) return;

    const oldItem = pkgList[idxToEdit];
    const oldCredit = oldItem.creditReceived ?? oldItem.creditAdded ?? 0;
    const oldPrice = oldItem.pricePaid ?? 0;

    const newPrice = Number(editPkgPrice) || 0;
    const newCredit = Number(editPkgCredit) || 0;

    const diffCredit = newCredit - oldCredit;
    const diffPrice = newPrice - oldPrice;

    pkgList[idxToEdit] = {
      ...oldItem,
      packageName: editPkgName.trim() || oldItem.packageName,
      pricePaid: newPrice,
      creditReceived: newCredit,
      creditAdded: newCredit
    };

    const newCreditBalance = Math.max(0, (targetMember.creditBalance || 0) + diffCredit);
    const newTotalTopUp = Math.max(0, (targetMember.totalTopUpAmount || 0) + diffPrice);

    const updatedMember: Member = {
      ...targetMember,
      creditBalance: newCreditBalance,
      totalTopUpAmount: newTotalTopUp,
      packagePurchases: pkgList,
      packageHistory: pkgList,
      updatedAt: new Date().toISOString()
    };

    const updatedMembers = members.map(m => m.id === targetMember.id ? updatedMember : m);
    onUpdateMembers(updatedMembers);
    setSelectedMemberForHistory(updatedMember);
    setEditingPkgIdx(null);
  };

  // Delete Credit Usage Entry
  const handleDeleteUsageLogItem = (targetMember: Member, idxToDelete: number) => {
    const uList = [...(targetMember.usageHistory || [])];
    if (idxToDelete < 0 || idxToDelete >= uList.length) return;

    const item = uList[idxToDelete];
    const isTopUp = item.type === 'topup';
    const amount = item.amount || 0;
    const title = item.serviceSummary || item.description || 'รายการใช้เครดิต';

    setDeleteUsageHistoryConfirm({
      targetMember,
      idxToDelete,
      title,
      amount,
      isTopUp
    });
  };

  const confirmDeleteUsageLogItem = () => {
    if (!deleteUsageHistoryConfirm) return;
    const { targetMember, idxToDelete, amount, isTopUp } = deleteUsageHistoryConfirm;

    const uList = [...(targetMember.usageHistory || [])];
    const newUList = uList.filter((_, idx) => idx !== idxToDelete);
    let newCreditBalance = targetMember.creditBalance || 0;
    let newTotalSpent = targetMember.totalSpentCredit || 0;

    if (isTopUp) {
      newCreditBalance = Math.max(0, newCreditBalance - amount);
    } else {
      newCreditBalance = newCreditBalance + amount;
      newTotalSpent = Math.max(0, newTotalSpent - amount);
    }

    const updatedMember: Member = {
      ...targetMember,
      creditBalance: newCreditBalance,
      totalSpentCredit: newTotalSpent,
      usageHistory: newUList,
      updatedAt: new Date().toISOString()
    };

    const updatedMembers = members.map(m => m.id === targetMember.id ? updatedMember : m);
    onUpdateMembers(updatedMembers);
    setSelectedMemberForHistory(updatedMember);
    setDeleteUsageHistoryConfirm(null);
  };

  // Start Editing Usage Item
  const handleStartEditUsageItem = (u: any, idx: number) => {
    setEditingUsageIdx(idx);
    setEditUsageSummary(u.serviceSummary || u.description || '');
    setEditUsageAmount(u.amount ?? '');
  };

  // Save Edited Usage Log Entry
  const handleSaveEditUsageItem = (targetMember: Member, idxToEdit: number) => {
    const uList = [...(targetMember.usageHistory || [])];
    if (idxToEdit < 0 || idxToEdit >= uList.length) return;

    const oldItem = uList[idxToEdit];
    const oldAmount = oldItem.amount || 0;
    const newAmount = Number(editUsageAmount) || 0;
    const diffAmount = newAmount - oldAmount;

    const isTopUp = oldItem.type === 'topup';

    let newCreditBalance = targetMember.creditBalance || 0;
    let newTotalSpent = targetMember.totalSpentCredit || 0;

    if (isTopUp) {
      newCreditBalance = Math.max(0, newCreditBalance + diffAmount);
    } else {
      newCreditBalance = Math.max(0, newCreditBalance - diffAmount);
      newTotalSpent = Math.max(0, newTotalSpent + diffAmount);
    }

    uList[idxToEdit] = {
      ...oldItem,
      serviceSummary: editUsageSummary.trim() || oldItem.serviceSummary || oldItem.description,
      description: editUsageSummary.trim() || oldItem.description || oldItem.serviceSummary,
      amount: newAmount
    };

    const updatedMember: Member = {
      ...targetMember,
      creditBalance: newCreditBalance,
      totalSpentCredit: newTotalSpent,
      usageHistory: uList,
      updatedAt: new Date().toISOString()
    };

    const updatedMembers = members.map(m => m.id === targetMember.id ? updatedMember : m);
    onUpdateMembers(updatedMembers);
    setSelectedMemberForHistory(updatedMember);
    setEditingUsageIdx(null);
  };

  // Save/Edit Package
  const handleOpenPackageModal = (pkg?: MemberPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPkgName(pkg.name);
      setPkgPrice(pkg.price);
      setPkgCredit(pkg.credit);
      setPkgDesc(pkg.description || '');
      setPkgColor(pkg.badgeColor || 'purple');
    } else {
      setEditingPackage(null);
      setPkgName('');
      setPkgPrice('');
      setPkgCredit('');
      setPkgDesc('');
      setPkgColor('purple');
    }
    setShowPackageModal(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(pkgPrice);
    const creditNum = Number(pkgCredit);

    if (!pkgName.trim() || isNaN(priceNum) || priceNum <= 0 || isNaN(creditNum) || creditNum <= 0) {
      alert('กรุณากรอกชื่อแพ็กเกจ, ราคาขาย, และมูลค่าเครดิตให้ถูกต้อง');
      return;
    }

    const bonus = Math.max(0, creditNum - priceNum);

    if (editingPackage) {
      const updatedPkgs = memberPackages.map(p => {
        if (p.id === editingPackage.id) {
          return {
            ...p,
            name: pkgName.trim(),
            price: priceNum,
            credit: creditNum,
            bonusCredit: bonus,
            description: pkgDesc.trim() || `จ่าย ${formatBaht(priceNum)} ได้รับเครดิต ${formatBaht(creditNum)}`,
            badgeColor: pkgColor
          };
        }
        return p;
      });
      onUpdateMemberPackages(updatedPkgs);
    } else {
      const newPkg: MemberPackage = {
        id: `pkg-${Date.now()}`,
        name: pkgName.trim(),
        price: priceNum,
        credit: creditNum,
        bonusCredit: bonus,
        description: pkgDesc.trim() || `จ่ายเพียง ${formatBaht(priceNum)} ได้รับเครดิตเต็ม ${formatBaht(creditNum)}`,
        badgeColor: pkgColor,
        isActive: true
      };
      onUpdateMemberPackages([newPkg, ...memberPackages]);
    }

    setShowPackageModal(false);
  };

  const handleTogglePackageStatus = (id: string) => {
    const updated = memberPackages.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
    onUpdateMemberPackages(updated);
  };

  const handleDeletePackage = (id: string, name: string) => {
    setDeletePackageConfirm({ id, name });
  };

  const confirmDeletePackage = () => {
    if (!deletePackageConfirm) return;
    const updated = memberPackages.filter(p => p.id !== deletePackageConfirm.id);
    onUpdateMemberPackages(updated);
    setDeletePackageConfirm(null);
  };

  const getPackageCardTheme = (color?: string) => {
    switch (color) {
      case 'amber':
        return {
          cardBg: 'bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-amber-50',
          chipBg: 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
          accentText: 'text-amber-400',
          glowBorder: 'border-amber-500/40 hover:border-amber-400/80',
          badge: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
          crown: 'text-amber-400',
          tag: 'VIP GOLD',
          foilShine: 'from-amber-400/20 via-amber-200/5 to-transparent',
          glowRing: 'ring-amber-500/30'
        };
      case 'slate':
        return {
          cardBg: 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-slate-900 text-slate-100',
          chipBg: 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950',
          accentText: 'text-slate-200',
          glowBorder: 'border-slate-500/40 hover:border-slate-300/80',
          badge: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
          crown: 'text-slate-300',
          tag: 'BLACK TITANIUM',
          foilShine: 'from-white/15 via-white/5 to-transparent',
          glowRing: 'ring-slate-500/30'
        };
      case 'emerald':
        return {
          cardBg: 'bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-emerald-50',
          chipBg: 'bg-gradient-to-br from-emerald-300 to-teal-400 text-emerald-950',
          accentText: 'text-emerald-400',
          glowBorder: 'border-emerald-500/40 hover:border-emerald-400/80',
          badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
          crown: 'text-emerald-400',
          tag: 'IMPERIAL JADE',
          foilShine: 'from-emerald-400/20 via-emerald-200/5 to-transparent',
          glowRing: 'ring-emerald-500/30'
        };
      case 'indigo':
        return {
          cardBg: 'bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-950 text-indigo-50',
          chipBg: 'bg-gradient-to-br from-indigo-300 to-blue-400 text-indigo-950',
          accentText: 'text-indigo-300',
          glowBorder: 'border-indigo-500/40 hover:border-indigo-400/80',
          badge: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
          crown: 'text-indigo-400',
          tag: 'ROYAL SAPPHIRE',
          foilShine: 'from-indigo-400/20 via-indigo-200/5 to-transparent',
          glowRing: 'ring-indigo-500/30'
        };
      case 'rose':
        return {
          cardBg: 'bg-gradient-to-br from-rose-950 via-pink-950 to-slate-950 text-rose-50',
          chipBg: 'bg-gradient-to-br from-rose-300 to-pink-400 text-rose-950',
          accentText: 'text-rose-400',
          glowBorder: 'border-rose-500/40 hover:border-rose-400/80',
          badge: 'bg-rose-400/20 text-rose-300 border-rose-400/40',
          crown: 'text-rose-400',
          tag: 'RUBY VELVET',
          foilShine: 'from-rose-400/20 via-rose-200/5 to-transparent',
          glowRing: 'ring-rose-500/30'
        };
      default: // purple
        return {
          cardBg: 'bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-purple-50',
          chipBg: 'bg-gradient-to-br from-purple-300 to-amber-400 text-purple-950',
          accentText: 'text-purple-300',
          glowBorder: 'border-purple-500/40 hover:border-purple-400/80',
          badge: 'bg-purple-400/20 text-purple-300 border-purple-400/40',
          crown: 'text-amber-400',
          tag: 'ROYAL AMETHYST',
          foilShine: 'from-purple-400/20 via-purple-200/5 to-transparent',
          glowRing: 'ring-purple-500/30'
        };
    }
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'amber': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'indigo': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'emerald': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rose': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'slate': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Crown className="w-64 h-64 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>ระบบสมาชิก & เครดิตเติมเงิน (MEMBER CREDIT SYSTEM)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
              จัดการสมาชิกและแพ็กเกจ VIP
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ช่วยสร้าง Royalty ให้ลูกค้าร้านตัดผม เช่น ซื้อแพ็กเกจ 18,000 บาท ได้รับเครดิต 20,000 บาท (ประหยัด 2,000 บ.) 
              และระบบจะตัดยอดเครดิตคงเหลือเมื่อมาใช้บริการโดยอัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleOpenAddMemberModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/25 transition-all flex items-center space-x-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ สมัครสมาชิกใหม่</span>
            </button>
            <button
              onClick={() => handleOpenPackageModal()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มแพ็กเกจใหม่</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">จำนวนสมาชิกทั้งหมด</span>
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white mt-2 font-mono">
              {totalMembers} <span className="text-xs text-slate-400 font-sans">คน</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">รวมเครดิตคงเหลือในระบบ</span>
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
              {formatBaht(totalCreditInSystem)}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">แพ็กเกจสมาชิกที่เปิดขาย</span>
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-300">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-300 mt-2 font-mono">
              {activePackagesCount} <span className="text-xs text-slate-400 font-sans">แพ็กเกจ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigators */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === 'members'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>รายชื่อสมาชิก ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('packages')}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === 'packages'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>ตั้งค่าแพ็กเกจเติมเงิน ({memberPackages.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: MEMBERS DIRECTORY */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          
          {/* Search bar & Quick Add */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เบอร์โทร, หรือรหัส M-001..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleOpenAddMemberModal}
              className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ เพิ่มสมาชิก</span>
            </button>
          </div>

          {/* Members Table / Grid */}
          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">ยังไม่พบข้อมูลสมาชิก</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery ? 'ไม่พบสมาชิกที่ตรงกับคำค้นหาของคุณ' : 'เริ่มต้นสร้างระบบสมาชิกเพื่อดึงดูดลูกค้าและรับชำระผ่านระบบเครดิต'}
              </p>
              <button
                onClick={handleOpenAddMemberModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <UserPlus className="w-4 h-4" />
                <span>สมัครสมาชิกคนแรก</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map(mem => (
                <div 
                  key={mem.id} 
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shadow-md">
                          {(mem.nickname || mem.firstName || mem.name || 'M').charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {mem.memberCode}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">{formatMemberDisplayName(mem)}</h4>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditMember(mem)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(mem.id, formatMemberDisplayName(mem))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="ลบสมาชิก"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Phone & Package */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{mem.phone || 'ไม่ระบุเบอร์โทร'}</span>
                      </div>

                      {/* Current Active Package */}
                      {(() => {
                        const pkgList = mem.packagePurchases || mem.packageHistory || [];
                        const latestPkg = pkgList[0];
                        const hasCredit = (mem.creditBalance || 0) > 0;

                        return (
                          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <PackageCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="text-slate-500 font-semibold text-[11px] shrink-0">แพ็กเกจ:</span>
                            {latestPkg ? (
                              <span className={`font-extrabold px-2 py-0.5 rounded-md text-[11px] truncate ${
                                hasCredit 
                                  ? 'bg-indigo-100/90 text-indigo-900 border border-indigo-200/80 shadow-2xs' 
                                  : 'bg-slate-200/80 text-slate-600 border border-slate-300'
                              }`}>
                                {latestPkg.packageName} {!hasCredit && '(เครดิตหมด)'}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal italic text-[11px]">ยังไม่มีแพ็กเกจ</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Credit Balance Card */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                        <span>เครดิตคงเหลือ (Credit Balance)</span>
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        {formatBaht(mem.creditBalance || 0)}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                        <span>เคยใช้ไป: {formatBaht(mem.totalSpentCredit || 0)}</span>
                        <span>เติมสะสม: {formatBaht(mem.totalTopUpAmount || 0)}</span>
                      </div>
                    </div>

                    {mem.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 italic">
                        "{mem.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center space-x-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenTopUp(mem)}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ เติมแพ็กเกจ</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMemberForHistory(mem);
                        setShowHistoryModal(true);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      title="ดูประวัติการเติมและใช้บริการ"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>ประวัติ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PACKAGES SETTINGS */}
      {activeSubTab === 'packages' && (
        <div className="space-y-6">
          {/* Header & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-xl">
                  <Crown className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900 font-sans">
                  ตั้งค่าระดับแพ็กเกจบัตรสมาชิก VIP (VIP Membership Tier Cards)
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                กำหนดราคาจ่ายจริงและมูลค่าเครดิตในกระเป๋าของสมาชิก (เช่น ซื้อ 18,000 บ. ได้รับเครดิต 20,000 บ. ได้โบนัสฟรี +2,000 บ.)
              </p>
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleOpenPackageModal()}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ สร้างแพ็กเกจสมาชิก VIP ใหม่</span>
              </button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                เทมเพลตแพ็กเกจยอดนิยม (คลิกเพื่อสร้างทันที)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1-CLICK PRESETS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PACKAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEditingPackage(null);
                    setPkgName(preset.name);
                    setPkgPrice(preset.price);
                    setPkgCredit(preset.credit);
                    setPkgColor(preset.color);
                    setPkgDesc(preset.desc);
                    setShowPackageModal(true);
                  }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 hover:border-amber-400/50 border border-white/10 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-extrabold text-white text-[11px] group-hover:text-amber-300 transition-colors truncate">
                      {preset.tierLabel}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      +{Math.round(((preset.credit - preset.price) / preset.price) * 100)}%
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono text-slate-300">
                    {formatBaht(preset.price)} <span className="text-slate-500">→</span> <span className="text-emerald-400 font-bold">{formatBaht(preset.credit)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberPackages.map(pkg => {
              const theme = getPackageCardTheme(pkg.badgeColor);
              const bonusAmount = Math.max(0, (pkg.credit || 0) - (pkg.price || 0));
              const bonusPercent = pkg.price > 0 ? Math.round((bonusAmount / pkg.price) * 100) : 0;

              return (
                <div 
                  key={pkg.id} 
                  className={`rounded-3xl border ${theme.glowBorder} p-6 shadow-lg transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                    pkg.isActive ? `${theme.cardBg}` : 'bg-slate-900/80 opacity-60 border-slate-700'
                  }`}
                >
                  {/* Subtle Foil Background Reflection */}
                  <div className={`absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br ${theme.foilShine} blur-2xl pointer-events-none`} />

                  {/* Card Header: Chip, Crown, Actions */}
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between">
                      {/* Realistic EMV Smart Chip Graphic */}
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-10 h-7 rounded-md ${theme.chipBg} p-1 flex flex-col justify-between border border-black/20 shadow-inner`}>
                          <div className="w-full h-1 bg-black/15 rounded-full" />
                          <div className="grid grid-cols-2 gap-0.5 h-2">
                            <div className="border-r border-black/20" />
                            <div />
                          </div>
                          <div className="w-full h-0.5 bg-black/15 rounded-full" />
                        </div>
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${theme.badge}`}>
                            {theme.tag}
                          </span>
                        </div>
                      </div>

                      {/* Action Menu (Edit, Delete) */}
                      <div className="flex items-center space-x-1 bg-black/30 backdrop-blur-xs p-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => handleOpenPackageModal(pkg)}
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขแพ็กเกจ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="ลบแพ็กเกจ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Title & Crown */}
                    <div className="pt-2">
                      <div className="flex items-center space-x-1.5 text-amber-400 mb-1">
                        <Crown className="w-4 h-4 shrink-0" />
                        <span className="text-[10px] font-mono font-black tracking-widest uppercase">VIP MEMBER PASS</span>
                      </div>
                      <h4 className="text-lg font-black tracking-tight text-white line-clamp-1">
                        {pkg.name}
                      </h4>
                    </div>

                    {/* Financial Value Display Box */}
                    <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">ราคาชำระจริง (Paid):</span>
                        <span className="font-mono font-black text-white text-base">{formatBaht(pkg.price)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">เครดิตเข้ากระเป๋า (Credit):</span>
                        <span className="font-mono font-black text-emerald-400 text-lg">{formatBaht(pkg.credit)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/10 text-amber-300 font-bold">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-amber-400" />
                          โบนัสพิเศษที่ได้รับ:
                        </span>
                        <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                          +{formatBaht(bonusAmount)} (+{bonusPercent}%)
                        </span>
                      </div>
                    </div>

                    {/* Description & Privileges */}
                    {pkg.description && (
                      <p className="text-[11.5px] text-slate-200/90 leading-relaxed bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/5 font-sans">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  {/* Footer Status & Toggle */}
                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${pkg.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-300">
                        {pkg.isActive ? 'เปิดขายปกติ' : 'ปิดการขายชั่วคราว'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePackageStatus(pkg.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        pkg.isActive 
                          ? 'bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-200 border border-white/10 hover:border-rose-400/40' 
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md'
                      }`}
                    >
                      {pkg.isActive ? 'ปิดการขาย' : 'เปิดขายแพ็กเกจนี้'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW MEMBER */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-sans">สมัครสมาชิกใหม่</h3>
                  <p className="text-[10px] text-slate-400 font-mono">NEW MEMBER REGISTRATION</p>
                </div>
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMember} className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อจริง <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="กรุณากรอกชื่อ"
                    value={newMemberFirstName}
                    onChange={(e) => setNewMemberFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    placeholder="กรอกนามสกุล"
                    value={newMemberLastName}
                    onChange={(e) => setNewMemberLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="กรอกชื่อเล่น"
                    value={newMemberNickname}
                    onChange={(e) => setNewMemberNickname(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="กรอกเบอร์โทรศัพท์"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {(newMemberFirstName || newMemberNickname || newMemberLastName) && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs font-semibold flex items-center justify-between">
                  <span className="text-amber-700 font-bold">ชื่อที่จะแสดงในระบบ:</span>
                  <span className="font-extrabold text-amber-900 font-sans">
                    {formatMemberDisplayName({ firstName: newMemberFirstName, lastName: newMemberLastName, nickname: newMemberNickname })}
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสสมาชิก</label>
                <input
                  type="text"
                  value={newMemberCode}
                  onChange={(e) => setNewMemberCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-600 focus:outline-none"
                />
              </div>

              {/* Initial Package TopUp Option */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-900 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>เลือกเติมแพ็กเกจทันทีเมื่อสมัคร (ตัวเลือกเสริม)</span>
                </div>

                <div>
                  <select
                    value={initialPackageId}
                    onChange={(e) => setInitialPackageId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="">-- ยังไม่เติมแพ็กเกจ (สมัครเปิดบัญชีก่อน) --</option>
                    {memberPackages.filter(p => p.isActive).map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — จ่าย {formatBaht(pkg.price)} (ได้เครดิต {formatBaht(pkg.credit)})
                      </option>
                    ))}
                  </select>
                </div>

                {initialPackageId && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ช่างที่ขาย/บริการ</label>
                      <select
                        value={initialBarberId}
                        onChange={(e) => setInitialBarberId(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                      >
                        {barbers.map(b => (
                          <option key={b.id} value={b.id}>ช่าง {b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ช่องทางชำระเงิน</label>
                      <select
                        value={initialPaymentMethod}
                        onChange={(e) => setInitialPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                      >
                        <option value="transfer">🏦 เงินโอนธนาคาร</option>
                        <option value="cash">💵 เงินสดหน้าร้าน</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ลูกค้าประจำแนะนำมา..."
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md"
                >
                  บันทึกสมัครสมาชิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TOP-UP PACKAGE TO MEMBER */}
      {showTopUpModal && selectedMemberForTopUp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-sans">เติมแพ็กเกจสมาชิก</h3>
                  <p className="text-[10px] text-slate-400 font-mono">TOP-UP MEMBER CREDIT PACKAGE</p>
                </div>
              </div>
              <button onClick={() => setShowTopUpModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTopUp} className="p-6 space-y-4 text-xs font-sans">
              {/* Member Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                    {selectedMemberForTopUp.memberCode}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{formatMemberDisplayName(selectedMemberForTopUp)}</h4>
                  <p className="text-slate-500 text-[11px]">{selectedMemberForTopUp.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">เครดิตปัจจุบัน</span>
                  <div className="text-base font-black text-emerald-600 font-mono">
                    {formatBaht(selectedMemberForTopUp.creditBalance)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>เลือกแพ็กเกจเติมเงิน VIP <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-amber-700 font-normal">คลิกเลือกแพ็กเกจที่ลูกค้าต้องการ</span>
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {memberPackages.filter(p => p.isActive).map(pkg => {
                    const theme = getPackageCardTheme(pkg.badgeColor);
                    const bonusAmount = Math.max(0, (pkg.credit || 0) - (pkg.price || 0));
                    const bonusPercent = pkg.price > 0 ? Math.round((bonusAmount / pkg.price) * 100) : 0;
                    const isSelected = selectedPackageId === pkg.id;

                    return (
                      <label 
                        key={pkg.id} 
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40 shadow-xs' 
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="topup_package"
                            value={pkg.id}
                            checked={isSelected}
                            onChange={() => setSelectedPackageId(pkg.id)}
                            className="accent-amber-600 w-4 h-4"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${theme.badge}`}>
                                {theme.tag}
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs">{pkg.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 font-sans">
                              จ่าย <strong className="font-mono text-slate-900">{formatBaht(pkg.price)}</strong> ➔ ได้เครดิต <strong className="font-mono text-emerald-600">{formatBaht(pkg.credit)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right pl-2">
                          <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300/60 block">
                            +{formatBaht(bonusAmount)}
                          </span>
                          <span className="text-[9.5px] text-emerald-700 font-bold">
                            (+{bonusPercent}%)
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ช่างที่ขาย/บริการ</label>
                  <select
                    value={topUpBarberId}
                    onChange={(e) => setTopUpBarberId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {barbers.map(b => (
                      <option key={b.id} value={b.id}>ช่าง {b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">วิธีรับชำระเงิน (เข้า POS)</label>
                  <select
                    value={topUpPaymentMethod}
                    onChange={(e) => setTopUpPaymentMethod(e.target.value as 'cash' | 'transfer')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="transfer">🏦 เงินโอนธนาคาร</option>
                    <option value="cash">💵 เงินสดหน้าร้าน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุบันทึก</label>
                <input
                  type="text"
                  placeholder="เช่น เติมเครดิตแพ็กเกจประจำเดือน..."
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black shadow-md"
                >
                  ยืนยันเติมเครดิตสมาชิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MEMBER HISTORY LOG */}
      {showHistoryModal && selectedMemberForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-500 text-white rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-sans">ประวัติของ {formatMemberDisplayName(selectedMemberForHistory)}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">CODE: {selectedMemberForHistory.memberCode}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
              {/* Member Stat Header */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500">เครดิตปัจจุบัน</span>
                  <div className="text-base font-extrabold text-emerald-600 font-mono">{formatBaht(selectedMemberForHistory.creditBalance)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">เคยใช้ไปรวม</span>
                  <div className="text-base font-extrabold text-slate-800 font-mono">{formatBaht(selectedMemberForHistory.totalSpentCredit || 0)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">เติมเงินสะสม</span>
                  <div className="text-base font-extrabold text-indigo-600 font-mono">{formatBaht(selectedMemberForHistory.totalTopUpAmount || 0)}</div>
                </div>
              </div>

              {/* Package Top-up Purchases History */}
              <div className="space-y-3">
                {(() => {
                  const pkgList = selectedMemberForHistory.packageHistory || selectedMemberForHistory.packagePurchases || [];
                  return (
                    <>
                      <h4 className="font-extrabold text-slate-900 flex items-center space-x-1.5 text-xs">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span>ประวัติการซื้อ/เติมแพ็กเกจ ({pkgList.length} ครั้ง)</span>
                      </h4>

                      {pkgList.length === 0 ? (
                        <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl">ยังไม่มีประวัติการซื้อแพ็กเกจ</p>
                      ) : (
                        <div className="space-y-2">
                          {pkgList.map((ph, idx) => {
                            const rawTs = ph.timestamp || ph.purchaseDate || '';
                            const datePart = rawTs ? String(rawTs).split('T')[0] : '';
                            const creditVal = ph.creditAdded ?? ph.creditReceived ?? 0;
                            const isEditing = editingPkgIdx === idx;

                            if (isEditing) {
                              return (
                                <div key={ph.id || idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                                  <div className="font-bold text-slate-800 text-xs">แก้ไขข้อมูลแพ็กเกจที่เติม</div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">ชื่อแพ็กเกจ</label>
                                      <input
                                        type="text"
                                        value={editPkgName}
                                        onChange={e => setEditPkgName(e.target.value)}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">ราคาจ่ายจริง (บ.)</label>
                                      <input
                                        type="number"
                                        value={editPkgPrice}
                                        onChange={e => setEditPkgPrice(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">เครดิตที่ได้ (Cr.)</label>
                                      <input
                                        type="number"
                                        value={editPkgCredit}
                                        onChange={e => setEditPkgCredit(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end space-x-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPkgIdx(null)}
                                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditPackagePurchase(selectedMemberForHistory, idx)}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs"
                                    >
                                      บันทึก
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={ph.id || idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between">
                                <div>
                                  <div className="font-extrabold text-slate-900">{ph.packageName}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    วันที่: {datePart ? formatThaiDate(datePart) : '-'} • ช่าง: {ph.barberName || 'ร้าน'} ({ph.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'})
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <span className="text-xs font-mono font-black text-emerald-600">+{formatBaht(creditVal)} Cr.</span>
                                    <div className="text-[10px] text-slate-400">จ่าย {formatBaht(ph.pricePaid)} บ.</div>
                                  </div>
                                  <div className="flex items-center space-x-1 pl-2 border-l border-amber-200/80">
                                    <button
                                      onClick={() => handleStartEditPackagePurchase(ph, idx)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                      title="แก้ไขประวัตินี้"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePackagePurchaseItem(selectedMemberForHistory, idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="ลบประวัติสมัครแพ็กเกจ (กรณีสมัครซ้ำ)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Credit Usage Log History */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {(() => {
                  const uList = selectedMemberForHistory.usageHistory || [];
                  return (
                    <>
                      <h4 className="font-extrabold text-slate-900 flex items-center space-x-1.5 text-xs">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        <span>ประวัติการใช้เครดิตตัดบริการ ({uList.length} ครั้ง)</span>
                      </h4>

                      {uList.length === 0 ? (
                        <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl">ยังไม่มีประวัติการหักใช้เครดิต</p>
                      ) : (
                        <div className="space-y-2">
                          {uList.map((u, idx) => {
                            const rawTs = u.timestamp || u.date || '';
                            const datePart = rawTs ? String(rawTs).split('T')[0] : '';
                            const title = u.serviceSummary || u.description || 'ค่าบริการตัดผม/เคมี';
                            const remaining = u.remainingCredit ?? u.balanceAfter ?? 0;
                            const isTopUp = u.type === 'topup';
                            const isEditing = editingUsageIdx === idx;

                            if (isEditing) {
                              return (
                                <div key={u.id || idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                                  <div className="font-bold text-slate-800 text-xs">แก้ไขบันทึกประวัติการใช้เครดิต</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">รายการ/บริการ</label>
                                      <input
                                        type="text"
                                        value={editUsageSummary}
                                        onChange={e => setEditUsageSummary(e.target.value)}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">จำนวนเครดิต (Cr.)</label>
                                      <input
                                        type="number"
                                        value={editUsageAmount}
                                        onChange={e => setEditUsageAmount(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-indigo-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end space-x-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingUsageIdx(null)}
                                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditUsageItem(selectedMemberForHistory, idx)}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs"
                                    >
                                      บันทึก
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={u.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                                <div>
                                  <div className="font-extrabold text-slate-900">{title}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    วันที่: {datePart ? formatThaiDate(datePart) : '-'}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <span className={`text-xs font-mono font-black ${isTopUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isTopUp ? '+' : '-'}{formatBaht(u.amount)} Cr.
                                    </span>
                                    <div className="text-[10px] text-slate-400">คงเหลือ: {formatBaht(remaining)}</div>
                                  </div>
                                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                                    <button
                                      onClick={() => handleStartEditUsageItem(u, idx)}
                                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                      title="แก้ไขประวัตินี้"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUsageLogItem(selectedMemberForHistory, idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="ลบประวัติการใช้เครดิต"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT MEMBER */}
      {showEditMemberModal && selectedMemberForEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-extrabold font-sans">แก้ไขข้อมูลสมาชิก</h3>
              </div>
              <button onClick={() => setShowEditMemberModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อจริง <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="กรุณากรอกชื่อ"
                    value={editMemberFirstName}
                    onChange={(e) => setEditMemberFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    placeholder="กรอกนามสกุล"
                    value={editMemberLastName}
                    onChange={(e) => setEditMemberLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    placeholder="กรอกชื่อเล่น"
                    value={editMemberNickname}
                    onChange={(e) => setEditMemberNickname(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="กรอกเบอร์โทรศัพท์"
                    value={editMemberPhone}
                    onChange={(e) => setEditMemberPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs font-semibold flex items-center justify-between">
                <span className="text-amber-700 font-bold">ชื่อที่จะแสดงในระบบ:</span>
                <span className="font-extrabold text-amber-900 font-sans">
                  {formatMemberDisplayName({ firstName: editMemberFirstName, lastName: editMemberLastName, nickname: editMemberNickname }) || editMemberName}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">รหัสสมาชิก</label>
                <input
                  type="text"
                  value={editMemberCode}
                  onChange={(e) => setEditMemberCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">เครดิตคงเหลือปัจจุบัน (แก้ไขโดยตรง)</label>
                <input
                  type="number"
                  value={editMemberCredit}
                  onChange={(e) => setEditMemberCredit(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl font-mono font-bold text-emerald-700 text-sm"
                  placeholder="จำนวนเครดิต..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุ</label>
                <textarea
                  rows={2}
                  value={editMemberNotes}
                  onChange={(e) => setEditMemberNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditMemberModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-md"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE / EDIT PACKAGE */}
      {showPackageModal && (() => {
        const previewTheme = getPackageCardTheme(pkgColor);
        const priceVal = Number(pkgPrice) || 0;
        const creditVal = Number(pkgCredit) || 0;
        const bonusVal = Math.max(0, creditVal - priceVal);
        const bonusPercent = priceVal > 0 ? Math.round((bonusVal / priceVal) * 100) : 0;

        const handleAddPrivilege = (privilegeText: string) => {
          if (!pkgDesc) {
            setPkgDesc(privilegeText);
          } else if (!pkgDesc.includes(privilegeText)) {
            setPkgDesc(`${pkgDesc} • ${privilegeText}`);
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col my-auto max-h-[92vh]">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-950 via-neutral-900 to-slate-950 text-white p-5 sm:px-6 flex items-center justify-between border-b border-amber-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center text-slate-950">
                    <Crown className="w-5 h-5 fill-slate-950" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black font-sans tracking-tight text-white flex items-center gap-2">
                      {editingPackage ? 'แก้ไขระดับแพ็กเกจสมาชิก VIP' : 'สร้างแพ็กเกจสมาชิก VIP ระดับใหม่'}
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                        {previewTheme.tag}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                      VIP MEMBERSHIP TIER CONFIGURATOR
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPackageModal(false)} 
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto font-sans text-xs">
                
                {/* 1. REAL-TIME LIVE VIP MEMBERSHIP CARD PREVIEW */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      ตัวอย่างบัตรสมาชิกจริง (Live Card Preview)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">ภาพจำลองบัตรของลูกค้า</span>
                  </div>

                  <div className={`rounded-3xl border ${previewTheme.glowBorder} p-5 sm:p-6 shadow-xl transition-all ${previewTheme.cardBg} relative overflow-hidden`}>
                    {/* Background Foil Glow */}
                    <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br ${previewTheme.foilShine} blur-xl pointer-events-none`} />

                    <div className="relative z-10 space-y-3.5">
                      {/* Top row: EMV Chip & Crown */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-9 h-6.5 rounded-md ${previewTheme.chipBg} p-1 flex flex-col justify-between border border-black/20 shadow-inner`}>
                            <div className="w-full h-0.5 bg-black/20 rounded-full" />
                            <div className="grid grid-cols-2 gap-0.5 h-1.5">
                              <div className="border-r border-black/20" />
                              <div />
                            </div>
                            <div className="w-full h-0.5 bg-black/20 rounded-full" />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${previewTheme.badge}`}>
                            {previewTheme.tag}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-amber-400 font-mono text-[10px] font-black">
                          <Crown className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>VIP PASS</span>
                        </div>
                      </div>

                      {/* Middle row: Tier Name */}
                      <div>
                        <p className="text-[10px] font-mono text-slate-300/80 uppercase tracking-widest">MEMBERSHIP PACKAGE</p>
                        <h4 className="text-lg sm:text-xl font-black text-white tracking-tight line-clamp-1">
                          {pkgName || 'ชื่อแพ็กเกจสมาชิก VIP...'}
                        </h4>
                      </div>

                      {/* Bottom values display */}
                      <div className="grid grid-cols-2 gap-3 bg-black/35 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">ราคาชำระจริง (Paid)</span>
                          <span className="text-base sm:text-lg font-black text-white font-mono">
                            {priceVal > 0 ? formatBaht(priceVal) : '฿0'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">เครดิตที่ได้รับ (Credit)</span>
                          <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                            {creditVal > 0 ? formatBaht(creditVal) : '฿0'}
                          </span>
                        </div>
                      </div>

                      {/* Live Bonus Savings Pill */}
                      {bonusVal > 0 && (
                        <div className="flex items-center justify-between bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-300 text-[11px] font-bold">
                          <span className="flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            โบนัสพิเศษที่ลูกค้าได้รับฟรี:
                          </span>
                          <span className="font-mono font-black">
                            +{formatBaht(bonusVal)} (+{bonusPercent}%)
                          </span>
                        </div>
                      )}

                      {pkgDesc && (
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-2">
                          {pkgDesc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. 1-CLICK LUXURY PRESETS */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                    ⚡ เลือกจากเทมเพลตมาตรฐาน (1-Click Presets)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PACKAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPkgName(preset.name);
                          setPkgPrice(preset.price);
                          setPkgCredit(preset.credit);
                          setPkgColor(preset.color);
                          setPkgDesc(preset.desc);
                        }}
                        className="p-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 group-hover:text-amber-900">
                          <span className="truncate">{preset.tierLabel}</span>
                          <span className="text-[10px] font-mono text-emerald-600 font-extrabold">
                            +{Math.round(((preset.credit - preset.price) / preset.price) * 100)}%
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          จ่าย {formatBaht(preset.price)} → ได้ {formatBaht(preset.credit)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSavePackage} className="space-y-4 pt-1">
                  {/* Package Name Input */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      ชื่อระดับแพ็กเกจสมาชิก <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น Package VIP Diamond (18,000)"
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs transition-all"
                    />
                  </div>

                  {/* Pricing Inputs (2 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1.5">
                        💳 ราคาชำระจริง (จ่ายเงินสด/โอน) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="เช่น 18000"
                          value={pkgPrice}
                          onChange={(e) => setPkgPrice(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-xs transition-all"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs pointer-events-none">บาท</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1.5">
                        💰 มูลค่าเครดิตในกระเป๋า (ได้เครดิตเต็ม) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="เช่น 20000"
                          value={pkgCredit}
                          onChange={(e) => setPkgCredit(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs transition-all"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 font-bold text-xs pointer-events-none">บาท</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Card (Instant Math) */}
                  {priceVal > 0 && creditVal > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                          สรุปผลประโยชน์ที่สมาชิกได้รับ (Member Value):
                        </span>
                        <p className="text-xs text-emerald-950 font-bold">
                          จ่าย <span className="font-mono">{formatBaht(priceVal)}</span> ➔ รับเครดิต <span className="font-mono font-black text-emerald-700">{formatBaht(creditVal)}</span>
                        </p>
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs text-right">
                        <span className="text-[10px] text-slate-500 font-medium block">โบนัสแถมฟรี (Bonus)</span>
                        <span className="font-mono font-black text-emerald-600 text-sm">
                          +{formatBaht(bonusVal)} ({bonusPercent}%)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card Theme Color Selector */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      🎨 ธีมสีระดับบัตร VIP (Card Theme)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'amber', label: '👑 Royal Gold', bg: 'bg-amber-500', desc: 'สีทองคำหรูหรา' },
                        { id: 'purple', label: '🟣 Royal Amethyst', bg: 'bg-purple-600', desc: 'สีม่วงราชวงศ์' },
                        { id: 'slate', label: '🖤 Black Titanium', bg: 'bg-slate-900', desc: 'สีดำไททาเนียม' },
                        { id: 'emerald', label: '🟢 Imperial Jade', bg: 'bg-emerald-600', desc: 'สีเขียวมรกต' },
                        { id: 'indigo', label: '🔵 Royal Sapphire', bg: 'bg-indigo-600', desc: 'สีน้ำเงินแซฟไฟร์' },
                        { id: 'rose', label: '🔴 Ruby Velvet', bg: 'bg-rose-600', desc: 'สีแดงทับทิม' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPkgColor(t.id as any)}
                          className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                            pkgColor === t.id 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full ${t.bg} shrink-0 border border-white/40`} />
                          <div className="truncate">
                            <div className="font-bold text-[11px] leading-tight truncate">{t.label}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Privileges Fast-Selector */}
                  <div className="space-y-1.5">
                    <span className="block font-bold text-slate-800">
                      🎁 คลิกเพื่อเพิ่มสิทธิประโยชน์ VIP ลงในคำอธิบาย:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PRIVILEGES.map((privilege, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleAddPrivilege(privilege)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 rounded-lg text-[10.5px] font-semibold border border-slate-200 hover:border-amber-300 transition-all cursor-pointer"
                        >
                          + {privilege}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description / Notes */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">คำอธิบายและสิทธิประโยชน์เพิ่มเติม</label>
                    <textarea
                      rows={2}
                      placeholder="เช่น ซื้อ 18,000 รับเครดิตเต็ม 20,000 บาท • สิทธิ์จองคิว VIP • เครื่องดื่ม Welcome Drink..."
                      value={pkgDesc}
                      onChange={(e) => setPkgDesc(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-3 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPackageModal(false)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all cursor-pointer text-xs"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer text-xs flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <Crown className="w-4 h-4 fill-slate-950" />
                      <span>✨ บันทึกแพ็กเกจ VIP นี้</span>
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: DELETE PACKAGE CONFIRM POPUP */}
      {deletePackageConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-extrabold font-sans">ยืนยันการลบแพ็กเกจสมาชิก</h3>
              </div>
              <button onClick={() => setDeletePackageConfirm(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-800 text-sm font-sans">
              <p className="font-semibold leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบแพ็กเกจ <span className="font-black text-rose-600">"{deletePackageConfirm.name}"</span> ออกจากระบบ?
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                * การลบแพ็กเกจจะไม่กระทบกับเครดิตของสมาชิกเดิมที่เคยซื้อแพ็กเกจนี้ไปแล้ว
              </p>
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletePackageConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePackage}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  ยืนยันลบแพ็กเกจ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: DELETE MEMBER CONFIRM POPUP */}
      {deleteMemberConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-extrabold font-sans">ยืนยันการลบลูกค้าสมาชิก</h3>
              </div>
              <button onClick={() => setDeleteMemberConfirm(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-800 text-sm font-sans">
              <p className="font-semibold leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก <span className="font-black text-rose-600">"{deleteMemberConfirm.name}"</span> ออกจากระบบ?
              </p>
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                ⚠️ ข้อมูลสมาชิก เครดิตคงเหลือ และประวัติย้อนหลังทั้งหมดของสมาชิกท่านนี้จะถูกลบทันที
              </p>
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteMemberConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMember}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  ยืนยันลบสมาชิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: DELETE PACKAGE PURCHASE HISTORY ITEM CONFIRM POPUP */}
      {deletePkgHistoryConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-extrabold font-sans">ยืนยันลบประวัติการเติมแพ็กเกจ</h3>
              </div>
              <button onClick={() => setDeletePkgHistoryConfirm(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-800 text-sm font-sans">
              <p className="font-semibold leading-relaxed">
                คุณต้องการลบประวัติการสมัครแพ็กเกจ <span className="font-black text-rose-600">"{deletePkgHistoryConfirm.packageName}"</span> ของ {formatMemberDisplayName(deletePkgHistoryConfirm.targetMember)} ออกใช่หรือไม่?
              </p>
              <div className="text-xs text-amber-900 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-1 font-semibold">
                <p>• เครดิตคงเหลือของสมาชิกจะถูกปรับลดลง: <span className="font-mono font-bold text-rose-600">-{formatBaht(deletePkgHistoryConfirm.creditToSub)} Cr.</span></p>
                <p>• ยอดเติมเงินสะสมจะถูกปรับลดลง: <span className="font-mono font-bold text-rose-600">-{formatBaht(deletePkgHistoryConfirm.priceToSub)} บาท</span></p>
              </div>
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeletePkgHistoryConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePackagePurchaseItem}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  ยืนยันลบประวัตินี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: DELETE CREDIT USAGE HISTORY ITEM CONFIRM POPUP */}
      {deleteUsageHistoryConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
            <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-extrabold font-sans">ยืนยันลบประวัติการใช้เครดิต</h3>
              </div>
              <button onClick={() => setDeleteUsageHistoryConfirm(null)} className="text-white/80 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-slate-800 text-sm font-sans">
              <p className="font-semibold leading-relaxed">
                คุณต้องการลบประวัติรายการ <span className="font-black text-rose-600">"{deleteUsageHistoryConfirm.title}"</span> ของ {formatMemberDisplayName(deleteUsageHistoryConfirm.targetMember)} ออกใช่หรือไม่?
              </p>
              <div className="text-xs text-indigo-900 bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200 space-y-1 font-semibold">
                {deleteUsageHistoryConfirm.isTopUp ? (
                  <p>• รายการเติมเครดิต +{formatBaht(deleteUsageHistoryConfirm.amount)} Cr. (ระบบจะทำการปรับลดเครดิตคงเหลือลง)</p>
                ) : (
                  <p>• รายการตัดเครดิต -{formatBaht(deleteUsageHistoryConfirm.amount)} Cr. (ระบบจะทำการคืนเครดิต <span className="font-mono font-bold text-emerald-600">+{formatBaht(deleteUsageHistoryConfirm.amount)} Cr.</span> กลับเข้ากระเป๋าของสมาชิก)</p>
                )}
              </div>
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteUsageHistoryConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUsageLogItem}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  ยืนยันลบประวัตินี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
