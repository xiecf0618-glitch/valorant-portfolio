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
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateMotion() {
  document.documentElement.dataset.reduceMotion = String(reduced);
  motionButton.setAttribute('aria-pressed', String(reduced));
  motionButton.setAttribute('aria-label', reduced ? '启用动效' : '减少动效');
  motionButton.textContent = reduced ? '开启平滑滚动' : '减少滚动动效';
}
motionButton.addEventListener('click', () => { reduced = !reduced; updateMotion(); });
updateMotion();
