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

/* Bounded decorative interactions. Existing article and navigation are unaffected. */
(() => {
  const showcase = document.querySelector('[data-weapon-showcase]');
  const jett = document.querySelector('[data-jett-showcase]');
  if (!showcase && !jett) return;

  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionReduced = () => systemMotion.matches || document.documentElement.dataset.reduceMotion === 'true';
  const activeAnimations = new Set();
  let pointerFrame = 0;
  let pointerTarget = null;

  function cancelAnimations() {
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
  }
  function play(element, frames, duration, delay = 0) {
    if (!element || motionReduced() || typeof element.animate !== 'function') return;
    const animation = element.animate(frames, { duration, delay, easing: 'cubic-bezier(.22,.65,.3,1)', iterations: 1 });
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
  }

  const viewer = showcase?.querySelector('[data-weapon-inspect]');
  const weaponImage = showcase?.querySelector('[data-weapon-image]');
  const weaponName = showcase?.querySelector('[data-weapon-name]');
  const weaponCue = showcase?.querySelector('[data-weapon-cue]');
  const orbit = showcase?.querySelector('[data-weapon-orbit]');
  const choices = [...(showcase?.querySelectorAll('[data-weapon-choice]') || [])];
  const jettButton = jett?.querySelector('[data-jett-interact]');
  const jettCue = jett?.querySelector('[data-jett-cue]');
  const jettPortrait = jett?.querySelector('[data-jett-portrait]');

  function resetPointer() {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pointerTarget = null;
    orbit?.style.removeProperty('--weapon-x');
    orbit?.style.removeProperty('--weapon-y');
    orbit?.style.removeProperty('--weapon-roll');
  }
  function selectWeapon(index, focus = false) {
    if (!choices[index] || !weaponImage) return;
    cancelAnimations();
    resetPointer();
    const selected = choices[index];
    choices.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    weaponImage.src = selected.dataset.src;
    weaponImage.alt = selected.dataset.alt;
    weaponImage.width = 512;
    weaponImage.height = Number(selected.dataset.height);
    if (weaponName) weaponName.textContent = selected.dataset.name;
    viewer?.setAttribute('aria-label', '检视 ' + selected.dataset.name.replace(' · ', ' '));
    if (focus) selected.focus({ preventScroll: true });
  }

  choices.forEach((button, index) => {
    button.addEventListener('click', () => selectWeapon(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % choices.length;
      if (event.key === 'ArrowLeft') next = (index + choices.length - 1) % choices.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = choices.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectWeapon(next, true);
      }
    });
  });

  viewer?.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motionReduced() || !orbit) return;
    const bounds = viewer.getBoundingClientRect();
    pointerTarget = {
      x: Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)),
      y: Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
    };
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointerTarget || motionReduced()) return;
      orbit.style.setProperty('--weapon-x', (pointerTarget.x * 5).toFixed(2) + 'px');
      orbit.style.setProperty('--weapon-y', (pointerTarget.y * 4).toFixed(2) + 'px');
      orbit.style.setProperty('--weapon-roll', (pointerTarget.x * 1.4).toFixed(2) + 'deg');
    });
  }, { passive: true });
  viewer?.addEventListener('pointerleave', resetPointer);
  viewer?.addEventListener('pointercancel', resetPointer);
  viewer?.addEventListener('blur', resetPointer);
  viewer?.addEventListener('click', () => {
    if (motionReduced()) return;
    cancelAnimations();
    resetPointer();
    play(weaponImage, [
      { transform: 'translateY(0) rotate(0deg)' },
      { transform: 'translateY(-6px) rotate(-5deg)', offset: .32 },
      { transform: 'translateY(-2px) rotate(2deg)', offset: .68 },
      { transform: 'translateY(0) rotate(0deg)' }
    ], 820);
  });

  jettButton?.addEventListener('click', () => {
    if (motionReduced()) return;
    cancelAnimations();
    play(jettPortrait, [
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: 'translate(3px,-4px) rotate(.9deg)', offset: .3 },
      { transform: 'translate(-2px,-1px) rotate(-.4deg)', offset: .7 },
      { transform: 'translate(0,0) rotate(0deg)' }
    ], 820);
    jett.querySelectorAll('.jett-wind').forEach((wind, i) => play(wind, [
      { opacity: 0, transform: 'translateY(10px) rotate(-24deg) scale(.82)' },
      { opacity: .72, transform: 'translateY(0) rotate(-16deg) scale(1)', offset: .4 },
      { opacity: 0, transform: 'translateY(-15px) rotate(-8deg) scale(1.05)' }
    ], 700, i * 110));
  });

  function syncMotion() {
    cancelAnimations();
    resetPointer();
    const reduced = motionReduced();
    if (viewer) viewer.disabled = reduced;
    if (weaponCue) weaponCue.textContent = reduced ? '动效已关闭' : '点击检视';
    if (jettButton) jettButton.disabled = reduced;
    if (jettCue) jettCue.textContent = reduced ? '动效已关闭' : '点击 · 唤起风效';
  }
  document.addEventListener('portfolio:motion-change', syncMotion);
  window.addEventListener('portfolio:motion-change', syncMotion);
  systemMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimations(); resetPointer(); }
  });
  selectWeapon(Math.max(0, choices.findIndex(button => button.getAttribute('aria-pressed') === 'true')));
  syncMotion();
})();
