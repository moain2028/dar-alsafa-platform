'use client';
import { useEffect, useState } from 'react';
import { Download, Printer, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import { api, dateTime, money } from '../lib/api';
import type { Order } from '../lib/types';

type Invoice={id:string;invoiceNumber:string;uuid:string;issueDate:string;qrBase64:string;qrDataUrl:string;complianceStatus:string;hash:string;previousHash:string};
export default function InvoiceModal({order,onClose}:{order:Order;onClose:()=>void}){
  const[invoice,setInvoice]=useState<Invoice|null>(null),[error,setError]=useState('');
  useEffect(()=>{api<Invoice>(`/invoices/${order.id}`).then(setInvoice).catch(e=>setError(e.message));},[order.id]);
  const downloadXml=async()=>{const xml=await api<string>(`/invoices/${order.id}/xml`);const blob=new Blob([xml],{type:'application/xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${order.orderNumber}.xml`;a.click();URL.revokeObjectURL(url);};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="invoice-modal" role="dialog" aria-modal="true" aria-label="الفاتورة"><button className="modal-close" onClick={onClose}><X/></button>
    <div className="invoice-brand"><span className="brand-mark">د</span><div><b>دار الصفاء</b><small>فاتورة ضريبية مبسطة — بيئة تطوير</small></div></div>
    {error?<p className="form-error">{error}</p>:!invoice?<div className="page-loading"><span className="spinner"/>توليد عرض الفاتورة…</div>:<>
      <div className="invoice-meta"><span>رقم الفاتورة<b>{invoice.invoiceNumber}</b></span><span>التاريخ<b>{dateTime(invoice.issueDate)}</b></span></div>
      <div className="invoice-items">{order.items.map(item=><div key={item.id}><span>{item.name} <small>× {item.quantity}</small></span><b>{money(item.totalHalalas)}</b></div>)}</div>
      <div className="invoice-totals"><span>الإجمالي قبل الضريبة<b>{money(order.subtotalHalalas-order.discountHalalas+order.deliveryFeeHalalas)}</b></span><span>ضريبة القيمة المضافة (15%)<b>{money(order.vatHalalas)}</b></span><strong>الإجمالي المستحق<b>{money(order.totalHalalas)}</b></strong></div>
      <div className="qr-wrap"><Image src={invoice.qrDataUrl} alt="رمز الاستجابة السريعة للفاتورة" width={120} height={120} unoptimized/><div><ShieldCheck/><b>TLV Base64 QR</b><p>الرقم الضريبي والطابع الزمني والإجمالي والضريبة مشفّرة وفق الدليل الرسمي.</p></div></div>
      <div className="compliance-note">هذه فاتورة تطوير وليست شهادة مطابقة للمرحلة الثانية. يلزم توقيع XML بشهادة CSID والتحقق والربط مع منصة فاتورة قبل الاستخدام الضريبي.</div>
      <div className="modal-actions"><button className="button primary" onClick={()=>window.print()}><Printer/>طباعة</button><button className="button secondary" onClick={downloadXml}><Download/>تنزيل XML</button></div>
    </>}
  </section></div>;
}
