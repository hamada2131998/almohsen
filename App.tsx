
import React, { useState, useEffect, useCallback } from 'react';
import { Branch, UserRole, Transaction, User, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import ReportView from './components/ReportView';
import { LayoutDashboard, Receipt, FilePieChart, LogOut, UserCircle, Settings, RefreshCw, DatabaseZap, Info, CheckCircle2, AlertTriangle, Send, Cloud, Copy, Link as LinkIcon } from 'lucide-react';

const INITIAL_USERS: User[] = [
  { id: '1', name: 'ابو اديب (مندوب)', role: UserRole.DELEGATE, branch: Branch.DELEGATE_1, password: '1111' },
  { id: '2', name: 'معتز (مندوب)', role: UserRole.DELEGATE, branch: Branch.DELEGATE_2, password: '2222' },
  { id: '3', name: 'عصام (مندوب)', role: UserRole.DELEGATE, branch: Branch.DELEGATE_3, password: '3333' },
  { id: '4', name: 'اسلام (المحاسب)', role: UserRole.ACCOUNTANT, password: '4444' },
  { id: '5', name: 'المدير العام', role: UserRole.ADMIN, password: '5555' },
];

// يمكنك وضع بيانات الربط هنا لتثبيتها للأبد
const DEFAULTS = {
  sheetUrl: 'https://script.google.com/macros/s/AKfycbytCr-ZsvUC1kBPIw5l68fFh5fIKFKBOn9kjZqsR6f2IHGw1PT2wO-H6fqMww4GgC_1iw/exec',
  tgToken: '8669512643:AAFZ2II9XvFxFckhDoyxb-VYgkYvvYZ4FEo',
  tgChatId: '5673659098'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users_mohsen');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [selectedLoginUser, setSelectedLoginUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entry' | 'reports' | 'settings'>('dashboard');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'loading'} | null>(null);
  
  const [sheetUrl, setSheetUrl] = useState<string>(() => localStorage.getItem('google_sheet_url_mohsen') || DEFAULTS.sheetUrl);
  const [tgToken, setTgToken] = useState<string>(() => localStorage.getItem('tg_token_mohsen') || DEFAULTS.tgToken);
  const [tgChatId, setTgChatId] = useState<string>(() => localStorage.getItem('tg_chat_id_mohsen') || DEFAULTS.tgChatId);
  
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToast({ message, type });
    if (type !== 'loading') setTimeout(() => setToast(null), 3500);
  };

  // ميزة الإعداد التلقائي عبر الرابط
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s'); // Sheet URL
    const t = params.get('t'); // TG Token
    const c = params.get('c'); // TG Chat ID

    if (s || t || c) {
      if (s) { setSheetUrl(decodeURIComponent(s)); localStorage.setItem('google_sheet_url_mohsen', decodeURIComponent(s)); }
      if (t) { setTgToken(decodeURIComponent(t)); localStorage.setItem('tg_token_mohsen', decodeURIComponent(t)); }
      if (c) { setTgChatId(decodeURIComponent(c)); localStorage.setItem('tg_chat_id_mohsen', decodeURIComponent(c)); }
      
      showToast('تم تحديث الإعدادات السحابية من الرابط بنجاح', 'success');
      // تنظيف الرابط للحفاظ على الخصوصية
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!sheetUrl) return;
    setIsSyncing(true);
    setErrorLog(null);
    try {
      const response = await fetch(`${sheetUrl}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`فشل الاتصال بالشيت`);
      const rawData = await response.json();
      
      if (!Array.isArray(rawData)) {
        setErrorLog("تنسيق الشيت غير صحيح. تأكد من نشر السكربت كـ Web App.");
        return;
      }

      const formatted: Transaction[] = rawData.map((item: any, index: number) => {
        const val = (ks: string[]) => {
          for(let k of ks) {
            if(item[k] !== undefined) return item[k];
            if(item[k.toLowerCase()] !== undefined) return item[k.toLowerCase()];
          }
          return null;
        };

        const typeStr = String(val(['type', 'النوع', 'typeStr']) || '').toUpperCase();
        let type = TransactionType.EXPENSE;
        if (typeStr.includes('RECEIPT') || typeStr.includes('استلام') || typeStr.includes('عهدة')) type = TransactionType.CUSTODY_RECEIPT;
        else if (typeStr.includes('FEED') || typeStr.includes('FUND') || typeStr.includes('تغذية')) type = TransactionType.FEEDING;

        const d = new Date(val(['timestamp', 'التاريخ', 'date']) || Date.now());
        
        return {
          id: String(val(['id']) || index),
          description: String(val(['details', 'البيان', 'description']) || 'بدون بيان'),
          branch: String(val(['branchName', 'الفرع', 'branch']) || 'غير محدد'),
          amount: parseFloat(String(val(['amount', 'القيمة']) || '0').replace(/,/g, '')),
          type: type,
          date: d.toLocaleDateString('en-CA'),
          timestamp: d.getTime() || index,
          createdBy: String(val(['userName', 'الموظف', 'user']) || 'نظام'),
          verified: String(val(['verified', 'الحالة'])).toLowerCase() === 'true',
          attachment: (item.attachment && item.attachment.length > 50) ? item.attachment : null
        };
      }).filter(t => !isNaN(t.amount)).sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(formatted);
    } catch (error: any) {
      setErrorLog(`خطأ مزامنة: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [sheetUrl]);

  useEffect(() => {
    if (sheetUrl && currentUser) fetchTransactions();
  }, [sheetUrl, currentUser, fetchTransactions]);

  const sendTelegramNotification = async (tx: any) => {
    if (!tgToken || !tgChatId) return;
    const message = `🔔 *حركة مالية جديدة - أسواق المحسن*\n-------------------------\n📍 *المندوب:* ${tx.branch}\n👤 *الموظف:* ${tx.createdBy}\n💰 *المبلغ:* ${tx.amount} ر.س\n🏷️ *النوع:* ${tx.type}\n📝 *البيان:* ${tx.description}\n📅 *التاريخ:* ${tx.date}\n-------------------------\n✅ تم الرفع للسحابة بنجاح`;
    try {
      if (tx.attachment) {
        const byteString = atob(tx.attachment.split(',')[1]);
        const mimeString = tx.attachment.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const formData = new FormData();
        formData.append('chat_id', tgChatId);
        formData.append('photo', new Blob([ab], {type: mimeString}), 'invoice.jpg');
        formData.append('caption', message);
        formData.append('parse_mode', 'Markdown');
        await fetch(`https://api.telegram.org/bot${tgToken}/sendPhoto`, { method: 'POST', body: formData });
      } else {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' })
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddTransaction = async (txData: any) => {
    showToast('جاري الحفظ والمزامنة...', 'loading');
    try {
      await fetch(sheetUrl, {
        method: 'POST', 
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', data: { ...txData } })
      });
      await sendTelegramNotification(txData);
      showToast('تم التسجيل بنجاح');
      setActiveTab('dashboard');
      setTimeout(fetchTransactions, 2000);
    } catch (e) { showToast('خطأ في الشبكة', 'error'); }
  };

  // وظيفة لتغيير حالة اعتماد العملية (Toggle Verification)
  const toggleVerification = async (id: string) => {
    if (!sheetUrl) return;
    showToast('جاري تحديث الحالة...', 'loading');
    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', id })
      });
      
      // تحديث محلي سريع لتحسين تجربة المستخدم
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, verified: !t.verified } : t));
      
      showToast('تم تحديث حالة الاعتماد');
      setTimeout(fetchTransactions, 2000);
    } catch (e) {
      showToast('فشل في تحديث الحالة', 'error');
    }
  };

  const updateUserPassword = (userId: string, pass: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, password: pass } : u);
    setUsers(updated);
    localStorage.setItem('users_mohsen', JSON.stringify(updated));
    showToast('تم تحديث كلمة المرور بنجاح');
    setEditingUser(null);
    setNewPassword('');
  };

  const generateInviteLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (sheetUrl) params.set('s', sheetUrl);
    if (tgToken) params.set('t', tgToken);
    if (tgChatId) params.set('c', tgChatId);
    
    const fullLink = `${baseUrl}?${params.toString()}`;
    navigator.clipboard.writeText(fullLink);
    showToast('تم نسخ رابط الإعداد التلقائي للموظفين!', 'success');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Tajawal']" dir="rtl">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          {!selectedLoginUser ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-10 mt-2">
                <DatabaseZap className="text-indigo-600 mx-auto mb-5" size={50} />
                <h1 className="text-3xl font-black text-slate-800">أسواق المحسن</h1>
                <p className="text-slate-400 text-sm mt-1 font-bold">بوابة الدخول السحابية</p>
              </div>
              <div className="space-y-3">
                {users.map(user => (
                  <button key={user.id} onClick={() => setSelectedLoginUser(user)} className="w-full p-5 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all text-right shadow-sm active:scale-95 group">
                    <div className="flex items-center gap-4">
                      <UserCircle size={24} className="text-slate-400 group-hover:text-white" />
                        <div className="text-right">
                        <div className="font-black text-slate-700">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {user.role === UserRole.ADMIN ? 'مدير النظام' : user.role === UserRole.ACCOUNTANT ? 'محاسب' : `مندوب: ${user.branch}`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-left duration-300">
              <button onClick={() => { setSelectedLoginUser(null); setPasswordInput(''); }} className="text-slate-400 hover:text-indigo-600 flex items-center gap-2 text-xs font-black mb-8">← عودة</button>
              <h2 className="text-2xl font-black text-slate-800 text-center mb-10">{selectedLoginUser.name}</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (passwordInput === selectedLoginUser.password) setCurrentUser(selectedLoginUser); else showToast('الرمز خطأ', 'error'); }} className="space-y-6">
                <input type="password" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="رمز الدخول" className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl text-center text-3xl font-black tracking-widest outline-none focus:border-indigo-500 transition-all shadow-inner" />
                <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">دخول</button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isBoss = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ACCOUNTANT;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pr-72 font-['Tajawal']" dir="rtl">
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl shadow-2xl font-black text-white flex items-center gap-3 animate-in slide-in-from-top border border-white/20 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'loading' ? 'bg-indigo-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'loading' && <RefreshCw className="animate-spin" size={18} />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      <aside className="hidden md:flex flex-col w-72 bg-white border-l border-slate-100 fixed right-0 top-0 bottom-0 z-20 shadow-xl">
        <div className="p-10 text-center">
          <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Cloud className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">أسواق المحسن</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${!sheetUrl ? 'bg-rose-500 animate-pulse' : isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${!sheetUrl ? 'text-rose-500' : 'text-slate-400'}`}>
              {!sheetUrl ? 'غير مربوط سحابياً' : isSyncing ? 'مزامنة...' : 'متصل'}
            </span>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="لوحة التحكم" />
          <NavItem active={activeTab === 'entry'} onClick={() => setActiveTab('entry')} icon={<Receipt size={20} />} label="إضافة حركة" />
          {isBoss && (
            <>
              <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FilePieChart size={20} />} label="التقارير" />
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="الإعدادات" />
            </>
          )}
        </nav>
        <div className="p-8 border-t border-slate-50">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-rose-600 bg-rose-50 font-black text-xs">
            <LogOut size={16} /> خروج
          </button>
        </div>
      </aside>

      <main className="p-4 md:p-12 max-w-7xl mx-auto">
        {errorLog && (
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start gap-4">
            <AlertTriangle className="text-rose-600 shrink-0" size={24} />
            <p className="text-xs text-rose-600 font-bold mt-1">{errorLog}</p>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard transactions={transactions} user={currentUser} onVerify={toggleVerification} />}
        {activeTab === 'entry' && <TransactionForm user={currentUser} onSubmit={handleAddTransaction} telegramLinked={!!tgToken} />}
        {activeTab === 'reports' && isBoss && <ReportView transactions={transactions} user={currentUser} />}
        {activeTab === 'settings' && isBoss && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <h2 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-800"><Settings size={30} className="text-indigo-600" /> الإعدادات العامة</h2>
              
              <div className="space-y-8">
                {/* قسم تغيير كلمات المرور */}
                <div className="space-y-4">
                   <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2">إدارة كلمات المرور</h3>
                   <div className="grid grid-cols-1 gap-3">
                     {users.map(u => (
                       <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="text-right">
                           <div className="font-black text-slate-700 text-sm">{u.name}</div>
                           <div className="text-[10px] text-slate-400 font-bold">الرمز الحالي: {u.password}</div>
                         </div>
                         <button 
                           onClick={() => setEditingUser(u)}
                           className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-all"
                         >
                           تغيير
                         </button>
                       </div>
                     ))}
                   </div>
                </div>

                {editingUser && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                      <h3 className="text-xl font-black text-slate-800 mb-2 text-center">تغيير كلمة مرور</h3>
                      <p className="text-slate-400 text-xs text-center mb-6 font-bold">{editingUser.name}</p>
                      <input 
                        type="text" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="الرمز الجديد"
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl font-black outline-none focus:border-indigo-500 mb-6"
                      />
                      <div className="flex gap-3">
                        <button 
                          onClick={() => updateUserPassword(editingUser.id, newPassword)}
                          disabled={!newPassword}
                          className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-black disabled:opacity-50"
                        >
                          حفظ
                        </button>
                        <button 
                          onClick={() => { setEditingUser(null); setNewPassword(''); }}
                          className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                   <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b pb-2">رابط النظام السحابي (Google)</h3>
                   <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="رابط Web App..." className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="space-y-4 pt-4">
                   <div className="flex justify-between items-center border-b pb-2">
                     <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">إعدادات تليجرام</h3>
                     <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                       <Send size={10} /> كيف أحصل على الـ ID؟
                     </a>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 mr-1">Bot Token</label>
                       <input type="text" value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="مثال: 123456:ABC..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] outline-none focus:border-indigo-500" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 mr-1">Chat ID</label>
                       <input type="text" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="مثال: 987654321" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[11px] outline-none focus:border-indigo-500" />
                     </div>
                   </div>
                   <p className="text-[10px] text-slate-400 font-bold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                     💡 للحصول على Chat ID: ابحث عن بوت <span className="text-indigo-600">@userinfobot</span> في تليجرام وأرسل له أي رسالة، سيعطيك رقم الـ ID الخاص بك.
                   </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <button onClick={() => { localStorage.setItem('google_sheet_url_mohsen', sheetUrl); localStorage.setItem('tg_token_mohsen', tgToken); localStorage.setItem('tg_chat_id_mohsen', tgChatId); fetchTransactions(); showToast('تم حفظ الإعدادات'); }} className="flex-1 bg-slate-900 text-white p-6 rounded-3xl font-black shadow-xl hover:bg-black active:scale-95 transition-all">حفظ البيانات</button>
                  <button onClick={generateInviteLink} className="flex-1 bg-indigo-600 text-white p-6 rounded-3xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <LinkIcon size={20} /> نسخ رابط دعوة الموظفين
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex gap-4">
              <Info size={24} className="text-indigo-600 shrink-0" />
              <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
                استخدم زر "نسخ رابط دعوة الموظفين" لإرسال رابط جاهز لكل موظف. عند فتحه، سيقوم التطبيق بضبط نفسه آلياً دون الحاجة لإدخال الروابط يدوياً في كل جهاز.
              </p>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[2.5rem] p-3 z-50 flex justify-around items-center shadow-2xl">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="الرئيسية" />
        <MobileNavItem active={activeTab === 'entry'} onClick={() => setActiveTab('entry')} icon={<Receipt size={24} />} label="إضافة" />
        {isBoss && <MobileNavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="إعدادات" />}
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-4.5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white font-black shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
    {icon} <span className="text-sm">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    {icon}
    <span className="text-[10px] font-black">{label}</span>
  </button>
);

export default App;
