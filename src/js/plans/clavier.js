/* ====== le clavier : seulement quand le focus est dans l'établi ======
   L'Atelier prenait Espace, les chiffres et Ctrl+Z sur toute la page : ici, Espace sert encore au bouton ou au lien qui a le focus,
   et la page défile quand personne n'a la main sur le plan. */
const enEditeur=t=>!!t&&t!==document.body&&$('#app').contains(t);
function ouvertModal(){return $('#modal').style.display==='flex'}
document.addEventListener('keydown',e=>{
  const tg=e.target,typing=!!tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable);
  if(e.key==='Escape'){
    if(prOn()){prSortir();return}
    if(ouvertModal()){closeModal();return}
    const menu=$('#pop').style.display==='block';
    closePop();
    if(!typing&&enEditeur(tg)){
      /* rien à annuler, rien de choisi : Échap sort aussi du plein écran (quand le navigateur ne l'a pas déjà fait) */
      const rien=!menu&&!g&&!vg&&!wg&&!vdraw&&!wdraw&&!bdraw&&!wmes&&!ui.sel.length&&(!ui.edit||ui.tool==='sel');
      g=null;vg=null;wg=null;vdraw=null;wdraw=null;bdraw=null;wmes=null;
      if(ui.edit&&ui.tool!=='sel')setTool('sel');else{ui.sel=[];renderSide()}
      renderOverlay();
      if(rien&&pleinOn())pleinBasculer(false)}
    return}
  if(typing||ouvertModal()||!enEditeur(tg))return;
  const k=e.key,ctrl=e.ctrlKey||e.metaKey;
  /* lecture ou écriture : voir tout, zoomer, déplacer la vue */
  if(!ctrl&&(k==='f'||k==='F')){if(e.shiftKey)pleinBasculer();else fit();e.preventDefault();return}
  if(tg===cv&&!ctrl&&(k==='+'||k==='='||k==='-'||k==='_')){
    const r=cv.getBoundingClientRect();zoomAt(r.width/2,r.height/2,k==='-'||k==='_'?.8:1.25);e.preventDefault();return}
  /* la vue en relief : R la fait tourner d'un quart de tour */
  if(isoOn()&&!ctrl&&(k==='r'||k==='R')){e.preventDefault();isoTourner(e.shiftKey?-1:1);return}
  if(!ui.edit){
    if(tg===cv&&k.startsWith('Arrow')){
      const st=e.shiftKey?160:60;
      ui.view.x+=k==='ArrowLeft'?st:k==='ArrowRight'?-st:0;ui.view.y+=k==='ArrowUp'?st:k==='ArrowDown'?-st:0;
      ui.userView=true;applyView();e.preventDefault()}
    return}
  /* écriture */
  if(k===' '&&tg===cv){ui.space=true;cv.classList.add('pan');e.preventDefault();return}
  if(ctrl&&(k==='z'||k==='Z')){e.preventDefault();e.shiftKey?redo():undo();return}
  if(ctrl&&(k==='y'||k==='Y')){e.preventDefault();redo();return}
  /* grouper, dégrouper : comme dans un logiciel de dessin */
  if(ctrl&&(k==='g'||k==='G')&&ui.mode==='b'){e.preventDefault();e.shiftKey?grpDefaire(selItems()):grpFaire(selItems());return}
  if(!ctrl&&/^[0-9]$/.test(k)){const L=ui.mode==='b'?BTOOLS:ui.mode==='w'?WTOOLS:VTOOLS;const i=(+k+9)%10;if(L[i]){setTool(L[i][0]);return}}
  const h=ui.mode==='b'?B_key(e):ui.mode==='w'?W_key(e):V_key(e);
  if(h)e.preventDefault()});
document.addEventListener('keyup',e=>{if(e.key===' '){ui.space=false;cv.classList.remove('pan')}});
window.addEventListener('blur',()=>{ui.space=false;cv.classList.remove('pan')});
/* le plan reprend la main après chaque geste : un appui qui retrace la surcouche (tracé d'une pièce, poignées) retire l'élément visé
   de la page, le navigateur laisse alors le focus à la page, et sans focus dans l'établi le clavier n'entend plus rien */
cv.addEventListener('pointerup',()=>{if(document.activeElement!==cv)cv.focus({preventScroll:true})});
