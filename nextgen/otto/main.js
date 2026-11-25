import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const host=document.getElementById('otto-runtime');
const root=host.shadowRoot;
const $ = (id) => root.getElementById(id);
const viewport = $('viewport');
const modelURL = new URL('./model.glb',import.meta.url).href;
const assetBytes = 1979048;
const modes = {
  idle:       { name: 'REPOSO', color:'#00d9e8',energy:.42,charge:0,flow:.60,fusion:.37,eye:{open:1,wide:1,tilt:0,gaze:0,bounce:0,glow:.20,blinkRate:.18},description:'Está tranquilo y atento. Probá otro ánimo para conocerlo.'},
  greeting:   { name: 'SALUDO', color:'#49e6ff',energy:.78,charge:.05,flow:1.15,fusion:.62,eye:{open:1.12,wide:1.16,tilt:.062,gaze:.008,bounce:.024,glow:.42,blinkRate:.24},description:'¡Hola! OTTO te saluda con una pequeña coreografía.'},
  processing: { name: 'PROCESANDO', color:'#a079ff',energy:.83,charge:.15,flow:1.65,fusion:.86,eye:{open:.64,wide:.91,tilt:-.072,gaze:.070,bounce:0,glow:.34,blinkRate:.33},description:'Está pensando: ojos y movimientos acompañan sus ideas.'},
  charging:   { name: 'CARGANDO',color:'#4d86ff',energy:.92,charge:.61,flow:2.20,fusion:.55,eye:{open:.90,wide:1.05,tilt:.025,gaze:-.030,bounce:.005,glow:.49,blinkRate:.27},description:'¡Recargando energía! Mirá cómo se ilumina.'},
  complete:   { name: 'COMPLETADO',color:'#44e7a8',energy:1,charge:1,flow:.75,fusion:.32,eye:{open:1.16,wide:1.21,tilt:.080,gaze:0,bounce:.028,glow:.60,blinkRate:.16},description:'¡Lo logró! Una pequeña celebración para vos.'},
  failed:     { name: 'FALLO',color:'#ff6581',energy:.38,charge:0,flow:.28,fusion:.12,eye:{open:1.04,wide:1,tilt:0,gaze:0,bounce:0,glow:.48,blinkRate:.15},description:'Ups, algo salió distinto. OTTO se sorprende y baja los brazos.'},
};
const labelColor = {'#00d9e8':'Cian JG Next Gen V3.1','#49e6ff':'Cyan brillante','#4d86ff':'Azul eléctrico','#a079ff':'Violeta IA','#44e7a8':'Verde completo','#ffb35e':'Ámbar','#ff6581':'Rojo'};
const state = { mode:'idle', color:new THREE.Color(modes.idle.color),energy:.42,charge:0,flow:.60,fusion:.37,eye:{...modes.idle.eye} };
const target = {color:new THREE.Color(modes.idle.color),energy:.42,charge:0,flow:.60,fusion:.37,eye:{...modes.idle.eye}};
let eyeExpressionsEnabled=true;
let currentExpressionMode='idle';
let overrideColor = null, playing=true, mixer=null, clipDuration=10, model=null, autoElapsed=0;
const energyTubes=[], reactiveMaterials=[], lights=[], eyeActors=[], tentacleActors=[];
let eyeMaterial=null;
const clock = new THREE.Clock();
let fpsCounter=0, fpsTime=0, fpsSmoothed=0, lastMetrics=0, shaderTime=0, flowDistance=0;
const tentacleGestureWeights={idle:1,greeting:0,processing:0,charging:0,complete:0,failed:0};
let tentacleMoodStart=0;
const ottoJointBounds={x:[.27,.44,.53,.59],y:[.25,.38,.45,.49],z:[.30,.43,.53,.59]};
const ottoBodyMotion={cog:null,head:null,cogPitch:new THREE.Euler(),headPitch:new THREE.Euler(),cogQ:new THREE.Quaternion(),headQ:new THREE.Quaternion(),bob:0,tilt:0,headTilt:0,accent:0};
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let tentacleIntensity=reducedMotion?.35:1,tentacleApplied=tentacleIntensity;
let tentaclePhase=0,energyFeedbackKick=0;
// Hot-path keys are allocated once, not repeatedly during each WebGL frame.
const EYE_KEYS=['open','wide','tilt','gaze','bounce','glow','blinkRate'];
const GESTURE_KEYS=['idle','greeting','processing','charging','complete','failed'];
const SYMBOL_KEYS=['ring','spiral','smile','charging','complete','failed'];
// R3 diagnostics are opt-in and available only on the loopback DEV preview.
// They never affect normal rendering or the production site.
const r3Enabled=/^(127\.0\.0\.1|localhost)$/.test(location.hostname)&&
  new URLSearchParams(location.search).get('otto_r3_diag')==='1';
let r3Scenario='full';
let r3OriginalDpr=1;
const r4BatchRequested=new URLSearchParams(location.search).get('otto_r4_batch')!=='0';
let r4BatchInfo={enabled:false,groups:0,sources:0,drawCallsSaved:0,meshes:[]};

const scene = new THREE.Scene();
// Transparent WebGL stage: the glass atmosphere is a lightweight CSS layer
// BEHIND OTTO, never an overlay on his visor, eyes or the UI.
scene.background = null;
const camera = new THREE.PerspectiveCamera(38,1,.05,500);
let revealPose={greeting:0,beat:0,flourish:0,yaw:0,roll:0,lift:0,slide:0};
function applyRevealZoom(){
 const zoom=Number(host.dataset.revealZoom)||1;
 if(host.dataset.revealPose)revealPose=JSON.parse(host.dataset.revealPose);
 if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix()}
}
host.addEventListener('otto-reveal',applyRevealZoom);
applyRevealZoom();
const renderer = new THREE.WebGLRenderer({ antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false });
renderer.setClearColor(0x090a0c,0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.matchMedia('(max-width:770px)').matches?1.35:1.6));
r3OriginalDpr=renderer.getPixelRatio();
renderer.setSize(viewport.clientWidth,viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = false;
viewport.prepend(renderer.domElement);
// Show the lightweight poster if the browser loses its WebGL context.
// Restoration reloads only this isolated preview; the GLB and presets remain untouched.
renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  renderer.setAnimationLoop(null);rendering=false;
  host.classList.remove('otto-live');
  host.classList.add('otto-3d-unavailable');
  $('progress').classList.remove('hidden');
  $('progress').classList.add('otto-boot-failed');
  $('load-title').textContent='OTTO en vista previa';
  $('load-subtitle').textContent='El navegador interrumpió el render 3D.';
  $('retry-otto').hidden=false;
},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>{try{renderer.render(scene,camera);if(model&&renderer.info.render.calls>=20){window.__OTTO_BOOT_READY__?.();$('progress').classList.add('hidden');syncVisibility()}}catch(err){window.__OTTO_BOOT_ERROR__?.(err.message)}},false);

const ambient = new THREE.HemisphereLight(0x91c9f1,0x0b1424,1.15);
const key = new THREE.DirectionalLight(0xe4f6ff,3.2); key.position.set(-3.8,5,6);
const rim = new THREE.DirectionalLight(0x5bd8ff,2.6); rim.position.set(2.8,3.5,-5);
const fill = new THREE.DirectionalLight(0x8195b8,1.3); fill.position.set(4,-1,4);
scene.add(ambient,key,rim,fill);
const holder = new THREE.Group(); const entrancePivot=new THREE.Group(); entrancePivot.add(holder); scene.add(entrancePivot);

const orbit = new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true; orbit.dampingFactor=.06; orbit.minDistance=3; orbit.maxDistance=25;
orbit.enablePan=false;
orbit.enableZoom=false;renderer.domElement.style.touchAction='pan-y';
$('otto-zoom').addEventListener('click',()=>{orbit.enableZoom=!orbit.enableZoom;renderer.domElement.style.touchAction=orbit.enableZoom?'none':'pan-y';$('otto-zoom').setAttribute('aria-pressed',String(orbit.enableZoom));$('otto-zoom').textContent=orbit.enableZoom?'Desactivar zoom':'Activar zoom'}); orbit.maxPolarAngle=Math.PI*.85;
let defaultCameraPos=new THREE.Vector3(0,0,8.7);

const shaderVertex = `
 varying vec2 vEnergyUv;
 varying vec3 vEyeNormal;
 void main() {
   vEnergyUv = uv;
   vEyeNormal = normalize(normalMatrix * normal);
   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 }`;

