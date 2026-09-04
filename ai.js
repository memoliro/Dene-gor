// AI tools load only when a creator chooses to use them. Processing stays in-browser.
let removeBackground;
async function getRemover(){
  if(!removeBackground){
    const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
    removeBackground=mod.default;
  }
  return removeBackground;
}
async function cutout(file,status){
  status.textContent='Preparing the private AI workspace…';
  const remove=await getRemover();
  const result=await remove(file,{progress:(key,current,total)=>{
    if(total)status.textContent=`Downloading AI assets… ${Math.min(100,Math.round(current/total*100))}%`;
    else status.textContent='Separating subject from background…';
  }});
  status.textContent='Done — your transparent PNG is ready.';
  return result;
}
function makeDownload(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${name||'studioshift'}-cutout.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
const bgEditor=document.querySelector('[data-tool="remove-bg"]');
if(bgEditor){
  const run=bgEditor.querySelector('.ai-remove'),status=bgEditor.querySelector('.ai-status'),save=bgEditor.querySelector('.ai-download');
  run.addEventListener('click',async()=>{
    if(!bgEditor.file)return;run.disabled=true;run.textContent='Working…';status.classList.remove('error');
    try{bgEditor.result=await cutout(bgEditor.file,status);save.classList.remove('hidden');}
    catch(error){status.textContent='AI processing could not start. Please check your connection and try a modern browser.';status.classList.add('error');console.error(error);}
    finally{run.disabled=false;run.innerHTML='Remove background <span>✦</span>';}
  });
  save.addEventListener('click',()=>bgEditor.result&&makeDownload(bgEditor.result,bgEditor.name));
}
// Smart focus reuses the locally generated alpha mask: the visible subject is centred in Fill / crop mode.
const resize=document.querySelector('[data-tool="resize"]');
if(resize){
  const fit=resize.querySelector('#fitMode');
  const btn=document.createElement('button');btn.className='ai-button';btn.type='button';btn.innerHTML='✦ Smart focus <small>AI</small>';
  const note=document.createElement('p');note.className='ai-note';note.textContent='Finds the main visible subject and keeps it centered when cropping.';
  fit.parentElement.after(btn,note);
  btn.addEventListener('click',async()=>{
    if(!resize.file)return;btn.disabled=true;btn.textContent='Finding subject…';
    try{const status=document.createElement('span');const png=await cutout(resize.file,status);const url=URL.createObjectURL(png);const img=new Image();await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});const c=document.createElement('canvas');c.width=Math.min(600,img.width);c.height=Math.round(img.height*c.width/img.width);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const data=ctx.getImageData(0,0,c.width,c.height).data;let minX=c.width,minY=c.height,maxX=0,maxY=0,seen=false;for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3){if(data[(y*c.width+x)*4+3]>25){seen=true;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}URL.revokeObjectURL(url);if(!seen)throw Error('No subject found');resize.focusX=(minX+maxX)/(2*c.width);resize.focusY=(minY+maxY)/(2*c.height);resize.fit='cover';document.querySelector('#fitMode').querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.mode==='cover'));window.studioShiftRedraw(resize);btn.textContent='✓ Subject centered';}
    catch(error){btn.textContent='Try smart focus again';console.error(error);}
    finally{btn.disabled=false;}
  });
}
