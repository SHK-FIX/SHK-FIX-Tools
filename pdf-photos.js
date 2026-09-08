(()=>{
  const enc=new TextEncoder();
  const bytes=s=>enc.encode(s);
  const concat=parts=>{const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;};
  const winMap={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
  function winBytes(value){const a=[];for(const ch of String(value??'')){const cp=ch.codePointAt(0);a.push(cp<=255?cp:(winMap[ch]??63));}return new Uint8Array(a);}
  function pdfText(value){const raw=winBytes(value),out=[];for(const b of raw){if(b===92||b===40||b===41)out.push(92);out.push(b);}return new Uint8Array(out);}
  function objText(id,text){return concat([bytes(`${id} 0 obj\n`),bytes(text),bytes('\nendobj\n')]);}
  function objStream(id,dict,stream){return concat([bytes(`${id} 0 obj\n<< ${dict} /Length ${stream.length} >>\nstream\n`),stream,bytes('\nendstream\nendobj\n')]);}
  function jpegSize(buf){const d=new DataView(buf);if(d.getUint16(0)!==0xffd8)throw new Error('Ungültiges JPEG.');let o=2;while(o<d.byteLength){if(d.getUint8(o)!==0xff){o++;continue;}const marker=d.getUint8(o+1);o+=2;if(marker===0xd8||marker===0xd9)continue;if(o+2>d.byteLength)break;const len=d.getUint16(o);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){return {height:d.getUint16(o+3),width:d.getUint16(o+5)};}o+=len;}throw new Error('JPEG-Größe konnte nicht gelesen werden.');}
  function lineCmd(text,x,y,font='F1',size=11){return concat([bytes(`BT\n/${font} ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(`),pdfText(text),bytes(') Tj\nET\n')]);}
  function wrap(text,max=72){const words=String(text||'').split(/\s+/),lines=[];let line='';for(const w of words){if(!w)continue;const next=line?`${line} ${w}`:w;if(next.length>max&&line){lines.push(line);line=w;}else line=next;}if(line)lines.push(line);return lines;}
  async function makePdfBlobWithPhotos(){
    const photos=(window.SHKPhotos?await SHKPhotos.list():[]).slice().reverse();
    const objects=[];let next=1;const reserve=()=>next++;
    const font=reserve(),bold=reserve(),pagesObj=reserve(),catalog=reserve();
    objects[font]=objText(font,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects[bold]=objText(bold,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds=[];

    const sourceLines=buildPdfLines();
    for(let i=0;i<sourceLines.length;i+=43){const lines=sourceLines.slice(i,i+43),contentId=reserve(),pageId=reserve();let y=790;const parts=[];lines.forEach((line,j)=>{const title=i===0&&j===0;parts.push(lineCmd(line,48,y,title?'F2':'F1',title?16:11));y-=title?28:16;});const stream=concat(parts);objects[contentId]=objStream(contentId,'',stream);objects[pageId]=objText(pageId,`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentId} 0 R >>`);pageIds.push(pageId);}

    if(photos.length){
      const titleContent=reserve(),titlePage=reserve();const titleStream=concat([lineCmd('Fotodokumentation',48,790,'F2',16),lineCmd(`${photos.length} Foto${photos.length===1?'':'s'} zum Aufmaß`,48,762,'F1',11)]);objects[titleContent]=objStream(titleContent,'',titleStream);objects[titlePage]=objText(titlePage,`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${titleContent} 0 R >>`);pageIds.push(titlePage);
    }

    for(let idx=0;idx<photos.length;idx++){
      const p=photos[idx],ab=await p.blob.arrayBuffer(),img=new Uint8Array(ab),size=jpegSize(ab),imgId=reserve(),contentId=reserve(),pageId=reserve();
      objects[imgId]=objStream(imgId,`/Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,img);
      const maxW=499,maxH=585,scale=Math.min(maxW/size.width,maxH/size.height,1),w=Math.round(size.width*scale),h=Math.round(size.height*scale),x=Math.round((595-w)/2),y=190+Math.max(0,585-h);
      const parts=[bytes(`q\n${w} 0 0 ${h} ${x} ${y} cm\n/Im1 Do\nQ\n`),lineCmd(`Foto ${idx+1} – ${p.area||'Projekt allgemein'}`,48,150,'F2',12)];
      let ty=130;for(const l of wrap(p.note||'',78).slice(0,3)){parts.push(lineCmd(l,48,ty,'F1',10));ty-=14;}parts.push(lineCmd(new Date(p.createdAt).toLocaleString('de-DE'),48,82,'F1',9));
      const stream=concat(parts);objects[contentId]=objStream(contentId,'',stream);objects[pageId]=objText(pageId,`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> /XObject << /Im1 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);pageIds.push(pageId);
    }

    objects[pagesObj]=objText(pagesObj,`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);objects[catalog]=objText(catalog,`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
    const header=bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'),parts=[header],offsets=[0];let pos=header.length;for(let id=1;id<next;id++){offsets[id]=pos;parts.push(objects[id]);pos+=objects[id].length;}const xref=pos;let tail=`xref\n0 ${next}\n0000000000 65535 f \n`;for(let id=1;id<next;id++)tail+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;tail+=`trailer\n<< /Size ${next} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;parts.push(bytes(tail));return new Blob(parts,{type:'application/pdf'});
  }
  async function savePhotoPdf(){const blob=await makePdfBlobWithPhotos(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=pdfFileName();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  downloadPdf=savePhotoPdf;
  shareProject=async function(){const title=`Abwasser-Aufmaß | ${state.project.object} | ${state.project.unit}`,text=createShareText(),blob=await makePdfBlobWithPhotos(),file=new File([blob],pdfFileName(),{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({title,text,files:[file]});return;}catch(e){if(e.name==='AbortError')return;}}if(navigator.share){try{await navigator.share({title,text});await savePhotoPdf();alert('Die PDF mit Fotodokumentation wurde gespeichert und kann angehängt werden.');return;}catch(e){if(e.name==='AbortError')return;}}await savePhotoPdf();await navigator.clipboard?.writeText(text);alert('PDF mit Fotodokumentation gespeichert.');};
  window.SHKPdfPhotos={makePdfBlobWithPhotos};
})();