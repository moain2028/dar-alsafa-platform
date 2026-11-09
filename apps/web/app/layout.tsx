import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegistrar from '../components/PwaRegistrar';

export const metadata: Metadata = { title: { default:'دار الصفاء | منظومة الضيافة الذكية',template:'%s | دار الصفاء' }, description:'منظومة سحابية موحدة لإدارة المطاعم والضيافة والتوصيل ونقاط البيع والفوترة.' };
export const viewport: Viewport = { width:'device-width',initialScale:1,themeColor:'#12372c' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ar" dir="rtl"><body><PwaRegistrar/>{children}</body></html>; }
