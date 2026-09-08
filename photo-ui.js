(()=>{
  const MODULE='Fotos & Notizen';
  function projectKey(){return [state.project.object,state.project.unit,state.project.orderNo].join('|')||'default';}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  async function renderPhotos(){
    app.innerHTML=`<section><button class="back" id="photoBack">← Zurück</button><div class="eyebrow">Dokumentation</div><h1>Fotos & Notizen</h1><p class="lead">Foto aufnehmen oder aus der Mediathek wählen. Alles bleibt lokal auf diesem Gerät.</p><div class="card"><label>Bereich<select id="photoArea"><option>Projekt allgemein</option><option>Fallleitung</option><option>Grundleitung</option><option>Anschlussleitungen</option><option>Brandschutz</option><option>Besonderheit</option></select></label><label style="margin-top:12px">Notiz<textarea id="photoNote" rows="3" placeholder="z. B. Schacht EG – Platz sehr eng"></textarea></label><input id="photoInput" type="file" accept="image/*" capture="environment" hidden><button class="primary full" id="photoAdd">📷 Foto aufnehmen / auswählen</button></div><div class="card"><div class="row between"><h2>Gespeicherte Fotos</h2><span class="status" id="photoCount">0</span></div><div id="photoGrid" class="photo-grid"></div></div></section>`;
    document.getElementById('photoBack').onclick=()=>render('measure');
    document.getElementById('photoAdd').onclick=()=>document.getElementById('photoInput').click();
    document.getElementById('photoInput').onchange=handlePhoto;
    await refreshGallery();
  }
  async function handlePhoto(e){
    const file=e.target.files?.[0]; if(!file) return;
    const btn=document.getElementById('photoAdd'); btn.disabled=true; btn.textContent='Foto wird gespeichert …';
    try{
      const blob=await SHKPhotoStore.compress(file);
      await SHKPhotoStore.put({id:crypto.randomUUID(),projectKey:projectKey(),area:document.getElementById('photoArea').value,note:document.getElementById('photoNote').value.trim(),blob,createdAt:new Date().toISOString()});
      document.getElementById('photoNote').value=''; e.target.value=''; await refreshGallery();
    }catch(err){alert('Foto konnte nicht gespeichert werden: '+err.message);}
    finally{btn.disabled=false;btn.textContent='📷 Foto aufnehmen / auswählen';}
  }
  async function refreshGallery(){
    const photos=await SHKPhotoStore.list(projectKey()); const host=document.getElementById('photoGrid');
    document.getElementById('photoCount').textContent=photos.length;
    if(!photos.length){host.innerHTML='<p class="hint">Noch keine Fotos gespeichert.</p>';return;}
    host.innerHTML='';
    for(const p of photos){
      const url=URL.createObjectURL(p.blob); const card=document.createElement('article'); card.className='photo-card';
      card.innerHTML=`<img src="${url}" alt="Aufmaßfoto"><div class="photo-meta"><b>${esc(p.area)}</b>${p.note?`<small>${esc(p.note)}</small>`:''}<small>${new Date(p.createdAt).toLocaleString('de-DE')}</small><button class="photo-delete" data-id="${p.id}">Foto löschen</button></div>`;
      card.querySelector('img').onload=()=>URL.revokeObjectURL(url); host.appendChild(card);
    }
    host.querySelectorAll('.photo-delete').forEach(b=>b.onclick=async()=>{if(confirm('Dieses Foto wirklich löschen?')){await SHKPhotoStore.remove(b.dataset.id);await refreshGallery();}});
  }
  document.addEventListener('click',e=>{const tile=e.target.closest(`[data-module="${MODULE}"]`);if(!tile)return;e.preventDefault();e.stopImmediatePropagation();state.currentModule=MODULE;saveState();renderPhotos();},true);
  const oldBuildSummary=buildSummary;
  buildSummary=function(){oldBuildSummary();SHKPhotoStore.list(projectKey()).then(photos=>{const items=[...document.querySelectorAll('#summaryModules .mini-item')];const row=items.find(el=>el.querySelector('span')?.textContent===MODULE);if(row)row.querySelector('b').textContent=photos.length;});};
  window.SHKPhotos={list:()=>SHKPhotoStore.list(projectKey()),projectKey,renderPhotos};
})();