// O6T-D4.1A: a smooth-union signed-distance field, rather than repeated ellipses.
// The five unequal cores use separate phases; a continuous travel accumulator avoids
// a position jump when the user changes the energy flow speed.
const shaderFragment = `
 uniform vec3 uColor;
 uniform float uEnergy;
 uniform float uCharge;
 uniform float uFlow;
 uniform float uFusion;
 uniform float uTravel;
 uniform float uDirection;
 uniform float uTime;
 uniform float uSeed;
 varying vec2 vEnergyUv;
 varying vec3 vEyeNormal;

 float smoothUnion(float a,float b,float k){
   float h=max(k-abs(a-b),0.0)/max(k,.01);
   return min(a,b)-h*h*k*.25;
 }
 float roundEllipse(float u,float phi,float center,float width,float turn,float stretch){
   float signedDistance=u-center;
   signedDistance-=floor(signedDistance+.5);
   float angle=atan(sin(phi-turn),cos(phi-turn));
   float bend=.012*sin(phi*2.0+uTravel*.41+center*6.2831853)
              +.007*sin(phi*3.0-uTravel*.23+uSeed);
   vec2 q=vec2((signedDistance+bend)/max(.025,width),angle/max(.55,stretch));
   return length(q)-1.0;
 }

 void main(){
   float u=vEnergyUv.x;
   float phi=vEnergyUv.y*6.2831853;
   float combined=2.0;
   // Five visually different cores; nearby cores fuse into a continuous silhouette.
   for(int i=0;i<5;i++){
     float id=float(i);
     float base=(id+.27+.29*sin(id*2.51+uSeed))/5.0;
     float drift=.027*sin(uTravel*(.24+.035*id)+id*2.07+uSeed);
     float offset=uTravel*uDirection*(.020+.0013*id);
     float center=fract(base+drift+offset);
     float sizeVariation=.5+.5*sin(id*2.63+uSeed*1.17);
     float width=.046+.096*sizeVariation*sizeVariation
                 +.008*sin(uTravel*.31+id*1.31);
     float turn=.61*sin(id*1.83+uSeed*1.4)
                 +.39*sin(uTravel*.23+id*1.73+uSeed);
     float height=.83+.74*(.5+.5*cos(id*2.59+uSeed));
     float d=roundEllipse(u,phi,center,width,turn,height);
     combined=smoothUnion(combined,d,.50+uFusion*.91);
   }
   float surface=1.0-smoothstep(-.13,.13,combined);
   float core=1.0-smoothstep(-.43,-.09,combined);
   float rim=clamp(surface-core,0.0,1.0);
   // Soft charge front + a saturated tail on the *same* fluid geometry.
   // The edge stays continuous when the slider moves, without creating meshes.
   float progress=1.0-smoothstep(uCharge-.026,uCharge+.026,u);
   float chargeLevel=smoothstep(.005,.92,uCharge);
   float chargeFront=exp(-pow((u-uCharge)/.038,2.0))*chargeLevel;
   float flowPulse=1.0+(.045+.055*clamp(uFlow/2.5,0.0,1.0))*sin(uTravel*1.22+uSeed);
   float front=.68+.32*max(0.0,normalize(vEyeNormal).z);
   vec3 pearl=mix(uColor,vec3(.88,.96,1.0),.05+.16*core);
   vec3 fluidColor=pearl*(.40*rim+1.03*core)*front;
   vec3 trailColor=uColor*(progress*chargeLevel*.46+chargeFront*.73);
   vec3 color=(fluidColor+trailColor+uColor*.008)*(.22+2.05*pow(clamp(uEnergy,0.0,1.0),1.62))*flowPulse;
   float alpha=clamp(surface*.70+core*.17+progress*chargeLevel*.21+chargeFront*.12+.015,0.0,.98);
   gl_FragColor=vec4(color,alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
 }`;

// R4: safe runtime static batching. All members share CTRL_HEAD and one material;
// local transforms are baked into merged geometry. The original GLB is untouched.
function batchHeadHardware(root){
  const result={enabled:r4BatchRequested,groups:0,sources:0,drawCallsSaved:0,meshes:[]};
  if(!r4BatchRequested)return result;
  const head=root.getObjectByName('CTRL_HEAD');
  if(!head?.isBone)return result;
  const eligible=head.children.filter(o=>{
    if(!o.isMesh||o.isSkinnedMesh||o.children.length||!o.visible)return false;
    if(!/^(O6P_[LR]_|O6T_D_MESH_HEADSET_(LEFT|RIGHT)_HINGE)/.test(o.name))return false;
    const mat=o.material,g=o.geometry;
    if(Array.isArray(mat)||!mat||mat.transparent||mat.opacity<1||mat.transmission>0)return false;
    if(!g?.index||g.groups.length||!g.attributes.position||g.morphAttributes.position?.length)return false;
    o.updateMatrix();
    return o.matrix.determinant()>0;
  });
  const buckets=new Map();
  for(const mesh of eligible){
    const g=mesh.geometry,key=mesh.material.uuid+'|'+Object.keys(g.attributes).sort().join(',')+'|'+
      Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>
        name+':'+a.itemSize+':'+a.array.constructor.name+':'+a.normalized).join('|');
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(mesh);
  }
  for(const meshes of buckets.values()){
    if(meshes.length<2)continue;
    const geometries=meshes.map(o=>o.geometry.clone().applyMatrix4(o.matrix));
    let merged=null;
    try{merged=mergeGeometries(geometries,false)}finally{
      for(const geometry of geometries)geometry.dispose();
    }
    if(!merged)continue;
    merged.computeBoundingSphere();
    const batched=new THREE.Mesh(merged,meshes[0].material);
    batched.name='OTTO_R4_HEAD_BATCH_'+meshes[0].material.name;
    batched.renderOrder=meshes[0].renderOrder;
    head.add(batched);
    for(const original of meshes)original.visible=false;
    result.groups++;
    result.sources+=meshes.length;
    result.drawCallsSaved+=meshes.length-1;
    result.meshes.push({name:batched.name,sources:meshes.map(o=>o.name),
      triangles:merged.index.count/3});
  }
  return result;
}

function buildEnergy(anchor, data) {
  const flat = data.jg_energy_path_xyz || [];
  if (!Array.isArray(flat) || flat.length<18) return null;
  const pts=[];
  for(let i=0;i<flat.length;i+=3) pts.push(new THREE.Vector3(flat[i],flat[i+1],flat[i+2]));
  // glTF may rotate Blender's Z-up vertex coordinates into Y-up; compare to the real conduit.
  const geom = anchor.geometry;
  geom.computeBoundingBox();
  const position=geom.attributes.position;
  const candidates=[
    (p)=>p.clone(),
    (p)=>new THREE.Vector3(p.x,p.z,-p.y),
    (p)=>new THREE.Vector3(p.x,-p.z,p.y),
  ];
  let chosen=0, best=Infinity;
  candidates.forEach((convert,i)=>{
    let sum=0;
    for(let j=0;j<pts.length;j+=Math.max(1,Math.floor(pts.length/12))){
      const p=convert(pts[j]); let dist=Infinity;
      for(let k=0;k<position.count;k+=Math.max(1,Math.floor(position.count/1500))){
        const dx=p.x-position.getX(k),dy=p.y-position.getY(k),dz=p.z-position.getZ(k);
        const dd=dx*dx+dy*dy+dz*dz;if(dd<dist)dist=dd;
      }
      sum+=dist;
    }
    if(sum<best){best=sum;chosen=i}
  });
  const line=pts.map(candidates[chosen]);
  const ring=data.jg_energy_type!=='headband';
  const curve=new THREE.CatmullRomCurve3(line,ring,'centripetal',.48);
  const tubular=ring?88:112;
  const width=ring?.013:.096;
  const tube=new THREE.TubeGeometry(curve,tubular,width,ring?8:10,ring);
  const uniforms={
    uColor:{value:state.color.clone()},uEnergy:{value:state.energy},
    uCharge:{value:state.charge},uFlow:{value:state.flow},
    uTime:{value:0},uTravel:{value:0},uFusion:{value:state.fusion},
    uDirection:{value:ring?(data.jg_energy_type==='left_ear'?-1:1):1},
    uSeed:{value:ring?(data.jg_energy_type==='left_ear'?1.7:3.7):.12}
  };
  const mat=new THREE.ShaderMaterial({vertexShader:shaderVertex,fragmentShader:shaderFragment,uniforms,transparent:true,side:THREE.FrontSide,depthWrite:false,blending:THREE.NormalBlending,toneMapped:true});
  const mesh=new THREE.Mesh(tube,mat);
  mesh.name='OTTO_WEB_FLUID_'+data.jg_energy_type;
  mesh.frustumCulled=false;mesh.renderOrder=8;
  anchor.add(mesh);
  energyTubes.push({mesh,uniforms,type:data.jg_energy_type});
  const curveBox=new THREE.Box3().setFromPoints(line);
  const geomCenter=geom.boundingBox.getCenter(new THREE.Vector3());
  const pathCenter=curveBox.getCenter(new THREE.Vector3());
  const shift=geomCenter.clone().sub(pathCenter);
  return {type:data.jg_energy_type,points:pts.length,orientation:chosen,fit:best.toFixed(3),geomCenter:geomCenter.toArray(),pathCenter:pathCenter.toArray(),shift:shift.toArray(),geomSize:geom.boundingBox.getSize(new THREE.Vector3()).toArray(),pathSize:curveBox.getSize(new THREE.Vector3()).toArray()};
}

