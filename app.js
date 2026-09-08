const app = document.getElementById('app');

const defaultState = {
  project: { object:'', unit:'', orderNo:'', worker:'Max' },
  minutes: 60,
  positions: [],
  currentModule: null,
  survey: null,
  status: null
};

let state = loadState();

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem('shkfix-aufmass') || '{}');
    return {
      ...defaultState,
      ...saved,
      project: { ...defaultState.project, ...(saved.project || {}) },
      positions: Array.isArray(saved.positions) ? saved.positions : []
    };
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState(){
  localStorage.setItem('shkfix-aufmass', JSON.stringify(state));
}

function fmtTime(min){
  const value = Math.max(0, Number(min) || 0);
  const h = Math.floor(value / 60);
  const m = value % 60;
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

function createShareText(){
  return `SHK FIX Abwasser-Aufmaß\nObjekt: ${state.project.object || '–'}\nBereich: ${state.project.unit || '–'}\nAuftragsnr.: ${state.project.orderNo || '–'}\nBearbeiter: ${state.project.worker || '–'}\nArbeitszeit: ${fmtTime(state.minutes)}`;
}

function render(name){
  if(name !== 'project'){
    if(window.SHKWorkflowV4?.renderHome) window.SHKWorkflowV4.renderHome();
    return;
  }

  const template = document.getElementById('screen-project');
  if(!template) return;
  app.innerHTML = '';
  app.appendChild(template.content.cloneNode(true));
  ['object','unit','orderNo','worker'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = state.project[id] || '';
  });
  window.scrollTo({top:0,behavior:'smooth'});
}

function buildSummary(){}

function makePdfBlob(){
  return new Blob(['PDF-Modul wird geladen.'], {type:'application/pdf'});
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
  const file = new File([makePdfBlob()], pdfFileName(), {type:'application/pdf'});
  const title = `Abwasser-Aufmaß | ${state.project.object || ''} | ${state.project.unit || ''}`;
  const text = createShareText();
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    try { await navigator.share({title,text,files:[file]}); return; }
    catch(e){ if(e.name === 'AbortError') return; }
  }
  downloadPdf();
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=12'));
}
