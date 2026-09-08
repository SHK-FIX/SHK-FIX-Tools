(()=>{
  const DN=['DN 32','DN 40','DN 50','DN 56','DN 63','DN 70','DN 75','DN 80','DN 90','DN 100','DN 110','DN 125','DN 150','DN 160','DN 200','DN 250','DN 300'];
  const BEND_ANGLES=['15°','30°','45°','67°','87°'];
  const BRANCH_ANGLES=['45°','67°','87°'];
  const HISTORY_KEY='shkfix-aufmass-history';

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;
  const clone=o=>JSON.parse(JSON.stringify(o));

  function blankSurvey(){return{pipes:[{id:uid(),dn:'DN 100',meters:0}],bends:[],connectors:[],branches:[],extraMaterials:[],fire:{collars:[],insulation:[],concrete:null},notes:''};}
  function ensureSurvey(){if(!state.survey)state.survey=blankSurvey();if(!state.status)state.status=state.project?.object?'open':null;}
  function loadHistory(){try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
  function saveHistory(v){localStorage.setItem(HISTORY_KEY,JSON.stringify(v));}
  function saveAll(){saveState();}

  function dnOptions(selected='DN 100'){
    const known=DN.includes(selected)?selected:'custom';
    return DN.map(v=>`<option value="${v}"${v===known?' selected':''}>${v}</option>`).join('')+`<option value="custom"${known==='custom'?' selected':''}>andere Dimension …</option>`;
  }
  function dnField(role,label,value='DN 100'){
    const custom=!DN.includes(value);
    return `<label>${label}<select class="dn-picker" data-role="${role}">${dnOptions(value)}</select><input class="dn-custom-v4" data-custom-for="${role}" value="${custom?esc(value):''}" placeholder="z. B. DN 120" ${custom?'':'hidden'}></label>`;
  }
  function readDn(row,role){const s=row.querySelector(`[data-role="${role}"]`);if(!s)return'';return s.value==='custom'?(row.querySelector(`[data-custom-for="${role}"]`)?.value.trim()||'andere Dimension'):s.value;}
  function qtyControl(value=1){return `<div class="big-stepper qty-stepper" data-value="${Math.max(1,Number(value)||1)}"><button type="button" data-step="qty-minus" aria-label="Menge verringern">−</button><strong>${Math.max(1,Number(value)||1)}</strong><button type="button" data-step="qty-plus" aria-label="Menge erhöhen">+</button></div>`;}
  function meterControl(value=0){const v=Number(value)||0;return `<div class="meter-wrap"><input class="meter-value" type="number" min="0" step="0.1" inputmode="decimal" value="${v}"><span>m</span><div class="big-stepper meter-stepper"><button type="button" data-step="meter-minus">−</button><button type="button" data-step="meter-plus">+</button></div></div>`;}
  function cardTitle(title,hint,addLabel,addType){return `<div class="row between card-head"><div><h2>${title}</h2>${hint?`<p class="hint">${hint}</p>`:''}</div>${addLabel?`<button type="button" class="secondary compact" data-add="${addType}">+ ${addLabel}</button>`:''}</div>`;}

  function pipeRow(p){return `<article class="selection-card" data-kind="pipe" data-id="${p.id||uid()}">${dnField('pipe-dn','Rohrdimension',p.dn)}<label>Länge</label>${meterControl(p.meters)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function bendRow(p){return `<article class="selection-card" data-kind="bend" data-id="${p.id||uid()}">${dnField('bend-dn','Dimension',p.dn||'DN 100')}<label>Winkel<select class="bend-angle">${BEND_ANGLES.map(v=>`<option${v===(p.angle||'45°')?' selected':''}>${v}</option>`).join('')}</select></label><label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function connectorRow(p){return `<article class="selection-card" data-kind="connector" data-id="${p.id||uid()}"><label>Bauteil<select class="connector-type"><option${p.type==='Verbinder'?' selected':''}>Verbinder</option><option${p.type==='Übergang'?' selected':''}>Übergang</option><option${p.type==='Muffe'?' selected':''}>Muffe</option><option${p.type==='Schelle'?' selected':''}>Schelle</option><option${p.type==='Sonstiges'?' selected':''}>Sonstiges</option></select></label>${dnField('connector-dn','Dimension',p.dn||'DN 100')}${dnField('connector-dn2','2. Dimension / Übergang',p.dn2||'DN 70')}<label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function branchRow(p){return `<article class="selection-card" data-kind="branch" data-id="${p.id||uid()}">${dnField('main-dn','Hauptleitung',p.mainDn||'DN 100')}${dnField('branch-dn','Abgang',p.branchDn||'DN 70')}<label>Winkel<select class="branch-angle">${BRANCH_ANGLES.map(v=>`<option${v===(p.angle||'45°')?' selected':''}>${v}</option>`).join('')}</select></label><label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function extraRow(p){return `<article class="selection-card" data-kind="extra" data-id="${p.id||uid()}"><label>Material / Beschreibung<input class="extra-name" value="${esc(p.name||'')}" placeholder="z. B. Übergangsstück Bestand"></label><label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function collarRow(p){return `<article class="selection-card" data-kind="collar" data-id="${p.id||uid()}">${dnField('collar-dn','Manschette',p.dn||'DN 100')}<label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}
  function insulationRow(p){return `<article class="selection-card" data-kind="insulation" data-id="${p.id||uid()}">${dnField('insulation-dn','Brandschutzisolierung',p.dn||'DN 100')}<label>Menge</label>${qtyControl(p.qty)}<button type="button" class="row-delete" data-remove>Entfernen</button></article>`;}

  function resetCurrent(){
    state.project={object:'',unit:'',orderNo:'',worker:state.project?.worker||'Max'};
    state.minutes=60;state.positions=[];state.currentModule=null;state.survey=blankSurvey();state.status=null;saveAll();
  }

  function renderHome(){
    const history=loadHistory();
    const hasOpen=!!(state.project?.object&&state.status==='open');
    app.innerHTML=`<section class="home-v4"><div class="eyebrow">SHK FIX</div><h1>Abwasser-Aufmaß</h1><p class="lead">Schnell erfassen, lokal speichern und sauber ans Büro übergeben.</p>
      <button class="primary hero-action" id="newSurvey">＋ Neues Aufmaß</button>
      <div class="card"><div class="row between"><div><div class="eyebrow">Verlauf</div><h2>Aufmaß-Verlauf</h2></div><span class="status">${history.length+(hasOpen?1:0)}</span></div>
        <h3>Offene Aufmaße</h3><div class="history-list">${hasOpen?`<button class="history-item" id="resumeOpen"><span><b>${esc(state.project.object)}</b><small>${esc(state.project.unit||'')}</small></span><strong>Weiter →</strong></button>`:'<p class="hint">Keine offenen Aufmaße.</p>'}</div>
        <h3>Abgeschlossene Aufmaße</h3><div class="history-list">${history.length?history.slice().reverse().map(h=>`<div class="history-item static"><span><b>${esc(h.project?.object||'Aufmaß')}</b><small>${esc(h.project?.unit||'')} · ${new Date(h.completedAt).toLocaleDateString('de-DE')}</small></span><strong>✓</strong></div>`).join(''):'<p class="hint">Noch keine abgeschlossenen Aufmaße.</p>'}</div>
      </div></section>`;
    document.getElementById('newSurvey').onclick=()=>{resetCurrent();renderProjectStart();};
    document.getElementById('resumeOpen')?.addEventListener('click',renderSurvey);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderProjectStart(){
    render('project');
    const section=app.querySelector('section');
    section?.insertAdjacentHTML('afterbegin','<button class="back" id="projectHome">← Hauptseite</button>');
    const back=document.getElementById('projectHome');if(back)back.onclick=renderHome;
  }

  function normalizeSurvey(){
    ensureSurvey();
    if(!Array.isArray(state.survey.pipes))state.survey.pipes=[];
    if(!Array.isArray(state.survey.bends))state.survey.bends=[];
    if(!Array.isArray(state.survey.connectors))state.survey.connectors=[];
    if(!Array.isArray(state.survey.branches))state.survey.branches=[];
    if(!Array.isArray(state.survey.extraMaterials))state.survey.extraMaterials=[];
    if(!state.survey.fire)state.survey.fire={collars:[],insulation:[],concrete:null};
    if(!Array.isArray(state.survey.fire.collars))state.survey.fire.collars=[];
    if(!Array.isArray(state.survey.fire.insulation))state.survey.fire.insulation=[];
    if(!state.survey.pipes.length)state.survey.pipes.push({id:uid(),dn:'DN 100',meters:0});
  }

  function renderSurvey(){
    normalizeSurvey();state.status='open';saveAll();
    const s=state.survey;
    app.innerHTML=`<section class="survey-v4"><button class="back" id="surveyHome">← Hauptseite</button><div class="row between"><div><div class="eyebrow">Neues Aufmaß</div><h1>${esc(state.project.object)}</h1><p class="lead">${esc(state.project.unit||'')}</p></div><span class="status">Offline gespeichert</span></div>
      <div class="card">${cardTitle('1. Rohrdimensionen','Mehrere Dimensionen können gleichzeitig erfasst werden.','Rohr','pipe')}<div id="pipesV4" class="selection-list">${s.pipes.map(pipeRow).join('')}</div></div>
      <div class="card">${cardTitle('2. Bögen','Dimension, Winkel und Menge getrennt auswählen.','Bogen','bend')}<div id="bendsV4" class="selection-list">${s.bends.length?s.bends.map(bendRow).join(''):'<p class="empty-note">Noch keine Bögen ausgewählt.</p>'}</div></div>
      <div class="card">${cardTitle('3. Verbinder, Übergänge usw.','Für Sondermaße steht immer „andere Dimension“ zur Verfügung.','Bauteil','connector')}<div id="connectorsV4" class="selection-list">${s.connectors.length?s.connectors.map(connectorRow).join(''):'<p class="empty-note">Noch keine weiteren Formteile ausgewählt.</p>'}</div></div>
      <div class="card">${cardTitle('4. Abzweige','Hauptleitung, Abgang, Winkel und Menge.','Abzweig','branch')}<div id="branchesV4" class="selection-list">${s.branches.length?s.branches.map(branchRow).join(''):'<p class="empty-note">Noch keine Abzweige ausgewählt.</p>'}</div></div>
      <div class="card">${cardTitle('5. Zusatzmaterial','Freies Material, das in keine der oberen Gruppen passt.','Material','extra')}<div id="extraV4" class="selection-list">${s.extraMaterials.length?s.extraMaterials.map(extraRow).join(''):'<p class="empty-note">Kein Zusatzmaterial erfasst.</p>'}</div></div>
      <div class="card"><div class="eyebrow">Brandschutz</div><h2>6. Brandschutz</h2><div class="subsection">${cardTitle('Brandschutzmanschetten','Mehrere DN möglich.','Manschette','collar')}<div id="collarsV4" class="selection-list">${s.fire.collars.length?s.fire.collars.map(collarRow).join(''):'<p class="empty-note">Keine Manschetten ausgewählt.</p>'}</div></div><div class="subsection">${cardTitle('Brandschutzisolierung','Mehrere Dimensionen möglich.','Isolierung','insulation')}<div id="insulationV4" class="selection-list">${s.fire.insulation.length?s.fire.insulation.map(insulationRow).join(''):'<p class="empty-note">Keine Isolierung ausgewählt.</p>'}</div></div><div class="subsection"><h3>Betonarbeiten notwendig?</h3><div class="choice-pair"><button type="button" data-concrete="yes" class="choice ${s.fire.concrete===true?'active':''}">✓ Ja</button><button type="button" data-concrete="no" class="choice ${s.fire.concrete===false?'active':''}">Nein</button></div></div></div>
      <div class="card"><h2>7. Notizen</h2><textarea id="notesV4" rows="5" placeholder="Besonderheiten, Bestand, Zugänglichkeit …">${esc(s.notes||'')}</textarea></div>
      <div class="card"><div class="row between"><div><h2>8. Fotos</h2><p class="hint">Fotofunktion wird wieder angebunden, sobald der neue Ablauf stabil läuft.</p></div><span class="status" id="photoCountV4">0</span></div><button type="button" class="secondary full" id="openPhotosV4" disabled>📷 Fotos – folgt</button></div>
      <div class="card time-card-v4"><div><h2>9. Arbeitszeit</h2><p class="hint">In 15-Minuten-Schritten.</p></div><div class="big-stepper time-stepper"><button type="button" id="timeMinusV4">−</button><strong id="timeV4">${fmtTime(state.minutes)}</strong><button type="button" id="timePlusV4">+</button></div></div>
      <div class="finish-actions"><button type="button" class="finish-btn full" id="finishV4">✓ Aufmaß abschließen</button></div>
    </section>`;
    wireSurvey();window.scrollTo({top:0,behavior:'smooth'});
  }

  function appendItem(kind){normalizeSurvey();const s=state.survey;const makers={pipe:()=>({id:uid(),dn:'DN 100',meters:0}),bend:()=>({id:uid(),dn:'DN 100',angle:'45°',qty:1}),connector:()=>({id:uid(),type:'Verbinder',dn:'DN 100',dn2:'DN 70',qty:1}),branch:()=>({id:uid(),mainDn:'DN 100',branchDn:'DN 70',angle:'45°',qty:1}),extra:()=>({id:uid(),name:'',qty:1}),collar:()=>({id:uid(),dn:'DN 100',qty:1}),insulation:()=>({id:uid(),dn:'DN 100',qty:1})};const targets={pipe:s.pipes,bend:s.bends,connector:s.connectors,branch:s.branches,extra:s.extraMaterials,collar:s.fire.collars,insulation:s.fire.insulation};targets[kind].push(makers[kind]());saveAll();renderSurvey();}

  function syncSurveyFromDom(){normalizeSurvey();const s=state.survey;const qty=r=>Number(r.querySelector('.qty-stepper')?.dataset.value||1);s.pipes=[...document.querySelectorAll('[data-kind="pipe"]')].map(r=>({id:r.dataset.id,dn:readDn(r,'pipe-dn'),meters:Number(r.querySelector('.meter-value')?.value||0)}));s.bends=[...document.querySelectorAll('[data-kind="bend"]')].map(r=>({id:r.dataset.id,dn:readDn(r,'bend-dn'),angle:r.querySelector('.bend-angle')?.value||'45°',qty:qty(r)}));s.connectors=[...document.querySelectorAll('[data-kind="connector"]')].map(r=>({id:r.dataset.id,type:r.querySelector('.connector-type')?.value||'Verbinder',dn:readDn(r,'connector-dn'),dn2:readDn(r,'connector-dn2'),qty:qty(r)}));s.branches=[...document.querySelectorAll('[data-kind="branch"]')].map(r=>({id:r.dataset.id,mainDn:readDn(r,'main-dn'),branchDn:readDn(r,'branch-dn'),angle:r.querySelector('.branch-angle')?.value||'45°',qty:qty(r)}));s.extraMaterials=[...document.querySelectorAll('[data-kind="extra"]')].map(r=>({id:r.dataset.id,name:r.querySelector('.extra-name')?.value.trim()||'',qty:qty(r)}));s.fire.collars=[...document.querySelectorAll('[data-kind="collar"]')].map(r=>({id:r.dataset.id,dn:readDn(r,'collar-dn'),qty:qty(r)}));s.fire.insulation=[...document.querySelectorAll('[data-kind="insulation"]')].map(r=>({id:r.dataset.id,dn:readDn(r,'insulation-dn'),qty:qty(r)}));s.notes=document.getElementById('notesV4')?.value||'';saveAll();}

  function removeByRow(row){syncSurveyFromDom();const kind=row.dataset.kind,id=row.dataset.id,s=state.survey;const targets={pipe:s.pipes,bend:s.bends,connector:s.connectors,branch:s.branches,extra:s.extraMaterials,collar:s.fire.collars,insulation:s.fire.insulation};targets[kind]=targets[kind].filter(x=>x.id!==id);if(kind==='pipe'&&!targets[kind].length)targets[kind].push({id:uid(),dn:'DN 100',meters:0});saveAll();renderSurvey();}

  function wireSurvey(){
    document.getElementById('surveyHome').onclick=()=>{syncSurveyFromDom();renderHome();};
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{syncSurveyFromDom();appendItem(b.dataset.add);});
    document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeByRow(b.closest('.selection-card')));
    document.querySelectorAll('.dn-picker').forEach(s=>s.onchange=()=>{const custom=s.parentElement.querySelector('.dn-custom-v4');if(custom)custom.hidden=s.value!=='custom';syncSurveyFromDom();});
    document.querySelectorAll('input,select,textarea').forEach(el=>{if(!el.classList.contains('dn-picker'))el.addEventListener('change',syncSurveyFromDom);});
    document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
      const row=b.closest('.selection-card');
      if(b.dataset.step.startsWith('qty')){
        const stepper=b.closest('.qty-stepper');let v=Number(stepper.dataset.value||1);v=b.dataset.step==='qty-plus'?v+1:Math.max(1,v-1);stepper.dataset.value=v;stepper.querySelector('strong').textContent=v;
      }else if(row){
        const input=row.querySelector('.meter-value');let v=Number(input.value||0);v=b.dataset.step==='meter-plus'?v+.1:Math.max(0,v-.1);input.value=(Math.round(v*10)/10).toFixed(1);
      }
      syncSurveyFromDom();
    });
    document.querySelectorAll('[data-concrete]').forEach(b=>b.onclick=()=>{state.survey.fire.concrete=b.dataset.concrete==='yes';saveAll();renderSurvey();});
    document.getElementById('timeMinusV4').onclick=()=>{state.minutes=Math.max(15,state.minutes-15);saveAll();document.getElementById('timeV4').textContent=fmtTime(state.minutes);};
    document.getElementById('timePlusV4').onclick=()=>{state.minutes+=15;saveAll();document.getElementById('timeV4').textContent=fmtTime(state.minutes);};
    document.getElementById('finishV4').onclick=finishSurvey;
  }

  function finishSurvey(){syncSurveyFromDom();if(!confirm('Aufmaß als abgeschlossen speichern?'))return;const history=loadHistory();history.push({id:uid(),completedAt:new Date().toISOString(),project:clone(state.project),survey:clone(state.survey),minutes:state.minutes});saveHistory(history);resetCurrent();renderHome();}

  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='start'){
      e.preventDefault();e.stopImmediatePropagation();
      const project={object:document.getElementById('object')?.value.trim()||'',unit:document.getElementById('unit')?.value.trim()||'',orderNo:document.getElementById('orderNo')?.value.trim()||'',worker:document.getElementById('worker')?.value.trim()||''};
      if(!project.object||!project.unit||!project.worker){alert('Objekt, Wohnung/Bereich und Bearbeiter sind Pflicht.');return;}
      state.project=project;state.survey=blankSurvey();state.status='open';state.minutes=60;state.positions=[];saveAll();renderSurvey();
    }
  },true);

  window.SHKWorkflowV4={renderHome,renderSurvey};
  renderHome();
})();