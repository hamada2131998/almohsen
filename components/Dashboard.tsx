
import React, { useMemo, useState } from 'react';
import { Transaction, User, UserRole, TransactionType, Branch } from '../types';
import { Wallet, Image as ImageIcon, X, ShoppingBag, Receipt, ArrowUpRight, AlertCircle, Clock, CheckCircle2, History } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  user: User;
  onVerify: (id: string) => void;
}

const normalize = (text: string) => {
  if (!text) return '';
  return text.trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '');
};

const Dashboard: React.FC<Props> = ({ transactions, user, onVerify }) => {
  const [viewImage, setViewImage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const branchMap = new Map<string, { name: string, custody: number, feeding: number, expenses: number }>();

    transactions.forEach(t => {
      const norm = normalize(t.branch);
      const current = branchMap.get(norm) || { name: t.branch.trim(), custody: 0, feeding: 0, expenses: 0 };
      
      if (t.type === TransactionType.CUSTODY_RECEIPT) current.custody += t.amount;
      else if (t.type === TransactionType.FEEDING) current.feeding += t.amount;
      else current.expenses += t.amount;
      
      branchMap.set(norm, current);
    });

    const results = Array.from(branchMap.values()).map(s => ({
      ...s,
      balance: (s.custody + s.feeding) - s.expenses
    }));

    if (user.role === UserRole.DELEGATE) {
      const myNorm = normalize(user.branch || '');
      return results.filter(r => normalize(r.name) === myNorm);
    }
    return results;
  }, [transactions, user]);

  const filteredTransactions = useMemo(() => {
    if (user.role === UserRole.DELEGATE) {
      const myNorm = normalize(user.branch || '');
      return transactions.filter(t => normalize(t.branch) === myNorm);
    }
    return transactions;
  }, [transactions, user]);

  const isBoss = user.role === UserRole.ADMIN || user.role === UserRole.ACCOUNTANT;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {viewImage && (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300" onClick={() => setViewImage(null)}>
          <div className="relative max-w-4xl w-full">
            <img src={viewImage} className="max-w-full max-h-[85vh] mx-auto object-contain rounded-3xl shadow-2xl border-4 border-white/10" alt="مرفق الحركة" />
            <button onClick={() => setViewImage(null)} className="absolute -top-14 right-0 text-white bg-rose-500 p-3 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-90 font-black flex items-center gap-2">
              <X size={24} /> إغلاق المعاينة
            </button>
          </div>
        </div>
      )}

      {/* رصيد المناديب المنفصل */}
      {user.role !== UserRole.DELEGATE && (
        <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] shadow-3xl relative overflow-hidden border border-slate-800 group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
               <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></span>
               <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em]">أرصدة العهد النقدية للمناديب</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.filter(s => s.name !== Branch.OFFICE).map(stat => (
                <div key={stat.name} className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                  <p className="text-indigo-300 text-[10px] font-black mb-2 uppercase tracking-widest">{stat.name}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-3xl font-black tabular-nums ${stat.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                      {stat.balance.toLocaleString()}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500">ر.س</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">إجمالي النقدية في السوق</p>
              <p className="text-xl font-black text-indigo-400 tabular-nums">
                {stats.reduce((a, b) => a + b.balance, 0).toLocaleString()} <span className="text-xs font-bold text-slate-600">ر.س</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* بطاقات الفروع */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stats.length === 0 && (
          <div className="col-span-full py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
            <AlertCircle className="text-slate-100 mb-4" size={60} />
            <p className="text-slate-400 font-black text-xl">لا توجد بيانات متاحة للمزامنة حالياً</p>
          </div>
        )}
        {stats.map(stat => (
          <div key={stat.name} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/40 transition-all duration-500 flex flex-col group relative overflow-hidden shadow-sm">
            <div className="flex justify-between items-start mb-10">
              <span className="bg-slate-100 text-slate-700 px-5 py-2 rounded-2xl text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">{stat.name}</span>
              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 group-hover:rotate-12 transition-transform shadow-sm">
                <Wallet size={24} />
              </div>
            </div>
            
            <div className="mb-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">رصيد العهدة الحالي</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-5xl font-black tabular-nums tracking-tight ${stat.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {stat.balance.toLocaleString()}
                </p>
                <span className="text-sm font-bold text-slate-300">ر.س</span>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-50 mt-auto">
               <div className="flex justify-between items-center group/row">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 group-hover/row:scale-110 transition-transform"><ShoppingBag size={14} /></div>
                    <span className="text-xs font-bold text-slate-500">استلام عهدة (+)</span>
                  </div>
                  <p className="text-sm font-black text-emerald-600">+{stat.custody.toLocaleString()}</p>
               </div>
               <div className="flex justify-between items-center group/row">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 group-hover/row:scale-110 transition-transform"><ArrowUpRight size={14} /></div>
                    <span className="text-xs font-bold text-slate-500">التغذية (+)</span>
                  </div>
                  <p className="text-sm font-black text-indigo-600">+{stat.feeding.toLocaleString()}</p>
               </div>
               <div className="flex justify-between items-center group/row">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-50 p-2 rounded-xl text-rose-600 group-hover/row:scale-110 transition-transform"><Receipt size={14} /></div>
                    <span className="text-xs font-bold text-slate-500">المصروفات (-)</span>
                  </div>
                  <p className="text-sm font-black text-rose-600">-{stat.expenses.toLocaleString()}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* سجل التحركات */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden shadow-slate-200/40">
        <div className="p-8 bg-slate-50/30 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-5">
             <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-100">
               <History size={24} />
             </div>
             <div>
               <h3 className="font-black text-slate-800 text-xl tracking-tight">سجل العمليات المالية</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">مزامنة حية مع Google Sheets</p>
             </div>
          </div>
          <span className="text-xs font-black bg-white border border-slate-200 text-slate-500 px-6 py-2.5 rounded-2xl shadow-sm">{filteredTransactions.length} عملية</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-7">البيان والتفاصيل</th>
                <th className="px-6 py-7 text-center">الفرع</th>
                <th className="px-6 py-7 text-center">المبلغ</th>
                <th className="px-6 py-7 text-center">المرفق</th>
                <th className="px-10 py-7 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-indigo-50/40 transition-all group duration-300">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                       <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${
                         tx.type === TransactionType.CUSTODY_RECEIPT ? 'bg-emerald-50 text-emerald-600' :
                         tx.type === TransactionType.FEEDING ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                         {tx.type === TransactionType.CUSTODY_RECEIPT ? <ShoppingBag size={20} /> :
                          tx.type === TransactionType.FEEDING ? <ArrowUpRight size={20} /> : <Receipt size={20} />}
                       </div>
                       <div>
                         <div className="font-black text-slate-800 text-[14px] mb-1 group-hover:text-indigo-600 transition-colors">{tx.description}</div>
                         <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-bold tracking-tight">
                            <span className="text-slate-600">{tx.createdBy}</span>
                            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                            <span>{tx.date}</span>
                         </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-7 text-center">
                    <span className="text-[11px] text-slate-600 font-black bg-slate-100 px-4 py-2 rounded-xl border border-slate-200/50">{tx.branch}</span>
                  </td>
                  <td className={`px-6 py-7 text-center font-black text-lg tabular-nums ${
                    tx.type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {tx.type === TransactionType.EXPENSE ? '-' : '+'}{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-7 text-center">
                    {tx.attachment ? (
                      <button onClick={() => setViewImage(tx.attachment!)} className="text-indigo-600 hover:text-white hover:bg-indigo-600 p-3 bg-indigo-50 rounded-2xl transition-all shadow-sm flex items-center gap-2 mx-auto">
                        <ImageIcon size={18} />
                        <span className="font-black">معاينة</span>
                      </button>
                    ) : <span className="text-slate-200 font-bold italic">بدون مرفق</span>}
                  </td>
                  <td className="px-10 py-7 text-center">
                    {isBoss ? (
                      <button onClick={() => onVerify(tx.id)} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-2 mx-auto active:scale-95 ${
                        tx.verified ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100' : 'bg-white text-rose-500 border-2 border-rose-500 hover:bg-rose-500 hover:text-white'
                      }`}>
                        {tx.verified ? <><CheckCircle2 size={16} /> معتمدة</> : 'اعتماد الآن'}
                      </button>
                    ) : (
                      <span className={`text-[11px] font-black px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2.5 w-fit mx-auto ${
                        tx.verified ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-400 bg-slate-50 border border-slate-100'
                      }`}>{tx.verified ? <><CheckCircle2 size={14} /> معتمدة</> : <><Clock size={14} /> قيد المراجعة</>}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
