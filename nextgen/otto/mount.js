
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
// Single lazy runtime in the same document; Shadow DOM isolates P2F's full-screen CSS.
const host=document.getElementById('otto-runtime');
const root=host.attachShadow({mode:'open'});
const assetURL=file=>{const url=new URL(file,import.meta.url);url.search=new URL(import.meta.url).search;return url.href};
const css=document.createElement('link');css.rel='stylesheet';css.href=assetURL('./styles.css');
const styleReady=new Promise((resolve,reject)=>{css.addEventListener('load',resolve,{once:true});css.addEventListener('error',()=>reject(Error('No se cargaron los estilos de OTTO')),{once:true})});
root.append(css,document.getElementById('otto-workspace-template').content.cloneNode(true));
const $=id=>root.getElementById(id);
let started=false;
window.__OTTO_BOOT_READY__=()=>{
 host.classList.add('otto-live');host.classList.remove('otto-3d-unavailable');
 $('retry-otto').hidden=true;$('progress').classList.add('hidden');
};
window.__OTTO_BOOT_ERROR__=message=>{
 host.classList.remove('otto-live');host.classList.add('otto-3d-unavailable');
 $('progress').classList.remove('hidden');$('progress').classList.add('otto-boot-failed');
 $('load-title').textContent='OTTO en vista previa';
 $('load-subtitle').textContent='No se pudo iniciar el 3D. '+String(message||'').slice(0,150);
 $('retry-otto').hidden=false;
};
$('retry-otto').addEventListener('click',()=>location.reload());
const observer=new IntersectionObserver(entries=>{
 if(started||!entries.some(e=>e.isIntersecting))return;
 started=true;observer.disconnect();
 $('load-title').textContent='Inicializando experiencia';$('load-subtitle').textContent='Cargando modelo 3D y animaciones…';
 styleReady.then(()=>import(assetURL('./main.js'))).catch(e=>window.__OTTO_BOOT_ERROR__(e.message));
},{rootMargin:'450px 0px'});
observer.observe(host);
window.__OTTO_MOUNT_QA__=()=>({started,live:host.classList.contains('otto-live'),failed:host.classList.contains('otto-3d-unavailable')});

