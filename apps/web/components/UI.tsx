'use client';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { statusLabels } from '../lib/api';

export function StatusBadge({status}:{status:string}){return <span className={`status status-${status.toLowerCase()}`}><i/>{statusLabels[status]||status}</span>;}
export function Toast({message,type='success',onClose}:{message:string;type?:'success'|'error';onClose:()=>void}){return <div className={`toast ${type}`} role="alert">{type==='success'?<CheckCircle2/>:<CircleAlert/>}<span>{message}</span><button onClick={onClose} aria-label="إغلاق"><X/></button></div>;}
export function PageHeader({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description:string;actions?:React.ReactNode}){return <header className="page-header"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions&&<div className="page-actions">{actions}</div>}</header>;}
export function Empty({title,text}:{title:string;text:string}){return <div className="empty-state"><span>✦</span><h3>{title}</h3><p>{text}</p></div>;}
export function Loading(){return <div className="page-loading"><span className="spinner"/>جارٍ تحميل البيانات…</div>;}
export function ErrorState({message,retry}:{message:string;retry:()=>void}){return <div className="error-state"><CircleAlert/><h3>تعذر تحميل البيانات</h3><p>{message}</p><button className="button secondary" onClick={retry}>إعادة المحاولة</button></div>;}
