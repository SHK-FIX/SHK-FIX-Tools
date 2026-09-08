(()=>{
  const MODULES=['Fallleitung','Grundleitung','Anschlussleitungen','Brandschutz'];
  const DN=['DN 32','DN 40','DN 50','DN 56','DN 63','DN 70','DN 75','DN 80','DN 90','DN 100','DN 110','DN 125','DN 150','DN 160','DN 200','DN 250','DN 300'];
  const MATERIALS=['HT','KG','SML','PE-HD','DB20','Sonstiges'];
  const BEND_ANGLES=['15°','30°','45°','67°','87°'];
  const BRANCH_ANGLES=['45°','67°','87°'];

  const opt=(arr,selected='')=>arr.map(v=>`<option${v===selected?' selected':''}>${v}</option>`).join('')+`<option value="custom">andere DN …</option>`;
  const materialOpts=()=>MATERIALS.map(v=>`<option>${v}</option>`).join('');

  function dnControl(cls,label,selected='DN 100'){
    return `<label>${label}<select class="${cls} dn-select">${opt(DN,selected)}</select><input class="${cls}-custom dn-custom" placeholder="z. B. DN 120" hidden></label>`;
  }
  function getDn(row,cls){const s=row.querySelector(`.${cls}`);if(!s)return'';return s.value==='custom'?(row.querySelector(`.${cls}-custom`)?.value.trim()||'andere DN'):s.value;}
  function qtyInput(){return '<label>Menge<input class="part-qty" type="number" min="1" step="1" value="1" inputmode="numeric"></label>';}

  function pipeRow(){const el=document.createElement('div');el.className='part-row';el.dataset.kind='Rohr';el.innerHTML=`${dnControl('pipe-dn','Rohrdimension')}<label>Länge (m)<input class="pipe-length" type="number" min="0" step="0.1" value="0" inputmode="decimal"></label><button type="button" class="row-delete" aria-label="Zeile löschen">×</button>`;return el;}
  function bendRow(){const el=document.createElement('div');el.className='part-row';el.dataset.kind='Bogen';el.innerHTML=`${dnControl('part-dn','Dimension')}<label>Winkel<select class="part-angle">${opt(BEND_ANGLES,'45°').replace('<option value="custom">andere DN …</option>','')}</select></label>${qtyInput()}<button type="button" class="row-delete">×</button>`;return el;}
  function branchRow(){const el=document.createElement('div');el.className='part-row branch-row';el.dataset.kind='Abzweig';el.innerHTML=`${dnControl('main-dn','Hauptleitung')}${dnControl('branch-dn','Abgang','DN 70')}<label>Winkel<select class="part-angle">${BRANCH_ANGLES.map(v=>`<option>${v}</option>`).join('')}</select></label>${qtyInput()}<button type="button" class="row-delete">×</button>`;return el;}
  function clampRow(){const el=document.createElement('div');el.className='part-row';el.dataset.kind='Schelle';el.innerHTML=`${dnControl('part-dn','Schellendimension')}${qtyInput()}<button type="button" class="row-delete">×</button>`;return el;}
  function reducerRow(){const el=document.createElement('div');el.className='part-row reducer-row';el.dataset.kind='Reduzierung';el.innerHTML=`${dnControl('from-dn','von')}${dnControl('to-dn','auf','DN 70')}${qtyInput()}<button type="button" class="row-delete">×</button>`;return el;}
  function sleeveRow(){const el=document.createElement('div');el.className='part-row';el.dataset.kind='Muffe';el.innerHTML=`${dnControl('part-dn','Dimension')}${qtyInput()}<button type="button" class="row-delete">×</button>`;return el;}

  function addRow(kind){const host=document.getElementById('partsHost');if(!host)return;const makers={Bogen:bendRow,Abzweig:branchRow,Schelle:clampRow,Reduzierung:reducerRow,Muffe:sleeveRow};host.appendChild(makers[kind]());}

  function renderModuleV2(module){
    state.currentModule=module;saveState();
    app.innerHTML=`<section><button class="back" id="v2Back">← Zurück</button><div class="eyebrow">Bereich erfassen</div><h1>${module}</h1>
      <div class="card form-grid"><label>Bezeichnung / Lage<input id="v2Name" placeholder="z. B. Schacht Bad EG"></label><label>Material<select id="v2Material">${materialOpts()}</select></label></div>
      <div class="card"><div class="row between"><div><h2>Rohre</h2><p class="hint">Mehrere Dimensionen in einer Position möglich.</p></div><button type="button" class="secondary compact" id="addPipe">+ Rohr</button></div><div id="pipesHost" class="parts-list"></div></div>
      <div class="card"><h2>Formteile</h2><div class="part-buttons"><button type="button" class="secondary" data-add-part="Bogen">+ Bogen</button><button type="button" class="secondary" data-add-part="Abzweig">+ Abzweig</button><button type="button" class="secondary" data-add-part="Schelle">+ Schelle</button><button type="button" class="secondary" data-add-part="Reduzierung">+ Reduzierung</button><button type="button" class="secondary" data-add-part="Muffe">+ Muffe</button></div><div id="partsHost" class="parts-list"></div></div>
      <div class="card"><label>Besonderheiten<textarea id="v2Notes" rows="4" placeholder="Bestand, Sonderlösung, schwer zugänglich …"></textarea></label></div>
      <button class="primary full" id="v2Save">Position speichern</button></section>`;
    document.getElementById('pipesHost').appendChild(pipeRow());
    document.getElementById('v2Back').onclick=()=>render('measure');
    document.getElementById('addPipe').onclick=()=>document.getElementById('pipesHost').appendChild(pipeRow());
    document.querySelectorAll('[data-add-part]').forEach(b=>b.onclick=()=>addRow(b.dataset.addPart));
    document.getElementById('v2Save').onclick=saveV2;
  }

  function saveV2(){
    const pipes=[...document.querySelectorAll('#pipesHost .part-row')].map(r=>({dn:getDn(r,'pipe-dn'),length:Number(r.querySelector('.pipe-length')?.value||0)})).filter(p=>p.dn||p.length);
    const components=[...document.querySelectorAll('#partsHost .part-row')].map(r=>{
      const kind=r.dataset.kind,qty=Math.max(1,Number(r.querySelector('.part-qty')?.value||1));
      if(kind==='Bogen')return{kind,dn:getDn(r,'part-dn'),angle:r.querySelector('.part-angle')?.value,qty};
      if(kind==='Abzweig')return{kind,mainDn:getDn(r,'main-dn'),branchDn:getDn(r,'branch-dn'),angle:r.querySelector('.part-angle')?.value,qty};
      if(kind==='Schelle'||kind==='Muffe')return{kind,dn:getDn(r,'part-dn'),qty};
      if(kind==='Reduzierung')return{kind,fromDn:getDn(r,'from-dn'),toDn:getDn(r,'to-dn'),qty};
      return{kind,qty};
    });
    state.positions.push({module:state.currentModule,name:document.getElementById('v2Name').value.trim(),material:document.getElementById('v2Material').value,pipes,components,notes:document.getElementById('v2Notes').value.trim(),createdAt:new Date().toISOString()});
    saveState();render('measure');
  }

  document.addEventListener('change',e=>{if(!e.target.matches('.dn-select'))return;const custom=e.target.parentElement.querySelector('.dn-custom');if(custom)custom.hidden=e.target.value!=='custom';},true);
  document.addEventListener('click',e=>{const del=e.target.closest('.row-delete');if(del){e.preventDefault();del.closest('.part-row')?.remove();}},true);
  document.addEventListener('click',e=>{const tile=e.target.closest('[data-module]');const module=tile?.dataset.module;if(!MODULES.includes(module))return;e.preventDefault();e.stopImmediatePropagation();renderModuleV2(module);},true);

  window.SHKModuleV2={DN,MATERIALS,renderModuleV2};
})();