const app = document.getElementById('app');
const templates = {
  project: document.getElementById('screen-project'),
  measure: document.getElementById('screen-measure'),
  module: document.getElementById('screen-module'),
  summary: document.getElementById('screen-summary')
};

const defaultState = {
  project: { object:'', unit:'', orderNo:'', worker:'Max' },
  minutes: 60,
  positions: [],
  currentModule: null
};

let state = loadState();

function loadState(){
  try { return { ...defaultState, ...JSON.parse(localStorage.getItem('shkfix-aufmass') || '{}') }; }
  catch { return structuredClone(defaultState); }
}
function saveState(){ localStorage.setItem('shkfix-aufmass', JSON.stringify(state)); }
function cloneTemplate(name){ return templates[name].content.cloneNode(true); }
function render(name){
  app.innerHTML='';
  app.appendChild(cloneTemplate(name));
  wire(name);
  window.scrollTo({top:0,behavior:'smooth'});
}
function fmtTime(min){
  const h=Math.floor(min/60), m=min%60;
  if(h && m) return `${h} Std. ${m} Min.`;
  if(h) return `${h} Std.`;
  return `${m} Min.`;
}
function safeFilePart(value){
  return String(value || 'ohne-Angabe')
    .trim()
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-zA-Z0-9_-]+/g,'_')
    .replace(/^_+|_+$/g,'') || 'ohne-Angabe';
}
function pdfFileName(){
  const date = new Date().toISOString().slice(0,10);
  return `Aufmass_Abwasser_${safeFilePart(state.project.object)}_${safeFilePart(state.project.unit)}_${date}.pdf`;
}

function wire(name){
  if(name==='project'){
    ['object','unit','orderNo','worker'].forEach(id=>document.getElementById(id).value=state.project[id]||'');
  }
  if(name==='measure'){
    document.getElementById('projectTitle').textContent = state.project.object || 'Neues Projekt';
    document.getElementById('timeValue').textContent = fmtTime(state.minutes);
  }
  if(name==='module') buildModule();
  if(name==='summary') buildSummary();
}

function buildModule(){
  document.getElementById('moduleTitle').textContent=state.currentModule;
  const names = state.currentModule==='Brandschutz'
    ? ['Brandschutzverbinder','Manschetten','Deckendurchführungen','Wanddurchführungen']
    : ['Bögen 45°','Bögen 87°','Abzweige','Muffen','Schellen','Reduzierungen'];
  const grid=document.getElementById('qtyGrid');
  names.forEach(n=>{
    const el=document.createElement('div'); el.className='qty'; el.dataset.name=n; el.dataset.value='0';
    el.innerHTML=`<span>${n}</span><div class="qty-controls"><button data-qty="minus">−</button><b>0</b><button data-qty="plus">+</button></div>`;
    grid.appendChild(el);
  });
}

function buildSummary(){
  document.getElementById('summaryProject').textContent=state.project.object||'–';
  document.getElementById('summaryUnit').textContent=state.project.unit||'–';
  document.getElementById('summaryWorker').textContent=state.project.worker||'–';
  document.getElementById('summaryTime').textContent=fmtTime(state.minutes);
  document.getElementById('summaryPositions').textContent=state.positions.length;
  const counts={}; state.positions.forEach(p=>counts[p.module]=(counts[p.module]||0)+1);
  const host=document.getElementById('summaryModules');
  ['Fallleitung','Grundleitung','Anschlussleitungen','Brandschutz','Material','Fotos & Notizen'].forEach(m=>{
    const el=document.createElement('div'); el.className='mini-item'; el.innerHTML=`<span>${m}</span><b>${counts[m]||0}</b>`; host.appendChild(el);
  });
}

function createShareText(){
  return `SHK FIX Abwasser-Aufmaß\nObjekt: ${state.project.object}\nBereich: ${state.project.unit}\nAuftragsnr.: ${state.project.orderNo||'–'}\nBearbeiter: ${state.project.worker}\nAufmaßdauer: ${fmtTime(state.minutes)}\nPositionen: ${state.positions.length}`;
}

function pdfSafe(value){
  return String(value ?? '')
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[–—]/g,'-').replace(/°/g,' Grad').replace(/[^ -~]/g,'?')
    .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}

function buildPdfLines(){
  const lines = [
    'SHK FIX - Abwasser-Aufmass',
    '',
    `Objekt: ${state.project.object || '-'}`,
    `Wohnung / Bereich: ${state.project.unit || '-'}`,
    `Auftragsnummer: ${state.project.orderNo || '-'}`,
    `Bearbeiter: ${state.project.worker || '-'}`,
    `Aufmassdauer: ${fmtTime(state.minutes)}`,
    `Erstellt: ${new Date().toLocaleString('de-DE')}`,
    '',
    `Erfasste Positionen: ${state.positions.length}`,
    ''
  ];

  state.positions.forEach((p,index)=>{
    lines.push(`${index+1}. ${p.module}${p.name ? ` - ${p.name}` : ''}`);
    lines.push(`   Material: ${p.material || '-'} | Dimension: ${p.dn || '-'} | Laenge: ${Number(p.length||0).toLocaleString('de-DE')} m`);
    const qty = Object.entries(p.qty || {}).filter(([,v])=>Number(v)>0).map(([k,v])=>`${k}: ${v}`).join(' | ');
    if(qty) lines.push(`   Formteile: ${qty}`);
    if(p.notes) lines.push(`   Hinweis: ${p.notes}`);
    lines.push('');
  });

  if(!state.positions.length) lines.push('Keine Positionen erfasst.');
  return lines;
}

