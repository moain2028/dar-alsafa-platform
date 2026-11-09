'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock3, ReceiptText } from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import OrderComposer from '../../components/OrderComposer';
import InvoiceModal from '../../components/InvoiceModal';
import { PageHeader, StatusBadge } from '../../components/UI';
import { api, dateTime, money, typeLabels } from '../../lib/api';
import type { Order } from '../../lib/types';

function CustomerOrders(){const[orders,setOrders]=useState<Order[]>([]),[selected,setSelected]=useState<Order|null>(null);const load=useCallback(()=>{api<Order[]>('/orders').then(setOrders).catch(()=>undefined);},[]);useEffect(()=>{load();const handler=()=>load();window.addEventListener('orders:refresh',handler);return()=>window.removeEventListener('orders:refresh',handler);},[load]);return <section className="card" style={{marginTop:24}}><div className="card-header"><div><h2>طلباتي وتتبع الحالة</h2><p>تتغير الحالة مباشرة مع المطبخ والمندوب</p></div><Clock3 size={18}/></div>{orders.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>النوع</th><th>الحالة</th><th>المندوب</th><th>الإجمالي</th><th/></tr></thead><tbody>{orders.map(order=><tr key={order.id}><td><b>{order.orderNumber}</b><small>{order.items.map(i=>`${i.name} × ${i.quantity}`).join('، ')}</small></td><td>{dateTime(order.createdAt)}</td><td>{typeLabels[order.type]}</td><td><StatusBadge status={order.status}/></td><td>{order.courier?.user?.name||'—'}</td><td>{money(order.totalHalalas)}</td><td><button className="text-button" onClick={()=>setSelected(order)}><ReceiptText size={14}/>الفاتورة</button></td></tr>)}</tbody></table></div>:<div className="cart-empty">لم تنشئ أي طلبات بعد.</div>}{selected&&<InvoiceModal order={selected} onClose={()=>setSelected(null)}/>}</section>;}
export default function CustomerPage(){return <AuthGuard roles={['CUSTOMER']}><PageHeader eyebrow="دار الصفاء في متناولك" title="اطلب ضيافتك المفضلة" description="قائمة الفرع الفعلية، رسوم وضريبة محسوبة من الخادم، وتتبع لحظي حتى بابك."/><OrderComposer mode="customer"/><CustomerOrders/></AuthGuard>;}
