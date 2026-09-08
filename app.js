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

async function shareProject(){
  const title=`Abwasser-Aufmaß | ${state.project.object} | ${state.project.unit}`;
  const text=createShareText();
  if(navigator.share){
    try { await navigator.share({title,text}); return; } catch(e){ if(e.name==='AbortError') return; }
  }
  await navigator.clipboard?.writeText(text);
  alert('Zusammenfassung kopiert. Jetzt über Mail oder WhatsApp teilen.');
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
  if(action==='print') window.print();
  if(action==='share') await shareProject();
});

document.getElementById('homeBtn').addEventListener('click',()=>render('project'));

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js')); }
render(state.project.object?'measure':'project');