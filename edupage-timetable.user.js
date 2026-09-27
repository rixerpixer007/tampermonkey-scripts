// ==UserScript==
// @name         EduPage timetable defaults
// @namespace    local.edupage.settings
// @version      1.7
// @description  Opens a chosen class timetable and turns "Päevad kirjeldatud veergude järgi" off.
// @match        https://torg.edupage.org/timetable/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/rixerpixer007/tampermonkey-scripts/refs/heads/main/edupage-timetable.user.js
// @downloadURL  https://raw.githubusercontent.com/rixerpixer007/tampermonkey-scripts/refs/heads/main/edupage-timetable.user.js
// ==/UserScript==

(function () {
  'use strict';

  const CLASS_NAME = 'G3D';
  const SWAP_AXIS_LABEL = 'Päevad kirjeldatud veergude järgi';
  const DEBUG = false;

  let patched = false;
  let classDone = false;
  let swapAxisDone = false;

  function log(...args) {
    if (DEBUG) console.log('[EduPage defaults]', ...args);
  }

  function itemText(item) {
    return String(item?.text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .trim();
  }

  function runMenuItem(item) {
    const handler = item.onclick || item.onClick;
    if (typeof handler !== 'function') return false;

    handler();

    setTimeout(() => {
      window.ASC?.hideContextMenu?.();
    }, 100);

    return true;
  }

  function patchEduPageMenu() {
    const ASC = window.ASC;
    if (!ASC?.showContextMenu) return false;
    if (patched) return true;

    patched = true;
    const originalShowContextMenu = ASC.showContextMenu;

    ASC.showContextMenu = function (items, ...args) {
      const realItems = items.filter(item => item && !Array.isArray(item));
      log('menu:', realItems.map(item => `${itemText(item)} checked=${item.checked}`));

      if (!classDone) {
        const classItem = realItems.find(item => itemText(item) === CLASS_NAME);

        if (classItem) {
          classDone = true;
          if (!classItem.checked) runMenuItem(classItem);
        }
      }

      if (!swapAxisDone) {
        const swapAxisItem = realItems.find(item => itemText(item) === SWAP_AXIS_LABEL);

        if (swapAxisItem) {
          swapAxisDone = true;
          if (swapAxisItem.checked) runMenuItem(swapAxisItem);
        }
      }

      return originalShowContextMenu.call(this, items, ...args);
    };

    return true;
  }

  function isVisible(el) {
    return !!el && el.offsetParent !== null;
  }

  function clickClassButton() {
    const button = [...document.querySelectorAll('span')]
      .filter(isVisible)
      .find(el => {
        const title = (el.getAttribute('title') || '').toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();
        const clickable = window.getComputedStyle(el).cursor === 'pointer';

        return clickable && (
          title.includes('klass') ||
          title.includes('class') ||
          text.includes('klass') ||
          text.includes('class')
        );
      });

    if (!button) return false;

    button.click();
    return true;
  }

  function clickSettingsButton() {
    const arrows = [...document.querySelectorAll('.fa-caret-down')].filter(isVisible);
    const button = arrows.at(-1)?.closest('span');

    if (!button) return false;

    button.click();
    return true;
  }

   function isTypingTarget(target) {
  if (!(target instanceof Element)) return false;

  return target.isContentEditable || Boolean(
    target.closest('input, textarea, select, [role="textbox"]')
  );
}

function clickNavigationArrow(title) {
  const arrow = [...document.querySelectorAll('span[title]')]
    .filter(isVisible)
    .find(el => el.getAttribute('title') === title);

  if (!arrow) return false;

  arrow.click();
  return true;
}

document.addEventListener('keydown', event => {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isTypingTarget(event.target)
  ) {
    return;
  }

  const title =
    event.key === 'ArrowLeft' ? '<<' :
    event.key === 'ArrowRight' ? '>>' :
    null;

  if (!title || !clickNavigationArrow(title)) return;

  event.preventDefault();
});

  let tries = 0;

  const timer = setInterval(() => {
    tries += 1;

    if (!patchEduPageMenu()) return;

    if (!classDone) {
      clickClassButton();
    } else if (!swapAxisDone) {
      clickSettingsButton();
    }

    if ((classDone && swapAxisDone) || tries > 80) {
      clearInterval(timer);
      log('finished', { classDone, swapAxisDone, tries });
    }
  }, 100);
})();
