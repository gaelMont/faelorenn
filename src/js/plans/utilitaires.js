'use strict';
/* ====== utilitaires ====== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
const fx=n=>Math.round(n*100)/100;
function mkrng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hstr(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const rr=(r,a,b)=>a+r()*(b-a);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const FONT='Palatino Linotype, Book Antiqua, Georgia, serif';
const INK='#2b2623', PAPER='#ece1c5';
