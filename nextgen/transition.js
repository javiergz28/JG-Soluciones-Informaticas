
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
// FIN-01: no changes to the CORE player or approved Services modules.
const section=document.getElementById('servicios');
const masks=[...section.querySelectorAll('[data-handoff-text]')];
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const narrow=matchMedia('(max-width:767px)');
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
export function surfaceState(top,height,small=false,staticMode=false){
 const h=Math.max(1,height);
 const progress=staticMode?1:clamp((h-top)/(h*.62));
 return {progress,inset:(1-smooth(progress))*(small?3:7)};
}
export function textState(top,bottom,height,staticMode=false){
 const h=Math.max(1,height);
 const enter=staticMode?1:smooth((h*.99-top)/(h*.30));
 const exit=staticMode?1:smooth((bottom-h*.015)/(h*.20));
 return 112*(enter*exit-1);
}
let frame=0,state={progress:1,inset:0,shifts:[]};
function paint(){
 frame=0;
 if(skipCoreMotion())return;
 const h=innerHeight,staticMode=reduced.matches;
 const s=surfaceState(section.getBoundingClientRect().top,h,narrow.matches,staticMode);
 const shifts=masks.map(m=>{const r=m.getBoundingClientRect();return textState(r.top,r.bottom,h,staticMode)});
 state={...s,shifts};
 setMotionStyle(section,'--handoff-inset',s.inset.toFixed(3)+'%');
 for(let i=0;i<masks.length;i++)setMotionStyle(masks[i],'--handoff-type',shifts[i].toFixed(3)+'%');
}
function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule,{passive:true});
addEventListener('pageshow',schedule);
reduced.addEventListener('change',schedule);
narrow.addEventListener('change',schedule);
document.fonts?.ready.then(schedule);
if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(schedule);ro.observe(section);ro.observe(document.getElementById('reel'));for(const m of masks)ro.observe(m)}
paint();
window.__jgHandoffQA=()=>({...state,shifts:[...state.shifts],reduced:reduced.matches});

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}
