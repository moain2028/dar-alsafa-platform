'use client';
import { useEffect } from 'react';
export default function PwaRegistrar(){useEffect(()=>{if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('/sw.js').catch(()=>undefined);},[]);return null;}
