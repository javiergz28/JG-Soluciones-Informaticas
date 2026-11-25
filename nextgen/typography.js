// Presentation-only: preserve approved CORE player and Services selection logic.
const phrases=new Map([
 ['Todo empieza con una idea.','con una idea.'],
 ['Las ideas cobran vida.','cobran vida.'],
 ['La diferencia está en los detalles.','en los detalles.'],
 ['Miramos más allá de lo evidente.','de lo evidente.'],
 ['Todo conecta. Todo evoluciona.','Todo evoluciona.'],
 ['Primero, entender.','entender.'],
 ['Cuidar es prevenir.','prevenir.'],
 ['Volver a funcionar.','funcionar.'],
 ['Más velocidad. Más tranquilidad.','Más tranquilidad.']
]);
function decorate(el){
 const full=el.textContent,tail=phrases.get(full);
 if(!tail||el.querySelector('.jg-title-accent'))return;
 const accent=document.createElement('span');
 accent.className='jg-title-accent';accent.textContent=tail;
 el.replaceChildren(document.createTextNode(full.slice(0,-tail.length)),accent);
}
for(const el of document.querySelectorAll('#reel .story-layer h1,#services-heading')){
 const observer=new MutationObserver(()=>decorate(el));
 observer.observe(el,{childList:true,characterData:true,subtree:true});
 decorate(el);
}
