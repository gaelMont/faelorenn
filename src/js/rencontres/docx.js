/* ============ fabrique de .docx, sans bibliotheque ============ */
const DX = (function(){
  const T = new Uint32Array(256);
  for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); T[n] = c >>> 0; }
  const crc32 = b => { let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const utf8 = s => new TextEncoder().encode(s);

  function zip(fichiers){
    const parts = [], central = []; let off = 0;
    fichiers.forEach(f => {
      const nom = utf8(f.nom), data = utf8(f.txt), crc = crc32(data);
      const h = new Uint8Array(30 + nom.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true);
      v.setUint16(12, 0x2821, true); v.setUint32(14, crc, true);
      v.setUint32(18, data.length, true); v.setUint32(22, data.length, true); v.setUint16(26, nom.length, true);
      h.set(nom, 30); parts.push(h, data);
      const c = new Uint8Array(46 + nom.length), w = new DataView(c.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true);
      w.setUint16(14, 0x2821, true); w.setUint32(16, crc, true); w.setUint32(20, data.length, true);
      w.setUint32(24, data.length, true); w.setUint16(28, nom.length, true); w.setUint32(42, off, true);
      c.set(nom, 46); central.push(c);
      off += h.length + data.length;
    });
    const cd = central.reduce((a, x) => a + x.length, 0);
    const e = new Uint8Array(22), z = new DataView(e.buffer);
    z.setUint32(0, 0x06054b50, true); z.setUint16(8, fichiers.length, true); z.setUint16(10, fichiers.length, true);
    z.setUint32(12, cd, true); z.setUint32(16, off, true);
    const tout = parts.concat(central, [e]);
    const out = new Uint8Array(tout.reduce((a, x) => a + x.length, 0));
    let p = 0; tout.forEach(x => { out.set(x, p); p += x.length; });
    return out;
  }

  const C = {h1:'1F3D2B', h2:'2E5A3E', txt:'1A1A1A', lbl:'6B7469', fill:'F1F5F1', head:'E6EDE7', line:'C3D2C6', rust:'9A4A28'};
  const W = 10506;
  const xe = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function r(txt, o){
    o = o || {};
    let pr = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>';
    if(o.b) pr += '<w:b/>'; if(o.i) pr += '<w:i/>'; if(o.caps) pr += '<w:caps/>';
    pr += '<w:color w:val="' + (o.c || C.txt) + '"/>';
    const sz = o.sz || 19; pr += '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>';
    if(o.sp) pr += '<w:spacing w:val="' + o.sp + '"/>';
    /* un retour à la ligne reste un retour à la ligne : une liste de butin, une description en plusieurs lignes */
    return '<w:r><w:rPr>' + pr + '</w:rPr><w:t xml:space="preserve">' + String(txt == null ? '' : txt).split('\n').map(xe).join('</w:t><w:br/><w:t xml:space="preserve">') + '</w:t></w:r>';
  }
  function p(runs, o){
    o = o || {};
    let pr = '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 60 : o.after) + '" w:line="' + (o.line || 260) + '" w:lineRule="auto"/>';
    if(o.keep) pr += '<w:keepNext/>';
    if(o.align) pr += '<w:jc w:val="' + o.align + '"/>';
    if(o.bord) pr += '<w:pBdr><w:bottom w:val="single" w:sz="' + o.bord.sz + '" w:space="' + o.bord.space + '" w:color="' + o.bord.c + '"/></w:pBdr>';
    if(o.shade) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>';
    if(o.ind) pr += '<w:ind w:left="' + o.ind + '"/>';
    return '<w:p><w:pPr>' + pr + '</w:pPr>' + (Array.isArray(runs) ? runs.join('') : runs) + '</w:p>';
  }
  const saut = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const titre = t => p(r(t, {sz:44, b:true, c:C.h1}), {after:20});
  const h2 = t => p(r(t, {sz:26, b:true, c:C.h1}), {before:120, after:60, keep:true, bord:{sz:8, space:3, c:C.h1}});
  const lbl = t => r(t + '  ', {sz:14, caps:true, c:C.lbl, sp:20});

  /* un bloc encadre : une table d'une seule cellule */
  function bloc(inner){
    const B = 'w:val="single" w:sz="4" w:color="' + C.line + '"';
    return '<w:tbl><w:tblPr><w:tblW w:w="' + W + '" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
      '<w:tblBorders><w:top ' + B + '/><w:left ' + B + '/><w:bottom ' + B + '/><w:right ' + B + '/></w:tblBorders>' +
      '<w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      '<w:tblGrid><w:gridCol w:w="' + W + '"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="' + W + '" w:type="dxa"/></w:tcPr>' +
      inner + '</w:tc></w:tr></w:tbl>' + p('', {after:80, line:120});
  }

  function paquet(corps, nomDoc){
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + corps +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="700" w:bottom="700" w:left="700" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';
    const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
    const drels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:color w:val="' + C.txt + '"/>' +
      '<w:sz w:val="19"/><w:szCs w:val="19"/><w:lang w:val="fr-BE"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
    const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      '<dc:title>' + xe(nomDoc) + '</dc:title><dc:creator>Faelorenn</dc:creator></cp:coreProperties>';
    return zip([
      {nom:'[Content_Types].xml', txt:types}, {nom:'_rels/.rels', txt:rels}, {nom:'docProps/core.xml', txt:core},
      {nom:'word/_rels/document.xml.rels', txt:drels}, {nom:'word/document.xml', txt:doc}, {nom:'word/styles.xml', txt:styles}
    ]);
  }

  return {C:C, r:r, p:p, saut:saut, titre:titre, h2:h2, lbl:lbl, bloc:bloc, paquet:paquet};
})();
