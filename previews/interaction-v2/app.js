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

/* Reaver inspect: pose order checked against the Riot skin preview at 5.4–10.3s.
 * This is a bounded 2.5D cutout, not a reconstructed model or video player. */
(() => {
  const root = one('[data-weapon-showcase]'), trigger = one('[data-weapon-inspect]');
  const rig = one('[data-weapon-stage]'), slider = one('#inspectProgress');
  if (!root || !trigger || !rig || !slider) return;
  const cue = one('[data-weapon-cue]'), phase = one('[data-weapon-phase]');
  const reset = one('[data-weapon-reset]');
  const duration = 4900;
  // Lift to the side, dwell, roll to the narrower top edge, dwell, lower.
  // Angle values are presentation choices; no unseen weapon surfaces are drawn.
  const poses = [
    [0, 0, 0, 0, 0, 0, 1], [.11, -2, -14, 8, -15, 9, 1.04],
    [.24, -3, -24, 12, -19, 14, 1.07], [.43, -3, -24, 12, -19, 14, 1.07],
    [.57, 3, -25, 57, 13, 34, 1.07], [.74, 3, -25, 57, 13, 34, 1.07],
    [.86, 1, -12, 24, 5, 20, 1.02], [1, 0, 0, 0, 0, 0, 1]
  ];
  let raf = 0, progress = 0, start = 0, pointer = null, suppressClick = false;
  const isReduced = () => document.documentElement.dataset.reduceMotion === 'true';
  const labels = p => p === 0 || p === 1 ? '持枪' : p < .11 ? '抬枪' : p < .46 ? '侧看枪身' : p < .78 ? '翻转检视' : '收枪复位';
  function pose(p) {
    progress = Math.max(0, Math.min(1, p));
    let i = poses.findIndex(k => k[0] >= progress);
    if (i < 1) i = 1;
    const a = poses[i - 1], b = poses[i];
    let t = (progress - a[0]) / (b[0] - a[0]);
    t = t * t * (3 - 2 * t);
    const v = a.slice(1).map((n, j) => n + (b[j + 1] - n) * t);
    rig.style.transform = `translate3d(${v[0]}%,${v[1]}px,0) rotateZ(${v[4]}deg) rotateY(${v[3]}deg) rotateX(${v[2]}deg) scale(${v[5]})`;
    const label = labels(progress);
    if (phase.textContent !== label) phase.textContent = label;
    slider.value = String(Math.round(progress * 100));
    slider.setAttribute('aria-valuetext', label);
    root.style.setProperty('--inspect-progress', `${progress * 100}%`);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function neutral() {
    stop(); pointer = null; pose(0); root.dataset.inspectState = 'idle';
    cue.textContent = isReduced() ? '拖动进度查看' : '点击检视 · 拖动查看';
    trigger.setAttribute('aria-busy', 'false');
  }
  function tick(now) {
    if (document.hidden || isReduced()) { neutral(); return; }
    pose((now - start) / duration);
    if (progress >= 1) { neutral(); return; }
    raf = requestAnimationFrame(tick);
  }
  function play() {
    if (isReduced()) { pose(progress < .45 ? .3 : progress < .75 ? .65 : 0); return; }
    stop(); root.dataset.inspectState = 'playing'; trigger.setAttribute('aria-busy', 'true');
    cue.textContent = '检视中 · 拖动可接管'; start = performance.now() - progress * duration;
    raf = requestAnimationFrame(tick);
  }
  trigger.addEventListener('click', event => { if (suppressClick && event.detail > 0) { suppressClick = false; return; } suppressClick = false; play(); });
  trigger.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, p: progress, drag: false };
    suppressClick = false;
  });
  trigger.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.drag) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      if (Math.abs(dx) < 7) return;
      pointer.drag = true; stop(); trigger.setPointerCapture(event.pointerId);
      root.dataset.inspectState = 'scrubbing'; cue.textContent = '松开后自然复位';
      trigger.setAttribute('aria-busy', 'false');
    }
    pose(pointer.p + dx / (trigger.clientWidth * .8));
  });
  function release(event) {
    if (!pointer || (event && event.pointerId !== pointer.id)) return;
    const wasDrag = pointer.drag; pointer = null;
    if (!wasDrag) return;
    suppressClick = true;
    if (event && trigger.hasPointerCapture(event.pointerId)) trigger.releasePointerCapture(event.pointerId);
    if (isReduced()) return;
    // Resume the inspected pose through the remaining authored sequence.
    root.dataset.inspectState = 'playing'; trigger.setAttribute('aria-busy','true'); start = performance.now() - progress * duration;
    raf = requestAnimationFrame(tick);
  }
  trigger.addEventListener('pointerup', release);
  trigger.addEventListener('pointercancel', () => { suppressClick = true; neutral(); });
  trigger.addEventListener('lostpointercapture', () => { if (pointer?.drag) { suppressClick = true; neutral(); } });
  slider.addEventListener('input', () => { stop(); pointer = null; root.dataset.inspectState = 'scrubbing'; trigger.setAttribute('aria-busy','false'); cue.textContent = '点击继续检视 · 复位归零'; pose(Number(slider.value) / 100); });
  reset.addEventListener('click', neutral);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); neutral(); }
    if (event.target === trigger && event.key.toLowerCase() === 'y' && !event.repeat) { event.preventDefault(); play(); }
  });
  addEventListener('portfolio:motion-change', neutral);
  document.addEventListener('visibilitychange', () => { if (document.hidden) neutral(); });
  addEventListener('pagehide', neutral);
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) neutral(); }).observe(root);
  neutral();
})();

