/* ====== façade ====== */
const FS={pierre:{wall:'#d9cdb2',line:'#b9aa88',roof:'#5f5c66',roofl:'#3f3d46',trim:'#c3b595'},colombage:{wall:'#efe3c4',line:'#6b4a2b',roof:'#8a4a36',roofl:'#6a3626',trim:'#6b4a2b'},brique:{wall:'#b86a4b',line:'#8f4c33',roof:'#4b4a52',roofl:'#34333a',trim:'#d9cdb2'},bois:{wall:'#a98557',line:'#7c6039',roof:'#6a5a3c',roofl:'#4d4129',trim:'#7c6039'}};
function facadeSVG(b){
  const fc=b.facade||{},st=FS[fc.style]||FS.pierre,F=34,FH=3.3*F,n=b.floors.length;
  const g0=b.floors[0];const rooms=g0.items.filter(i=>i.t==='room'&&i.kind!=='cour'&&i.kind!=='ext');
  const e=rooms.length?floorExtent({items:rooms}):{x0:0,y0:0,x1:10,y1:8};
  const Wm=Math.max(5,e.x1-e.x0),W=Wm*F,Ht=n*FH,tw=fc.tower?4.2*F:0;
  const mx=60+tw,gy=120+Ht+(fc.roof==='conique'?0:0),top=gy-Ht;
  const roofH=fc.roof==='plat'?20:fc.roof==='pignon'?W*.32:Ht*.55;
  const Wt=W+mx*2,Hh=gy+90;let s='';
  const southY=e.y1;const onSouth=(it)=>Math.abs(it.y-southY)<.6&&it.o==='h';
  s+=`<rect width="${Wt}" height="${Hh}" fill="#ece3cb"/><rect x="0" y="${gy}" width="${Wt}" height="${Hh-gy}" fill="#cfc3a0"/>`;
  s+=`<rect x="${mx}" y="${top}" width="${W}" height="${Ht}" fill="${st.wall}" stroke="${INK}" stroke-width="3"/>`;
  if(fc.style==='pierre'||fc.style==='brique'){let d='';for(let y=top+16;y<gy;y+=16)d+=`M${mx} ${y}H${mx+W}`;s+=`<path d="${d}" stroke="${st.line}" stroke-width=".8" opacity=".7"/>`}
  if(fc.style==='bois'){let d='';for(let y=top+12;y<gy;y+=12)d+=`M${mx} ${y}H${mx+W}`;s+=`<path d="${d}" stroke="${st.line}" stroke-width="1" opacity=".8"/>`}
  if(fc.style==='colombage'){let d='';for(let f=0;f<n;f++){const y0=top+f*FH;for(let x=mx;x<mx+W;x+=F*1.6){d+=`M${x} ${y0}V${y0+FH}`}d+=`M${mx} ${y0}H${mx+W}`}s+=`<path d="${d}" stroke="${st.line}" stroke-width="3"/>`;let dd='';for(let f=0;f<n;f++){const y0=top+f*FH;for(let x=mx;x+F*1.6<=mx+W+1;x+=F*3.2)dd+=`M${x} ${y0}L${x+F*1.6} ${y0+FH}`}s+=`<path d="${dd}" stroke="${st.line}" stroke-width="2" opacity=".8"/>`}
  for(let f=1;f<n;f++)s+=`<rect x="${mx}" y="${top+f*FH-3}" width="${W}" height="6" fill="${st.trim}" stroke="${INK}" stroke-width="1.5"/>`;
  s+=`<rect x="${mx-4}" y="${gy-10}" width="${W+8}" height="10" fill="${st.trim}" stroke="${INK}" stroke-width="2"/>`;
  // portes et fenêtres issues du plan
  let doorX=null;
  const dd=g0.items.filter(i=>i.t==='door'&&onSouth(i));
  if(dd.length)doorX=(dd[0].x-e.x0)*F;
  const lancet=(x,y,w,h)=>st.line==='#6b4a2b'||fc.style==='bois'?`<rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" fill="#a9c5d3" stroke="${INK}" stroke-width="2"/><path d="M${x} ${y}V${y+h}M${x-w/2} ${y+h/2}H${x+w/2}" stroke="${INK}" stroke-width="1.2"/><rect x="${x-w/2-5}" y="${y}" width="5" height="${h}" fill="${st.line}" stroke="${INK}"/><rect x="${x+w/2}" y="${y}" width="5" height="${h}" fill="${st.line}" stroke="${INK}"/>`:
   `<path d="M${x-w/2-3} ${y+h}V${y+h*.3}L${x} ${y-4}L${x+w/2+3} ${y+h*.3}V${y+h}Z" fill="#bfb08c" stroke="${INK}" stroke-width="1.5"/><path d="M${x-w/2} ${y+h-2}V${y+h*.32}L${x} ${y}L${x+w/2} ${y+h*.32}V${y+h-2}Z" fill="#a9c5d3" stroke="${INK}" stroke-width="1.8"/><path d="M${x} ${y+3}V${y+h-2}M${x-w/2} ${y+h*.6}H${x+w/2}" stroke="${INK}" stroke-width="1"/>`;
  for(let f=0;f<n;f++){
    const F_=b.floors[f];const ws=F_.items.filter(i=>i.t==='win'&&i.o==='h'&&Math.abs(i.y-southY)<.6&&i.k!=='meurtriere');
    let xs=ws.map(w=>(w.x-e.x0)*F);
    if(!xs.length){const cnt=Math.max(2,Math.round(Wm/3.2));xs=[];for(let i=0;i<cnt;i++)xs.push(W*(i+.5)/cnt)}
    const wy=top+(n-1-f)*FH+FH*.22,wh=FH*.56;
    for(const x of xs){if(f===0&&doorX!=null&&Math.abs(x-doorX)<F*1.2)continue;if(f===0&&doorX==null&&Math.abs(x-W/2)<F*1.2)continue;s+=lancet(mx+x,wy,F*.62,wh)}}
  const dx=mx+(doorX!=null?doorX:W/2);
  s+=`<path d="M${dx-F*.6} ${gy}V${gy-F*1.3}Q${dx-F*.6} ${gy-F*2} ${dx} ${gy-F*2.15}Q${dx+F*.6} ${gy-F*2} ${dx+F*.6} ${gy-F*1.3}V${gy}Z" fill="#5a4128" stroke="${INK}" stroke-width="2.5"/><path d="M${dx} ${gy-F*2.1}V${gy}" stroke="${INK}" stroke-width="1.4"/>`;
  if(fc.porch!==false){s+=`<rect x="${dx-F*1.1}" y="${gy-F*2.6}" width="${F*2.2}" height="${F*2.6}" fill="none" stroke="${INK}" stroke-width="2.5" opacity=".0"/><polygon points="${dx-F*1.4},${gy-F*2.55} ${dx},${gy-F*3.5} ${dx+F*1.4},${gy-F*2.55}" fill="${st.roof}" stroke="${INK}" stroke-width="2.5"/><rect x="${dx-F*1.2}" y="${gy-F*2.55}" width="${F*.16}" height="${F*2.55}" fill="${st.trim}" stroke="${INK}"/><rect x="${dx+F*1.04}" y="${gy-F*2.55}" width="${F*.16}" height="${F*2.55}" fill="${st.trim}" stroke="${INK}"/>`}
  // toit
  const rx0=mx-10,rx1=mx+W+10;
  if(fc.roof==='croupe'){s+=`<polygon points="${rx0},${top} ${mx+W*.14},${top-roofH} ${mx+W*.86},${top-roofH} ${rx1},${top}" fill="${st.roof}" stroke="${INK}" stroke-width="3"/>`;let d='';for(let i=1;i<6;i++){const t=i/6,y=top-roofH*t,a=(rx0)+(mx+W*.14-rx0)*t,bb=rx1-(rx1-(mx+W*.86))*t;d+=`M${fx(a)} ${fx(y)}H${fx(bb)}`}s+=`<path d="${d}" stroke="${st.roofl}" stroke-width="1.5"/>`}
  else if(fc.roof==='pignon'){s+=`<polygon points="${rx0},${top} ${mx+W/2},${top-roofH} ${rx1},${top}" fill="${st.roof}" stroke="${INK}" stroke-width="3"/><polygon points="${mx+W*.2},${top} ${mx+W/2},${top-roofH*.7} ${mx+W*.8},${top}" fill="${st.wall}" stroke="${INK}" stroke-width="2" opacity=".0"/>`;let d='';for(let i=1;i<7;i++){const t=i/7,y=top-roofH*t;d+=`M${fx(rx0+(mx+W/2-rx0)*t)} ${fx(y)}H${fx(rx1-(rx1-mx-W/2)*t)}`}s+=`<path d="${d}" stroke="${st.roofl}" stroke-width="1.5"/>`}
  else {s+=`<rect x="${rx0}" y="${top-roofH}" width="${rx1-rx0}" height="${roofH}" fill="${st.wall}" stroke="${INK}" stroke-width="3"/>`;let d='';for(let x=rx0;x<rx1-10;x+=26)d+=`M${x} ${top-roofH}v-12h14v12`;s+=`<path d="${d}" fill="${st.wall}" stroke="${INK}" stroke-width="2.5"/>`}
  for(let i=0;i<(fc.chim??0);i++){const cxm=mx+W*(.22+.56*(i/Math.max(1,(fc.chim-1)||1)));s=s.replace('</rect>','</rect>');s+=`<rect x="${fx(cxm)}" y="${top-roofH-26}" width="22" height="${fc.roof==='plat'?40:roofH*.7}" fill="#cdbf9f" stroke="${INK}" stroke-width="2.5"/><rect x="${fx(cxm-4)}" y="${top-roofH-34}" width="30" height="9" fill="#cdbf9f" stroke="${INK}" stroke-width="2.5"/>`}
  if(fc.tower){const tx=mx-tw*.55,tww=tw*.9,th=Ht+F*3;s+=`<rect x="${tx}" y="${gy-th}" width="${tww}" height="${th}" fill="${st.wall}" stroke="${INK}" stroke-width="3"/><polygon points="${tx-8},${gy-th} ${tx+tww/2},${gy-th-F*3.4} ${tx+tww+8},${gy-th}" fill="${st.roof}" stroke="${INK}" stroke-width="3"/>`;for(let f=0;f<n+1;f++)s+=lancet(tx+tww/2,gy-th+F*.5+f*FH,F*.5,FH*.5)}
  s+=`<line x1="0" y1="${gy}" x2="${Wt}" y2="${gy}" stroke="${INK}" stroke-width="3"/>`;
  s+=`<g font-family="${FONT}" fill="${INK}"><text x="30" y="40" font-size="20" font-weight="700" letter-spacing="1.5">FAÇADE</text><text x="30" y="60" font-size="12.5" font-style="italic">${esc(b.name)}</text></g>`;
  return{svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${fx(Wt)}" height="${fx(Hh)}" viewBox="0 0 ${fx(Wt)} ${fx(Hh)}">${s}</svg>`,w:Wt,h:Hh}}
