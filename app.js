'use strict';
document.documentElement.classList.add('js');
const one = (s, root = document) => root.querySelector(s);
const all = (s, root = document) => [...root.querySelectorAll(s)];

function enhanceTabs(buttonSelector, panelSelector, key) {
  const buttons = all(buttonSelector), panels = all(panelSelector);
  if (!buttons.length) return;
  function select(index, focus = false) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
      button.classList.toggle('active', i === index);
    });
    panels.forEach(panel => { panel.hidden = panel.dataset[key + 'Panel'] !== buttons[index].dataset[key]; });
    if (focus) buttons[index].focus();
  }
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', event => {
      let index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') index = (i + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') index = (i + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = buttons.length - 1;
      if (index !== undefined) { event.preventDefault(); select(index, true); }
    });
  });
  select(0);
}
enhanceTabs('[data-user]', '[data-user-panel]', 'user');
enhanceTabs('[data-eco]', '[data-eco-panel]', 'eco');

const chapters = all('.chapter');
function expandChapter(chapter, open) {
  chapter.classList.toggle('open', open);
  one('.chapter-head', chapter).setAttribute('aria-expanded', String(open));
  const subnav = one('.subnav', chapter);
  subnav.inert = !open;
  subnav.setAttribute('aria-hidden', String(!open));
}
chapters.forEach((chapter, i) => {
  const button = one('.chapter-head', chapter), subnav = one('.subnav', chapter);
  subnav.id = 'chapter-links-' + i;
  button.setAttribute('aria-controls', subnav.id);
  expandChapter(chapter, chapter.classList.contains('open'));
  button.addEventListener('click', () => expandChapter(chapter, !chapter.classList.contains('open')));
});

const side = one('#sideNav'), menuButtons = [one('#menuBtn'), one('#dockMenu')].filter(Boolean);
const backdrop = one('#menuBackdrop');
let lastMenuButton;
const isVisible = element => element && element.isConnected && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
function menuFocusables() {
  return all('a[href],button,input,select,textarea,[tabindex]', side).filter(element =>
    !element.disabled && element.tabIndex >= 0 && !element.closest('[inert]') && isVisible(element)
  );
}
side.setAttribute('role', 'dialog');
side.tabIndex = -1;
function setMenu(open, returnFocus = false) {
  if (!open && (returnFocus || side.contains(document.activeElement))) {
    const target = isVisible(lastMenuButton) ? lastMenuButton : menuButtons.find(isVisible);
    target?.focus({ preventScroll: true });
  }
  side.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  side.inert = !open;
  side.setAttribute('aria-hidden', String(!open));
  if (open) side.setAttribute('aria-modal', 'true'); else side.removeAttribute('aria-modal');
  backdrop?.setAttribute('aria-hidden', String(!open));
  menuButtons.forEach(button => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-controls', 'sideNav');
    button.setAttribute('aria-label', open ? '关闭目录' : '打开目录');
  });
  if (open) {
    const currentChapter = one('.chapter.active', side);
    if (currentChapter) expandChapter(currentChapter, true);
    const target = (currentChapter && one('.chapter-head', currentChapter)) || menuFocusables()[0] || side;
    requestAnimationFrame(() => { if (side.classList.contains('open')) target.focus({ preventScroll: true }); });
  }
}
menuButtons.forEach(button => button.addEventListener('click', () => {
  lastMenuButton = button; setMenu(!side.classList.contains('open'));
}));
setMenu(false);
backdrop?.addEventListener('click', () => setMenu(false, true));
one('#drawerClose')?.addEventListener('click', () => setMenu(false, true));
document.addEventListener('keydown', event => {
  if (!side.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setMenu(false, true);
  }
  if (event.key === 'Tab') {
    const focusable = menuFocusables();
    const first = focusable[0], last = focusable.at(-1);
    if (!first) { event.preventDefault(); side.focus(); }
    else if (!focusable.includes(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
all('a[href^="#"]', side).forEach(link => link.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  setMenu(false);
  const section = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (section) { section.tabIndex = -1; section.focus({ preventScroll: true }); }
}));

const scenes = all('section.scene'), links = all('.subnav a'), dockLinks = all('.mobile-dock a');
let pending = false;
function updateReading() {
  const active = [...scenes].reverse().find(scene => scene.getBoundingClientRect().top <= innerHeight * .38) || scenes[0];
  links.forEach(link => {
    const selected = link.dataset.scene === active.id;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
  });
  chapters.forEach(chapter => {
    const selected = chapter.dataset.chapter === active.dataset.chapter;
    const changed = selected && !chapter.classList.contains('active');
    chapter.classList.toggle('active', selected);
    if (changed && !side.classList.contains('open')) expandChapter(chapter, true);
  });
  dockLinks.forEach(link => link.classList.toggle('active', link.hash === '#' + active.id || (link.hash === '#scene03' && active.dataset.chapter === 'product') || (link.hash === '#scene08' && active.dataset.chapter === 'commerce') || (link.hash === '#scene16' && active.dataset.chapter === 'esports')));
  const maximum = document.documentElement.scrollHeight - innerHeight;
  const progress = Math.max(0, Math.min(1, maximum > 0 ? scrollY / maximum : 0));
  one('#reading').textContent = String(Math.round(progress * 100)).padStart(2, '0') + '%';
  one('#readBar').style.width = (progress * 100) + '%';
  pending = false;
}
addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateReading); } }, { passive: true });
addEventListener('resize', updateReading);
addEventListener('load', updateReading);
updateReading();

