/* Direct Codex implementation. Progressive enhancement; no scroll hijacking. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fit = scene => scene.style.setProperty('--scene-scale', scene.clientWidth / (Number(scene.dataset.planeWidth) || 1402));
  const scenes = [...document.querySelectorAll('.photo-composite')];
  scenes.forEach(fit);
  if ('ResizeObserver' in window) {
    const sizes = new ResizeObserver(entries => entries.forEach(e => fit(e.target)));
    scenes.forEach(s => sizes.observe(s));
  } else addEventListener('resize', () => scenes.forEach(fit));

  const tabs = [...document.querySelectorAll('[data-case]')];
  function enter(el) {
    el.classList.remove('is-entering');
    if (!reduced.matches) requestAnimationFrame(() => el.classList.add('is-entering'));
  }
  function select(tab) {
    tabs.forEach(t => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !active;
      if (active) { panel.querySelectorAll('.photo-composite').forEach(fit); enter(panel); }
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;
      e.preventDefault(); select(tabs[next]); tabs[next].focus();
    });
  });
  document.querySelectorAll('.cx-mode').forEach(group => {
    group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      group.closest('.cx-case').querySelectorAll('.cx-example').forEach(panel => {
        const active = panel.dataset.index === button.dataset.example;
        panel.hidden = !active;
        if (active) { panel.querySelectorAll('.photo-composite').forEach(fit); enter(panel); }
      });
    }));
  });

  const observed = [...document.querySelectorAll('.cx-story,.cx-personal,.cx-private,.cx-start')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
    }), {threshold: .08});
    observed.forEach(s => observer.observe(s));
    if (!reduced.matches) document.documentElement.classList.add('cx-motion');
  }
  const hero = document.querySelector('.cx-hero-media');
  const header = document.querySelector('.cx-header');
  let queued = false, heroVisible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {heroVisible = entries[0].isIntersecting;}).observe(hero);
  function paint() {
    queued = false;
    const extent = document.documentElement.scrollHeight - innerHeight;
    header.style.setProperty('--read', extent > 0 ? Math.max(0,Math.min(1,scrollY/extent)) : 0);
    if (heroVisible && !reduced.matches && innerWidth > 800) {
      const p = Math.max(0, Math.min(1, scrollY/700));
      hero.style.setProperty('--hero-expand', p);
      hero.querySelector('.photo-composite').style.borderRadius = `${28 - p * 20}px`;
    }
  }
  const queue = () => {if (!queued) {queued = true; requestAnimationFrame(paint);}};
  addEventListener('scroll', queue, {passive:true}); addEventListener('resize', queue);
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      document.documentElement.classList.remove('cx-motion');
      hero.style.setProperty('--hero-expand', 0);
      hero.querySelector('.photo-composite').style.borderRadius = '';
    }
    queue();
  });
  paint();
})();