// O6T-D4.1B: eyes are children of CTRL_EYE_L/R, which already own the O5 blink tracks.
// Add one expression pivot per eye. Never write to the existing animated bones.
// D4.1C-P2: 00 and @@ are real 3D curves, mounted on the existing eye bones.
// They keep the same GLB, original O5 blink and approved visor.
let spiralEyeMaterial=null;
const assistantMaterials={};
function buildAssistantEyeSymbols(actor){
  const attr=actor.mesh.geometry.attributes.position;
  const center=actor.mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
  const source=[];
  for(let i=0;i<attr.count;i++)source.push([attr.getX(i)-center.x,attr.getZ(i)-center.z]);
  function sampledDepth(x){
    let sum=0,count=0,nearest=1e9,nearValue=0;
    for(const p of source){
      const d=Math.abs(p[0]-x);
      if(d<.024){sum+=p[1];count++}
      if(d<nearest){nearest=d;nearValue=p[1]}
    }
    return count?sum/count:nearValue;
  }
  const zl=sampledDepth(-.12),zr=sampledDepth(.12);
  const slope=(zr-zl)/.24,base=(zr+zl)*.5+.051;
  const depth=(x)=>base+slope*x-.012*Math.pow(x/.19,2);
  const ringPoints=[];
  for(let i=0;i<72;i++){
    const a=2*Math.PI*i/72,x=.19*Math.cos(a),y=.195*Math.sin(a);
    ringPoints.push(new THREE.Vector3(x,y,depth(x)));
  }
  const spiralPoints=[];
  for(let i=0;i<88;i++){
    const t=i/87,a=-.35+3.5*Math.PI*t,r=.146*(1-t)+.030,x=r*Math.cos(a);
    spiralPoints.push(new THREE.Vector3(x,r*Math.sin(a),depth(x)+.008));
  }
  const group=new THREE.Group();group.name='OTTO_SYMBOLS_'+actor.side;
  actor.pivot.add(group);
  const ring=new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(ringPoints,true,'centripetal'),96,.031,7,true),eyeMaterial);
  ring.name='OTTO_EYE_'+actor.side+'_00';ring.frustumCulled=false;
  if(!spiralEyeMaterial){
    spiralEyeMaterial=eyeMaterial.clone();
    spiralEyeMaterial.name='OTTO_PROCESSING_VIOLET';
    spiralEyeMaterial.color.set('#a079ff');
    spiralEyeMaterial.emissive.set('#a079ff');
    spiralEyeMaterial.emissiveIntensity=.5;
  }
  const spiral=new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(spiralPoints,false,'centripetal'),88,.023,7,false),spiralEyeMaterial);
  spiral.name='OTTO_EYE_'+actor.side+'_AT';spiral.frustumCulled=false;
  // Charging: dark circular guide plus an indexed blue progress arc.
  // Draw range changes index count only; no per-frame geometry allocation.
  if(!assistantMaterials.chargeTrack){
    assistantMaterials.chargeTrack=eyeMaterial.clone();
    assistantMaterials.chargeTrack.name='OTTO_CHARGE_TRACK';
    assistantMaterials.chargeTrack.color.set('#16435b');
    assistantMaterials.chargeTrack.emissive.set('#07213c');
    assistantMaterials.chargeTrack.emissiveIntensity=.14;
    assistantMaterials.chargeArc=eyeMaterial.clone();
    assistantMaterials.chargeArc.name='OTTO_CHARGE_PROGRESS';
    assistantMaterials.chargeArc.color.set('#4d86ff');
    assistantMaterials.chargeArc.emissive.set('#4d86ff');
    assistantMaterials.chargeArc.emissiveIntensity=.9;
    assistantMaterials.complete=eyeMaterial.clone();
    assistantMaterials.complete.name='OTTO_SUCCESS_CHECK';
    assistantMaterials.complete.color.set('#44e7a8');
    assistantMaterials.complete.emissive.set('#44e7a8');
    assistantMaterials.complete.emissiveIntensity=.85;
    assistantMaterials.failed=eyeMaterial.clone();
    assistantMaterials.failed.name='OTTO_FAILURE_CROSS';
    assistantMaterials.failed.color.set('#ff6581');
    assistantMaterials.failed.emissive.set('#ff6581');
    assistantMaterials.failed.emissiveIntensity=.78;
  }
  const progressPoints=[];
  for(let i=0;i<64;i++){
    const angle=2*Math.PI*i/64, x=.174*Math.sin(angle), y=.181*Math.cos(angle);
    progressPoints.push(new THREE.Vector3(x,y,depth(x)+.013));
  }
  const makeProgressGeometry=()=>new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(progressPoints,true,'centripetal'),64,.028,6,true);
  const charging=new THREE.Group();
  charging.name='OTTO_CHARGING_'+actor.side;
  const track=new THREE.Mesh(makeProgressGeometry(),assistantMaterials.chargeTrack);
  const arc=new THREE.Mesh(makeProgressGeometry(),assistantMaterials.chargeArc);
  track.name='OTTO_CHARGE_TRACK_'+actor.side;
  arc.name='OTTO_CHARGE_ARC_'+actor.side;
  arc.position.z=.015; // keep the luminous percentage above the dim guide (no z-fighting)
  arc.userData.maxSegments=64;
  charging.add(track,arc);
  const stroke=(name,xy,material,width=.034)=>{
    const pts=xy.map(([x,y])=>new THREE.Vector3(x,y,depth(x)+.022));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(pts,false,'centripetal'),24,width,6,false),material);
    mesh.name=name+'_'+actor.side;
    mesh.frustumCulled=false;
    return mesh;
  };
  // Completed: legible green check, not a scaled-up 00.
  const complete=stroke('OTTO_COMPLETE_CHECK',
    [[-.142,.002],[-.094,-.044],[-.037,-.101],[.031,-.016],[.152,.127]],
    assistantMaterials.complete,.041);
  // Failed: clear red X with two independent strokes.
  const failed=new THREE.Group();
  failed.name='OTTO_FAILED_X_'+actor.side;
  failed.add(
    stroke('OTTO_FAILED_SLASH_A',[[-.13,.132],[.13,-.132]],assistantMaterials.failed,.038),
    stroke('OTTO_FAILED_SLASH_B',[[-.13,-.132],[.13,.132]],assistantMaterials.failed,.038)
  );
  group.add(ring,spiral,charging,complete,failed);
  return {group,ring,spiral,charging,track,arc,complete,failed,
    weights:{ring:1,spiral:0,smile:0,charging:0,complete:0,failed:0},
    progress:0,depthSlope:slope};
}
function updateAssistantEyeSymbols(actor,dt,viewOcclusion=1){
  const s=actor.symbols,w=s.weights,mode=revealPose.greeting>.3?'greeting':currentExpressionMode,active=eyeExpressionsEnabled;
  const desired={
    ring:active&&(mode==='idle'||mode==='processing')?1:0,
    spiral:active&&mode==='processing'?1:0,
    smile:!active||mode==='greeting'?1:0,
    charging:active&&mode==='charging'?1:0,
    complete:active&&mode==='complete'?1:0,
    failed:active&&mode==='failed'?1:0
  };
  const cinematic=(revealPose.progress??1)<.94;
  const alpha=cinematic||s.wasCinematic?1:1-Math.exp(-Math.min(dt,.075)*10);
  s.wasCinematic=cinematic;
  for(const key of SYMBOL_KEYS)w[key]=THREE.MathUtils.lerp(w[key],desired[key],alpha);
  // Cancel D4.1B's squashing of the glyphs but not the original O5 bone blink.
  // At steep side angles the far-side 2D assistant glyph can otherwise protrude
  // beyond the curved visor. Smoothly suppress only the hidden/far eye.
  s.group.scale.set(viewOcclusion/Math.max(.1,actor.pivot.scale.x),
    viewOcclusion/Math.max(.1,actor.pivot.scale.y),viewOcclusion);
  s.group.visible=viewOcclusion>.025;
  actor.symbols.viewOcclusion=viewOcclusion;
  s.ring.scale.setScalar(Math.max(.001,w.ring));
  s.ring.visible=w.ring>.018;
  s.spiral.scale.setScalar(Math.max(.001,w.spiral));
  s.spiral.rotation.z=shaderTime*.24*actor.sign;
  s.spiral.visible=w.spiral>.018;
  // Indexed draw range is the actual charge percentage. No new mesh or texture.
  s.progress=THREE.MathUtils.clamp(state.charge,0,1);
  const segments=Math.round(s.progress*s.arc.userData.maxSegments);
  s.arc.geometry.setDrawRange(0,segments*6*6);
  s.arc.visible=segments>0;
  s.charging.scale.setScalar(Math.max(.001,w.charging)*(1+.01*Math.sin(shaderTime*3)));
  s.charging.visible=w.charging>.018;
  s.complete.scale.setScalar(Math.max(.001,w.complete)*
    (1+.065*Math.sin(shaderTime*4.8)));
  s.complete.visible=w.complete>.018;
  s.failed.scale.setScalar(Math.max(.001,w.failed)*
    (1+.033*Math.sin(shaderTime*6.7)));
  s.failed.visible=w.failed>.018;
  actor.mesh.visible=w.smile>.018&&viewOcclusion>.22;
}
function setupEyeActors(root){
  const specs=[['left','O6T_D_MESH_EYE_LEFT_SMILE',-1],['right','O6T_D_MESH_EYE_RIGHT_SMILE',1]];
  for(const [side,name,sign] of specs){
    const mesh=root.getObjectByName(name);
    if(!mesh||!mesh.isMesh||!mesh.parent||mesh.parent.name!==('CTRL_EYE_'+(side==='left'?'L':'R')))
      throw new Error('Rig ocular inesperado: '+name);
    mesh.geometry.computeBoundingBox();
    const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    const baseParent=mesh.parent;
    mesh.updateWorldMatrix(true,false);
    const originalMatrix=mesh.matrixWorld.clone();
    const pivot=new THREE.Group();
    pivot.name='OTTO_EYE_EXPRESSION_'+side.toUpperCase();
    pivot.position.copy(mesh.position).add(center.clone().multiply(mesh.scale).applyQuaternion(mesh.quaternion));
    pivot.quaternion.copy(mesh.quaternion);
    pivot.scale.copy(mesh.scale);
    baseParent.add(pivot);
    pivot.add(mesh);
    mesh.position.copy(center).multiplyScalar(-1);
    mesh.quaternion.identity();
    mesh.scale.set(1,1,1);
    mesh.updateWorldMatrix(true,false);
    let matrixError=0;
    for(let n=0;n<16;n++)matrixError=Math.max(matrixError,Math.abs(originalMatrix.elements[n]-mesh.matrixWorld.elements[n]));
    if(matrixError>0.00005)throw new Error('El pivot alteró el ojo: '+side+' diff '+matrixError);
    if(!eyeMaterial){
      eyeMaterial=mesh.material.clone();
      eyeMaterial.name='OTTO_WEB_CYAN_EYES_REACTIVE';
      eyeMaterial.emissive.set('#18d3e8');
      eyeMaterial.emissiveIntensity=.10;
      eyeMaterial.roughness=Math.max(.18,eyeMaterial.roughness);
    }
    mesh.material=eyeMaterial;
    const actor={side,sign,mesh,pivot,parent:baseParent,home:pivot.position.clone(),matrixError};
    actor.symbols=buildAssistantEyeSymbols(actor);
    eyeActors.push(actor);
  }
}
function updateEyeActors(dt){
  if(eyeActors.length!==2)return;
  const enabled=eyeExpressionsEnabled?1:0;
  const eye=state.eye;
  const mode=revealPose.greeting>.3?'greeting':currentExpressionMode;
  const processScan=mode==='processing' ? Math.sin(shaderTime*1.48)*.026 : 0;
  const chargingScan=mode==='charging' ? (state.charge-.5)*.024:0;
  const bounce=(mode==='greeting'||mode==='complete') ? Math.sin(shaderTime*3.4)*eye.bounce*.30 : 0;
  // O5 owns both blink tracks; no independent synthetic blink cycle.
  const cameraYaw=Math.atan2(camera.position.x-orbit.target.x,camera.position.z-orbit.target.z)-(revealPose.yaw||0);
  const sideAngle=Math.abs(cameraYaw);
  const flash=(mode==='complete' ? Math.max(0,Math.sin(shaderTime*5.2))*.13 : 0)
             +(mode==='charging' ? state.charge*.13 : 0)
             +(mode==='failed' ? Math.max(0,Math.sin(shaderTime*5.9))*.11 : 0);
  for(const actor of eyeActors){
    // Prevent the ~6-second double-blink flicker: the original GLB track
    // already closes the parent bone and is synchronized with its clip.
    const slightLife=.008*Math.sin(shaderTime*.9+(actor.sign>0?1.3:0));
    actor.pivot.position.x=actor.home.x+enabled*(eye.gaze+processScan+chargingScan);
    actor.pivot.position.y=actor.home.y+enabled*(eye.bounce+bounce+slightLife);
    actor.pivot.position.z=actor.home.z;
    actor.pivot.scale.set(1+enabled*(eye.wide-1),1+enabled*(eye.open-1),1);
    actor.pivot.rotation.z=enabled*actor.sign*eye.tilt;
    const farEye=cameraYaw*actor.sign<0;
    const profileOcclusion=farEye?1-THREE.MathUtils.smoothstep(sideAngle,.72,1.10):1;
    // From oblique-backward to rear view, neither eye glyph should remain active;
    // depth-testing alone can fail during head bobs/expressive rotations.
    const rearOcclusion=1-THREE.MathUtils.smoothstep(sideAngle,1.48,1.95);
    const occlusion=profileOcclusion*rearOcclusion;
    updateAssistantEyeSymbols(actor,dt,occlusion);
  }
  if(eyeMaterial){
    const brightness=Math.pow(THREE.MathUtils.clamp(state.energy,0,1),1.6);
    eyeMaterial.emissiveIntensity=enabled*(.055+eye.glow*.57+flash+1.32*(brightness+energyFeedbackKick));
  }
}

