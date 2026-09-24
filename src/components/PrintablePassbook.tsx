import React from 'react';
import { PassbookEntry } from '../types';
import { formatDateWithDay } from '../lib/dateUtils';

interface PrintablePassbookProps {
  entityName: string;
  entityType: 'Customer' | 'Supplier';
  entries: PassbookEntry[];
  pendingBalance: number;
  phone?: string;
  location?: string;
}

export const PrintablePassbook: React.FC<PrintablePassbookProps> = ({
  entityName,
  entityType,
  entries,
  pendingBalance,
  phone,
  location,
}) => {
  const isCustomer = entityType === 'Customer';

  return (
    <div
      id={`passbook-${entityType.toLowerCase()}-${entityName.replace(/[^a-zA-Z0-9]/g, '_')}`}
      className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-2xl max-w-3xl mx-auto font-sans border border-slate-300 print:shadow-none print:border-none print:p-4 print:max-w-none"
      style={{ minWidth: '320px' }}
    >
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b-2 border-slate-900 gap-3">
        {/* Top Left: Mobile Numbers */}
        <div className="text-xs font-bold text-slate-800 space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-emerald-700">Ph:</span>
            <span className="font-mono">9715813463</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-emerald-700">Ph:</span>
            <span className="font-mono">8190801030</span>
          </div>
        </div>

        {/* Top Center: Devotional Header in Tamil */}
        <div className="text-center flex-1 my-1 sm:my-0">
          <div className="text-sm sm:text-base font-bold text-slate-900 tracking-wide font-serif">
            ஸ்ரீ வாழகுருநாதன் துணை
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-800 tracking-wide font-serif">
            ஸ்ரீ அங்காள ஈஸ்வரி துணை
          </div>
        </div>

        {/* Top Right: Boxed T.S.K TRADERS */}
        <div className="border-2 border-slate-900 px-3 py-1.5 rounded-lg bg-slate-50 shadow-sm text-center">
          <span className="font-black text-sm tracking-wider text-slate-900">
            T.S.K TRADERS
          </span>
        </div>
      </div>

      {/* ----------------- SUB-HEADER BANNER WITH SKETCHES ----------------- */}
      <div className="py-3 my-2 flex items-center justify-between border-b border-slate-300">
        {/* Left Side: Exact Lord Murugan Sketch */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
          <img
            src="/murugan_sketch.png"
            alt="Lord Murugan Sketch"
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
          />
        </div>

        {/* Center Title & Mandi Name */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-widest uppercase font-serif">
            T.S.K
          </h1>
          <h2 className="text-sm sm:text-base font-bold text-rose-800 mt-1 font-serif">
            தக்காளி காய்கனி கமிஷன் மண்டி
          </h2>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            {entityType.toUpperCase()} LEDGER & PASSBOOK STATEMENT
          </p>
        </div>

        {/* Right Side: Tomato Sketch SVG */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center p-1 bg-rose-50 rounded-full border border-rose-200">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M50 15 C30 15 15 30 15 55 C15 80 30 90 50 90 C70 90 85 80 85 55 C85 30 70 15 50 15 Z" fill="#dc2626" />
            <ellipse cx="40" cy="40" rx="10" ry="6" fill="#fca5a5" opacity="0.6" />
            <path d="M50 15 Q40 5 35 10 Q45 15 50 20 Q55 15 65 10 Q60 5 50 15 Z" fill="#166534" />
            <path d="M50 15 L50 5" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ----------------- ENTITY & STATEMENT META ----------------- */}
      <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3.5 rounded-lg border border-slate-300 my-4 text-xs">
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            {isCustomer ? 'Customer Account' : 'Supplier Account'}
          </span>
          <strong className="text-sm font-bold text-slate-900 block">{entityName}</strong>
          {location && <span className="text-slate-700 block mt-0.5">Location: {location}</span>}
          {phone && phone !== 'N/A' && (
            <span className="text-slate-600 font-mono block">Ph: {phone}</span>
          )}
        </div>

        <div className="text-right">
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">
            {isCustomer ? 'Current Outstanding Receivable Dues' : 'Current Outstanding Payable Debt'}
          </span>
          <strong className={`text-base font-mono font-bold block ${pendingBalance > 0 ? (isCustomer ? 'text-rose-700' : 'text-amber-700') : 'text-emerald-700'}`}>
            ₹{pendingBalance.toLocaleString('en-IN')}
          </strong>
          <span className="text-slate-700 block mt-1 text-[11px]">
            Statement Date: <strong className="font-mono">{formatDateWithDay(new Date().toISOString().slice(0, 10))}</strong>
          </span>
        </div>
      </div>

      {/* ----------------- PASSBOOK TRANSACTIONS TABLE ----------------- */}
      <div className="overflow-hidden rounded-lg border border-slate-300 my-4">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="p-2.5">Date & Day</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Reference / Notes</th>
              <th className="p-2.5 text-right">{isCustomer ? 'Sale Billed (Debit)' : 'Purchase Billed (Credit)'}</th>
              <th className="p-2.5 text-right">{isCustomer ? 'Payment Paid (Credit)' : 'Settlement Paid (Debit)'}</th>
              <th className="p-2.5 text-right">Running Dues (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                  No passbook transaction records found.
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id || idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="p-2.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                    {formatDateWithDay(entry.date)}
                  </td>
                  <td className="p-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      entry.transactionType.includes('Sale') || entry.transactionType.includes('Purchase')
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {entry.transactionType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600 text-[11px]">
                    {entry.referenceId && <strong className="font-mono text-slate-800 mr-1">{entry.referenceId}</strong>}
                    {entry.notes || '-'}
                  </td>
                  <td className="p-2.5 text-right font-mono text-slate-900">
                    {entry.type === 'Debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-800 font-semibold">
                    {entry.type === 'Credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    ₹{entry.runningBalance.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ----------------- PASSBOOK FOOTER & SIGNATURE ----------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-2 border-t border-slate-300">
        <div className="text-[11px] text-slate-600 space-y-1 w-full sm:w-1/2">
          <p className="font-medium">
            * All figures are calculated live from official Mandi vouchers.
          </p>
          <p className="text-[10px] text-slate-500 italic">
            Computer generated passbook ledger — T.S.K TRADERS
          </p>
        </div>

        <div className="w-full sm:w-1/2 bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-700">
            <span>Total Recorded Transactions:</span>
            <strong className="font-mono text-slate-900">{entries.length} Entries</strong>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-bold">
            <span className="text-slate-900">Net Current Balance:</span>
            <strong className={`font-mono text-sm ${pendingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              ₹{pendingBalance.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>
      </div>

      {/* ----------------- SIGNATURE LINE ----------------- */}
      <div className="mt-8 pt-6 flex justify-between items-center text-xs text-slate-600">
        <div>
          <span>{isCustomer ? 'Customer Signature' : 'Supplier Signature'}</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-slate-900 block">For T.S.K TRADERS</span>
          <span className="text-[10px] text-slate-500">(Authorized Signatory)</span>
        </div>
      </div>
    </div>
  );
};
