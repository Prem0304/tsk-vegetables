import React from 'react';
import { Sale, Customer } from '../types';
import { formatDateWithDay } from '../lib/dateUtils';

interface PrintableInvoiceProps {
  sale: Sale;
  customer?: Customer;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ sale, customer }) => {
  return (
    <div
      id={`invoice-${sale.invoiceNo}`}
      className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-2xl max-w-2xl mx-auto font-sans border border-slate-300 print:shadow-none print:border-none print:p-4 print:max-w-none"
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
        {/* Left Side: Exact User-Provided Lord Murugan Sketch */}
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
            Wholesale Tomato Commission Mandi Yard
          </p>
        </div>

        {/* Right Side: Tomato Sketch SVG */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center p-1 bg-rose-50 rounded-full border border-rose-200">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Fresh Tomato & Leaf Vector */}
            <path d="M50 15 C30 15 15 30 15 55 C15 80 30 90 50 90 C70 90 85 80 85 55 C85 30 70 15 50 15 Z" fill="#dc2626" />
            <ellipse cx="40" cy="40" rx="10" ry="6" fill="#fca5a5" opacity="0.6" />
            <path d="M50 15 Q40 5 35 10 Q45 15 50 20 Q55 15 65 10 Q60 5 50 15 Z" fill="#166534" />
            <path d="M50 15 L50 5" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ----------------- INVOICE META & CUSTOMER INFO ----------------- */}
      <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3.5 rounded-lg border border-slate-300 my-4 text-xs">
        <div>
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">Billed Customer</span>
          <strong className="text-sm font-bold text-slate-900 block">{sale.customerName}</strong>
          <span className="text-slate-700 block mt-0.5">
            {customer?.shopLocation || sale.notes || 'Vegetable Mandi Outward Dispatch'}
          </span>
          {customer?.phone && customer.phone !== 'N/A' && (
            <span className="text-slate-600 font-mono block">Ph: {customer.phone}</span>
          )}
        </div>

        <div className="text-right">
          <span className="text-slate-500 font-semibold block text-[10px] uppercase">Invoice Receipt</span>
          <strong className="text-sm font-mono font-bold text-emerald-800 block">{sale.invoiceNo}</strong>
          <span className="text-slate-700 block mt-0.5">Date: <strong className="font-mono">{formatDateWithDay(sale.date)}</strong></span>
          <span className="inline-block mt-1 px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[10px]">
            Mode: {sale.paymentMethod}
          </span>
        </div>
      </div>

      {/* ----------------- LINE ITEMS TABLE ----------------- */}
      <div className="overflow-hidden rounded-lg border border-slate-300 my-4">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="p-2.5">S.No</th>
              <th className="p-2.5">Item / Grade Category</th>
              <th className="p-2.5 text-center">Qty (Crates)</th>
              <th className="p-2.5 text-right">Rate / Crate</th>
              <th className="p-2.5 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
            {sale.lineItems.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                <td className="p-2.5 text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                <td className="p-2.5">
                  <strong className="text-slate-900">{item.crateSize} Crate</strong>
                  {item.grade && <span className="text-slate-600 block text-[11px]">{item.grade}</span>}
                </td>
                <td className="p-2.5 text-center font-bold text-sm font-mono">{item.quantity}</td>
                <td className="p-2.5 text-right font-mono">₹{item.ratePerCrate.toLocaleString('en-IN')}</td>
                <td className="p-2.5 text-right font-bold font-mono text-slate-900">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ----------------- BILL TOTALS & DUES BREAKDOWN ----------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-2 border-t border-slate-300">
        <div className="text-[11px] text-slate-600 space-y-1 w-full sm:w-1/2">
          <p className="font-medium">
            * Please verify crate counts and return empty crates promptly.
          </p>
          <p className="text-[10px] text-slate-500 italic">
            Computer generated sales voucher — T.S.K TRADERS
          </p>
        </div>

        <div className="w-full sm:w-1/2 bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-700">
            <span>Grand Total Bill Amount:</span>
            <strong className="font-mono text-sm text-slate-900">₹{sale.totalAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between items-center text-emerald-800">
            <span>Paid Amount ({sale.paymentMethod}):</span>
            <strong className="font-mono text-sm">₹{sale.paidAmount.toLocaleString('en-IN')}</strong>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-rose-700 font-bold">
            <span>Outstanding Balance Added:</span>
            <strong className="font-mono text-sm">₹{sale.balanceAdded.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      {/* ----------------- SIGNATURE LINE ----------------- */}
      <div className="mt-8 pt-6 flex justify-between items-center text-xs text-slate-600">
        <div>
          <span>Buyer Signature</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-slate-900 block">For T.S.K TRADERS</span>
          <span className="text-[10px] text-slate-500">(Authorized Signatory)</span>
        </div>
      </div>
    </div>
  );
};
