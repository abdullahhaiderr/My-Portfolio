// Public-site interactions only. The admin loads its own script and stylesheet.
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observed = new WeakSet();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      observer.unobserve(target);
      if (reducedMotion.matches || !target.animate) return;
      const direction = target.dataset.aos;
      const transform = direction === 'fade-left' ? 'translateX(16px)' : direction === 'fade-right' ? 'translateX(-16px)' : 'translateY(16px)';
      target.animate([{ opacity: 0, transform }, { opacity: 1, transform: 'none' }], {
        duration: 450, delay: Math.min(Number(target.dataset.aosDelay) || 0, 180), easing: 'cubic-bezier(.2,.7,.2,1)'
      });
    });
  }, { threshold: 0.08 }) : null;

  function refresh(root = document) {
    root.querySelectorAll('.reveal, [data-aos]').forEach(el => {
      if (observed.has(el)) return;
      observed.add(el);
      // Never hide content in anticipation of JS or an observer callback.
      if (observer) observer.observe(el);
    });
  }
  function filterProjects() {
    const selected = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    let count = 0;
    document.querySelectorAll('.portfolio-item[data-category]').forEach(item => {
      item.hidden = selected !== 'all' && item.dataset.category !== selected;
      if (!item.hidden) count++;
    });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.filter === selected)));
    const status = document.getElementById('portfolioStatus');
    if (status) status.textContent = `${count} project${count === 1 ? '' : 's'} shown`;
    refresh();
  }
  window.CreativeHaiderUI = { refresh, filterProjects };

  document.addEventListener('DOMContentLoaded', () => {
    const subjectSelect = document.getElementById('contact-subject');
    const requestedService = new URLSearchParams(window.location.search).get('service');
    if (subjectSelect && requestedService && Array.from(subjectSelect.options).some(option => option.value === requestedService)) {
      subjectSelect.value = requestedService;
    }
    const menu = document.querySelector('.mobile-menu');
    const trigger = document.querySelector('.mobile-menu-btn');
    const close = document.querySelector('.mobile-menu-close');
    const setMenu = open => {
      if (!menu || !trigger) return;
      menu.hidden = !open;
      menu.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
      document.querySelectorAll('main, footer, .whatsapp-float, .navbar').forEach(el => { el.inert = open; });
      if (open) close?.focus(); else trigger.focus();
    };
    trigger?.addEventListener('click', () => setMenu(true));
    close?.addEventListener('click', () => setMenu(false));
    menu?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    menu?.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false); }
      if (e.key !== 'Tab') return;
      const controls = [...menu.querySelectorAll('a[href],button')];
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', e => {
      if (e.matches && menu && !menu.hidden) setMenu(false);
    });
    const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
      const active = new URL(a.href).pathname === path;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const navbar = document.querySelector('.navbar');
    const top = document.querySelector('.back-to-top');
    let scheduled = false;
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        navbar?.classList.toggle('scrolled', window.scrollY > 50);
        top?.classList.toggle('visible', window.scrollY > 500);
        scheduled = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    top?.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' }); });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      filterProjects();
    }));
    document.querySelectorAll('.faq-toggle').forEach(button => button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('.faq-toggle').forEach(b => {
        const expanded = b === button && open;
        b.setAttribute('aria-expanded', String(expanded));
        b.closest('.faq-item').classList.toggle('active', expanded);
        document.getElementById(b.getAttribute('aria-controls')).hidden = !expanded;
      });
    }));
    const motionButton = document.querySelector('.motion-toggle');
    motionButton?.addEventListener('click', () => {
      const paused = document.body.classList.toggle('motion-paused');
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) document.getAnimations().forEach(animation => animation.cancel());
    });
    // Invalid social/legal placeholders remain identifiable without pretending to navigate.
    document.querySelectorAll('a[aria-disabled="true"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
    refresh();
    filterProjects();
  });
})();
