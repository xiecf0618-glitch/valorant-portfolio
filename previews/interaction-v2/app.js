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

/*
 * Tailwind-inspired webpage recreation, using the existing unmodified portrait.
 * Reference: https://playvalorant.com/en-us/agents/jett/
 * Two deliberate presses: prepare the wind, then dash. Timing/return are adapted
 * for the portfolio; this is not a recording or the game's skeletal animation.
 * Integration: remove the previous Jett IIFE, then include this after app.js.
 */
(() => {
  'use strict';
  const root = document.querySelector('[data-jett-showcase]');
  const button = root?.querySelector('[data-jett-interact]');
  const portrait = root?.querySelector('[data-jett-portrait]');
  const cue = root?.querySelector('[data-jett-cue]');
  if (!root || !button || !portrait || !cue || root.dataset.jettMounted) return;
  root.dataset.jettMounted = 'true';
  root.classList.add('jett-tailwind');
  root.querySelectorAll('.jett-wind').forEach(node => node.remove());
  const stage = document.createElement('span');
  stage.className = 'jett-motion-stage';
  stage.setAttribute('aria-hidden', 'true');
  portrait.before(stage);
  stage.append(portrait);
  for (let i = 1; i <= 3; i += 1) {
    const echo = portrait.cloneNode(true);
    echo.removeAttribute('data-jett-portrait');
    echo.classList.add('jett-echo', `jett-echo-${i}`);
    echo.setAttribute('aria-hidden', 'true');
    echo.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    echo.querySelectorAll('img').forEach(img => { img.alt = ''; img.loading = 'eager'; });
    stage.prepend(echo);
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  const flow = document.createElementNS(svgNS, 'svg');
  flow.classList.add('jett-flow');
  flow.setAttribute('viewBox', '0 0 320 618');
  flow.setAttribute('aria-hidden', 'true');
  [
    'M104 568 C36 511 203 506 151 427',
    'M110 561 C48 510 184 501 143 437',
    'M229 558 C281 503 147 481 219 407',
    'M234 552 C272 503 161 476 222 420',
    'M120 604 C81 576 93 548 137 540',
    'M250 527 C299 469 223 449 250 390'
  ].forEach(d => { const path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', d); flow.append(path); });
  stage.append(flow);
  const speed = document.createElement('span');
  speed.className = 'jett-speed';
  speed.setAttribute('aria-hidden', 'true');
  const lines = [
    [17,83,2,0,.62],[23,114,1,24,.45],[31,92,3,-20,.8],[39,121,2,3,.5],
    [47,101,4,-10,.92],[52,87,1,22,.65],[59,117,3,-14,.75],
    [64,80,2,36,.8],[73,126,2,-7,.72],[80,100,4,-22,.86],[88,88,1,20,.6]
  ];
  lines.forEach(([y,width,thick,shift,alpha]) => {
    const line = document.createElement('i');
    line.style.cssText = `--line-y:${y}%;--line-width:${width}%;--line-thick:${thick}px;--line-shift:${shift}px;--line-alpha:${alpha}`;
    speed.append(line);
  });
  stage.append(speed);
  const cueIcon = cue.previousElementSibling;
  if (cueIcon) { cueIcon.textContent = 'E'; cueIcon.classList.add('jett-key'); }
  const status = document.createElement('span');
  status.className = 'jett-motion-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(status);

  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => systemMotion.matches || document.documentElement.dataset.reduceMotion === 'true';
  let state = 'idle';
  let startTime = 0;
  let raf = 0;
  let direction = 1;
  let width = 0;
  let queuedDash = false;
  const primeDuration = 700;
  const readyDuration = 7500;
  const dashDuration = 400;
  const returnDuration = 450;
  const set = (name, value) => root.style.setProperty(`--jett-${name}`, String(value));
  const clamp = value => Math.max(0, Math.min(1, value));
  const labels = {
    idle: ['点击 · 蓄风', '与捷风互动：点击蓄风，然后再次点击发动逐风'],
    priming: ['蓄风中…', '捷风正在蓄风，可以再次点击发动逐风'],
    ready: ['再次点击 · 逐风', '逐风已就绪，再次点击冲刺；也可用方向键选择方向'],
    dashing: ['逐风', '捷风正在逐风冲刺'],
    returning: ['逐风', '捷风互动即将复位']
  };
  function change(next, now = performance.now()) {
    state = next;
    startTime = now;
    root.dataset.jettState = next;
    cue.textContent = labels[next][0];
    button.setAttribute('aria-label', labels[next][1]);
    button.setAttribute('aria-pressed', String(next === 'priming' || next === 'ready'));
    if (next === 'ready') status.textContent = '逐风已就绪。再次点击即可冲刺。';
    if (next === 'dashing') status.textContent = direction > 0 ? '捷风向右冲刺。' : '捷风向左冲刺。';
  }
  function neutral() {
    set('x', '0px'); set('opacity', 1); set('blur', '0px'); set('wind', 0);
    set('trail', 0); set('charge', 0); set('streak-x', '0px');
    for (const name of ['one', 'two', 'three']) set(`ghost-${name}`, '0px');
  }
  function cancel() {
    cancelAnimationFrame(raf);
    raf = 0;
    queuedDash = false;
    neutral();
    change('idle');
    status.textContent = '';
    if (reduced()) { cue.textContent = '动效已关闭'; button.setAttribute('aria-label', '捷风立绘，动效已关闭'); }
  }
  function beginDash(now) {
    width = stage.getBoundingClientRect().width;
    set('direction', direction);
    queuedDash = false;
    change('dashing', now);
  }
  function frame(now) {
    raf = 0;
    if (reduced() || document.hidden) { cancel(); return; }
    const elapsed = now - startTime;
    if (state === 'priming') {
      const t = clamp(elapsed / primeDuration);
      set('wind', .9 * Math.sin(Math.PI * .5 * t));
      set('charge', t);
      if (t === 1) { change('ready', now); if (queuedDash) beginDash(now); }
    } else if (state === 'ready') {
      set('wind', .68 + .18 * Math.sin(elapsed / 200));
      set('charge', .8 + .2 * Math.sin(elapsed / 250));
      if (elapsed > readyDuration) { cancel(); return; }
    } else if (state === 'dashing') {
      const t = clamp(elapsed / dashDuration);
      const distance = width * 1.2;
      const x = direction * distance * (1 - Math.pow(1 - t, 2));
      set('x', `${x.toFixed(2)}px`);
      set('opacity', 1 - clamp((t - .25) / .5));
      set('blur', `${(Math.sin(t * Math.PI) * 1.6).toFixed(2)}px`);
      set('wind', (1 - t) * .6);
      set('charge', 0);
      set('trail', Math.sin(Math.PI * t));
      set('streak-x', `${(direction * width * .36 * t).toFixed(2)}px`);
      ['one','two','three'].forEach((name, index) => set(`ghost-${name}`, `${(x - direction * width * (.12 + index * .11) * Math.sin(t * Math.PI)).toFixed(2)}px`));
      if (t === 1) { neutral(); set('opacity', 0); change('returning', now); }
    } else if (state === 'returning') {
      const t = clamp(elapsed / returnDuration);
      // Soft return belongs to webpage reset, not a second invented game ability.
      set('opacity', t * t * (3 - 2 * t));
      if (t === 1) { cancel(); direction *= -1; return; }
    }
    if (state !== 'idle') raf = requestAnimationFrame(frame);
  }
  function activate() {
    if (reduced() || document.hidden) return;
    if (state === 'idle') {
      neutral(); change('priming');
      status.textContent = '开始蓄风。再次点击发动逐风。';
      raf = requestAnimationFrame(frame);
    } else if (state === 'priming') queuedDash = true;
    else if (state === 'ready') beginDash(performance.now());
  }
  button.addEventListener('click', activate);
  button.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      direction = event.key === 'ArrowLeft' ? -1 : 1;
      if (state === 'ready') status.textContent = `${direction < 0 ? '向左' : '向右'}逐风。按回车或空格发动。`;
    }
    if (event.key.toLowerCase() === 'e' && !event.repeat) { event.preventDefault(); activate(); }
  });
  function syncMotion() {
    cancel();
    button.disabled = reduced();
    if (reduced()) { cue.textContent = '动效已关闭'; button.setAttribute('aria-label', '捷风立绘，动效已关闭'); }
  }
  window.addEventListener('portfolio:motion-change', syncMotion);
  systemMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  window.addEventListener('pagehide', cancel);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && state !== 'idle') cancel();
  }, { threshold: .01 }).observe(root);
  syncMotion();
})();
