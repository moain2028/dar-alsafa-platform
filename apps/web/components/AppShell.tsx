'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Bell, ChefHat, ClipboardList, LayoutDashboard, LogOut, Menu, Package, ReceiptText, ShoppingBag, Truck, UserRound, WalletCards, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL, clearSession, getToken, roleHome } from '../lib/api';
import type { Role, User } from '../lib/types';

const nav:Record<string,{href:string;label:string;icon:typeof LayoutDashboard}[]>={
  executive:[{href:'/dashboard',label:'نظرة عامة',icon:LayoutDashboard},{href:'/pos',label:'نقاط البيع',icon:ShoppingBag},{href:'/kds',label:'شاشة المطبخ',icon:ChefHat},{href:'/inventory',label:'المخزون',icon:Package},{href:'/finance',label:'المالية والفوترة',icon:WalletCards}],
  manager:[{href:'/dashboard',label:'نظرة عامة',icon:LayoutDashboard},{href:'/pos',label:'نقاط البيع',icon:ShoppingBag},{href:'/kds',label:'شاشة المطبخ',icon:ChefHat},{href:'/inventory',label:'المخزون',icon:Package},{href:'/finance',label:'التقارير المالية',icon:ReceiptText}],
  accountant:[{href:'/finance',label:'دفتر الأستاذ',icon:WalletCards},{href:'/dashboard',label:'مؤشرات الأداء',icon:BarChart3}],
  cashier:[{href:'/pos',label:'نقاط البيع',icon:ShoppingBag},{href:'/kds',label:'حالة الطلبات',icon:ClipboardList}],
  courier:[{href:'/courier',label:'مهام التوصيل',icon:Truck}],
  customer:[{href:'/customer',label:'اطلب الآن',icon:ShoppingBag}],
};
function group(role:Role){if(role==='SUPER_ADMIN')return'executive';if(role==='BRANCH_MANAGER')return'manager';if(role==='ACCOUNTANT')return'accountant';if(role==='CASHIER')return'cashier';if(role==='COURIER')return'courier';return'customer';}
export default function AppShell({user,children}:{user:User;children:React.ReactNode}){
  const pathname=usePathname(),router=useRouter();const[open,setOpen]=useState(false),[live,setLive]=useState(false);
  useEffect(()=>{const token=getToken();if(!token)return;const relative=API_URL.startsWith('/');const base=relative?window.location.origin:API_URL.replace(/\/api\/?$/,'');const socket=io(`${base}/events`,{auth:{token},path:relative?'/events/socket.io':'/socket.io',transports:relative?['polling','websocket']:['websocket','polling']});socket.on('connect',()=>setLive(true));socket.on('disconnect',()=>setLive(false));socket.on('order.changed',()=>window.dispatchEvent(new Event('orders:refresh')));return()=>{socket.disconnect();};},[]);
  useEffect(()=>setOpen(false),[pathname]);
  const logout=()=>{clearSession();router.replace('/login');};
  return <div className="app-shell">
    {open&&<button aria-label="إغلاق القائمة" className="sidebar-scrim" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar ${open?'open':''}`}>
      <Link className="brand" href={roleHome[user.role]}><span className="brand-mark">د</span><span><b>دار الصفاء</b><small>منظومة الضيافة الذكية</small></span></Link>
      <div className="workspace-pill"><span className="avatar">{user.name.slice(0,1)}</span><span><b>{user.name}</b><small>{user.email}</small></span></div>
      <nav className="main-nav"><span className="nav-caption">مساحة العمل</span>{nav[group(user.role)].map(item=>{const Icon=item.icon;return <Link key={item.href} className={pathname===item.href?'active':''} href={item.href}><Icon size={19}/>{item.label}{pathname===item.href&&<i/>}</Link>;})}</nav>
      <div className="sidebar-bottom"><div className="live-chip"><span className={live?'online':'offline'}/>{live?'المزامنة اللحظية متصلة':'تحديث تلقائي كل دقيقة'}</div><button className="logout" onClick={logout}><LogOut size={18}/>تسجيل الخروج</button></div>
    </aside>
    <main className="main-content"><div className="mobile-topbar"><button className="icon-button" onClick={()=>setOpen(true)} aria-label="فتح القائمة"><Menu/></button><Link className="brand compact" href={roleHome[user.role]}><span className="brand-mark">د</span><b>دار الصفاء</b></Link><button className="icon-button" aria-label="الإشعارات"><Bell/></button></div>{children}</main>
  </div>;
}
