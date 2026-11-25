
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
// G2-C20-P2: native sticky stack, measured reference proportions, original JG artwork.
const panels = [...document.querySelectorAll('.story-panel')];
const stack = document.getElementById('story-stack');
const heading = document.getElementById('story-heading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const narrowScreen = matchMedia('(max-width: 767px)');
const clamp = value => Math.min(1, Math.max(0, value));
let pendingFrame = 0, active = 0, frameCount = 0;
const recede = panels.map(() => 0);

function draw() {
  pendingFrame = 0;
 if(skipCoreMotion())return;
  const staticLayout = reducedMotion.matches || narrowScreen.matches;
  // Intrinsic heights and the untransformed stack prevent feedback from sticky transforms.
  const stackTop = stack.getBoundingClientRect().top + scrollY;
  const gap = parseFloat(getComputedStyle(stack).rowGap) || 0;
  const panelStyles = panels.map(panel => getComputedStyle(panel));
  const heights = panelStyles.map((style, i) => parseFloat(style.height) || panels[i].offsetHeight);
  const pin = parseFloat(panelStyles[0].top) || 0;
  const headingGap = parseFloat(getComputedStyle(heading).marginBottom) || 0;
  const headingDistance = heading.offsetHeight + headingGap;
  // The title uses its natural position, not the sticky or transformed rectangle.
  // Both concealed endpoints are above the mask; card geometry stays unchanged.
  const headingTop = stackTop - headingDistance - scrollY;
  const viewport = Math.max(1, innerHeight);
  const headingEnter = clamp((viewport * .99 - headingTop) / (viewport * .34));
  const headingExit = narrowScreen.matches
    ? clamp((headingTop + heading.offsetHeight - viewport * .015) / (viewport * .22))
    : 1 - clamp((scrollY - (stackTop - headingDistance - pin)) / Math.max(1, headingDistance));
  const smooth = v => v * v * (3 - 2 * v);
  const headingShift = reducedMotion.matches ? 0 : 112 * (smooth(headingEnter) * smooth(headingExit) - 1);
  setMotionStyle(heading,'--heading-shift', headingShift.toFixed(4) + '%');
  let naturalTop = stackTop;
  active = 0;
  for (const [i, panel] of panels.entries()) {
    const height = heights[i];
    const progress = staticLayout || i === panels.length - 1 ? 0 : clamp((scrollY - (naturalTop - pin)) / Math.max(1, height + pin));
    recede[i] = progress;
    setMotionStyle(panel,'--recede-scale', (1 - progress * .1).toFixed(4));
    // The black backing stays opaque: the underlying card darkens, never disappears.
    setMotionStyle(panel,'--panel-light', (1 - progress * .5).toFixed(4));
    if (naturalTop - scrollY <= innerHeight * .62) active = i;
    naturalTop += height + gap;
  }
  if(stack.dataset.active!==String(active))stack.dataset.active = String(active);
  frameCount++;
}
function schedule() { if (!pendingFrame) pendingFrame = requestAnimationFrame(draw); }
addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule, {passive:true});
addEventListener('pageshow', schedule);
reducedMotion.addEventListener('change', schedule);
narrowScreen.addEventListener('change', schedule);
document.fonts?.ready.then(schedule);
schedule();
window.__jgStoryQA = () => ({count:panels.length,active,progress:[...recede],scrollY,
  stackTop:stack.getBoundingClientRect().top,stackBottom:stack.getBoundingClientRect().bottom,
  top:panels.map(p=>Math.round(p.getBoundingClientRect().top)),
  zIndexes:panels.map(p=>Number(getComputedStyle(p).zIndex)),
  sticky:panels.map(p=>getComputedStyle(p).position),
  headingShift:parseFloat(heading.style.getPropertyValue('--heading-shift')) || 0,frameCount,reduced:reducedMotion.matches,narrow:narrowScreen.matches,
  images:document.images.length,externalScripts:[...document.scripts].filter(s=>s.src&&new URL(s.src).origin!==location.origin).length});

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}
