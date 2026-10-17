/* ====== retours ====== */
let toastT=0;
function toast(t){const m=$('#msg');m.textContent=t;m.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>m.classList.remove('on'),clamp(2600+String(t).length*45,2600,9000))}
function closePop(){$('#pop').style.display='none'}
function popup(btn,entries){const p=$('#pop');p.innerHTML=entries.map((e,i)=>e==='-'?'<hr>':`<button data-i="${i}">${esc(e.t)}</button>`).join('');const r=btn.getBoundingClientRect();p.style.display='block';p.style.left='0px';p.style.top=(r.bottom+4)+'px';p.style.left=Math.max(8,Math.min(r.left,innerWidth-p.offsetWidth-8))+'px';p.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;closePop();entries[+b.dataset.i].f()}}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#pop')&&!e.target.closest('#bExp,#bImp'))closePop()},true);
let modalDe=null;
function modal(html){if($('#modal').style.display!=='flex')modalDe=document.activeElement;$('#modalCard').innerHTML=html;$('#modal').style.display='flex';const f=$('#modalCard').querySelector('input:not([type=hidden]),textarea,select,button');if(f)f.focus()}
function closeModal(){$('#modal').style.display='none';if(modalDe&&modalDe.focus&&document.contains(modalDe))modalDe.focus();modalDe=null}
$('#modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')closeModal()});
