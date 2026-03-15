
import React, { useState, useMemo } from 'react';
import { Transaction, Branch, User, UserRole, TransactionType } from '../types';
import { FileSpreadsheet, Printer, Search, ArrowRightLeft, Calculator, Download } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  user: User;
}

const normalize = (text: string) => {
  if (!text) return '';
  return text.trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '');
};

const ReportView: React.FC<Props> = ({ transactions, user }) => {
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    let data = transactions.filter(t => {
      const matchBranch = filterBranch === 'all' ? true : normalize(t.branch) === normalize(filterBranch);
      const matchStart = startDate ? t.date >= startDate : true;
      const matchEnd = endDate ? t.date <= endDate : true;
      const matchSearch = search ? 
        normalize(t.description).includes(normalize(search)) || 
        normalize(t.createdBy).includes(normalize(search)) : true;
      return matchBranch && matchStart && matchEnd && matchSearch;
    });
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }, [transactions, filterBranch, startDate, endDate, search]);

  const ledger = useMemo(() => {
    let balance = 0;
    return filteredData.map(t => {
      const isIn = t.type === TransactionType.FEEDING || t.type === TransactionType.CUSTODY_RECEIPT;
      const amount = t.amount;
      balance += (isIn ? amount : -amount);
      return { 
        ...t, 
        balanceAfter: balance, 
        inflow: isIn ? amount : 0, 
        outflow: isIn ? 0 : amount 
      };
    });
  }, [filteredData]);

  const totals = useMemo(() => ({
    in: ledger.reduce((s, i) => s + i.inflow, 0),
    out: ledger.reduce((s, i) => s + i.outflow, 0),
    bal: ledger.length > 0 ? ledger[ledger.length - 1].balanceAfter : 0
  }), [ledger]);

  // وظيفة تصدير ملف Excel (CSV)
  const handleExportExcel = () => {
    if (ledger.length === 0) return alert('لا توجد بيانات لتصديرها');

    // العناوين
    const headers = ['التاريخ', 'البيان', 'الفرع', 'بواسطة', 'داخل (+)', 'خارج (-)', 'الرصيد التراكمي'];
    
    // البيانات
    const rows = ledger.map(item => [
      item.date,
      item.description.replace(/,/g, '-'), // استبدال الفواصل لمنع تداخل الأعمدة
      item.branch,
      item.createdBy,
      item.inflow,
      item.outflow,
      item.balanceAfter
    ]);

    // دمج العناوين والصفوف
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // إضافة BOM لدعم اللغة العربية في إكسيل
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = `كشف_حساب_${filterBranch}_${new Date().toLocaleDateString('en-CA')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* الفلاتر */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-wrap gap-4 no-print">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 mb-1.5 block mr-1 uppercase tracking-wider">بحث في البيانات</label>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full p-3 pr-11 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" 
              placeholder="ابحث عن بيان أو موظف..." 
            />
          </div>
        </div>
        <div className="w-44">
          <label className="text-[10px] font-black text-slate-400 mb-1.5 block mr-1 uppercase tracking-wider">تصفية حسب المندوب</label>
          <select 
            value={filterBranch} 
            onChange={e => setFilterBranch(e.target.value)} 
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
          >
            <option value="all">كافة المناديب</option>
            {Object.values(Branch).map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="w-36">
            <label className="text-[10px] font-black text-slate-400 mb-1.5 block mr-1 uppercase tracking-wider">من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
          </div>
          <div className="w-36">
            <label className="text-[10px] font-black text-slate-400 mb-1.5 block mr-1 uppercase tracking-wider">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button 
            onClick={handleExportExcel} 
            title="تصدير إكسيل"
            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <FileSpreadsheet size={20} />
            <span className="text-xs font-black hidden md:block">تصدير Excel</span>
          </button>
          <button 
            onClick={() => window.print()} 
            title="طباعة الكشف"
            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Printer size={20} />
            <span className="text-xs font-black hidden md:block">طباعة</span>
          </button>
        </div>
      </div>

      {/* ملخص الحسابات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-lg flex items-center justify-between group">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي الداخل (عهدة + تغذية)</p>
            <p className="text-2xl font-black text-emerald-600">+{totals.in.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform"><ArrowRightLeft size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-lg flex items-center justify-between group">
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي المصروفات</p>
            <p className="text-2xl font-black text-rose-500">-{totals.out.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50 p-3 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform rotate-180"><ArrowRightLeft size={24} /></div>
        </div>
        <div className="bg-indigo-600 p-6 rounded-[1.5rem] shadow-xl shadow-indigo-100 flex items-center justify-between text-white">
          <div>
            <p className="text-[10px] text-indigo-200 font-black uppercase tracking-widest mb-1">الرصيد الصافي للفترة</p>
            <p className="text-2xl font-black">{totals.bal.toLocaleString()}</p>
          </div>
          <Calculator className="text-indigo-300 opacity-50" size={32} />
        </div>
      </div>

      {/* الجدول المحاسبي */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-5 font-black uppercase tracking-wider w-28">التاريخ</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider">البيان والتفاصيل</th>
                <th className="px-4 py-5 font-black uppercase tracking-wider text-center w-32">داخل (+)</th>
                <th className="px-4 py-5 font-black uppercase tracking-wider text-center w-32">خارج (-)</th>
                <th className="px-6 py-5 font-black uppercase tracking-wider text-center w-36">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ledger.map((item, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-indigo-50/30 transition-colors`}>
                  <td className="px-6 py-5 text-slate-500 font-bold">{item.date}</td>
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-800 text-sm">{item.description}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">
                      <span className="text-indigo-600">{item.branch}</span> • بواسطة {item.createdBy}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center font-black text-sm text-emerald-600">
                    {item.inflow > 0 ? `+${item.inflow.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-5 text-center font-black text-sm text-rose-500">
                    {item.outflow > 0 ? `-${item.outflow.toLocaleString()}` : '-'}
                  </td>
                  <td className={`px-6 py-5 text-center font-black text-sm ${item.balanceAfter < 0 ? 'text-rose-700 bg-rose-50/30' : 'text-slate-900 bg-slate-50/50'}`}>
                    {item.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            {ledger.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-black">
                <tr>
                  <td colSpan={2} className="px-6 py-6 text-left text-sm uppercase tracking-widest">إجمالي الحركات الصافية</td>
                  <td className="px-4 py-6 text-center text-emerald-400 text-sm">+{totals.in.toLocaleString()}</td>
                  <td className="px-4 py-6 text-center text-rose-400 text-sm">-{totals.out.toLocaleString()}</td>
                  <td className="px-6 py-6 text-center bg-indigo-600 text-lg">{totals.bal.toLocaleString()} ر.س</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 20px !important; }
          .bg-white { box-shadow: none !important; border: 1px solid #eee !important; border-radius: 10px !important; }
          table { border-collapse: collapse !important; }
          th { background-color: #000 !important; color: #fff !important; }
          td, th { border: 1px solid #eee !important; }
        }
      `}</style>
    </div>
  );
};

export default ReportView;