// A single scroll-driven camera approach. No model copies and no change to rig.
const chapter=document.getElementById('otto'),pin=chapter.querySelector('.otto-pin');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
export function revealState(progress,small=false,staticMode=false){
 const p=staticMode?1:clamp(progress);
 const ramp=(a,b)=>ease((p-a)/(b-a));
 const pulse=(a,b,c)=>ramp(a,b)*(1-ramp(b,c));
 // Full-size character peeks from the right, glides in with a playful wave,
 // slightly overshoots, then settles into the original interactive framing.
 const flourish=pulse(.10,.36,.66);
 const hello=ramp(.08,.26)*(1-ramp(.64,.85));
 const beat=hello*Math.sin(Math.PI*5*(p-.08)/.66);
 const screenSlide=staticMode?0:1.10*(1-ramp(.03,.49))-.045*pulse(.43,.57,.77);
 const dock=ramp(.73,.95);
 const title=small?ramp(.24,.41):ramp(.46,.80);
 const nameFirst=staticMode?1:ramp(.015,.19),nameSecond=staticMode?1:ramp(.055,.25);
 // Swap the headline while the dock is revealed; no opacity or layout changes.
 const introExit=ramp(.72,.81),playFirst=ramp(.81,.90),playSecond=ramp(.84,.94),playCopy=ramp(.84,.95);
 return {progress:p,introExit,playFirst,playSecond,playCopy,zoom:small?1.08:1.18,dock,title,nameFirst,nameSecond,hello,beat,flourish,screenSlide,
   yaw:staticMode?0:-.36*pulse(.08,.25,.43)+.34*pulse(.30,.48,.72)-.12*hello,
   roll:staticMode?0:-.15*flourish+.09*beat,
   lift:staticMode?0:.32*flourish+.10*beat,
   slide:0,
   greeting:staticMode?0:hello};
}
let revealFrame=0,reveal={},lastRevealKey='';
const revealNarrow=matchMedia('(max-width:770px)');
const skip=chapter.querySelector('.otto-skip');
const controlsAnchor=document.getElementById('otto-controls');
const headline=document.getElementById('otto-heading');
const playCopyMask=chapter.querySelector('.otto-play-mask');
const gatedControls=[...root.querySelectorAll('.otto-dock,.scene-toolbar')];
function paintReveal(){
 revealFrame=0;
 if(skipCoreMotion())return;
 const top=parseFloat(getComputedStyle(pin).top)||0;
 const chapterTop=chapter.getBoundingClientRect().top;
 const lead=Math.max(0,innerHeight*.80-top);
 const entry=Math.max(1,controlsAnchor.offsetTop-64+top);
 const p=(top+lead-chapterTop)/(entry+lead);
 const next=revealState(p,revealNarrow.matches,reduced.matches);
 const bridge=reduced.matches?1:ease((innerHeight-chapterTop)/Math.max(1,innerHeight-top));
 const inset=(1-bridge)*(revealNarrow.matches?4:15);
 setMotionStyle(chapter,'--otto-bridge-inset',inset.toFixed(3)+'%');
 if(chapter.classList.contains('otto-bridging')!==(bridge<.999))chapter.classList.toggle('otto-bridging',bridge<.999);
 const key=JSON.stringify(next);
 if(key===lastRevealKey)return;
 lastRevealKey=key;reveal=next;
 host.dataset.revealZoom=String(reveal.zoom);
 host.dataset.revealPose=key;
 setMotionStyle(host,'--otto-scale',String(reveal.zoom));
 setMotionStyle(host,'--otto-poster-slide',(reveal.screenSlide*100).toFixed(3)+'vw');
 setMotionStyle(host,'--otto-stage-light',String(.15+.38*reveal.flourish+.25*reveal.greeting+.15*reveal.dock));
 setMotionStyle(host,'--otto-dock-reveal',((1-reveal.dock)*100).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-copy-shift',(-112*reveal.title).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-name-scale',String(1-.19*reveal.title));
 setMotionStyle(chapter,'--otto-name-first',((1-reveal.nameFirst)*112).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-name-second',((1-reveal.nameSecond)*112).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-intro-exit',(-112*reveal.introExit).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-play-first',((1-reveal.playFirst)*112).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-play-second',((1-reveal.playSecond)*112).toFixed(3)+'%');
 setMotionStyle(chapter,'--otto-play-copy',(-112*(1-reveal.playCopy)).toFixed(3)+'%');
 const playing=reveal.playFirst>=.5;
 const label=playing?'Jugá conmigo.':'Hola, soy OTTO.';
 if(headline.getAttribute('aria-label')!==label)headline.setAttribute('aria-label',label);
 const copyHidden=String(reveal.playCopy<.999);
 if(playCopyMask.getAttribute('aria-hidden')!==copyHidden)playCopyMask.setAttribute('aria-hidden',copyHidden);

 chapter.classList.toggle('otto-interaction',reveal.dock>=.999);
 chapter.classList.toggle('otto-copy-out',!reduced.matches&&reveal.title>=.999);
 const tab=reveal.title>=.999?-1:0;if(skip.tabIndex!==tab)skip.tabIndex=tab;
 for(const el of gatedControls)if(el.inert!==(reveal.dock<.999))el.inert=reveal.dock<.999;
 host.dispatchEvent(new Event('otto-reveal'));
}
function scheduleReveal(){if(!revealFrame)revealFrame=requestAnimationFrame(paintReveal)}
addEventListener('scroll',scheduleReveal,{passive:true});addEventListener('resize',scheduleReveal,{passive:true});addEventListener('pageshow',scheduleReveal);
reduced.addEventListener('change',scheduleReveal);
new ResizeObserver(scheduleReveal).observe(chapter);
paintReveal();
window.__OTTO_REVEAL_QA__=()=>({...reveal});

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}
