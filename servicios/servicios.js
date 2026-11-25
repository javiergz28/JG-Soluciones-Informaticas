
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
// G2-C19-P7. Servicios 2.1: dynamic headline and reversible scroll entrance, no extra dependencies.
const grid=document.getElementById('service-grid');
const cards=[...grid.querySelectorAll('.service-card')];
let active=0;
const servicesHeading=document.getElementById('services-heading');
const headlines=[
  'Primero, entender.',
  'Cuidar es prevenir.',
  'Volver a funcionar.',
  'Más velocidad. Más tranquilidad.'
];
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
let headlineAnimation=null;
function updateHeadline(index){
  if(!servicesHeading||servicesHeading.textContent===headlines[index])return;
  headlineAnimation?.cancel();
  servicesHeading.textContent=headlines[index];
  if(!reducedMotion.matches&&typeof servicesHeading.animate==='function'){
    headlineAnimation=servicesHeading.animate([
      {transform:'translate3d(0,8px,0)'},
      {transform:'translate3d(0,0,0)'}
    ],{duration:370,easing:'cubic-bezier(.22,1,.36,1)'});
  }
}
function selectService(index,{focus=false}={}){
  if(index<0||index>=cards.length)return;
  active=index;
  grid.dataset.active=String(index);
  updateHeadline(index);
  for(const [i,card] of cards.entries()){
    const selected=i===index;
    const button=card.querySelector('button');
    const detail=card.querySelector('.service-detail');
    card.classList.toggle('is-active',selected);
    button.setAttribute('aria-expanded',String(selected));
    button.querySelector('.card-icon').textContent=selected?'−':'+';
    detail.hidden=!selected;
  }
  if(focus)cards[index].querySelector('button').focus();
}
for(const [i,card] of cards.entries()){
  const button=card.querySelector('button');
  // The full card is a click target; links retain their own navigation.
  card.addEventListener('click',event=>{
    if(event.target.closest('button,a'))return;
    selectService(i);
  });
  button.addEventListener('click',()=>selectService(i));
  button.addEventListener('keydown',event=>{
    const next={ArrowRight:i%2===0?i+1:i-1,ArrowLeft:i%2===0?i+1:i-1,ArrowDown:(i+2)%4,ArrowUp:(i+2)%4,Home:0,End:3}[event.key];
    if(next===undefined)return;
    event.preventDefault();
    selectService(next,{focus:true});
  });
}
// Pointer-following light remains on precise mouse devices, without a custom cursor.
// The native pointer remains visible on cards and links.
const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
if(finePointer.matches&&!reducedMotion.matches){
  let frame=0,spotCard=null,x=0,y=0;
  const paintSpot=()=>{
    if(spotCard){
      const rect=spotCard.getBoundingClientRect();
      spotCard.style.setProperty('--spot-x',`${Math.max(0,Math.min(100,(x-rect.left)/rect.width*100)).toFixed(1)}%`);
      spotCard.style.setProperty('--spot-y',`${Math.max(0,Math.min(100,(y-rect.top)/rect.height*100)).toFixed(1)}%`);
    }
    frame=0;
  };
  grid.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    spotCard=event.target.closest('.service-card');
    if(!spotCard)return;
    x=event.clientX;y=event.clientY;
    if(!frame)frame=requestAnimationFrame(paintSpot);
  },{passive:true});
}

