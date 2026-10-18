/* ============ fabrique de .docx, sans bibliothèque ============
   La mécanique commune aux exports Word : l'encodage, le zip non compressé (« stored ») et les
   parties fixes du paquet ; le texte s'échappe avec echapperHtml (commun/echappement.js).
   Chaque registre écrit lui-même son document, ses styles et ses propriétés : leurs tailles,
   interlignes et marges ne sont pas les mêmes.
   Rien que des déclarations « function », préfixées docx : le module reste sûr si une page
   charge un jour deux paquets qui le contiennent. */

function docxUtf8(str){
  if(typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const b = []; // repli
  for(let i = 0; i < str.length; i++){
    let c = str.charCodeAt(i);
    if(c < 128) b.push(c);
    else if(c < 2048){ b.push(192 | (c >> 6), 128 | (c & 63)); }
    else { b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  }
  return new Uint8Array(b);
}

/* la table du CRC est calculée au premier appel et gardée sur la fonction */
function docxCrc32(buf){
  let t = docxCrc32.table;
  if(!t){
    t = docxCrc32.table = new Uint32Array(256);
    for(let n = 0; n < 256; n++){
      let c = n;
      for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
  }
  let c = 0xFFFFFFFF;
  for(let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* une archive zip sans compression : [{nom, txt}] -> octets. La date est fixe (2020-01-01) :
   le même document donne toujours le même fichier */
function docxZip(fichiers){
  const parts = [], central = [];
  let offset = 0;
  fichiers.forEach(f => {
    const nom = docxUtf8(f.nom), data = docxUtf8(f.txt), crc = docxCrc32(data);
    const lfh = new Uint8Array(30 + nom.length);
    const v = new DataView(lfh.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
    v.setUint16(10, 0, true); v.setUint16(12, 0x2821, true);   // 2020-01-01
    v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
    v.setUint16(26, nom.length, true); v.setUint16(28, 0, true);
    lfh.set(nom, 30);
    parts.push(lfh, data);

    const cd = new Uint8Array(46 + nom.length);
    const c = new DataView(cd.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, 0, true); c.setUint16(14, 0x2821, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, nom.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true);
    c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true);
    c.setUint32(42, offset, true);
    cd.set(nom, 46);
    central.push(cd);
    offset += lfh.length + data.length;
  });
  const cdTaille = central.reduce((a, x) => a + x.length, 0);
  const eocd = new Uint8Array(22);
  const e = new DataView(eocd.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(4, 0, true); e.setUint16(6, 0, true);
  e.setUint16(8, fichiers.length, true); e.setUint16(10, fichiers.length, true);
  e.setUint32(12, cdTaille, true); e.setUint32(16, offset, true); e.setUint16(20, 0, true);

  const tout = parts.concat(central, [eocd]);
  const total = tout.reduce((a, x) => a + x.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  tout.forEach(x => { out.set(x, p); p += x.length; });
  return out;
}


/* le paquet complet : les trois parties fixes autour du document, des styles et des propriétés
   du registre, toujours dans le même ordre */
function docxPaquet(doc, styles, core){
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';

  const drels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  return docxZip([
    {nom:'[Content_Types].xml', txt:types},
    {nom:'_rels/.rels', txt:rels},
    {nom:'docProps/core.xml', txt:core},
    {nom:'word/_rels/document.xml.rels', txt:drels},
    {nom:'word/document.xml', txt:doc},
    {nom:'word/styles.xml', txt:styles}
  ]);
}
