import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tuneMaterial } from './weapon-material.js';
import { DURATION, samplePose, poseSegment } from './weapon-timeline.js';

export async function mountWeapon(root) {
  const button=root.querySelector('[data-weapon-inspect]');
  const space=root.querySelector('.weapon-space');
  const cue=root.querySelector('[data-weapon-cue]');
  const status=root.querySelector('[data-weapon-phase]');
  const fallback=root.querySelector('[data-weapon-stage]');
  const canvas=document.createElement('canvas');canvas.className='weapon-canvas';canvas.setAttribute('aria-hidden','true');
  let renderer,model,scene,camera,grip,environment;
  let raf=0,progress=0,playStart=0,pointer=null,visible=true,ready=false,suppressClick=false,pendingPlay=false,disposed=false;
  let state='loading',returnStart=0,returnPose=null,frameOffsetY=0;
  const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const euler=new THREE.Euler(0,0,0,'ZYX'),quaternion=new THREE.Quaternion(),fromQuaternion=new THREE.Quaternion();
  const reduced=()=>document.documentElement.dataset.reduceMotion==='true';
  const setState=(next,label)=>{state=next;root.dataset.inspectState=next;button.setAttribute('aria-busy',String(next==='loading'||next==='playing'||next==='returning'));if(label)cue.textContent=label;};
  const cancelFrame=()=>{cancelAnimationFrame(raf);raf=0;};
  function draw(){if(ready&&visible&&!document.hidden&&!disposed){renderer.render(scene,camera);root.dataset.renderCount=String(+(root.dataset.renderCount||0)+1);}}
  function pose(p){progress=Math.max(0,Math.min(1,p));const v=samplePose(progress),{a,b,u}=poseSegment(progress);grip.position.fromArray(v.p);grip.position.y+=frameOffsetY;fromQuaternion.setFromEuler(euler.set(...a.r));quaternion.setFromEuler(euler.set(...b.r));grip.quaternion.slerpQuaternions(fromQuaternion,quaternion,u);grip.updateMatrixWorld(true);root.dataset.inspectProgress=(progress*100).toFixed(2);root.dataset.inspectPose=JSON.stringify([...grip.position.toArray(),...grip.quaternion.toArray()].map(n=>+n.toFixed(5)));draw();}
  function releasePointer(){const id=pointer?.id;pointer=null;if(id!==undefined&&button.hasPointerCapture(id))button.releasePointerCapture(id);}
  function neutral(render=true){cancelFrame();pendingPlay=false;releasePointer();progress=0;if(ready)setState('idle',reduced()?'动效已关闭':'点击枪械 · 检视');if(ready){if(render)pose(0);else{const v=samplePose(0);grip.position.fromArray(v.p);grip.position.y+=frameOffsetY;grip.quaternion.setFromEuler(euler.set(...v.r));root.dataset.inspectProgress='0';}}status.textContent=reduced()?'掠影狂徒，动效已关闭':'掠影狂徒，可以检视';}
  function tick(now){raf=0;if(!visible||document.hidden||disposed){neutral(false);return;}
    if(state==='returning'){
      const u=Math.min(1,(now-returnStart)/230),s=u*u*(3-2*u),idle=samplePose(0);
      grip.position.lerpVectors(returnPose.p,new THREE.Vector3(idle.p[0],idle.p[1]+frameOffsetY,idle.p[2]),s);
      quaternion.setFromEuler(euler.set(...idle.r));grip.quaternion.slerpQuaternions(returnPose.q,quaternion,s);draw();
      if(u>=1){neutral();return;}
    }else if(state==='playing'){
      pose((now-playStart)/DURATION);if(progress>=1){neutral();return;}
    }else return;
    raf=requestAnimationFrame(tick);
  }
  function play(){if(reduced()||document.hidden||!visible||disposed)return;if(!ready){pendingPlay=state==='loading';return;}if(state==='playing'||state==='returning')return;
    setState('playing','检视中');status.textContent='正在检视掠影狂徒';playStart=performance.now()-progress*DURATION;cancelFrame();raf=requestAnimationFrame(tick);
  }
  function returnToIdle(){if(!ready)return;pendingPlay=false;releasePointer();cancelFrame();if(reduced()||!visible||document.hidden||progress===0){neutral();return;}
    returnPose={p:grip.position.clone(),q:grip.quaternion.clone()};returnStart=performance.now();setState('returning','复位中');raf=requestAnimationFrame(tick);
  }
  function hit(x,y){if(!ready)return false;const b=canvas.getBoundingClientRect();ndc.set((x-b.left)/b.width*2-1,-(y-b.top)/b.height*2+1);raycaster.setFromCamera(ndc,camera);return raycaster.intersectObject(model,true).length>0;}
  button.addEventListener('pointerdown',event=>{if(event.button!==0||state==='returning'||reduced()||!hit(event.clientX,event.clientY))return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,p:progress,drag:false};suppressClick=false;});
  button.addEventListener('pointermove',event=>{
    if(!pointer){button.classList.toggle('weapon-hit',hit(event.clientX,event.clientY));return;}
    if(pointer.id!==event.pointerId)return;let dx=event.clientX-pointer.x;const dy=event.clientY-pointer.y;
    if(!pointer.drag){if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){pointer=null;return;}if(Math.abs(dx)<7)return;
      // Freeze the last rendered pose, then zero the drag origin: no catch-up jump.
      pointer.p=progress;pointer.x=event.clientX;pointer.drag=true;cancelFrame();button.setPointerCapture(event.pointerId);dx=0;setState('scrubbing','拖动检视');
    }
    pose(pointer.p+dx/(button.clientWidth*.8));
  });
  button.addEventListener('pointerup',event=>{if(!pointer||pointer.id!==event.pointerId)return;const dragged=pointer.drag;releasePointer();if(dragged){suppressClick=true;play();}});
  button.addEventListener('click',event=>{if(suppressClick&&event.detail>0){suppressClick=false;return;}suppressClick=false;if(event.detail===0||hit(event.clientX,event.clientY))play();});
  button.addEventListener('pointercancel',()=>{suppressClick=true;returnToIdle();});
  button.addEventListener('lostpointercapture',()=>{if(pointer?.drag){suppressClick=true;returnToIdle();}});
  button.addEventListener('pointerleave',()=>button.classList.remove('weapon-hit'));
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();returnToIdle();}if(event.key.toLowerCase()==='y'&&!event.repeat){event.preventDefault();play();}});
  addEventListener('portfolio:motion-change',()=>{if(ready)neutral();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)neutral(false);else if(ready)draw();});
  addEventListener('pagehide',()=>neutral(false));
  addEventListener('pageshow',()=>{if(ready)draw();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)neutral(false);else if(ready)draw();});observer.observe(root);
  function fail(error){cancelFrame();ready=false;pendingPlay=false;setState('unavailable','静态预览');root.dataset.renderer='fallback';status.textContent='三维检视暂不可用，已保留枪械静态预览';fallback.hidden=false;canvas.hidden=true;console.warn('Weapon renderer unavailable:',error?.message||error);}
  try{
    setState('loading','三维模型加载中');space.append(canvas);
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,1,.03,10);camera.position.set(0,0,0);camera.lookAt(0,0,-1);camera.updateMatrixWorld();
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xdedfff,0x232331,1.2));
    const key=new THREE.DirectionalLight(0xf6f1ff,1.6);key.position.set(-2,3,4);scene.add(key);
    const rim=new THREE.DirectionalLight(0x9982ff,1.1);rim.position.set(2,1,-3);scene.add(rim);
    const loader=new GLTFLoader();const gltf=await loader.loadAsync(new URL('../models/reaver-vandal.glb',import.meta.url).href);
    if(disposed)return;model=gltf.scene;model.updateMatrixWorld(true);
    // Uploaded model is +X muzzle, +Y top. Trigger is a named transform in its rig.
    const trigger=model.getObjectByName('Trigger_5');const pivot=trigger?trigger.getWorldPosition(new THREE.Vector3()).sub(new THREE.Vector3(.088624,.088763,0)):new THREE.Vector3(0,-.045,0);
    model.position.sub(pivot);const modelScale=1;model.position.multiplyScalar(modelScale);model.scale.multiplyScalar(modelScale);
    const materials=new Set();
    model.traverse(object=>{if(object.isMesh){object.frustumCulled=false;for(const material of (Array.isArray(object.material)?object.material:[object.material]))materials.add(material);}});
    for(const material of materials)tuneMaterial(material,Math.min(4,renderer.capabilities.getMaxAnisotropy()));
    grip=new THREE.Group();grip.add(model);scene.add(grip);
    function resize(){const w=space.clientWidth,h=space.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,w<600?1.5:2));renderer.setSize(w,h,false);camera.aspect=w/h;const framing=Math.max(1,(16/9)/camera.aspect);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(25))*framing));frameOffsetY=-.30*(framing-1);camera.updateProjectionMatrix();if(ready&&state==='idle')pose(0);else draw();}
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(space);resize();
    const idle=samplePose(0);grip.position.fromArray(idle.p);grip.position.y+=frameOffsetY;grip.quaternion.setFromEuler(euler.set(...idle.r));
    // Decode textures/upload buffers/compile once before making the gun clickable.
    await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
    ready=true;root.dataset.renderer='webgl';root.dataset.modelMeshes='2';fallback.hidden=true;
    const autoplay=pendingPlay;neutral();if(autoplay)play();
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail(new Error('WebGL context lost'));});
    canvas.addEventListener('webglcontextrestored',()=>{canvas.hidden=false;ready=true;root.dataset.renderer='webgl';fallback.hidden=true;neutral();},{once:true});
  }catch(error){fail(error);}
}
