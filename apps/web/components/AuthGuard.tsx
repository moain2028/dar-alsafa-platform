'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser } from '../lib/api';
import type { Role } from '../lib/types';
import AppShell from './AppShell';

export default function AuthGuard({children,roles}:{children:React.ReactNode;roles?:Role[]}) {
  const router=useRouter(); const pathname=usePathname();
  useEffect(()=>{const user=getUser();if(!user)router.replace(`/login?next=${encodeURIComponent(pathname)}`);else if(roles&&!roles.includes(user.role))router.replace('/login');},[router,pathname,roles]);
  const user=getUser(); if(!user) return <div className="page-loading"><span className="spinner"/>جارٍ التحقق من الجلسة…</div>;
  if(roles&&!roles.includes(user.role)) return <div className="page-loading">جارٍ تحويلك…</div>;
  return <AppShell user={user}>{children}</AppShell>;
}