/* Official Tailwind demo: horizontal environment sweep and brief cyan-white
 * streaks. First-person hand/body animation cannot be reproduced by this PNG.
 * 1000/7500ms from Riot 7.04; burst and presentation reset are web timings. */
(() => {
  const root = one('[data-jett-showcase]');
  if (!root) return;
  const button = one('[data-jett-interact]', root), cue = one('[data-jett-cue]', root);
  const status = one('[data-jett-status]', root), directions = all('[data-jett-direction]', root);
  const stage = one('.jett-motion-stage', root), speed = one('.jett-speed', root);
  [[16,88,1,.5],[25,100,2,.6],[37,80,1,.8],[45,98,3,1],[51,78,1,.8],[59,95,2,.9],[68,86,1,.7],[76,100,3,.9],[85,73,1,.55]].forEach(([y,length,weight,alpha]) => {
    const line = document.createElement('i');
    line.style.cssText = `--y:${y}%;--length:${length}%;--weight:${weight}px;--alpha:${alpha}`;
    speed.append(line);
  });
  let state = 'idle', direction = 1, raf = 0, started = 0, queued = false, distance = 0;
  const set = (key,value) => root.style.setProperty(`--jett-${key}`,String(value));
  const clamp = t => Math.max(0,Math.min(1,t));
  const reduced = () => document.documentElement.dataset.reduceMotion === 'true';
  function change(next,now=performance.now()) {
    state = next; started = now; root.dataset.jettState = next;
    const active = next === 'dashing' || next === 'settling' || next === 'resetting';
    button.disabled = active || reduced();
    directions.forEach(b => b.disabled = active || reduced());
    button.setAttribute('aria-pressed',String(next==='priming'||next==='ready'));
  }
  function neutral(message = '捷风 · 逐风') {
    cancelAnimationFrame(raf); raf=0; queued=false;
    ['x','echo-x','bg'].forEach(k=>set(k,'0px'));
    ['trail','wind','meter'].forEach(k=>set(k,0));
    set('opacity',1);set('fade',1);set('lean','0deg');set('smear',1);
    change('idle'); cue.textContent=reduced()?'动效已关闭':'点击 · 准备逐风';
    button.setAttribute('aria-label',reduced()?'捷风立绘，动效已关闭':`捷风逐风：点击准备，再次点击向${direction>0?'右':'左'}冲刺`);
    status.textContent=message;one('[data-jett-countdown]',root).textContent='';
  }
  function dash(now) {
    distance=stage.clientWidth*.23*direction;
    queued=false;one('[data-jett-countdown]',root).textContent='';set('direction',direction);set('meter',0);change('dashing',now);
    cue.textContent=direction>0?'向右逐风':'向左逐风';status.textContent='冲刺中';
  }
  function frame(now) {
    if(reduced()||document.hidden){neutral();return;}
    const elapsed=now-started;
    if(state==='priming'){
      const t=clamp(elapsed/1000);set('wind',t*.7);set('meter',t);
      if(t===1){change('ready',now);cue.textContent='再次点击 · 逐风';button.setAttribute('aria-label',`逐风就绪，再次点击向${direction>0?'右':'左'}冲刺`);status.textContent='逐风就绪';if(queued)dash(now);}
    }else if(state==='ready'){
      const remaining=Math.max(0,7.5-elapsed/1000);
      set('meter',remaining/7.5);set('wind',.5+.15*Math.sin(elapsed/170));
      one('[data-jett-countdown]',root).textContent=remaining.toFixed(1)+' 秒';
      // Countdown is visible, while the live status announces only meaningful states.
      root.setAttribute('data-ready-seconds',remaining.toFixed(1));
      if(elapsed>=7500){neutral('准备窗口结束');return;}
    }else if(state==='dashing'){
      const t=clamp(elapsed/280), x=distance*(1-Math.pow(1-t,2));
      const burst=Math.sin(Math.PI*t);
      set('x',`${x}px`);set('echo-x',`${x-distance*.65*burst}px`);
      set('bg',`${-x*.35}px`);set('trail',burst);set('wind',1-t);
      set('lean',`${direction*-9*burst}deg`);set('smear',1+.12*burst);set('opacity',1-.25*burst);
      if(t===1){set('lean','0deg');set('smear',1);set('trail',0);set('wind',0);set('opacity',1);change('settling',now);cue.textContent='逐风结束';status.textContent='已停稳 · 即将复位';}
    }else if(state==='settling'){
      if(elapsed>=1000){change('resetting',now);status.textContent='演示复位';}
    }else if(state==='resetting'){
      const t=clamp(elapsed/500);
      set('fade',Math.abs(2*t-1));
      if(t>=.5){set('x','0px');set('bg','0px');}
      if(t===1){neutral();return;}
    }
    if(state!=='idle')raf=requestAnimationFrame(frame);
  }
  function activate(){
    if(reduced()||document.hidden)return;
    if(state==='idle'){neutral();change('priming');cue.textContent='准备中…';status.textContent='准备逐风';raf=requestAnimationFrame(frame);}
    else if(state==='priming'){queued=true;cue.textContent='就绪后冲刺';}
    else if(state==='ready')dash(performance.now());
  }
  function choose(value){
    direction=value;
    directions.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.jettDirection)===value)));
    if(state==='idle')neutral();
    else if(state==='ready'){button.setAttribute('aria-label',`逐风就绪，再次点击向${direction>0?'右':'左'}冲刺`);status.textContent=`逐风就绪 · 向${value>0?'右':'左'}`;}
  }
  button.addEventListener('click',activate);
  directions.forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.jettDirection))));
  one('[data-jett-reset]',root).addEventListener('click',()=>neutral());
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();neutral();return;}
    if(button.disabled)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(event.key==='ArrowLeft'?-1:1);}
    if(event.key.toLowerCase()==='e'&&!event.repeat){event.preventDefault();activate();}
  });
  addEventListener('portfolio:motion-change',()=>neutral());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)neutral();});
  addEventListener('pagehide',()=>neutral());
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)neutral();}).observe(root);
  neutral();
})();