// O6T-D4.1E: lightweight additive choreography, evaluated *after* AnimationMixer.
// O5 remains the authoritative skeleton animation; no new clip, skin or GLB.
function setupTentacleActors(root){
  const segments=['BASE','MID_A','MID_B','TIP'];
  ottoBodyMotion.cog=root.getObjectByName('CTRL_COG');
  ottoBodyMotion.head=root.getObjectByName('CTRL_HEAD');
  if(!ottoBodyMotion.cog?.isBone||!ottoBodyMotion.head?.isBone)throw new Error('CTRL_COG / CTRL_HEAD no disponibles para animación expresiva');
  for(let i=1;i<=6;i++){
    const prefix='T'+String(i).padStart(2,'0');
    const bones=segments.map(s=>root.getObjectByName(prefix+'_'+s));
    if(bones.some(b=>!b||!b.isBone))throw new Error('Rig de tentáculo incompleto: '+prefix);
    if(bones[1].parent!==bones[0]||bones[2].parent!==bones[1]||bones[3].parent!==bones[2])
      throw new Error('Cadena de tentáculo inconsistente: '+prefix);
    tentacleActors.push({
      name:prefix,index:i-1,side:i<=3?-1:1,
      outer:[1,6].includes(i),inner:[3,4].includes(i),
      bones,deltas:segments.map(()=>new THREE.Quaternion()),
      eulers:segments.map(()=>new THREE.Euler(0,0,0,'XYZ')),
      angles:segments.map(()=>new THREE.Vector3()),originalBones:bones.map(b=>b.name)
    });
  }
}
function updateTentacles(dt){
  // Never accumulate local rotation while paused or before O5's AnimationMixer update.
  if(!playing||!mixer||tentacleActors.length!==6)return;
  const alpha=1-Math.exp(-Math.min(dt,.075)*6.3);
  for(const key of GESTURE_KEYS){
    tentacleGestureWeights[key]=THREE.MathUtils.lerp(
      tentacleGestureWeights[key],key===currentExpressionMode?1:0,alpha);
  }
  tentacleApplied=THREE.MathUtils.lerp(tentacleApplied,tentacleIntensity,alpha);
  const w=tentacleGestureWeights;
  // Time integral avoids phase jumps when the user adjusts the movement dial.
  tentaclePhase+=Math.min(dt,.075)*(.55+.75*tentacleApplied);
  const t=tentaclePhase,strength=1.47*Math.pow(tentacleApplied,1.28);
  const elapsed=Math.max(0,t-tentacleMoodStart);
  const arrival=Math.exp(-elapsed*1.35);
  const cheer=Math.max(0,Math.sin(elapsed*8.2))*Math.exp(-elapsed*.24);
  const countdown=state.charge;
  for(const actor of tentacleActors){
    const i=actor.index,side=actor.side;
    const outer=actor.outer?1:.55,inner=actor.inner?1:.42;
    for(let j=0;j<4;j++){
      const tip=j/3, lag=j*.81;
      const jointWeight=[.45,.92,1.13,1.03][j];
      // Idle: clearly readable underwater breathing without frantic movement.
      let x=w.idle*(.028+.066*tip)*Math.sin(t*1.45+i*.84-lag);
      let y=w.idle*(.018+.050*tip)*Math.cos(t*1.02+i*.7-lag);
      let z=w.idle*(.042+.074*tip)*Math.sin(t*1.25+i*1.14-lag);
      // Greeting: outer arms wave visibly, other arms echo the greeting.
      // One side starts half a beat later, making the character feel responsive.
      const hello=Math.sin(t*4.6+(side>0?1.3:0)-j*.93);
      const waveScale=actor.outer?1:.55;
      x+=w.greeting*(.087+.215*tip)*waveScale*hello;
      y+=w.greeting*(.040+.132*tip)*waveScale*Math.cos(t*4.6+(side>0?1.3:0)-j*.93);
      z+=w.greeting*side*(.090+.206*tip)*waveScale*(.45+.55*Math.sin(t*3.2+i*.36));
      x+=w.greeting*arrival*.12*(actor.outer?1:.35);
      // Processing: two central arms perform alternating 'typing' beats.
      const think=Math.sin(t*5.5+(i%2)*Math.PI+j*.76);
      x+=w.processing*(.062+.232*tip)*inner*think;
      y+=w.processing*(.018+.135*tip)*inner*Math.sin(t*4.1+i*.75-j*1.15);
      z+=w.processing*side*(.066+.169*tip)*inner*Math.sin(t*4.75+i*.45+lag);
      // Charging: a fast ripple travels from base to tip, amplitude grows with power.
      const chargeWave=Math.sin(t*(3.5+1.8*countdown)-i*.68-j*1.06);
      const chargeScale=.54+.46*countdown;
      x+=w.charging*(.074+.223*tip)*chargeScale*chargeWave;
      y+=w.charging*(.055+.166*tip)*chargeScale*Math.cos(t*3.15-i*.7-j*1.06);
      z+=w.charging*side*(.064+.179*tip)*chargeScale*Math.sin(t*2.85+i*.65+j*.85);
      // Success: arms open in a celebratory V and bounce to two emphatic beats.
      const dance=Math.sin(t*5.15+i*.57-j*.78);
      x+=w.complete*side*(.071+.178*tip)*dance;
      y+=w.complete*(.083+.171*tip)*Math.sin(t*4.4+i*.73-j*.62);
      z+=w.complete*side*(.148+.236*tip)*(.88+.23*Math.sin(t*4.8+i*.62));
      z+=w.complete*side*cheer*.09;
      // Failure: theatrical 'oh no' droop and tiny perplexed oscillation.
      const shiver=Math.sin(t*6.9+i*1.2+j*.56);
      x+=w.failed*(-.091-.177*tip)+w.failed*(.023+.009*tip)*shiver;
      y+=w.failed*(.026+.075*tip)*shiver;
      z+=w.failed*(-side)*(.111+.192*tip)+w.failed*.022*Math.cos(t*6.6+i*.85-j*.52);
      // Scroll choreography is additive to O5; outer tentacles lead a two-beat wave.
      const greet=revealPose.greeting||0,beat=revealPose.beat||0,flourish=revealPose.flourish||0;
      const lead=actor.outer?1:actor.inner?.28:.55;
      const delayed=Math.sin((revealPose.progress||0)*Math.PI*9-j*.67+(side>0?0:1.35));
      x+=greet*lead*(.09+.28*tip)*delayed+flourish*(.06+.09*tip);
      y+=greet*lead*(.05+.14*tip)*Math.cos((revealPose.progress||0)*Math.PI*9-j*.67);
      z+=greet*side*lead*(.11+.24*tip)*(1+.25*beat)+flourish*side*.11;
      // Restrict the roots more strongly than the distal joints to protect the body silhouette.
      const boundX=ottoJointBounds.x[j],boundY=ottoJointBounds.y[j],boundZ=ottoJointBounds.z[j];
      x=THREE.MathUtils.clamp(x*jointWeight*strength,-boundX,boundX);
      y=THREE.MathUtils.clamp(y*jointWeight*strength,-boundY,boundY);
      z=THREE.MathUtils.clamp(z*jointWeight*strength,-boundZ,boundZ);
      actor.angles[j].set(x,y,z);
      actor.eulers[j].set(x,y,z,'XYZ');
      actor.bones[j].quaternion.multiply(actor.deltas[j].setFromEuler(actor.eulers[j]));
    }
  }
  // A very small whole-body performance makes the motion visible at web scale.
  // Apply only AFTER O5, with reused quaternions and no frame-to-frame accumulation.
  const body=ottoBodyMotion;
  const bob=strength*(
    w.idle*.035*Math.sin(t*1.35)+
    w.greeting*(.045*Math.sin(t*4.3)+.032*arrival)+
    w.processing*.029*Math.sin(t*5.1)+
    w.charging*(.025+.052*state.charge)*Math.sin(t*3.6)+
    w.complete*(.052+.073*cheer+.026*Math.sin(t*4.8))+
    w.failed*(-.081+.016*Math.sin(t*6.1))
  );
  const sway=strength*(
    w.idle*.018*Math.sin(t*1.15)+
    w.greeting*.055*Math.sin(t*3.15)+
    w.processing*.028*Math.sin(t*3.8)+
    w.charging*.040*Math.sin(t*3.2)+
    w.complete*.076*Math.sin(t*4.4)+
    w.failed*.036*Math.sin(t*6.7)
  );
  const nod=strength*(
    w.idle*.018*Math.sin(t*1.28)+
    w.greeting*.040*Math.sin(t*3.75)+
    w.processing*.053*Math.sin(t*4.5)+
    w.charging*.033*Math.sin(t*3.8)+
    w.complete*(-.045+.042*Math.sin(t*5.0))+
    w.failed*(.077+.018*Math.sin(t*6.5))
  );
  body.bob=THREE.MathUtils.clamp(bob,-.12,.17);
  body.tilt=THREE.MathUtils.clamp(sway,-.09,.09);
  body.headTilt=THREE.MathUtils.clamp(nod,-.085,.095);
  body.accent=cheer;
  body.cog.position.y+=body.bob;
  body.cogPitch.set(0,0,body.tilt);
  body.cog.quaternion.multiply(body.cogQ.setFromEuler(body.cogPitch));
  body.headPitch.set(body.headTilt,0,body.tilt*.28);
  body.head.quaternion.multiply(body.headQ.setFromEuler(body.headPitch));
  // SkinnedMesh reads refreshed bone matrices during the next renderer.render.
}
function getTentacleState(){
  return {
    mode:currentExpressionMode,controllerMode:state.mode,playing,
    intensity:tentacleIntensity,applied:tentacleApplied,
    weights:{...tentacleGestureWeights},
    body:{bob:+ottoBodyMotion.bob.toFixed(5),tilt:+ottoBodyMotion.tilt.toFixed(5),headTilt:+ottoBodyMotion.headTilt.toFixed(5),
      accent:+ottoBodyMotion.accent.toFixed(5),elapsed:+Math.max(0,shaderTime-tentacleMoodStart).toFixed(4)},
    actors:tentacleActors.map(a=>({
      name:a.name,side:a.side,bones:a.originalBones,
      angles:a.angles.map(v=>v.toArray().map(n=>+n.toFixed(5))),
      tipPosition:a.bones[3].getWorldPosition(new THREE.Vector3()).toArray().map(n=>+n.toFixed(5))
    }))
  };
}

