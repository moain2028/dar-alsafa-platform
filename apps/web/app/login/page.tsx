'use client';
import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Check, ChefHat, LockKeyhole, ShoppingBag, Truck, UserRound, WalletCards } from 'lucide-react';
import { api, roleHome, saveSession } from '../../lib/api';
import type { User } from '../../lib/types';

const roles=[
  {role:'مدير عام',email:'admin@daralsafa.local',icon:BarChart3,desc:'كل الفروع والعمليات'},
  {role:'مدير فرع',email:'manager@daralsafa.local',icon:ChefHat,desc:'التشغيل والمخزون'},
  {role:'محاسب',email:'accountant@daralsafa.local',icon:WalletCards,desc:'القيود والتقارير'},
  {role:'كاشير',email:'cashier@daralsafa.local',icon:ShoppingBag,desc:'POS وشاشة الطلبات'},
  {role:'مندوب',email:'courier@daralsafa.local',icon:Truck,desc:'المهام وإثبات التسليم'},
  {role:'عميل',email:'customer@daralsafa.local',icon:UserRound,desc:'الطلب والتتبع'},
];
function LoginForm(){const router=useRouter(),params=useSearchParams();const[email,setEmail]=useState('admin@daralsafa.local'),[password,setPassword]=useState('DarAlsafa!2026'),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const submit=async(e?:FormEvent,selectedEmail?:string)=>{e?.preventDefault();setLoading(true);setError('');try{const result=await api<{accessToken:string;user:User}>('/auth/login',{method:'POST',body:JSON.stringify({email:selectedEmail||email,password})});saveSession(result.accessToken,result.user);router.replace(params.get('next')||roleHome[result.user.role]);}catch(err){setError(err instanceof Error?err.message:'تعذر تسجيل الدخول');}finally{setLoading(false);}};
  return <div className="login-page"><section className="login-showcase"><Link href="/" className="brand"><span className="brand-mark">د</span><span><b>دار الصفاء</b><small>منظومة الضيافة الذكية</small></span></Link><div className="login-message"><span className="eyebrow">مرحباً بك في مركز العمليات</span><h1>وضوح أكبر.<br/>تشغيل أسرع.<br/>ضيافة تليق باسمك.</h1><p>منصة عربية تربط الصالة والمطبخ والتوصيل والحسابات، ليتخذ فريقك القرار من نفس الصورة اللحظية.</p><div className="login-features"><span><Check/>واجهات مصممة بالكامل من اليمين إلى اليسار</span><span><Check/>أدوار وصلاحيات مستقلة لكل عضو</span><span><Check/>بيانات تجريبية آمنة للاختبار الشامل</span></div></div><footer>بيئة عرض تشغيلية · لا تستخدم بيانات عملاء حقيقية</footer></section>
    <main className="login-form-wrap"><div className="login-form"><h2>تسجيل الدخول</h2><p>استخدم بيانات حسابك، أو اختر أحد الأدوار التجريبية للدخول المباشر.</p>{error&&<p className="form-error">{error}</p>}<form onSubmit={submit}><div className="field"><label htmlFor="email">البريد الإلكتروني</label><input id="email" type="email" dir="ltr" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label htmlFor="password">كلمة المرور</label><input id="password" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></div><button className="button primary full" disabled={loading}>{loading?<span className="spinner"/>:<LockKeyhole/>}{loading?'جارٍ التحقق…':'دخول آمن'}</button></form>
      <div className="demo-title">دخول سريع بالحسابات التجريبية</div><div className="demo-roles">{roles.map(({icon:Icon,...item})=><button className="demo-role" key={item.email} disabled={loading} onClick={()=>{setEmail(item.email);void submit(undefined,item.email);}}><Icon/><span><b>{item.role}</b><small>{item.desc}</small></span></button>)}</div><p className="muted small" style={{marginTop:18,lineHeight:1.8}}>كلمة المرور الموحدة للعرض: <code dir="ltr">DarAlsafa!2026</code><br/>غيّرها وعطّل البيانات التجريبية قبل النشر الفعلي.</p>
    </div></main>
  </div>;}

export default function LoginPage(){return <Suspense fallback={<div className="page-loading"><span className="spinner"/>جارٍ تجهيز تسجيل الدخول…</div>}><LoginForm/></Suspense>;}
