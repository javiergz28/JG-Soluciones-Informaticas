
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
// G2-C20-P5 — geometry only, no scroll interception, fades, timers or one-shot state.
const bridge=document.getElementById('chapter-bridge');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const narrow=matchMedia('(max-width:767px)');
const clamp=v=>Math.max(0,Math.min(1,v));
function bridgeState(top,height,small=false,staticMode=false){
  const h=Math.max(height,1);
  const progress=staticMode?1:clamp((h*.94-top)/(h*.62));
  const eased=progress*progress*(3-2*progress);
  return {progress,inset:(1-eased)*(small?4:9),shift:(1-eased)*(small?24:64)};
}
// Read stationary mask bounds. Both hidden endpoints are above the mask.
function typeState(top,bottom,height,staticMode=false){
  const h=Math.max(height,1);
  const enter=staticMode?1:clamp((h*.99-top)/(h*.34));
  const exit=staticMode?1:clamp((bottom-h*.015)/(h*.22));
  const eased=v=>v*v*(3-2*v);
  return {enter,exit,shift:112*(eased(enter)*eased(exit)-1)};
}
const masks=[...bridge.querySelectorAll('[data-kinetic]')];
let typeStates=[];
let frame=0,state=bridgeState(0,1);
function paint(){
  frame=0;
 if(skipCoreMotion())return;
  state=bridgeState(bridge.getBoundingClientRect().top,innerHeight,narrow.matches,reduced.matches);
  typeStates=masks.map(mask=>{
    const rect=mask.getBoundingClientRect();
    return typeState(rect.top,rect.bottom,innerHeight,reduced.matches);
  });
  for(const [i,mask] of masks.entries()){
    setMotionStyle(mask,'--type-shift',typeStates[i].shift.toFixed(3)+'%');
  }
  setMotionStyle(bridge,'--bridge-inset',state.inset.toFixed(3)+'%');
  setMotionStyle(bridge,'--bridge-shift',state.shift.toFixed(3)+'px');
}
function schedule(){if(!frame)frame=requestAnimationFrame(paint)}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule,{passive:true});
addEventListener('pageshow',schedule);
reduced.addEventListener('change',schedule);
narrow.addEventListener('change',schedule);
if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(schedule);
  observer.observe(document.querySelector('.services-section'));
  observer.observe(bridge);
  for(const mask of masks)observer.observe(mask);
}
document.fonts?.ready.then(schedule);
paint();
window.__jgBridgeQA=()=>({...state,type:typeStates.map(v=>({...v})),top:bridge.getBoundingClientRect().top,reduced:reduced.matches});

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}