function decorateMaterials(root) {
  const shared=new WeakMap();
  root.traverse((obj)=>{
    if(!obj.isMesh) return;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    const mapped=materials.map((mat)=>{
      if(!mat)return mat;
      if(shared.has(mat))return shared.get(mat);
      const name=mat.name||'';
      let m=mat;
      if(name.includes('O6T_B_MAT_SEMITRANSPARENT_CYAN_RING_BASE') || name.includes('O6T_C_REACTIVE_DARK_INSET')){
        m=mat.clone();m.color.set('#1e5165');m.roughness=.20;
        m.metalness=.20;m.forceSinglePass=true;
        if(name.includes('REACTIVE_DARK_INSET')){m.color.set('#172b43');m.roughness=.25}
        reactiveMaterials.push({material:m,dark:name.includes('REACTIVE_DARK_INSET')});
      }else if(name.includes('O6S_MAT_OPTICAL_CONDUIT_GLASS') || name.includes('O6T_B_MAT_OPTICAL_RING_GLASS')){
        m=mat.clone();
        m.transparent=true;m.opacity=.13;m.depthWrite=false;m.metalness=.035;
        m.roughness=.10;m.color.set('#b7dce9');m.side=THREE.FrontSide;
        m.forceSinglePass=true;
      }else if(name.includes('MAT_VISOR_OBSIDIAN')){
        m=mat.clone();m.roughness=Math.max(.20,m.roughness);
      }else if(name.includes('MAT_GRAPHITE_')){
        m=mat.clone();m.roughness=Math.max(.27,m.roughness);
      }
      shared.set(mat,m);
      return m;
    });
    obj.material=Array.isArray(obj.material)?mapped:mapped[0];
  });
}

function showStatus(message,error=false){$('runtime-status').textContent=message;$('runtime-status').classList.toggle('error',error)}
function errorMessage(message){
  $('load-title').textContent='No se pudo iniciar OTTO';
  $('load-subtitle').textContent=message;
  $('progress').classList.remove('hidden');
  showStatus(message,true);
  console.error('[OTTO DEV]',message);
}

function updateSwatch(hex){
  const h=hex.toLowerCase();
  $('color-picker').value=h;
  $('color-preview').style.background=h;
  $('color-preview').style.boxShadow='0 0 23px '+h+'55';
  $('hex-label').textContent=h.toUpperCase();
  $('color-label').textContent=labelColor[h]||'Personalizado';
  $('dock-light-orb').style.setProperty('--orb-color',h);
  $('dock-light-label').textContent=(labelColor[h]||'Personalizado').split(' ')[0];
  root.querySelectorAll('.swatch').forEach(btn=>btn.classList.toggle('active',btn.dataset.color===h));
}
// Friendly qualitative states make changes legible without a long control panel.
function energyFeel(value){
  return value>=75?'Máxima':value>=50?'Alta':value>=20?'Estable':'Baja';
}
function motionFeel(value){
  return value>=71?'Expresivo':value>=46?'Activo':value>=21?'Suave':'Calmo';
}
function updateSliders(src){
  $('energy').value=Math.round(src.energy*100);
  $('charge').value=Math.round(src.charge*100);
  $('flow').value=Math.round(src.flow*100);
  $('energy-value').textContent=Math.round(src.energy*100)+'%';
  $('dock-energy').style.setProperty('--dial-pct',Math.round(src.energy*100)+'%');
  $('dock-energy').style.setProperty('--dial-sweep',(Math.round(src.energy*100)*2.7).toFixed(1)+'deg');
  $('energy-feel').textContent=energyFeel(src.energy*100);
  $('dock-energy').style.setProperty('--dock-halo',(.04+.27*Math.pow(src.energy,1.5)).toFixed(3));
  $('dock-light-orb').style.setProperty('--orb-brightness',(.53+1.05*src.energy).toFixed(3));
  viewport.style.setProperty('--otto-energy-aura',(.04+.81*Math.pow(src.energy,1.6)).toFixed(3));
  $('charge-value').textContent=Math.round(src.charge*100)+'%';
  $('flow-value').textContent=src.flow.toFixed(1)+'×';
  $('fusion').value=Math.round(src.fusion*100);
  $('fusion-value').textContent=Math.round(src.fusion*100)+'%';
  $('dock-charge').style.setProperty('--dial-pct',Math.round(src.charge*100)+'%');
  $('dock-flow').style.setProperty('--dial-pct',Math.round(src.flow/2.5*100)+'%');
  $('dock-fusion').style.setProperty('--dial-pct',Math.round(src.fusion*100)+'%');
  $('charge-feel').textContent=src.charge>=.95?'Completa':src.charge>=.5?'Alta':src.charge>.10?'Subiendo':'Sin carga';
  $('flow-feel').textContent=src.flow<.05?'Detenido':src.flow<.8?'Suave':src.flow<1.6?'Natural':'Rápido';
  $('fusion-feel').textContent=src.fusion<.2?'Separado':src.fusion<.66?'Suave':'Unido';
}
function applyMode(mode,{fromDemo=false}={}){
  const preset=modes[mode]||modes.idle;
  if(mode!==currentExpressionMode || !fromDemo)tentacleMoodStart=shaderTime;
  currentExpressionMode=mode;
  if(!fromDemo){state.mode=mode;overrideColor=null}
  target.color.set(overrideColor||preset.color);
  target.energy=preset.energy;target.charge=preset.charge;target.flow=preset.flow;target.fusion=preset.fusion;Object.assign(target.eye,preset.eye);
  $('mode-name').textContent=fromDemo?'DEMO / '+preset.name:preset.name;
  $('mode-description').textContent=preset.description;
  $('mood-now').dataset.mood=mode;
  $('eye-state-label').textContent=({idle:'00 · atento',greeting:'◡◡ · saludo',processing:'@@ · procesando',charging:'◌ · progreso',complete:'✓✓ · completado',failed:'×× · fallo'})[mode]||'00 · atento';
  updateSliders(target);updateSwatch(overrideColor||preset.color);
  root.querySelectorAll('[data-mode]').forEach(b=>{
    const on=b.dataset.mode===(fromDemo?'auto':mode);
    b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
  });
}
function chooseMode(mode){
  if(mode==='auto'){
    state.mode='auto';overrideColor=null;autoElapsed=0;tick.lastDemoMode='idle';applyMode('idle',{fromDemo:true});
    $('mode-name').textContent='DEMO / REPOSO';
    root.querySelectorAll('[data-mode]').forEach(b=>{
      const on=b.dataset.mode==='auto';b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
    });
  }else applyMode(mode);
  setDockPanel('');
}
// Dock P2A: light, mood and precision settings share one anchored popover.
// Native range/color inputs and all existing OTTO state paths remain intact.
const dockTriggers=[...root.querySelectorAll('[data-dock-toggle]')];
const dockPopovers=new Map(['light','mood','settings'].map(name=>[
  name,root.getElementById('dock-'+name+'-panel')
]));
let openDockPanel='';
function setDockPanel(name=''){
  openDockPanel=openDockPanel===name?'':name;
  for(const [key,panel] of dockPopovers)panel.hidden=key!==openDockPanel;
  root.querySelector('.otto-dock').classList.toggle('is-open',Boolean(openDockPanel));
  for(const trigger of dockTriggers){
    const expanded=trigger.dataset.dockToggle===openDockPanel;
    trigger.setAttribute('aria-expanded',String(expanded));
  }
  if(openDockPanel){dockPopovers.get(openDockPanel)?.querySelector('[data-dock-close]')?.focus({preventScroll:true});}
}
for(const trigger of dockTriggers){
  trigger.addEventListener('click',()=>{
    setDockPanel(trigger.dataset.dockToggle);
  });
}
root.querySelectorAll('[data-dock-close]').forEach(button=>button.addEventListener('click',()=>{
  const key=openDockPanel;setDockPanel('');
  root.querySelector('[data-dock-toggle="'+key+'"]')?.focus();
}));
root.addEventListener('pointerdown',event=>{
  if(openDockPanel&&!event.target.closest('.otto-dock'))setDockPanel('');
});
root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&openDockPanel){
    const key=openDockPanel;setDockPanel('');
    root.querySelector('[data-dock-toggle="'+key+'"]')?.focus();
  }
});
root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
$('eye-expressions').addEventListener('change',e=>{eyeExpressionsEnabled=e.target.checked;});
$('tentacle-motion').value=Math.round(tentacleIntensity*100);
$('tentacle-motion-value').textContent=Math.round(tentacleIntensity*100)+'%';
$('dock-motion').style.setProperty('--dial-pct',Math.round(tentacleIntensity*100)+'%');
  $('dock-motion').style.setProperty('--dial-sweep',(Math.round(tentacleIntensity*100)*2.7).toFixed(1)+'deg');