const motionButton = one('#motionBtn');
const systemMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = systemMotionPreference.matches;
function updateMotion() {
  if (systemMotionPreference.matches) reduced = true;
  document.documentElement.dataset.reduceMotion = String(reduced);
  motionButton.disabled = systemMotionPreference.matches;
  motionButton.setAttribute('aria-pressed', String(reduced));
  motionButton.setAttribute('aria-label', systemMotionPreference.matches ? '系统已减少动效' : reduced ? '启用动效' : '减少动效');
  motionButton.textContent = systemMotionPreference.matches ? '系统已减少动效' : reduced ? '启用动效' : '减少动效';
  window.dispatchEvent(new CustomEvent('portfolio:motion-change', { detail: { reduced } }));
}
motionButton.addEventListener('click', () => { reduced = !reduced; updateMotion(); });
systemMotionPreference.addEventListener('change', event => { reduced = event.matches; updateMotion(); });
updateMotion();

/* The reference has two held inspect poses. A single side-view PNG cannot
 * reveal the actual top/back surfaces: keep it legible, never flatten it. */
(() => {
  const root=one('[data-weapon-showcase]'), trigger=one('[data-weapon-inspect]');
  const rig=one('[data-weapon-stage]'), cue=one('[data-weapon-cue]'), status=one('[data-weapon-phase]');
  if(!root||!trigger||!rig)return;
  const duration=4900;
  const poses=[
    [0,0,0,0,0,0,1], [.1,-2,-16,5,-10,7,1.03],
    [.24,-4,-28,8,-16,14,1.07], [.43,-4,-28,8,-16,14,1.07],
    [.57,3,0,16,12,38,.86], [.74,3,0,16,12,38,.86],
    [.86,1,-12,8,5,28,1.02], [1,0,0,0,0,0,1]
  ];
  const transform=v=>`translate3d(${v[0]}%,${v[1]}px,0) rotateZ(${v[4]}deg) rotateY(${v[3]}deg) rotateX(${v[2]}deg) scale(${v[5]})`;
  const frames=poses.map(p=>({offset:p[0],transform:transform(p.slice(1)),easing:'cubic-bezier(.4,0,.2,1)'}));
  let animation=null, progress=0, pointer=null, suppressClick=false;
  const isReduced=()=>document.documentElement.dataset.reduceMotion==='true';
  function stop(){if(animation){const a=animation;animation=null;a.cancel();}}
  function pose(p){
    progress=Math.max(0,Math.min(1,p));
    let i=poses.findIndex(k=>k[0]>=progress);if(i<1)i=1;
    const a=poses[i-1],b=poses[i];let t=(progress-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);
    rig.style.transform=transform(a.slice(1).map((v,j)=>v+(b[j+1]-v)*t));
    root.dataset.inspectProgress=String(Math.round(progress*100));
  }
  function neutral(){
    stop();pointer=null;progress=0;rig.style.transform='';root.dataset.inspectProgress='0';root.dataset.inspectState='idle';
    trigger.setAttribute('aria-busy','false');cue.textContent=isReduced()?'动效已关闭':'点击枪械 · 检视';
    status.textContent=isReduced()?'掠影狂徒，动效已关闭':'掠影狂徒，可以检视';
  }
  function play(){
    if(isReduced()||document.hidden||animation)return;
    root.dataset.inspectState='playing';trigger.setAttribute('aria-busy','true');cue.textContent='检视中';status.textContent='检视掠影狂徒';
    const current=rig.animate(frames,{duration,fill:'both'});animation=current;current.currentTime=progress*duration;
    current.finished.then(()=>{if(animation===current)neutral();},()=>{});
  }
  trigger.addEventListener('click',e=>{if(suppressClick&&e.detail>0){suppressClick=false;return;}suppressClick=false;play();});
  // Optional direct manipulation stays on the gun; no separate scrubber UI.
  trigger.addEventListener('pointerdown',e=>{
    if(e.button!==0||isReduced())return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,p:animation?Number(animation.currentTime)/duration:progress,drag:false};suppressClick=false;
  });
  trigger.addEventListener('pointermove',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if(!pointer.drag){
      if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){pointer=null;return;}
      if(Math.abs(dx)<7)return;
      pointer.drag=true;stop();trigger.setPointerCapture(e.pointerId);root.dataset.inspectState='scrubbing';trigger.setAttribute('aria-busy','false');cue.textContent='检视中';
    }
    pose(pointer.p+dx/(trigger.clientWidth*.8));
  });
  trigger.addEventListener('pointerup',e=>{
    if(!pointer||e.pointerId!==pointer.id)return;
    const dragged=pointer.drag;pointer=null;if(!dragged)return;suppressClick=true;
    if(trigger.hasPointerCapture(e.pointerId))trigger.releasePointerCapture(e.pointerId);play();
  });
  trigger.addEventListener('pointercancel',()=>{suppressClick=true;neutral();});
  trigger.addEventListener('lostpointercapture',()=>{if(pointer?.drag){suppressClick=true;neutral();}});
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();neutral();}
    if(e.key.toLowerCase()==='y'&&!e.repeat){e.preventDefault();play();}
  });
  addEventListener('portfolio:motion-change',neutral);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)neutral();});
  addEventListener('pagehide',neutral);
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)neutral();}).observe(root);
  neutral();
})();

