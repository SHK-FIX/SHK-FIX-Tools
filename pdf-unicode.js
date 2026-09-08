function pdfEscape(value){
  return String(value ?? '')
    .replace(/\\/g,'\\\\')
    .replace(/\(/g,'\\(')
    .replace(/\)/g,'\\)');
}

function toWinAnsiBinary(value){
  const map={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
  let out='';
  for(const ch of String(value)){
    const cp=ch.codePointAt(0);
    if(cp<=255) out+=String.fromCharCode(cp);
    else if(map[ch]!==undefined) out+=String.fromCharCode(map[ch]);
    else out+='?';
  }
  return out;
}

function componentText(c){
  if(c.kind==='Bogen') return `${c.kind} ${c.dn || '–'} ${c.angle || ''} × ${c.qty || 1}`;
  if(c.kind==='Abzweig') return `${c.kind} ${c.mainDn || '–'} / ${c.branchDn || '–'} – ${c.angle || ''} × ${c.qty || 1}`;
  if(c.kind==='Schelle') return `${c.kind} ${c.dn || '–'} × ${c.qty || 1}`;
  if(c.kind==='Muffe') return `${c.kind} ${c.dn || '–'} × ${c.qty || 1}`;
  if(c.kind==='Reduzierung') return `${c.kind} ${c.fromDn || '–'} → ${c.toDn || '–'} × ${c.qty || 1}`;
  return `${c.kind || 'Bauteil'} × ${c.qty || 1}`;
}

function buildPdfLines(){
  const lines=[
    'SHK FIX – Abwasser-Aufmaß','',
    `Objekt: ${state.project.object || '–'}`,
    `Wohnung / Bereich: ${state.project.unit || '–'}`,
    `Auftragsnummer: ${state.project.orderNo || '–'}`,
    `Bearbeiter: ${state.project.worker || '–'}`,
    `Aufmaßdauer: ${fmtTime(state.minutes)}`,
    `Erstellt: ${new Date().toLocaleString('de-DE')}`,'',
    `Erfasste Positionen: ${state.positions.length}`,''
  ];

  state.positions.forEach((p,index)=>{
    lines.push(`${index+1}. ${p.module}${p.name ? ` – ${p.name}` : ''}`);
    lines.push(`   Material: ${p.material || '–'}`);

    if(Array.isArray(p.pipes) && p.pipes.length){
      lines.push('   Rohre:');
      p.pipes.forEach(pipe=>lines.push(`   • ${pipe.dn || '–'} – ${Number(pipe.length||0).toLocaleString('de-DE')} m`));
    } else {
      lines.push(`   Rohr: ${p.dn || '–'} – ${Number(p.length||0).toLocaleString('de-DE')} m`);
    }

    if(Array.isArray(p.components) && p.components.length){
      lines.push('   Formteile:');
      p.components.forEach(c=>lines.push(`   • ${componentText(c)}`));
    } else {
      const qty=Object.entries(p.qty||{}).filter(([,v])=>Number(v)>0).map(([k,v])=>`${k}: ${v}`).join(' | ');
      if(qty) lines.push(`   Formteile: ${qty}`);
    }

    if(p.notes) lines.push(`   Hinweis: ${p.notes}`);
    lines.push('');
  });

  if(!state.positions.length) lines.push('Keine Positionen erfasst.');
  return lines;
}

function makePdfBlob(){
  const pageWidth=595,pageHeight=842,marginX=48,topY=790,lineHeight=16,linesPerPage=43;
  const sourceLines=buildPdfLines().map(line=>toWinAnsiBinary(pdfEscape(line)));
  const pages=[];
  for(let i=0;i<sourceLines.length;i+=linesPerPage) pages.push(sourceLines.slice(i,i+linesPerPage));
  if(!pages.length) pages.push([toWinAnsiBinary('SHK FIX – Abwasser-Aufmaß')]);
  const objects=[];
  const addObject=body=>{objects.push(body);return objects.length;};
  const fontObj=addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontObj=addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageObjIds=[],contentObjIds=[];
  pages.forEach((pageLines,pageIndex)=>{
    let stream='BT\n/F1 11 Tf\n',y=topY;
    pageLines.forEach((line,lineIndex)=>{
      const isTitle=pageIndex===0&&lineIndex===0;
      stream+=`${isTitle?'/F2 16 Tf':'/F1 11 Tf'}\n1 0 0 1 ${marginX} ${y} Tm\n(${line}) Tj\n`;
      y-=isTitle?28:lineHeight;
    });
    stream+='ET';
    const contentId=addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    contentObjIds.push(contentId);
    pageObjIds.push(addObject('PENDING_PAGE'));
  });
  const pagesObj=addObject('PENDING_PAGES');
  const catalogObj=addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  pageObjIds.forEach((pageId,i)=>{objects[pageId-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${boldFontObj} 0 R >> >> /Contents ${contentObjIds[i]} 0 R >>`;});
  objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageObjIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;
  let pdf='%PDF-1.4\n';
  const offsets=[0];
  objects.forEach((body,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const xrefOffset=pdf.length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++) pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const bytes=new Uint8Array(pdf.length);
  for(let i=0;i<pdf.length;i++) bytes[i]=pdf.charCodeAt(i)&0xff;
  return new Blob([bytes],{type:'application/pdf'});
}
