'use client';
import AuthGuard from '../../components/AuthGuard';
import OrderComposer from '../../components/OrderComposer';
import { PageHeader } from '../../components/UI';
export default function PosPage(){return <AuthGuard roles={['SUPER_ADMIN','BRANCH_MANAGER','CASHIER']}><PageHeader eyebrow="Cloud POS" title="نقطة البيع السحابية" description="أنشئ الطلب وأرسله للمطبخ مع احتساب الضريبة والقيد والفاتورة في معاملة واحدة."/><OrderComposer mode="pos"/></AuthGuard>;}