// As in CORE-01, entrance is a pure function of scroll distance: reversible,
// with no observer that permanently locks a section in the visible state.
// Scroll motion uses CSS translate/scale independently of the card hover transform.
const headingBlock=document.querySelector('.services-heading');
const headingParts=[headingBlock?.querySelector('.overline'),servicesHeading,headingBlock?.querySelector('p:last-child')].filter(Boolean);
const entranceParts=[...headingParts,...cards];
let revealFrame=0;
let headingProgress=headingParts.map(()=>1),cardProgress=cards.map(()=>1);
let headingEnter=headingParts.map(()=>1),headingExit=headingParts.map(()=>1);
let cardEnter=cards.map(()=>1),cardExit=cards.map(()=>1);
const clamp01=value=>Math.max(0,Math.min(1,value));
const easeOut=value=>1-(1-value)**3;
function paintEntrance(){
  revealFrame=0;
 if(skipCoreMotion())return;
  if(reducedMotion.matches)return;
  const height=Math.max(innerHeight,1);
  // Observe stable containers, not translated card rectangles, to avoid feedback loops.
  const headingRect=headingBlock.getBoundingClientRect();
  const gridRect=grid.getBoundingClientRect();
  const titleTop=headingRect.top;
  const gridTop=gridRect.top,gridBottom=gridRect.bottom;
  const titleDistance=Math.max(110,Math.min(230,height*.31));
  const cardDistance=Math.max(135,Math.min(270,height*.36));
  // Entry builds the scene as the section comes into view.
  // Exit dismantles it as the section leaves; reversing scroll exactly reverses both.
  headingProgress=headingParts.map((element,i)=>{
    const entering=clamp01((height*.735-titleTop-i*55)/titleDistance);
    const exiting=clamp01((gridBottom-height*.34+i*20)/(height*.35));
    headingEnter[i]=entering;headingExit[i]=exiting;
    const progress=Math.min(entering,exiting),eased=easeOut(progress);
    const leaving=exiting<entering;
    setMotionStyle(element,'--reveal-x','0px');
    setMotionStyle(element,'--reveal-y',`${((1-eased)*(leaving?-68:68)).toFixed(2)}px`);
    setMotionStyle(element,'--reveal-cut-top',leaving?'0%':`${((1-eased)*100).toFixed(2)}%`);
    setMotionStyle(element,'--reveal-cut-bottom',leaving?`${((1-eased)*100).toFixed(2)}%`:'0%');
    return progress;
  });
  cardProgress=cards.map((element,i)=>{
    const entering=clamp01((height*.75-gridTop-i*70)/cardDistance);
    // Top row withdraws first; bottom row follows toward its assigned corner.
    const exiting=clamp01((gridBottom-height*.36+i*25)/(height*.35));
    cardEnter[i]=entering;cardExit[i]=exiting;
    const progress=Math.min(entering,exiting),eased=easeOut(progress);
    // Order: 01 top-left, 02 top-right, 03 bottom-left, 04 bottom-right.
    const signX=i%2===0?-1:1,signY=i<2?-1:1;
    // A physical corner reveal (clip) replaces opacity fading. Stronger travel,
    // with the same precise reverse path on up/down scroll.
    const cut=`${((1-eased)*100).toFixed(2)}%`;
    setMotionStyle(element,'--reveal-x',`${((1-eased)*signX*100).toFixed(2)}px`);
    setMotionStyle(element,'--reveal-y',`${((1-eased)*signY*84).toFixed(2)}px`);
    setMotionStyle(element,'--reveal-scale',(.80+.20*eased).toFixed(4));
    setMotionStyle(element,'--reveal-cut-top',i<2?'0%':cut);
    setMotionStyle(element,'--reveal-cut-right',i%2===0?cut:'0%');
    setMotionStyle(element,'--reveal-cut-bottom',i<2?cut:'0%');
    setMotionStyle(element,'--reveal-cut-left',i%2===0?'0%':cut);
    return progress;
  });
}
function scheduleEntrance(){if(!revealFrame&&!reducedMotion.matches)revealFrame=requestAnimationFrame(paintEntrance)}
function configureEntrance(){
  if(reducedMotion.matches){
    if(revealFrame)cancelAnimationFrame(revealFrame);
    revealFrame=0;
    for(const element of entranceParts){element.classList.remove('scroll-reveal');for(const prop of ['--reveal-x','--reveal-y','--reveal-scale','--reveal-cut-top','--reveal-cut-right','--reveal-cut-bottom','--reveal-cut-left'])element.style.removeProperty(prop)}
    headingProgress=headingParts.map(()=>1);cardProgress=cards.map(()=>1);headingEnter=headingParts.map(()=>1);headingExit=headingParts.map(()=>1);cardEnter=cards.map(()=>1);cardExit=cards.map(()=>1);
  }else{
    for(const element of entranceParts)element.classList.add('scroll-reveal');
    // Render the initial state now, including if the browser restores scroll position.
    paintEntrance();
  }
}
addEventListener('scroll',scheduleEntrance,{passive:true});
addEventListener('resize',scheduleEntrance,{passive:true});
reducedMotion.addEventListener('change',configureEntrance);
configureEntrance();

window.__jgServiciosQA=()=>({active,headline:servicesHeading.textContent,headingRevealed:headingProgress.every(p=>p>=.995),cardsRevealed:cardProgress.every(p=>p>=.995),headingProgress:[...headingProgress],cardProgress:[...cardProgress],headingEnter:[...headingEnter],headingExit:[...headingExit],cardEnter:[...cardEnter],cardExit:[...cardExit],expanded:cards.filter(c=>c.querySelector('button').getAttribute('aria-expanded')==='true').length,visibleDetails:cards.filter(c=>!c.querySelector('.service-detail').hidden).length,count:cards.length,prices:[...document.querySelectorAll('.service-price strong')].map(x=>x.textContent),reduced:reducedMotion.matches,cursorEnabled:false,cursorVisible:false});

function setMotionStyle(el,key,value){if(el.style.getPropertyValue?.(key)!==value)el.style.setProperty(key,value)}
