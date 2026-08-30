const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = window.matchMedia('(max-width: 800px)').matches;
const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.connection && navigator.connection.saveData);
const root = document.documentElement;

// Loader: fast first visit, nearly instant on same-tab revisits.
const loader = $('.loader');
const loaderNum = $('.loader-num');
const loaderBar = $('.loader-bar i');

function finishLoader(delay = 120) {
  window.setTimeout(() => {
    loader?.classList.add('done');
    document.body.classList.add('ready');
    playHeroIntro();
  }, delay);
}

function runLoader() {
  if (!loader || reducedMotion) return finishLoader(0);

  const seen = sessionStorage.getItem('jf-loader-seen');
  if (seen) {
    if (loaderNum) loaderNum.textContent = '100';
    if (loaderBar) loaderBar.style.width = '100%';
    return finishLoader(70);
  }

  const start = performance.now();
  const duration = lowPower ? 560 : 760;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(eased * 100);
    if (loaderNum) loaderNum.textContent = String(value).padStart(2, '0');
    if (loaderBar) loaderBar.style.width = `${value}%`;
    if (t < 1) requestAnimationFrame(tick);
    else {
      sessionStorage.setItem('jf-loader-seen', '1');
      finishLoader(120);
    }
  };
  requestAnimationFrame(tick);
}

// Current time.
function updateClock() {
  const target = $('#clock');
  if (!target) return;
  const d = new Date();
  target.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((x) => String(x).padStart(2, '0')).join(':');
}
updateClock();
setInterval(updateClock, 1000);

// Lenis: deliberately desktop-only. Native touch scrolling is faster and more predictable on mobile.
let lenis = null;
if (!reducedMotion && finePointer && window.Lenis) {
  lenis = new window.Lenis({
    autoRaf: true,
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    anchors: false
  });
}

// Pointer / magnetic interactions.
const cursor = $('.cursor');
if (finePointer && cursor && !reducedMotion) {
  let pointerX = innerWidth / 2;
  let pointerY = innerHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    root.style.setProperty('--mx', `${event.clientX}px`);
    root.style.setProperty('--my', `${event.clientY}px`);
  }, { passive: true });

  const renderCursor = () => {
    cursorX += (pointerX - cursorX) * 0.2;
    cursorY += (pointerY - cursorY) * 0.2;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    requestAnimationFrame(renderCursor);
  };
  requestAnimationFrame(renderCursor);

  $$('.magnetic').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('big'));
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('big');
      el.style.transform = '';
    });
    el.addEventListener('mousemove', (event) => {
      const r = el.getBoundingClientRect();
      const dx = event.clientX - r.left - r.width / 2;
      const dy = event.clientY - r.top - r.height / 2;
      el.style.transform = `translate3d(${dx * 0.11}px, ${dy * 0.11}px, 0)`;
    });
  });
}

// Anime.js hero sequence. Gracefully falls back to CSS if CDN is unavailable.
function playHeroIntro() {
  if (reducedMotion) return;
  const heroWords = $$('.hero-title .line span');
  const heroMeta = $$('.hero-meta span, .hero-bottom > *');
  if (!heroWords.length) return;

  if (window.anime?.animate && window.anime?.stagger) {
    const { animate, stagger } = window.anime;
    heroWords.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(115%) rotate(3deg)';
    });
    heroMeta.forEach((el) => el.style.opacity = '0');

    animate(heroWords, {
      opacity: [0, 1],
      y: ['115%', '0%'],
      rotate: [3, 0],
      duration: 1050,
      delay: stagger(90, { start: 60 }),
      ease: 'outExpo'
    });
    animate(heroMeta, {
      opacity: [0, 1],
      y: [14, 0],
      duration: 700,
      delay: stagger(75, { start: 420 }),
      ease: 'outQuad'
    });
  } else {
    heroWords.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
}

// Intersection reveals — single observer for better performance.
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');

    // Stagger skill-card content only when its parent becomes visible.
    if (entry.target.classList.contains('skills') && window.anime?.animate && !reducedMotion) {
      const { animate, stagger } = window.anime;
      animate($$('.skill-card', entry.target), {
        opacity: [0, 1],
        y: [25, 0],
        duration: 680,
        delay: stagger(90),
        ease: 'outCubic'
      });
    }
    observer.unobserve(entry.target);
  });
}, { threshold: mobile ? 0.06 : 0.12, rootMargin: '0px 0px -5% 0px' });

$$('.reveal').forEach((el) => revealObserver.observe(el));

