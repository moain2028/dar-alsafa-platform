import type { User } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
export const getToken = () => typeof window === 'undefined' ? null : localStorage.getItem('dar_token');
export const getUser = (): User|null => { if (typeof window === 'undefined') return null; try { return JSON.parse(localStorage.getItem('dar_user') || 'null'); } catch { return null; } };
export function saveSession(token:string,user:User) { localStorage.setItem('dar_token',token); localStorage.setItem('dar_user',JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem('dar_token'); localStorage.removeItem('dar_user'); }
export async function api<T>(path:string, options:RequestInit={}):Promise<T> {
  const token=getToken();
  const headers=new Headers(options.headers);
  if(options.body) headers.set('Content-Type','application/json');
  if(token) headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(`${API_URL}${path}`,{...options,headers,cache:'no-store'});
  if(response.status===401 && path!=='/auth/login') { clearSession(); if(typeof window!=='undefined') window.location.href='/login'; }
  const type=response.headers.get('content-type')||'';
  const data=type.includes('application/json')?await response.json():await response.text();
  if(!response.ok) { const message=typeof data==='object'&&data?.message; throw new Error(Array.isArray(message)?message.join('، '):message||'تعذر إتمام العملية'); }
  return data as T;
}
export const money=(halalas:number)=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR',minimumFractionDigits:2}).format((halalas||0)/100);
export const number=(value:number)=>new Intl.NumberFormat('ar-SA').format(value||0);
export const dateTime=(value:string)=>new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export const time=(value:string)=>new Intl.DateTimeFormat('ar-SA',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export const statusLabels:Record<string,string>={PLACED:'طلب جديد',CONFIRMED:'تم التأكيد',PREPARING:'قيد التحضير',READY:'جاهز',OUT_FOR_DELIVERY:'في الطريق',DELIVERED:'تم التوصيل',SERVED:'تم التقديم',CANCELLED:'ملغي'};
export const typeLabels:Record<string,string>={DINE_IN:'محلي',TAKEAWAY:'سفري',DELIVERY:'توصيل'};
export const paymentLabels:Record<string,string>={CASH:'نقداً',MADA:'مدى',APPLE_PAY:'Apple Pay',CARD:'بطاقة',STC_PAY:'STC Pay',WALLET:'المحفظة'};
export const roleHome:Record<string,string>={SUPER_ADMIN:'/dashboard',BRANCH_MANAGER:'/dashboard',ACCOUNTANT:'/finance',CASHIER:'/pos',COURIER:'/courier',CUSTOMER:'/customer'};