function makePdfBlob(){
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 48;
  const topY = 790;
  const lineHeight = 16;
  const linesPerPage = 43;
  const sourceLines = buildPdfLines().map(pdfSafe);
  const pages = [];
  for(let i=0;i<sourceLines.length;i+=linesPerPage) pages.push(sourceLines.slice(i,i+linesPerPage));
  if(!pages.length) pages.push(['SHK FIX - Abwasser-Aufmass']);

  const objects = [];
  const addObject = body => { objects.push(body); return objects.length; };
  const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageObjIds = [];
  const contentObjIds = [];

  pages.forEach((pageLines,pageIndex)=>{
    let stream = 'BT\n/F1 11 Tf\n';
    let y = topY;
    pageLines.forEach((line,lineIndex)=>{
      const isTitle = pageIndex===0 && lineIndex===0;
      stream += `${isTitle ? '/F2 16 Tf' : '/F1 11 Tf'}\n1 0 0 1 ${marginX} ${y} Tm\n(${line}) Tj\n`;
      y -= isTitle ? 28 : lineHeight;
    });
    stream += 'ET';
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    contentObjIds.push(contentId);
    const pageId = addObject('PENDING_PAGE');
    pageObjIds.push(pageId);
  });

  const pagesObj = addObject('PENDING_PAGES');
  const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  pageObjIds.forEach((pageId,i)=>{
    objects[pageId-1] = `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${boldFontObj} 0 R >> >> /Contents ${contentObjIds[i]} 0 R >>`;
  });
  objects[pagesObj-1] = `<< /Type /Pages /Kids [${pageObjIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body,i)=>{
    offsets.push(pdf.length);
    pdf += `${i+1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objects.length;i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length+1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], {type:'application/pdf'});
}

function downloadPdf(){
  const blob = makePdfBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function shareProject(){
  const title=`Abwasser-Aufmaß | ${state.project.object} | ${state.project.unit}`;
  const text=createShareText();
  const file = new File([makePdfBlob()], pdfFileName(), {type:'application/pdf'});

  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try {
      await navigator.share({title,text,files:[file]});
      return;
    } catch(e){
      if(e.name==='AbortError') return;
    }
  }

  if(navigator.share){
    try {
      await navigator.share({title,text});
      downloadPdf();
      alert('Die PDF wurde zusätzlich gespeichert. Du kannst sie jetzt in Mail oder WhatsApp anhängen.');
      return;
    } catch(e){ if(e.name==='AbortError') return; }
  }

  downloadPdf();
  await navigator.clipboard?.writeText(text);
  alert('PDF gespeichert und Zusammenfassung kopiert. Jetzt über Mail oder WhatsApp teilen.');
}

function savePosition(){
  const qty={}; document.querySelectorAll('.qty').forEach(el=>qty[el.dataset.name]=Number(el.dataset.value));
  state.positions.push({
    module:state.currentModule,
    name:document.getElementById('positionName').value.trim(),
    material:document.getElementById('material').value,
    dn:document.getElementById('dn').value,
    length:Number(document.getElementById('length').value||0),
    qty,
    notes:document.getElementById('notes').value.trim(),
    createdAt:new Date().toISOString()
  });
  saveState(); render('measure');
}

document.addEventListener('click', async e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  const module=e.target.closest('[data-module]')?.dataset.module;
  const nav=e.target.closest('[data-nav]')?.dataset.nav;
  const qtyAction=e.target.dataset.qty;

  if(nav) render(nav);
  if(module){ state.currentModule=module; saveState(); render('module'); }
  if(qtyAction){
    const box=e.target.closest('.qty'); let v=Number(box.dataset.value);
    v=qtyAction==='plus'?v+1:Math.max(0,v-1); box.dataset.value=String(v); box.querySelector('b').textContent=v;
  }
  if(action==='start'){
    state.project={object:document.getElementById('object').value.trim(),unit:document.getElementById('unit').value.trim(),orderNo:document.getElementById('orderNo').value.trim(),worker:document.getElementById('worker').value.trim()};
    if(!state.project.object||!state.project.unit||!state.project.worker){ alert('Objekt, Wohnung/Bereich und Bearbeiter sind Pflicht.'); return; }
    saveState(); render('measure');
  }
  if(action==='plus-time'){ state.minutes+=15; saveState(); document.getElementById('timeValue').textContent=fmtTime(state.minutes); }
  if(action==='minus-time'){ state.minutes=Math.max(15,state.minutes-15); saveState(); document.getElementById('timeValue').textContent=fmtTime(state.minutes); }
  if(action==='to-summary') render('summary');
  if(action==='back-measure') render('measure');
  if(action==='save-position') savePosition();
  if(action==='print') downloadPdf();
  if(action==='share') await shareProject();
});

document.getElementById('homeBtn').addEventListener('click',()=>render('project'));

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js')); }
render(state.project.object?'measure':'project');