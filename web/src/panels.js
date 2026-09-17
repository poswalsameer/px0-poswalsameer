// web/src/panels.js
import { $, $$, S, api } from './state.js';
import { layout, render } from './renderer.js';
import { updateStatus } from './status.js';
import { loadOutline } from './outline.js';
import { treeEl, openDirs, drawTree } from './tree.js';
import { reloadOpenTabs } from './tabs.js';
import { showToast } from './ui.js';

/* The sidebar's "move to the other side" action lives in settings.js, which
   registers it here on load. Keeping the dependency one-way (as selbar/agent
   do) avoids importing settings from the sidebar module and keeps the two from
   forming a cycle. */
let sidebarToggle = null;
export function setSidebarToggle(fn) { sidebarToggle = fn; }

export function showPanel(name) {
  document.body.classList.remove('side-hidden');
  layout();
  render();
}

const sideMenu = $('#side-menu');

function closeSideMenu() {
  if (sideMenu && !sideMenu.hidden) sideMenu.hidden = true;
}

/* The sidebar's right-click menu, at the pointer. One action for now: move the
   panel to the other side. */
function openSideMenu(x, y) {
  if (!sideMenu) return;
  const onRight = document.body.classList.contains('side-right');
  sideMenu.replaceChildren();
  const btn = document.createElement('button');
  btn.className = 'side-menu-item';
  btn.setAttribute('role', 'menuitem');
  btn.textContent = onRight ? 'Move Sidebar to Left' : 'Move Sidebar to Right';
  sideMenu.append(btn);
  sideMenu.hidden = false;
  // Open toward the pointer's bottom-right, flipping at the window's edges.
  const w = sideMenu.offsetWidth, h = sideMenu.offsetHeight;
  sideMenu.style.left = Math.max(4, x + w > innerWidth - 4 ? x - w : x) + 'px';
  sideMenu.style.top = Math.max(4, y + h > innerHeight - 4 ? y - h : y) + 'px';
}

export function initPanels() {
  $('#btn-reindex').addEventListener('click', async () => {
    const j = await api('/api/reindex');
    S.meta.files = j.files; S.meta.indexMs = j.indexMs;
    treeEl.innerHTML = ''; openDirs.clear();
    await drawTree('', treeEl, 0);
    // Reindex is a refresh: re-fetch open tabs quietly in place without tab switching.
    await reloadOpenTabs();
    updateStatus();
    showToast('✓', 'Workspace reindexed');
  });

  /* sidebar resize */
  (() => {
    const rz = $('#resizer'); let dragging = false;
    rz.addEventListener('mousedown', e => { dragging = true; rz.classList.add('drag'); e.preventDefault(); });
    addEventListener('mousemove', e => {
      if (!dragging) return;
      const raw = document.body.classList.contains('side-right') ? innerWidth - e.clientX : e.clientX;
      $('#side').style.width = Math.max(170, Math.min(620, raw)) + 'px';
    });
    addEventListener('mouseup', () => { if (dragging) { dragging = false; rz.classList.remove('drag'); layout(); render(); } });
  })();

  /* Right-click on the sidebar opens its menu. Footer links keep the browser's
     own menu, so "open in new tab" still works on them. */
  document.addEventListener('contextmenu', e => {
    if (sideMenu && sideMenu.contains(e.target)) { e.preventDefault(); return; }
    if (!e.target.closest('#side') || e.target.closest('a')) return;
    e.preventDefault();
    openSideMenu(e.clientX, e.clientY);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSideMenu(); });

  if (sideMenu) {
    sideMenu.addEventListener('mousedown', e => e.preventDefault());
    sideMenu.addEventListener('click', e => {
      if (!e.target.closest('.side-menu-item')) return;
      closeSideMenu();
      if (sidebarToggle) sidebarToggle();
      showToast('✓', 'Sidebar moved to ' + (document.body.classList.contains('side-right') ? 'right' : 'left'));
    });
    document.addEventListener('mousedown', e => { if (!sideMenu.hidden && !sideMenu.contains(e.target)) closeSideMenu(); }, true);
    addEventListener('resize', closeSideMenu);
    addEventListener('blur', closeSideMenu);
    document.addEventListener('scroll', closeSideMenu, true);
  }
}
