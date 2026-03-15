
import React, { useState, useRef } from 'react';
import { Branch, TransactionType, User, UserRole } from '../types';
import { Save, ShoppingBag, Receipt, Camera, X, Loader2, Send, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  onSubmit: (tx: any) => void;
  telegramLinked: boolean;
}

const TransactionForm: React.FC<Props> = ({ user, onSubmit, telegramLinked }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.CUSTODY_RECEIPT);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState<Branch>(user.branch || Branch.DELEGATE_1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setAttachment(compressed);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert('يرجى إدخال مبلغ صحيح');
    if (!description) return alert('يرجى إدخال وصف للعملية');
    
    // فحص إجبارية الصورة للمصروفات واستلام العهدة
    if ((type === TransactionType.EXPENSE || type === TransactionType.CUSTODY_RECEIPT) && !attachment) {
      return alert('يجب التقاط صورة (سند أو فاتورة) لإتمام العملية!');
    }

    onSubmit({
      type,
      amount: parseFloat(amount),
      description,
      branch,
      date,
      createdBy: user.name,
      attachment
    });

    setAttachment(null);
    setAmount('');
    setDescription('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[3rem] shadow-3xl border border-slate-100 overflow-hidden relative">
        {telegramLinked && (
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100">
            <Send size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">مربوط بالسحابة</span>
          </div>
        )}
        
        <div className="p-10 pb-4 text-center">
          <h2 className="text-3xl font-black text-slate-800">تسجيل حركة</h2>
          <p className="text-slate-400 text-xs mt-1 font-bold">يرجى التأكد من اختيار النوع الصحيح</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-8">
          <div className="grid grid-cols-2 gap-4 p-2 bg-slate-50 rounded-[2rem] border border-slate-100">
            <button
              type="button"
              onClick={() => setType(TransactionType.CUSTODY_RECEIPT)}
              className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[1.5rem] font-black transition-all ${
                type === TransactionType.CUSTODY_RECEIPT ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-slate-400 bg-white'
              }`}
            >
              <ShoppingBag size={24} />
              <span className="text-xs uppercase tracking-widest">استلام عهدة (+)</span>
            </button>

            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[1.5rem] font-black transition-all ${
                type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-xl scale-105' : 'text-slate-400 bg-white'
              }`}
            >
              <Receipt size={24} />
              <span className="text-xs uppercase tracking-widest">مصروفات (-)</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-1 block uppercase tracking-wider">المبلغ</label>
              <div className="relative">
                <input 
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-4xl font-black text-center focus:border-indigo-500 outline-none transition-all tabular-nums"
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">ر.س</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-1 block">المندوب / القسم</label>
                <select value={branch} onChange={(e) => setBranch(e.target.value as Branch)} disabled={user.role === UserRole.DELEGATE} className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none">
                  {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-1 block">التاريخ</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-700 outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-1 block">البيان (تفاصيل العملية)</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="أدخل الوصف..." className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-bold resize-none" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black text-slate-500 mr-1 block">صورة المرفق (الفاتورة)</label>
                {(type === TransactionType.EXPENSE || type === TransactionType.CUSTODY_RECEIPT) && (
                  <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-full flex items-center gap-1 border border-rose-100">
                    <AlertCircle size={10} /> إرفاق الصورة إلزامي
                  </span>
                )}
              </div>
              <div 
                onClick={() => !isCompressing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[160px] ${
                  attachment ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
              >
                {isCompressing ? (
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                ) : attachment ? (
                  <div className="relative">
                    <img src={attachment} alt="Preview" className="w-40 h-40 object-cover rounded-2xl border-4 border-white shadow-xl" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAttachment(null); }} className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full p-2 shadow-lg">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={32} className="text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 font-black">اضغط للتصوير</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isCompressing}
            className={`w-full p-6 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 ${
              ((type === TransactionType.EXPENSE || type === TransactionType.CUSTODY_RECEIPT) && !attachment) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            <Save size={24} />
            <span>حفظ الحركة</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