$('motion-feel').textContent=motionFeel(tentacleIntensity*100);
$('dock-motion').style.setProperty('--dock-halo',(.04+.25*Math.pow(tentacleIntensity,1.5)).toFixed(3));
$('tentacle-motion').addEventListener('input',e=>{
  tentacleIntensity=THREE.MathUtils.clamp(Number(e.target.value)/100,0,1);
  $('tentacle-motion-value').textContent=Math.round(tentacleIntensity*100)+'%';
  $('dock-motion').style.setProperty('--dial-pct',Math.round(tentacleIntensity*100)+'%');
  $('dock-motion').style.setProperty('--dial-sweep',(Math.round(tentacleIntensity*100)*2.7).toFixed(1)+'deg');
  $('motion-feel').textContent=motionFeel(tentacleIntensity*100);
  $('dock-motion').style.setProperty('--dock-halo',(.04+.25*Math.pow(tentacleIntensity,1.5)).toFixed(3));
});

// P2F: One consistent family of six horizontal glass instruments. Pointer interaction is linear, and the
// native inputs remain available for keyboard, accessibility and existing presets.
for(const id of ['energy','tentacle-motion','charge','flow','fusion']){
  const input=$(id),dial=input.closest('.dock-dial'),module=input.closest('.dock-module');
  let activePointer=null;
  const moveDial=e=>{
    const rect=dial.getBoundingClientRect();
    // Full-width tactile rail, 0% at left and 100% at right.
    const pct=THREE.MathUtils.clamp((e.clientX-rect.left)/rect.width,0,1);
    const next=Math.round(Number(input.min)+pct*(Number(input.max)-Number(input.min)));
    if(Number(input.value)!==next){
      input.value=String(next);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  };
  input.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault();input.focus({preventScroll:true});
    activePointer=e.pointerId;module.dataset.dragging='true';
    input.setPointerCapture?.(e.pointerId);moveDial(e);
  });
  input.addEventListener('pointermove',e=>{
    if(e.pointerId!==activePointer)return;
    e.preventDefault();moveDial(e);
  });
  const end=e=>{
    if(e.pointerId!==activePointer)return;
    activePointer=null;delete module.dataset.dragging;
    if(input.hasPointerCapture?.(e.pointerId))input.releasePointerCapture(e.pointerId);
  };
  input.addEventListener('pointerup',end);
  input.addEventListener('pointercancel',end);
  input.addEventListener('lostpointercapture',end);
}

function selectColor(hex){
  overrideColor=hex;target.color.set(hex);updateSwatch(hex);
}
$('color-picker').addEventListener('input',e=>selectColor(e.target.value));
root.querySelectorAll('.swatch').forEach(b=>b.addEventListener('click',()=>selectColor(b.dataset.color)));
for(const [id,field] of [['energy','energy'],['charge','charge'],['flow','flow'],['fusion','fusion']]){
  $(id).addEventListener('input',e=>{
    const before=target[field];
    const next=THREE.MathUtils.clamp(Number(e.target.value)/100,0,field==='flow'?2.5:1);
    target[field]=next;
    if(field==='energy'&&!reducedMotion&&next>before){
      // A short, bounded luminous response, independent of the character's blink tracks.
      energyFeedbackKick=Math.max(energyFeedbackKick,Math.min(.14,(next-before)*.30));
    }
    updateSliders(target);
  });
}
$('toggle-play').addEventListener('click',()=>{
  playing=!playing;
  $('toggle-play').textContent=playing?'Pausar animación':'Reanudar animación';
  $('toggle-play').setAttribute('aria-pressed',String(playing));
});
$('reset-camera').addEventListener('click',()=>{
  camera.position.copy(defaultCameraPos);
  orbit.target.set(0,0,0);orbit.update();
});

let renderWidth=0,renderHeight=0;
const renderNarrow=matchMedia('(max-width:770px)');
function resize(){
  const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);
  if(w===renderWidth&&h===renderHeight)return;
  renderWidth=w;renderHeight=h;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
window.addEventListener('resize',resize);
// Dynamic dock panels resize the viewport without relying on a window resize event.
new ResizeObserver(resize).observe(viewport);

function tick(){
  // Bound unusually long frames: one delayed compositor/GC frame must not
  // jump OTTO's animation or the flowing shader through multiple poses.
  const dt=Math.min(clock.getDelta(),.045);
  if(document.hidden)return;
  if(playing){
    shaderTime+=dt;autoElapsed+=dt;
    if(mixer&&!(r3Enabled&&r3Scenario==='freeze-rig'))mixer.update(dt);
    if(state.mode==='auto'){
      const t=autoElapsed%10;
      const mode=t<1.45?'idle':t<5.9?'greeting':t<7.65?'processing':t<8.85?'charging':t<9.52?'complete':'idle';
      if(tick.lastDemoMode!==mode){applyMode(mode,{fromDemo:true});tick.lastDemoMode=mode}
      if(mode==='charging')target.charge=THREE.MathUtils.lerp(.12,1,THREE.MathUtils.smoothstep(t,7.65,8.85));
      if(mode==='complete')target.charge=1;
      if(mode==='charging'||mode==='complete'){updateSliders(target)}
    }
  }
  const mix=1-Math.exp(-dt*3.8);
  state.color.lerp(target.color,mix);
  state.energy=THREE.MathUtils.lerp(state.energy,target.energy,mix);
  state.charge=THREE.MathUtils.lerp(state.charge,target.charge,1-Math.exp(-dt*8.2));
  state.flow=THREE.MathUtils.lerp(state.flow,target.flow,1-Math.exp(-dt*6.2));
  state.fusion=THREE.MathUtils.lerp(state.fusion,target.fusion,mix);
  for(const k of EYE_KEYS)state.eye[k]=THREE.MathUtils.lerp(state.eye[k],target.eye[k],mix);
  // Freeze the GLB mixer and its additive layers only during an explicit QA scenario.
  if(!(r3Enabled&&r3Scenario==='freeze-rig')){
    updateEyeActors(dt);
    updateTentacles(dt);
  }
  // Integrated flow phase: continuous when speed changes, and genuinely still at 0%.
  // Quadratic response makes the existing 0–2.5x slider significantly more readable.
  if(playing)flowDistance+=dt*state.flow*(.68+1.12*state.flow);
  for(const item of energyTubes){
    const u=item.uniforms;
    u.uColor.value.copy(state.color);u.uEnergy.value=state.energy;u.uCharge.value=state.charge;
    u.uFlow.value=state.flow;u.uTime.value=shaderTime;
    u.uTravel.value=flowDistance;u.uFusion.value=state.fusion;
  }
  const luminous=Math.pow(THREE.MathUtils.clamp(state.energy,0,1),1.55)+energyFeedbackKick;
  for(const r of reactiveMaterials){
    r.material.color.copy(state.color).multiplyScalar(r.dark?.11:.18);
    r.material.emissive.copy(state.color).multiplyScalar(r.dark?.012+.058*luminous:.010+.265*luminous);
  }
  rim.color.copy(state.color);
  rim.intensity=.72+2.50*luminous+(currentExpressionMode==='failed'?.17*Math.max(0,Math.sin(shaderTime*5.8)):0);
  for(const light of lights){light.color.copy(state.color);light.intensity=.05+.92*luminous+state.charge*.20}
  energyFeedbackKick*=Math.exp(-dt*7.5);
  // Absolute parent transform, never accumulates and returns to identity at interaction.
  entrancePivot.rotation.set(0,revealPose.yaw||0,revealPose.roll||0);
  entrancePivot.position.set(revealPose.slide||0,revealPose.lift||0,0);
  // Keep the character on the right of persistent editorial title, no change to orbit target.
  const narrow=renderNarrow.matches;
  const w=Math.max(1,renderWidth),h=Math.max(1,renderHeight);
  const offset=Math.round(-w*((narrow?0:.16)+(revealPose.screenSlide||0)));
  const offsetY=narrow?Math.round(-h*.13*(revealPose.flourish||0)):0;
  if(!camera.view?.enabled||camera.view.offsetX!==offset||camera.view.offsetY!==offsetY||camera.view.fullWidth!==w||camera.view.fullHeight!==h)camera.setViewOffset(w,h,offset,offsetY,w,h);
  orbit.enabled=(revealPose.dock??1)>=.999;
  key.intensity=3.2+.85*(revealPose.flourish||0)+.30*(revealPose.greeting||0);
  orbit.update();
  if(!(r3Enabled&&r3Scenario==='no-render'))renderer.render(scene,camera);
  const now=performance.now();
  if(d3PrevTime>0&&now-d3PrevTime<250){d3Times[d3Cursor]=now-d3PrevTime;d3Cursor=(d3Cursor+1)%d3Times.length;d3Count=Math.min(d3Count+1,d3Times.length)}
  d3PrevTime=now;
  fpsCounter++;fpsTime+=Math.min(.25,Math.max(0,(now-(tick.lastTime||now))/1000));lastMetrics+=dt;tick.lastTime=now;
  if(fpsTime>=.65){
    const fps=fpsCounter/fpsTime;fpsSmoothed=fpsSmoothed?fpsSmoothed*.55+fps*.45:fps;
    const fpsLabel=Math.round(fpsSmoothed)+' FPS';if($('fps').textContent!==fpsLabel)$('fps').textContent=fpsLabel;
    fpsCounter=0;fpsTime=0;
  }
  if(lastMetrics>=1.5){
    const ri=renderer.info.render;
    // Avoid DOM updates to invisible diagnostics; on slower GPUs these can trigger reflow.
    if(openDockPanel==='settings'){
    $('metric-calls').textContent=ri.calls.toLocaleString('es-UY');
    $('metric-tris').textContent=ri.triangles.toLocaleString('es-UY');
    $('metric-time').textContent=mixer?((mixer.time%clipDuration).toFixed(1)+' / '+clipDuration.toFixed(0)+'s'):'—';
    }
    lastMetrics=0;
  }
}
let visible=false,rendering=false;
function syncVisibility(){
 const active=visible&&!document.hidden&&!host.classList.contains('otto-3d-unavailable')&&!renderer.getContext().isContextLost();
 if(active===rendering)return;
 rendering=active;renderer.setAnimationLoop(active?tick:null);
 if(active){clock.getDelta();tick.lastTime=0;d3PrevTime=0;}
}
const visibilityObserver=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);syncVisibility()},{threshold:0});
visibilityObserver.observe(host);
document.addEventListener('visibilitychange',syncVisibility);
window.__OTTO_VISIBILITY__=()=>({visible,rendering});
window.__OTTO_ENTRANCE_QA__=()=>({zoom:camera.zoom,pose:{...revealPose},pivot:entrancePivot.position.toArray(),rotation:entrancePivot.rotation.toArray().slice(0,3),canvas:[renderer.domElement.width,renderer.domElement.height],viewOffset:camera.view?.offsetX??0});