// Initial hidden state for Anime.js stagger content only when JS is active.
if (!reducedMotion) {
  $$('.skill-card').forEach((el) => { el.style.opacity = '0'; });
}

// One scroll pipeline instead of multiple scroll handlers.
let scrollY = window.scrollY;
let lastY = scrollY;
let velocity = 0;
let scrollTicking = false;
const heroLines = $$('.hero-title .line');
const heroOrb = $('.hero-orb');
const nav = $('.nav');
const closingLines = $$('.closing-title span');

function renderScrollEffects() {
  const dy = scrollY - lastY;
  lastY = scrollY;
  velocity += (dy - velocity) * 0.12;

  if (nav) nav.classList.toggle('compact', scrollY > 70);

  if (!reducedMotion && !mobile && !lowPower) {
    const heroProgress = Math.min(scrollY / Math.max(innerHeight, 1), 1.25);
    heroLines.forEach((line, i) => {
      const direction = i % 2 ? -1 : 1;
      line.style.transform = `translate3d(${direction * heroProgress * 62}px,0,0)`;
    });

    if (heroOrb) {
      const x = Math.sin(scrollY * 0.005) * 10;
      const y = Math.cos(scrollY * 0.004) * 8 + Math.max(-18, Math.min(18, velocity * 0.45));
      heroOrb.style.transform = `translate3d(${x}px,${y}px,0) rotate(${scrollY * 0.018}deg)`;
    }

    const closingRect = $('.closing')?.getBoundingClientRect();
    if (closingRect && closingRect.top < innerHeight && closingRect.bottom > 0) {
      const local = (innerHeight - closingRect.top) / (innerHeight + closingRect.height);
      closingLines.forEach((line, i) => {
        line.style.transform = `translate3d(${(i % 2 ? -1 : 1) * local * 28}px,0,0)`;
      });
    }

  }

  scrollTicking = false;
}

function onScroll() {
  scrollY = window.scrollY;
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(renderScrollEffects);
  }
}
window.addEventListener('scroll', onScroll, { passive: true });
renderScrollEffects();

// Project 3D tilt and cursor-follow shine. Disabled on touch / low-power hardware.
if (finePointer && !reducedMotion && !lowPower) {
  $$('[data-tilt]').forEach((card) => {
    let frame = 0;
    card.addEventListener('mousemove', (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width;
        const y = (event.clientY - r.top) / r.height;
        card.style.setProperty('--shine-x', `${x * 100}%`);
        card.style.setProperty('--shine-y', `${y * 100}%`);
        card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg) translate3d(0,-2px,0)`;
      });
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// Lightweight card motion, paused when section is off-screen or on mobile.
let memoryTimer = null;
const memory = $('.memory');
if (memory && !mobile && !reducedMotion && !lowPower) {
  const memoryObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !memoryTimer) {
      memoryTimer = setInterval(() => {
        $$('.memory .card').forEach((card) => {
          if (Math.random() > 0.82) {
            card.style.transform = `translate3d(0,${Math.random() * 6 - 3}px,0) rotate(${Math.random() * 4 - 2}deg)`;
          }
        });
      }, 1300);
    } else if (!entry.isIntersecting && memoryTimer) {
      clearInterval(memoryTimer);
      memoryTimer = null;
    }
  });
  memoryObserver.observe(memory);
}

// Glitch pulse on the Huffman output while in view.
const glitch = $('.glitch-text');
if (glitch && !reducedMotion && window.anime?.animate) {
  const glitchObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    const { animate } = window.anime;
    animate(glitch, {
      x: [0, -2, 2, -1, 0],
      opacity: [1, .65, 1, .8, 1],
      duration: 500,
      ease: 'linear'
    });
  }, { threshold: 0.6 });
  glitchObserver.observe(glitch);
}

// Smooth anchor navigation: Lenis on desktop, native smooth scroll elsewhere.
$$('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const id = anchor.getAttribute('href');
    if (!id || id === '#') return;
    const target = $(id);
    if (!target) return;
    event.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.05 });
    else target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });
});

// Keyboard easter egg retained from original build.
let secret = '';
window.addEventListener('keydown', (event) => {
  secret = (secret + event.key.toLowerCase()).slice(-4);
  if (secret === 'void') document.body.classList.toggle('void-mode');
});

// Recalculate progress after fonts/layout settle.
window.addEventListener('load', () => {
  renderScrollEffects();
  runLoader();
});

// Failsafe: don't leave a user staring at a loader if an external resource stalls.
setTimeout(() => {
  if (loader && !loader.classList.contains('done')) runLoader();
}, 1800);
