
// CORE isolation: process the boundary once, then skip downstream geometry and DOM writes.
const coreStageForMotion=document.getElementById('reel');
let coreMotionEnd=coreStageForMotion?Math.max(0,coreStageForMotion.offsetHeight-innerHeight*1.5):0;
let coreMotionQuiet=false;
function refreshCoreMotionEnd(){coreMotionEnd=coreStageForMotion?Math.max(0,coreStageForMotion.offsetHeight-innerHeight*1.5):0;coreMotionQuiet=false}
addEventListener('resize',refreshCoreMotionEnd,{passive:true});
addEventListener('pageshow',refreshCoreMotionEnd);
function skipCoreMotion(){
 const quiet=!!coreStageForMotion&&scrollY<coreMotionEnd;
 const skip=quiet&&coreMotionQuiet;coreMotionQuiet=quiet;return skip;
}
const contact=document.getElementById('contacto');
const texts=[...document.querySelectorAll('#contacto [data-end-text]')],cells=[...contact.querySelectorAll('.contact-grid :is(a,button)')];
const grid=contact.querySelector('.contact-grid');
const footer=contact.querySelector('.footer');
const reduce=matchMedia('(prefers-reduced-motion:reduce)');
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{const p=clamp(v);return p*p*(3-2*p)};
let frame=0,state={};
function paint(){
 frame=0;
 if(skipCoreMotion())return;const h=Math.max(innerHeight,1),r=reduce.matches;
 const textRects=texts.map(t=>t.getBoundingClientRect());
 const rect=grid.getBoundingClientRect();
 const offsets=cells.map(c=>c.offsetTop);
 const footTop=footer.offsetTop+contact.getBoundingClientRect().top;
 const maxY=document.documentElement.scrollHeight-h;
 const shifts=textRects.map((rect,i)=>{
  const shift=r?0:112*(ease((h*.99-rect.top)/(h*.27))*ease((rect.bottom-h*.015)/(h*.22))-1);
  setMotionStyle(texts[i],'--end-shift',shift.toFixed(3)+'%');return shift;
 });
 setMotionStyle(grid,'--grid-line',(100*(r?1:ease((h-rect.top)/(h*.26)))).toFixed(3)+'%');
 const entries=cells.map((c,i)=>{
  const top=rect.top+offsets[i];
  const p=r?1:ease((h*.99-top)/(h*.26)),cut=(1-p)*100,dx=(i%2?1:-1)*(1-p)*55,dy=(i<2?-1:1)*(1-p)*45;
  for(const [k,v] of Object.entries({top:i<2?0:cut,bottom:i<2?cut:0,left:i%2?cut:0,right:i%2?0:cut}))setMotionStyle(c,'--cell-'+k,v.toFixed(3)+'%');
  setMotionStyle(c,'--cell-x',dx.toFixed(3)+'px');setMotionStyle(c,'--cell-y',dy.toFixed(3)+'px');return p;
 });
 const fp=r?1:Math.max(ease((h-footTop)/(h*.12)),ease(1-(maxY-scrollY)/(h*.18)));
 setMotionStyle(footer,'--footer-cut',((1-fp)*100).toFixed(3)+'%');setMotionStyle(footer,'--footer-y',((1-fp)*18).toFixed(3)+'px');
 state={inset:0,shifts,entries,footer:fp};
}
function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('pageshow',schedule);reduce.addEventListener('change',schedule);document.fonts?.ready.then(schedule);new ResizeObserver(schedule).observe(contact);paint();
window.__JG_END_QA__=()=>structuredClone(state);

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}


// FIN-03 — reuse the existing LIVE Formspree endpoint without navigating there.
const consultationDialog=document.getElementById('jg-consulta-dialog');
const consultationOpen=document.getElementById('jg-consulta-open');
const consultationForm=document.getElementById('jg-consulta-form');
const consultationStatus=document.getElementById('jg-consulta-status');
const consultationSend=document.getElementById('jg-consulta-send');
let consultationPending=false;
let consultationY=0;
consultationOpen.addEventListener('click',()=>{
 if(consultationDialog.open)return;
 consultationY=scrollY;
 consultationDialog.showModal();
 document.documentElement.classList.add('jg-consulta-open');
});
document.getElementById('jg-consulta-close').addEventListener('click',()=>consultationDialog.close());
consultationDialog.addEventListener('close',()=>{
 document.documentElement.classList.remove('jg-consulta-open');
 consultationOpen.focus({preventScroll:true});
 scrollTo({top:consultationY,behavior:'instant'});
});
for(const field of consultationForm.querySelectorAll('[required]')){
 field.addEventListener('input',()=>field.setCustomValidity(''));
}
consultationForm.addEventListener('submit',async event=>{
 event.preventDefault();
 if(consultationPending)return;
 for(const field of consultationForm.querySelectorAll('[required]')){
  field.value=field.value.trim();
  field.setCustomValidity(field.value?'':'Completá este campo.');
 }
 if(!consultationForm.reportValidity())return;
 consultationPending=true;consultationSend.disabled=true;consultationForm.setAttribute('aria-busy','true');
 consultationSend.textContent='Enviando…';consultationStatus.textContent='Enviando tu consulta…';
 try{
  const response=await fetch(consultationForm.action,{method:'POST',body:new FormData(consultationForm),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const result=await response.json();
  if(result.ok===false||result.errors?.length)throw Error('No aceptado');
  consultationForm.reset();
  consultationStatus.textContent='Recibimos tu consulta. Te respondemos por correo a la brevedad.';
 }catch{
  consultationStatus.textContent='No pudimos confirmar el envío. Tus datos siguen aquí; podés reintentar o comunicarte por WhatsApp.';
 }finally{
  consultationPending=false;consultationSend.disabled=false;consultationForm.removeAttribute('aria-busy');
  consultationSend.replaceChildren(document.createTextNode('Enviar consulta '),Object.assign(document.createElement('span'),{textContent:'↗'}));
  consultationSend.lastElementChild.setAttribute('aria-hidden','true');
 }
});
