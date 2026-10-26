// Public-site interactions only. The admin loads its own script and stylesheet.
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observed = new WeakSet();
  const AUTO_REVEAL_SELECTOR = [
    '.page-header > *',
    'main .section-header',
    'main .about-grid > *',
    'main .timeline-item',
    'main .edu-card',
    'main .service-card',
    'main .service-detail-card',
    'main .pricing-card',
    'main .portfolio-item',
    'main .process-card',
    'main .testimonial-card',
    'main .contact-item',
    'main .contact-form',
    'main .faq-item',
    'main .technology-group',
    'main .service-answer-card',
    'main .legal-document',
    'footer .footer-grid > *',
    'footer .footer-bottom'
  ].join(', ');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('motion-in');
      observer.unobserve(target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }) : null;

  function prepareAutoRevealTargets(root) {
    root.querySelectorAll(AUTO_REVEAL_SELECTOR).forEach(el => {
      if (el.closest('.hero') || el.matches('.reveal, [data-aos]')) return;
      el.dataset.aos = 'fade-up';
    });
  }

  function refresh(root = document) {
    prepareAutoRevealTargets(root);
    const canAnimate = Boolean(observer && !reducedMotion.matches);
    document.body?.classList.toggle('motion-ready', canAnimate);
    root.querySelectorAll('.reveal, [data-aos]').forEach(el => {
      if (el.closest('.hero')) return;
      if (!el.hasAttribute('data-aos')) el.dataset.aos = 'fade-up';
      const delay = Math.min(Number(el.dataset.aosDelay) || 0, 180);
      el.style.setProperty('--motion-delay', delay + 'ms');
      el.classList.add('motion-pending');
      if (!canAnimate) {
        el.classList.add('motion-in');
        return;
      }
      if (!observed.has(el)) {
        observed.add(el);
        observer.observe(el);
      }
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
    if (observer && !reducedMotion.matches) {
      document.querySelectorAll('.portfolio-item:not([hidden]).motion-pending:not(.motion-in)').forEach(item => observer.observe(item));
    }
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
      if (reducedMotion.matches) {
        document.body.classList.remove('motion-ready');
        document.querySelectorAll('.motion-pending').forEach(el => el.classList.add('motion-in'));
        document.getAnimations().forEach(animation => animation.cancel());
      } else {
        refresh();
      }
    });
    // Invalid social/legal placeholders remain identifiable without pretending to navigate.
    document.querySelectorAll('a[aria-disabled="true"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
    const rotatingTagline = document.querySelector('.hero-rotating-tagline');
    if (rotatingTagline && !reducedMotion.matches) {
      const taglines = ['AI that saves time', 'Websites that convert', 'SaaS built to scale'];
      let taglineIndex = 0;
      window.setInterval(() => {
        taglineIndex = (taglineIndex + 1) % taglines.length;
        rotatingTagline.classList.add('tagline-changing');
        window.setTimeout(() => {
          rotatingTagline.textContent = taglines[taglineIndex];
          rotatingTagline.classList.remove('tagline-changing');
        }, 180);
      }, 2800);
    }

    // Accessible type-and-delete headline motion inspired by modern text-cycle UI patterns.
    const rotatingWord = document.querySelector('.hero-rotating-word');
    if (rotatingWord && !reducedMotion.matches) {
      const words = ['web apps', 'SaaS products', 'AI workflows'];
      let wordIndex = 0;
      let charIndex = words[0].length;
      let deleting = true;
      const tick = () => {
        const word = words[wordIndex];
        charIndex += deleting ? -1 : 1;
        rotatingWord.classList.toggle('word-erasing', deleting);
        rotatingWord.textContent = word.slice(0, Math.max(0, charIndex));
        let delay = deleting ? 54 : 92;
        if (charIndex <= 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          delay = 190;
        } else if (charIndex >= words[wordIndex].length) {
          charIndex = words[wordIndex].length;
          deleting = true;
          delay = 1250;
        }
        window.setTimeout(tick, delay);
      };
      window.setTimeout(tick, 1450);
    }

    // Lightweight cookie consent. Essential site functionality remains available;
    // no optional analytics/advertising cookies are enabled by this banner.
    const consentKey = 'creativehaider-cookie-consent-v1';
    let savedConsent = null;
    try { savedConsent = window.localStorage.getItem(consentKey); } catch (_) {}
    if (!savedConsent) {
      const banner = document.createElement('section');
      banner.className = 'cookie-consent';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-modal', 'false');
      banner.setAttribute('aria-labelledby', 'cookie-consent-title');
      banner.innerHTML = `
        <div class="cookie-consent-copy">
          <span class="cookie-consent-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.7 13.1A8.7 8.7 0 0 1 10.9 3.3a8.8 8.8 0 1 0 9.8 9.8Z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8" cy="9" r="1.15" fill="currentColor"/><circle cx="13" cy="7.5" r="1" fill="currentColor"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor"/><circle cx="9" cy="16" r="1" fill="currentColor"/></svg></span>
          <div>
            <h2 id="cookie-consent-title">Your privacy matters</h2>
            <p>This site uses essential storage for core functionality and remembering your choice. Optional analytics loads only if you choose Accept all. Essential only keeps analytics disabled.</p>
          </div>
        </div>
        <div class="cookie-consent-actions">
          <button type="button" class="cookie-accept">Accept all</button>
          <button type="button" class="cookie-essential">Essential only</button>
        </div>`;
      document.body.appendChild(banner);
      const saveConsent = choice => {
        try { window.localStorage.setItem(consentKey, JSON.stringify({ choice, savedAt: new Date().toISOString() })); } catch (_) {}
        window.dispatchEvent(new CustomEvent('creativehaider-consent-change', { detail: choice }));
        banner.remove();
      };
      banner.querySelector('.cookie-accept').addEventListener('click', () => saveConsent('all'));
      banner.querySelector('.cookie-essential').addEventListener('click', () => saveConsent('essential'));
    }

    // Submit client reviews to Supabase for moderation before public display.
    const reviewForm = document.getElementById('review-submit-form');
    const reviewStatus = document.getElementById('review-form-status');
    const reviewPhoto = document.getElementById('review-photo');
    const reviewPhotoPreview = document.getElementById('review-photo-preview');
    reviewPhoto?.addEventListener('change', () => {
      const file = reviewPhoto.files?.[0];
      if (!file || !reviewPhotoPreview) { if (reviewPhotoPreview) reviewPhotoPreview.hidden = true; return; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
        reviewPhoto.value = '';
        reviewPhotoPreview.hidden = true;
        if (reviewStatus) { reviewStatus.textContent = 'Choose a JPG, PNG or WebP photo smaller than 3 MB.'; reviewStatus.classList.add('is-error'); }
        return;
      }
      reviewPhotoPreview.src = URL.createObjectURL(file);
      reviewPhotoPreview.hidden = false;
    });
    reviewForm?.addEventListener('submit', async event => {
      event.preventDefault();
      if (!reviewStatus) return;
      const submitButton = reviewForm.querySelector('button[type="submit"]');
      const values = new FormData(reviewForm);
      const name = String(values.get('name') || '').trim();
      const role = String(values.get('role') || '').trim();
      const review = String(values.get('review') || '').trim();
      const rating = Number(values.get('rating'));
      const photo = values.get('review_photo');
      if (name.length < 2 || review.length < 12 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        reviewStatus.textContent = 'Please enter your name, a review of at least 12 characters, and a valid rating.';
        reviewStatus.classList.add('is-error');
        return;
      }
      const cfg = window.CREATIVE_HAIDER_SUPABASE || {};
      if (!cfg.url || !cfg.anonKey) {
        reviewStatus.textContent = 'Review submissions are not configured yet. Please contact me directly for now.';
        reviewStatus.classList.add('is-error');
        return;
      }
      if (!(photo instanceof File) || !photo.size) {
        reviewStatus.textContent = 'Please choose a photo to submit with your review.';
        reviewStatus.classList.add('is-error');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 3 * 1024 * 1024) {
        reviewStatus.textContent = 'Please choose a JPG, PNG or WebP photo smaller than 3 MB.';
        reviewStatus.classList.add('is-error');
        return;
      }
      submitButton.disabled = true;
      reviewStatus.classList.remove('is-error');
      reviewStatus.textContent = 'Uploading your photo and submitting your review…';
      try {
        const safeName = photo.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(-90) || 'review-photo';
        const imagePath = 'review-submissions/' + crypto.randomUUID() + '-' + safeName;
        const uploadResponse = await fetch(cfg.url + '/storage/v1/object/review-images/' + imagePath, {
          method: 'POST',
          headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': photo.type, 'x-upsert': 'false' },
          body: photo
        });
        if (!uploadResponse.ok) throw new Error('Photo upload failed (' + uploadResponse.status + '). Please check that the Supabase setup SQL has been run.');
        const imageUrl = cfg.url + '/storage/v1/object/public/review-images/' + imagePath;
        const response = await fetch(cfg.url + '/rest/v1/client_reviews', {
          method: 'POST',
          headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ name, role: role || null, review, rating, image_url: imageUrl })
        });
        if (!response.ok) throw new Error('Review submission failed (' + response.status + ').');
        reviewForm.reset();
        if (reviewPhotoPreview) { reviewPhotoPreview.hidden = true; reviewPhotoPreview.removeAttribute('src'); }
        reviewStatus.textContent = 'Thank you! Your review and photo have been received. They will appear after an authenticity check.';
      } catch (error) {
        console.error('Review submission failed:', error);
        reviewStatus.textContent = 'We couldn’t submit your review right now. Please try again later or contact me directly.';
        reviewStatus.classList.add('is-error');
      } finally {
        submitButton.disabled = false;
      }
    });

    // Load only approved client reviews from Supabase for the public testimonial section.
    async function loadApprovedTestimonials() {
      const section = document.getElementById('testimonials');
      const marquee = document.getElementById('approved-testimonials-marquee');
      const emptyState = document.getElementById('approved-testimonials-empty');
      const tracks = Array.from(document.querySelectorAll('[data-testimonial-track]'));
      if (!section || !marquee || !emptyState || !tracks.length) return;

      const cfg = window.CREATIVE_HAIDER_SUPABASE || {};
      if (!cfg.url || !cfg.anonKey) {
        marquee.hidden = true;
        emptyState.hidden = false;
        return;
      }

      try {
        const endpoint = cfg.url.replace(/\/$/, '') +
          '/rest/v1/client_reviews?select=name,role,review,rating,image_url,created_at&status=eq.approved&order=created_at.desc&limit=30';
        const response = await fetch(endpoint, {
          headers: { apikey: cfg.anonKey, Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Could not load published reviews (' + response.status + ').');
        const reviews = await response.json();

        tracks.forEach(track => { track.replaceChildren(); track.dataset.loopReady = 'false'; });
        if (!Array.isArray(reviews) || reviews.length === 0) {
          marquee.hidden = true;
          emptyState.hidden = false;
          return;
        }

        const makeCard = review => {
          const card = document.createElement('li');
          card.className = 'testimonial-glass-card';

          const quote = document.createElement('span');
          quote.className = 'testimonial-quote-mark';
          quote.setAttribute('aria-hidden', 'true');
          quote.textContent = '“';

          const text = document.createElement('p');
          text.textContent = review.review || '';

          const footer = document.createElement('footer');
          if (review.image_url) {
            const img = document.createElement('img');
            img.src = review.image_url;
            img.alt = '';
            img.width = 44;
            img.height = 44;
            img.loading = 'lazy';
            img.decoding = 'async';
            footer.appendChild(img);
          }

          const identity = document.createElement('span');
          const name = document.createElement('strong');
          name.textContent = review.name || 'Client';
          identity.appendChild(name);

          if (review.role) {
            const role = document.createElement('small');
            role.textContent = review.role;
            identity.appendChild(role);
          }
          footer.appendChild(identity);

          const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
          const stars = document.createElement('div');
          stars.className = 'testimonial-rating';
          stars.setAttribute('aria-label', rating + ' out of 5 stars');
          stars.textContent = '★'.repeat(rating);
          card.append(quote, text, stars, footer);
          return card;
        };

        reviews.forEach((review, index) => {
          tracks[index % tracks.length].appendChild(makeCard(review));
        });

        marquee.hidden = false;
        emptyState.hidden = true;

        // Duplicate cards only after real approved reviews have been rendered.
        tracks.forEach(track => {
          Array.from(track.children).forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('img').forEach(img => img.setAttribute('alt', ''));
            track.appendChild(clone);
          });
          track.dataset.loopReady = 'true';
        });
      } catch (error) {
        console.error('Approved testimonials failed to load:', error);
        marquee.hidden = true;
        emptyState.hidden = false;
        emptyState.textContent = 'Client testimonials are temporarily unavailable. Please check back soon.';
      }
    }

    loadApprovedTestimonials();

    refresh();
    filterProjects();
  });
})();