// Differential R3 measurement: change exactly one factor per test.
function setStabilityScenario(name){
  if(!r3Enabled||!['full','no-fluid','freeze-rig','no-glass','no-render','dom-only','low-dpr'].includes(name))return null;
  const previousScenario=r3Scenario;
  r3Scenario=name;
  const requestedDpr=name==='low-dpr'?Math.max(.65,r3OriginalDpr*.8):r3OriginalDpr;
  if(Math.abs(renderer.getPixelRatio()-requestedDpr)>.001)renderer.setPixelRatio(requestedDpr);
  // Do not restart a running rAF loop merely to change a diagnostic scenario.
  if(name==='dom-only')renderer.setAnimationLoop(null);
  else if(previousScenario==='dom-only')renderer.setAnimationLoop(tick);
  for(const tube of energyTubes)tube.mesh.visible=name!=='no-fluid';
  const glass=root.querySelector('.liquid-atmosphere');
  if(glass)glass.style.display=name==='no-glass'?'none':'';
  const shell=root.querySelector('.dock-shell');
  if(shell){
    shell.style.backdropFilter=name==='no-glass'?'none':'';
    shell.style.webkitBackdropFilter=name==='no-glass'?'none':'';
  }
  return name;
}
// D3 diagnostics: renderer.info contains counts, not GPU byte usage.
// Geometry byte estimate reflects typed arrays, not GPU VRAM allocations.
const d3Times=new Float32Array(240);
let d3Cursor=0,d3Count=0,d3PrevTime=0;
function d3Diagnostics(){
  const gl=renderer.getContext();
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  const rendererLabel=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const geometrySet=new Set();
  const bufferSet=new Set();
  let geometryBytes=0;
  if(model)model.traverse(obj=>{
    if(!obj.geometry || geometrySet.has(obj.geometry.uuid))return;
    geometrySet.add(obj.geometry.uuid);
    const geo=obj.geometry;
    const attrs=Object.values(geo.attributes||{});
    if(geo.index)attrs.push(geo.index);
    for(const attr of attrs){
      const arr=attr.data?.array||attr.array;
      if(arr?.buffer&&!bufferSet.has(arr.buffer)){
        bufferSet.add(arr.buffer);
        geometryBytes+=arr.byteLength;
      }
    }
  });
  const sorted=Array.from(d3Times.subarray(0,d3Count)).sort((a,b)=>a-b);
  const ms=(p)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]:null;
  return {
    renderer:rendererLabel,
    webgl:gl.getParameter(gl.VERSION),
    dpr:renderer.getPixelRatio(),
    canvas:[renderer.domElement.width,renderer.domElement.height],
    drawCalls:renderer.info.render.calls,
    renderedTriangles:renderer.info.render.triangles,
    geometries:renderer.info.memory.geometries,
    textures:renderer.info.memory.textures,
    programs:renderer.info.programs?.length||0,
    uniqueGeometries:geometrySet.size,
    geometryAttributeBytes:geometryBytes,
    fpsMedian:ms(.5)?+(1000/ms(.5)).toFixed(1):null,
    frameP95ms:ms(.95)?+ms(.95).toFixed(1):null,
    frameSamples:sorted.length,
    jsHeapUsedBytes:performance.memory?.usedJSHeapSize||null,
    visibility:document.visibilityState,
  };
}

