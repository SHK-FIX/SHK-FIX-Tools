(()=>{
  const MODULES=['Fallleitung','Grundleitung','Anschlussleitungen','Brandschutz'];
  const DN=['DN 32','DN 40','DN 50','DN 56','DN 63','DN 70','DN 75','DN 80','DN 90','DN 100','DN 110','DN 125','DN 150','DN 160','DN 200','DN 250','DN 300'];
  const MATERIALS=['HT','KG','SML','PE-HD','DB20','Sonstiges'];
  const BEND_ANGLES=['15°','30°','45°','67°','87°'];
  const BRANCH_ANGLES=['45°','67°','87°'];

  const opt=(arr,selected='')=>arr.map(v=>`<option${v===selected?' selected':''}>${v}</option>`).join('')+`<option value="custom">andere DN …</option>`;
  const materialOpts=(selected='')=>MATERIALS.map(v=>`<option${v===selected?' selected':''}>${v}</option>`).join('');
  function dnControl(cls,label,selected='DN 100'){
    return `<label>${label}<select class="${cls} dn-select">${opt(DN,selected)}</select><input class="${cls}-custom dn-custom" placeholder="z. B. DN 120" hidden></label>`;
  }
  function getDn(row,cls){const s=row.querySelector(`.${cls}`);if(!s)return'';return s.value==='custom'?(row.querySelector(`.${cls}-custom`)?.value.trim()||'andere DN'):s.value;}
  function qtyStepper(value=1){return `<div class="qty-stepper" data-qty-value="${value}"><button type="button" class="qty-minus" aria-label="Menge verringern">−</button><strong class="qty-value">${value}</strong><button type="button" class="qty-plus" aria-label="Menge erhöhen">+</button></div>`;}
  function getQty(row){return Math.max(1,Number(row.querySelector('.qty-value')?.textContent||1));}

  function pipeRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Rohr';el.innerHTML=`<div class="part-card-head"><b>Rohr</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('pipe-dn','Rohrdimension')}<label>Länge (m)<input class="pipe-length" type="number" min="0" step="0.1" value="0" inputmode="decimal"></label></div>`;return el;}
  function bendRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Bogen';el.innerHTML=`<div class="part-card-head"><b>Bogen</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('part-dn','Dimension')}<label>Winkel<select class="part-angle">${BEND_ANGLES.map(v=>`<option>${v}</option>`).join('')}</select></label><div><span class="field-label">Menge</span>${qtyStepper()}</div></div>`;return el;}
  function branchRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Abzweig';el.innerHTML=`<div class="part-card-head"><b>Abzweig</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('main-dn','Hauptleitung')}${dnControl('branch-dn','Abgang','DN 70')}<label>Winkel<select class="part-angle">${BRANCH_ANGLES.map(v=>`<option>${v}</option>`).join('')}</select></label><div><span class="field-label">Menge</span>${qtyStepper()}</div></div>`;return el;}
  function clampRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Schelle';el.innerHTML=`<div class="part-card-head"><b>Schelle</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('part-dn','Schellendimension')}<div><span class="field-label">Menge</span>${qtyStepper()}</div></div>`;return el;}
  function reducerRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Reduzierung';el.innerHTML=`<div class="part-card-head"><b>Reduzierung</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('from-dn','von')}${dnControl('to-dn','auf','DN 70')}<div><span class="field-label">Menge</span>${qtyStepper()}</div></div>`;return el;}
  function sleeveRow(){const el=document.createElement('div');el.className='part-card';el.dataset.kind='Muffe';el.innerHTML=`<div class="part-card-head"><b>Muffe</b><button type="button" class="row-delete">Entfernen</button></div><div class="part-grid">${dnControl('part-dn','Dimension')}<div><span class="field-label">Menge</span>${qtyStepper()}</div></div>`;return el;}

  function addRow(kind){const host=document.getElementById('partsHost');if(!host)return;const makers={Bogen:bendRow,Abzweig:branchRow,Schelle:clampRow,Reduzierung:reducerRow,Muffe:sleeveRow};host.appendChild(makers[kind]());}

  function renderBrandschutz(){
    state.currentModule='Brandschutz';saveState();
    app.innerHTML=`<section><button class="back" id="v2Back">← Zurück</button><div class="eyebrow">Bereich erfassen</div><h1>Brandschutz</h1>
      <div class="card form-grid"><label>Bezeichnung / Lage<input id="v2Name" placeholder="z. B. Decke Bad EG"></label><label>Leitungsdimension<select id="fireDn">${opt(DN,'DN 100')}</select></label></div>
      <div class="card"><h2>Brandschutzverbinder</h2><div class="fire-row"><div><b>Verbinder</b><small>Dimension der Durchführung</small></div><select id="fireConnectorDn">${opt(DN,'DN 100')}</select>${qtyStepper()}</div></div>
      <div class="card"><h2>Brandschutzisolierung</h2><div class="fire-row"><div><b>Isolierung</b><small>Dämmstärke</small></div><select id="fireInsulation"><option>13 mm</option><option>20 mm</option><option selected>28 mm</option><option>30 mm</option><option>40 mm</option><option>Sonstiges</option></select>${qtyStepper()}</div></div>
      <div class="card"><h2>Betonarbeiten notwendig?</h2><div class="yesno"><label><input type="radio" name="concrete" value="ja"> Ja</label><label><input type="radio" name="concrete" value="nein" checked> Nein</label></div></div>
      <div class="card"><label>Hinweise<textarea id="v2Notes" rows="3" placeholder="z. B. Decke öffnen, Bestand unklar …"></textarea></label></div>
      <button class="primary full" id="v2Save">Brandschutz speichern</button></section>`;
    document.getElementById('v2Back').onclick=()=>render('measure');
    document.getElementById('v2Save').onclick=saveBrandschutz;
  }

  function renderModuleV2(module){
    if(module==='Brandschutz'){renderBrandschutz();return;}
    state.currentModule=module;saveState();
    app.innerHTML=`<section><button class="back" id="v2Back">← Zurück</button><div class="eyebrow">Bereich erfassen</div><h1>${module}</h1>
      <div class="card"><label>Bezeichnung / Lage<input id="v2Name" placeholder="z. B. Schacht Bad EG"></label></div>
      <div class="card material-split"><div><div class="eyebrow">Bestand</div><h2>Momentan verbaut</h2><label>Material<select id="existingMaterial">${materialOpts()}</select></label></div><div><div class="eyebrow">Neu</div><h2>Einzubauen</h2><label>Material<select id="newMaterial">${materialOpts()}</select></label></div></div>
      <div class="card"><div class="row between"><div><h2>Rohre</h2><p class="hint">Mehrere Dimensionen in einer Position möglich.</p></div><button type="button" class="secondary compact" id="addPipe">+ Rohr</button></div><div id="pipesHost" class="parts-list"></div></div>
      <div class="card"><h2>Formteile</h2><p class="hint">Formteil auswählen – danach erscheint es als eigene übersichtliche Karte.</p><div class="part-buttons"><button type="button" class="secondary" data-add-part="Bogen">+ Bogen</button><button type="button" class="secondary" data-add-part="Abzweig">+ Abzweig</button><button type="button" class="secondary" data-add-part="Schelle">+ Schelle</button><button type="button" class="secondary" data-add-part="Reduzierung">+ Reduzierung</button><button type="button" class="secondary" data-add-part="Muffe">+ Muffe</button></div><div id="partsHost" class="parts-list"></div></div>
      <div class="card"><label>Besonderheiten<textarea id="v2Notes" rows="4" placeholder="Bestand, Sonderlösung, schwer zugänglich …"></textarea></label></div>
      <button class="primary full" id="v2Save">Position speichern</button></section>`;
    document.getElementById('pipesHost').appendChild(pipeRow());
    document.getElementById('v2Back').onclick=()=>render('measure');
    document.getElementById('addPipe').onclick=()=>document.getElementById('pipesHost').appendChild(pipeRow());
    document.querySelectorAll('[data-add-part]').forEach(b=>b.onclick=()=>addRow(b.dataset.addPart));
    document.getElementById('v2Save').onclick=saveV2;
  }

  function saveBrandschutz(){
    const connectorRow=document.getElementById('fireConnectorDn').closest('.fire-row');
    const insulationRow=document.getElementById('fireInsulation').closest('.fire-row');
    state.positions.push({module:'Brandschutz',name:document.getElementById('v2Name').value.trim(),fire:{dn:document.getElementById('fireDn').value,connectorDn:document.getElementById('fireConnectorDn').value,connectorQty:getQty(connectorRow),insulation:document.getElementById('fireInsulation').value,insulationQty:getQty(insulationRow),concrete:document.querySelector('input[name="concrete"]:checked')?.value==='ja'},notes:document.getElementById('v2Notes').value.trim(),createdAt:new Date().toISOString()});
    saveState();render('measure');
  }

  function saveV2(){
    const pipes=[...document.querySelectorAll('#pipesHost .part-card')].map(r=>({dn:getDn(r,'pipe-dn'),length:Number(r.querySelector('.pipe-length')?.value||0)})).filter(p=>p.dn||p.length);
    const components=[...document.querySelectorAll('#partsHost .part-card')].map(r=>{
      const kind=r.dataset.kind,qty=getQty(r);
      if(kind==='Bogen')return{kind,dn:getDn(r,'part-dn'),angle:r.querySelector('.part-angle')?.value,qty};
      if(kind==='Abzweig')return{kind,mainDn:getDn(r,'main-dn'),branchDn:getDn(r,'branch-dn'),angle:r.querySelector('.part-angle')?.value,qty};
      if(kind==='Schelle'||kind==='Muffe')return{kind,dn:getDn(r,'part-dn'),qty};
      if(kind==='Reduzierung')return{kind,fromDn:getDn(r,'from-dn'),toDn:getDn(r,'to-dn'),qty};
      return{kind,qty};
    });
    state.positions.push({module:state.currentModule,name:document.getElementById('v2Name').value.trim(),existingMaterial:document.getElementById('existingMaterial').value,newMaterial:document.getElementById('newMaterial').value,material:document.getElementById('newMaterial').value,pipes,components,notes:document.getElementById('v2Notes').value.trim(),createdAt:new Date().toISOString()});
    saveState();render('measure');
  }

  document.addEventListener('change',e=>{if(!e.target.matches('.dn-select'))return;const custom=e.target.parentElement.querySelector('.dn-custom');if(custom)custom.hidden=e.target.value!=='custom';},true);
  document.addEventListener('click',e=>{
    const minus=e.target.closest('.qty-minus'),plus=e.target.closest('.qty-plus');
    if(minus||plus){e.preventDefault();const step=e.target.closest('.qty-stepper'),out=step.querySelector('.qty-value');let v=Number(out.textContent||1);v=plus?v+1:Math.max(1,v-1);out.textContent=v;step.dataset.qtyValue=v;return;}
    const del=e.target.closest('.row-delete');if(del){e.preventDefault();del.closest('.part-card')?.remove();}
  },true);
  document.addEventListener('click',e=>{const tile=e.target.closest('[data-module]');const module=tile?.dataset.module;if(!MODULES.includes(module))return;e.preventDefault();e.stopImmediatePropagation();renderModuleV2(module);},true);

  window.SHKModuleV2={DN,MATERIALS,renderModuleV2};
})();