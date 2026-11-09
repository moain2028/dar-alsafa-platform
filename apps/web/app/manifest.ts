import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دار الصفاء — منظومة الضيافة الذكية', short_name: 'دار الصفاء',
    description: 'إدارة الطلبات ونقاط البيع والمطبخ والتوصيل والفوترة.',
    lang: 'ar', dir: 'rtl', start_url: '/', display: 'standalone',
    background_color: '#f5f7f4', theme_color: '#12372c',
  };
}
