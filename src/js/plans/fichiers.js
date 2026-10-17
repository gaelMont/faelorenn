/* ====== fichiers ====== */
async function saveFile(name,data,mime){
  const blob=data instanceof Blob?data:new Blob([data],{type:mime||'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast('Fichier prêt : '+name)}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Copié dans le presse-papiers');return true}catch(e){}
  modal(`<h2>Copier le texte</h2><p class="hint">Le presse-papiers est bloqué ici. Sélectionne et copie à la main.</p><textarea id="cpy" rows="14">${esc(t)}</textarea><div class="row"><button class="btn" onclick="closeModal()">Fermer</button></div>`);const ta=$('#cpy');ta.focus();ta.select();return false}
function svgToPng(svg,w,h,scale=2){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));img.onload=()=>{const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('png')),'image/png')};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};img.src=u})}
const slug=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'plan';