async function loadModel(){
  try{
    if(!renderer.capabilities.isWebGL2)showStatus('WebGL 1: algunas funciones pueden variar.');
    // Avoid a redundant HEAD request: embedded browsers and local tunnels may
    // reject HEAD even when the GLB GET works. The manifest verifies asset bytes.
    const length=assetBytes;
    $('metric-size').textContent=(length/1048576).toFixed(2)+' MiB';
    const gltf=await new GLTFLoader().loadAsync(modelURL, e=>{
      if(e.total)$('load-subtitle').textContent='Modelo '+Math.round(e.loaded/e.total*100)+'%';
    });
    model=gltf.scene;
    decorateMaterials(model);
    setupEyeActors(model);
    setupTentacleActors(model);
    // Headset optimization is optional: a failure must never hide the whole mascot.
    try{r4BatchInfo=batchHeadHardware(model)}
    catch(batchError){
      console.warn('[OTTO] Static batching skipped:',batchError);
      r4BatchInfo={enabled:false,groups:0,sources:0,drawCallsSaved:0,meshes:[],error:String(batchError)};
    }
    holder.add(model);
    const box=new THREE.Box3().setFromObject(model);
    const center=box.getCenter(new THREE.Vector3());
    const size=box.getSize(new THREE.Vector3());
    holder.position.copy(center).multiplyScalar(-1);
    const smallScreen=window.matchMedia('(max-width:770px)').matches;
    const verticalFovHalf=THREE.MathUtils.degToRad(camera.fov/2);
    const horizontalFit=size.x/(2*Math.tan(verticalFovHalf)*Math.max(.45,camera.aspect));
    // Mobile: a little more breathing space around all six tentacles and the glass lens.
    const distance=smallScreen?Math.max(13.3,horizontalFit*1.28):Math.max(9.45,size.y*2.27,size.z*2.85);
    defaultCameraPos.set(size.x*(smallScreen?.12:.43),size.y*.14,distance);
    console.info('[OTTO FRAME]',JSON.stringify({size:size.toArray(),center:center.toArray(),distance}));
    camera.position.copy(defaultCameraPos);
    orbit.minDistance=Math.max(size.y*.5,1.8);
    orbit.maxDistance=Math.max(size.y*4.5,18);
    orbit.target.set(0,0,0);orbit.update();
    const anchors=[];
    model.traverse(o=>{
      if(o.isMesh && o.userData && o.userData.jg_energy_path_xyz) {
        const result=buildEnergy(o,o.userData);
        if(result)anchors.push(result);
      }
    });
    mixer=new THREE.AnimationMixer(model);
    if(gltf.animations.length){
      for(const clip of gltf.animations){
        const action=mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat,Infinity);
        action.play();
      }
      clipDuration=Math.max(...gltf.animations.map(a=>a.duration))||10;
    }
    const lightPositions=[[-1.5,3.05,0],[1.5,3.05,0]];
    for(const xyz of lightPositions){
      const light=new THREE.PointLight(0x23d8f6,.38,3,2);light.position.set(...xyz);
      // Attach to model root so lighting follows the character without extra scene systems.
      model.add(light);lights.push(light);
    }
    $('asset-info').textContent=gltf.animations.length+' clip(s) · '+anchors.length+' canales de energía · '+gltf.scene.children.length+' nodos raíz';
    showStatus('GLB cargado · '+anchors.length+'/3 canales de energía · '+gltf.animations.length+' animación(es).');
    window.__OTTO_DEV__={ready:true,clipCount:gltf.animations.length,duration:clipDuration,channelInfo:anchors,
      assetBytes:length,eyeBlinkTrackCount:gltf.animations.flatMap(c=>c.tracks).filter(t=>/^CTRL_EYE_[LR]\.scale$/.test(t.name)).length,
      assetBytesVerified:length===assetBytes,get fps(){return fpsSmoothed},get mode(){return state.mode},
      getBatchInfo:()=>({...r4BatchInfo}),
      setStabilityScenario,
      inspectRenderInventory:()=>r3Enabled?(()=>{
        const rows=[];
        model.traverse(o=>{
          if(!o.isMesh||!o.geometry)return;
          const mats=Array.isArray(o.material)?o.material:[o.material],geo=o.geometry;
          rows.push({name:o.name,parent:o.parent?.name,parentId:o.parent?.uuid,
            skinned:!!o.isSkinnedMesh,geom:geo.uuid,
            mat:mats.map(m=>m?.uuid||'').join('|'),matName:mats.map(m=>m?.name||'').join('|'),
            attrs:Object.keys(geo.attributes).sort().join(','),indexed:!!geo.index,
            groups:geo.groups.length,morph:!!o.morphTargetInfluences?.length,
            tri:Math.floor((geo.index?.count||geo.attributes.position?.count||0)/3),
            visible:o.visible,renderOrder:o.renderOrder,frustumCulled:o.frustumCulled,
            animatedParent:!!o.parent?.isBone});
        });
        return {rows,count:rows.length,drawCalls:renderer.info.render.calls};
      })():null,
      getStabilitySample:()=>r3Enabled?{
        scenario:r3Scenario,mixerTime:+(mixer?.time||0).toFixed(4),
        shaderTime:+shaderTime.toFixed(4),travel:+flowDistance.toFixed(4),
        fps:+fpsSmoothed.toFixed(1),drawCalls:renderer.info.render.calls,
        triangles:renderer.info.render.triangles,fluidVisible:energyTubes.filter(t=>t.mesh.visible).length,
        glassHidden:root.querySelector('.liquid-atmosphere')?.style.display==='none',
        dpr:renderer.getPixelRatio(),canvas:[renderer.domElement.width,renderer.domElement.height]
      }:null,
      get triangles(){return renderer.info.render.triangles},get drawCalls(){return renderer.info.render.calls},
      get charge(){return state.charge}, get flow(){return state.flow},
      get fusion(){return state.fusion},setMode:chooseMode,setColor:selectColor,
      getTentacleState,
      setTentacleMotion:(value)=>{tentacleIntensity=THREE.MathUtils.clamp(Number(value),0,1);
        $('tentacle-motion').value=Math.round(tentacleIntensity*100);
        $('tentacle-motion-value').textContent=Math.round(tentacleIntensity*100)+'%';
        $('dock-motion').style.setProperty('--dial-pct',Math.round(tentacleIntensity*100)+'%');
  $('dock-motion').style.setProperty('--dial-sweep',(Math.round(tentacleIntensity*100)*2.7).toFixed(1)+'deg');
        $('motion-feel').textContent=motionFeel(tentacleIntensity*100);
        $('dock-motion').style.setProperty('--dock-halo',(.04+.25*Math.pow(tentacleIntensity,1.5)).toFixed(3));},
      inspectLoopSeam:()=>{
        const clip=gltf.animations[0]; if(!clip)return {available:false};
        const gaps=clip.tracks.map(track=>{
          const n=track.getValueSize(), values=track.values;
          const first=Array.from(values.slice(0,n)),last=Array.from(values.slice(values.length-n));
          const raw=track.name.toLowerCase();
          let gap;
          if(raw.endsWith('.quaternion')&&n===4){
            const dot=Math.abs(first.reduce((s,v,i)=>s+v*last[i],0));
            gap=2*Math.acos(THREE.MathUtils.clamp(dot,0,1))*180/Math.PI;
          }else gap=Math.sqrt(first.reduce((s,v,i)=>s+(v-last[i])**2,0));
          return {name:track.name,n,keys:track.times.length,
            firstTime:track.times[0],lastTime:track.times[track.times.length-1],gap};
        });
        gaps.sort((a,b)=>b.gap-a.gap);
        const velocityJumps=clip.tracks.filter(track=>track.times.length>3).map(track=>{
          const n=track.getValueSize(),v=track.values,t=track.times;
          const step0=t[1]-t[0],stepN=t[t.length-1]-t[t.length-2];
          if(step0<=0||stepN<=0)return {name:track.name,jump:null};
          const a=Array.from({length:n},(_,k)=>(v[n+k]-v[k])/step0);
          const b=Array.from({length:n},(_,k)=>(v[v.length-n+k]-v[v.length-2*n+k])/stepN);
          // Equivalent q and -q rotations must have their signs aligned.
          if(n===4&&a.reduce((x,y,i)=>x+y*b[i],0)<0)for(let i=0;i<n;i++)b[i]*=-1;
          const jump=Math.sqrt(a.reduce((x,y,i)=>x+(y-b[i])**2,0));
          return {name:track.name,jump:+jump.toFixed(5),firstSpeed:+Math.hypot(...a).toFixed(5),lastSpeed:+Math.hypot(...b).toFixed(5)};
        }).sort((a,b)=>(b.jump||0)-(a.jump||0));
        return {duration:clip.duration,total:gaps.length,nonzero:gaps.filter(t=>t.gap>.00001).length,gaps:gaps.slice(0,24),rigTracks:clip.tracks.filter(t=>/^(CTRL_COG|CTRL_HEAD|T0[1-6]_)/.test(t.name)).map(t=>t.name),velocityJumps:velocityJumps.slice(0,20)};
      },
      getFeedbackState:()=>({energy:+state.energy.toFixed(4),targetEnergy:+target.energy.toFixed(4),
        eyeIntensity:+(eyeMaterial?.emissiveIntensity||0).toFixed(4),rimIntensity:+rim.intensity.toFixed(4),
        motionTarget:+tentacleIntensity.toFixed(4),motionApplied:+tentacleApplied.toFixed(4),
        gestureScale:+(1.47*Math.pow(tentacleApplied,1.28)).toFixed(4),
        movementLabel:$('motion-feel').textContent,energyLabel:$('energy-feel').textContent,
        phaseSpeed:+(.55+.75*tentacleApplied).toFixed(4)}),
      tentacleBones:tentacleActors.length*4,
      getFluidState:()=>energyTubes.map(item=>({type:item.type,fusion:item.uniforms.uFusion.value,travel:item.uniforms.uTravel.value,charge:item.uniforms.uCharge.value,flow:item.uniforms.uFlow.value,flowRate:state.flow*(.68+1.12*state.flow),targetFlow:target.flow,targetCharge:target.charge,color:'#'+item.uniforms.uColor.value.getHexString(),direction:item.uniforms.uDirection.value,position:item.mesh.position.toArray()})),
      focusEnergy:()=>{orbit.target.set(0,1.60,0);camera.position.set(1.45,2.45,4.5);orbit.update()},
      focusEyes:()=>{orbit.target.set(0,1.05,0);camera.position.set(1.1,1.15,5.05);orbit.update()},
      resetCamera:()=>{$('reset-camera').click()},
      // O6T-D4.1G QA-only camera presets: no changes to the default user view.
      setCameraAngle:(degrees,elevation=0.8)=>{
        const angle=THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number(degrees),-160,160));
        const radius=defaultCameraPos.length();
        camera.position.set(radius*Math.sin(angle),Number(elevation),radius*Math.cos(angle));
        orbit.target.set(0,0,0);orbit.update();
      },
      inspectSideRig:()=>{
        const samples=tentacleActors.map(a=>{
          a.bones[0].updateWorldMatrix(true,true);
          return {name:a.name,joints:a.bones.map(b=>b.getWorldPosition(new THREE.Vector3()).toArray())};
        });
        const accessories=[];
        model.traverse(o=>{
          if(o.isMesh&&/VISOR|EAR|HEADPHONE|HEADSET/i.test(o.name)){
            const box=new THREE.Box3().setFromObject(o);
            const center=box.getCenter(new THREE.Vector3());
            const size=box.getSize(new THREE.Vector3());
            accessories.push({name:o.name,center:center.toArray(),size:size.toArray()});
          }
        });
        return {mode:currentExpressionMode,samples,accessories};
      },
      diagnostics:d3Diagnostics,
      setEyeExpressions:(enabled)=>{eyeExpressionsEnabled=Boolean(enabled);$('eye-expressions').checked=eyeExpressionsEnabled},
      getEyeState:()=>({enabled:eyeExpressionsEnabled,mode:currentExpressionMode,controllerMode:state.mode,eyeValues:{...state.eye},emissive:eyeMaterial?.emissiveIntensity,
        actors:eyeActors.map(a=>({side:a.side,parent:a.parent.name,originalBlinkScale:a.parent.scale.y,
          matrixError:a.matrixError,position:a.pivot.position.toArray(),scale:a.pivot.scale.toArray(),tilt:a.pivot.rotation.z,
          symbols:{...a.symbols.weights,ringVisible:a.symbols.ring.visible,spiralVisible:a.symbols.spiral.visible,
            smileVisible:a.mesh.visible,ringTriangles:a.symbols.ring.geometry.index.count/3,
            spiralTriangles:a.symbols.spiral.geometry.index.count/3,depthSlope:a.symbols.depthSlope,
            chargingVisible:a.symbols.charging.visible,completeVisible:a.symbols.complete.visible,
            failedVisible:a.symbols.failed.visible,chargeProgress:a.symbols.progress,
            chargeDrawIndices:a.symbols.arc.geometry.drawRange.count,
            checkTriangles:a.symbols.complete.geometry.index.count/3,
            failedStrokes:a.symbols.failed.children.length,
            viewOcclusion:a.symbols.viewOcclusion??1}}))}),
      inspectEyes:()=>['O6T_D_MESH_EYE_LEFT_SMILE','O6T_D_MESH_EYE_RIGHT_SMILE'].map(name=>{
        const o=model.getObjectByName(name);if(!o)return {name,found:false};
        o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;
        return {name,parent:o.parent?.name,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),
          boxCenter:b.getCenter(new THREE.Vector3()).toArray(),boxSize:b.getSize(new THREE.Vector3()).toArray(),
          worldCenter:new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).toArray(),
          worldSize:new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).toArray()};
      }),
      inspect:()=>({modelBounds:new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray(),camera:camera.position.toArray(),materials:[...new Set(reactiveMaterials.map(m=>m.material.name))],channels:energyTubes.map(t=>({name:t.mesh.name,triangles:t.mesh.geometry.index?.count/3,visible:t.mesh.visible})),meshCount:model.children.length}),
      debugShell:(visible)=>{model.traverse(o=>{if(o.isMesh&&(o.name.includes('O6S_BAND_CLEAR_GLASS_CHANNEL')||o.name.includes('O6T_B_L_RING_GLASS_CONDUIT')||o.name.includes('O6T_B_R_RING_GLASS_CONDUIT'))){const list=Array.isArray(o.material)?o.material:[o.material];for(const mat of list){if(mat)mat.visible=visible}}})}
    };
    console.info('[OTTO O6T-D4.1L]',window.__OTTO_DEV__);
    // Verify that the 3D scene can render before hiding the static safety image.
    resize();
    // Validate the model in the center while the fallback covers the canvas.
    // An intentionally off-screen character must not be mistaken for a failed GLB.
    camera.clearViewOffset();
    renderer.render(scene,camera);
    if(renderer.getContext().isContextLost()||renderer.info.render.calls<20||renderer.info.render.triangles<10000){
      throw new Error('El modelo 3D no se dibujó correctamente.');
    }
    // Present only the correctly framed scroll state.
    const bootOffset=Math.round(-renderWidth*((renderNarrow.matches?0:.16)+(revealPose.screenSlide||0)));
    const bootY=renderNarrow.matches?Math.round(-renderHeight*.13*(revealPose.flourish||0)):0;
    camera.setViewOffset(Math.max(1,renderWidth),Math.max(1,renderHeight),bootOffset,bootY,Math.max(1,renderWidth),Math.max(1,renderHeight));
    renderer.render(scene,camera);
    window.__OTTO_BOOT_READY__?.();
    $('progress').classList.add('hidden');
  }catch(err){
    console.error(err);
    errorMessage(err.message||String(err));
    window.__OTTO_BOOT_ERROR__?.(err.message||String(err));
    syncVisibility();
    window.__OTTO_DEV__={ready:false,error:String(err)};
  }
}
applyMode('idle');resize();loadModel();