/* One click presents preparation then lateral Tailwind automatically.
 * Environment sweep and brief wind follow the official first-person demo.
 * This standing portrait has no joint/hand animation; no pretend body skew. */
(() => {
  const root=one('[data-jett-showcase]');if(!root)return;
  const button=one('[data-jett-interact]',root),cue=one('[data-jett-cue]',root),status=one('[data-jett-status]',root);
  const stage=one('.jett-motion-stage',root),portrait=one('[data-jett-portrait]',root),echo=one('[data-jett-echo]',root);
  const speed=one('.jett-speed',root),wind=one('.jett-wind-field',root),scenery=one('.jett-scenery',root),ground=one('.jett-ground',root);
  [[16,88,1,.5],[25,100,2,.6],[37,80,1,.8],[45,98,3,1],[51,78,1,.8],[59,95,2,.9],[68,86,1,.7],[76,100,3,.9],[85,73,1,.55]].forEach(([y,length,weight,alpha])=>{
    const line=document.createElement('i');line.style.cssText=`--y:${y}%;--length:${length}%;--weight:${weight}px;--alpha:${alpha}`;speed.append(line);
  });
  let state='idle',generation=0;const active=new Set();
  const isReduced=()=>document.documentElement.dataset.reduceMotion==='true';
  function animate(element,frames,duration,easing='linear'){
    const a=element.animate(frames,{duration,easing,fill:'both'});a.finished.catch(()=>{});active.add(a);return a;
  }
  function change(next,label){state=next;root.dataset.jettState=next;cue.textContent=label;button.setAttribute('aria-busy',String(next!=='idle'));}
  function neutral(){
    generation++;active.forEach(a=>a.cancel());active.clear();
    change('idle',isReduced()?'动效已关闭':'点击捷风 · 逐风');
    status.textContent=isReduced()?'捷风，动效已关闭':'捷风，可以演示逐风';
  }
  async function activate(){
    if(state!=='idle'||isReduced()||document.hidden)return;
    const token=++generation;const valid=()=>token===generation;
    const x=stage.clientWidth*.32;
    try{
      change('priming','逐风');status.textContent='演示逐风';
      await animate(wind,[{opacity:.12,transform:'translateY(8px)'},{opacity:.65,transform:'translateY(-10px)'}],1000,'ease-out').finished;
      if(!valid())return;
      change('dashing','逐风');
      animate(wind,[{opacity:.8},{opacity:0}],300);
      animate(echo,[{transform:'translateX(0)',opacity:.4},{transform:`translateX(${x*.35}px)`,opacity:.22,offset:.5},{transform:`translateX(${x*.6}px)`,opacity:0}],340);
      animate(speed,[{opacity:.8,transform:'translateX(-14%)'},{opacity:1,offset:.15},{opacity:0,transform:'translateX(24%)'}],340);
      animate(ground,[{opacity:.6},{opacity:1,offset:.2},{opacity:0}],380);
      animate(scenery,[{transform:'translateX(0)',filter:'blur(0)'},{transform:`translateX(${-x*.6}px)`,filter:'blur(3px)',offset:.45},{transform:`translateX(${-x*.7}px)`,filter:'blur(0)'}],280,'cubic-bezier(.12,.7,.2,1)');
      await animate(portrait,[{transform:'translateX(0)',opacity:1},{transform:`translateX(${x*.75}px)`,opacity:.3,offset:.45},{transform:`translateX(${x}px)`,opacity:1}],280,'cubic-bezier(.12,.7,.2,1)').finished;
      if(!valid())return;change('settling','逐风');
      await animate(portrait,[{transform:`translateX(${x}px)`},{transform:`translateX(${x}px)`}],650).finished;
      if(!valid())return;change('resetting','逐风');
      // Hide before resetting the stage; returning is presentation, not a dash back.
      await animate(stage,[{opacity:1},{opacity:0}],180,'ease-out').finished;
      if(!valid())return;
      active.forEach(a=>{if(a.effect?.target!==stage){a.cancel();active.delete(a);}});
      await animate(stage,[{opacity:0},{opacity:1}],240,'ease-in').finished;
      if(valid())neutral();
    }catch(error){if(valid())neutral();}
  }
  button.addEventListener('click',activate);
  button.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();neutral();}
    if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();activate();}
  });
  addEventListener('portfolio:motion-change',neutral);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)neutral();});
  addEventListener('pagehide',neutral);
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)neutral();}).observe(root);
  neutral();
})();
