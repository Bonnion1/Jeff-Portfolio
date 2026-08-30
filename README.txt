JEFF DARK MOTION PORTFOLIO — OPTIMIZED BUILD

Files to deploy:
- index.html
- style.css
- script.js

What changed:
- Added Lenis smooth scrolling on desktop only; mobile keeps native scrolling for reliability/performance.
- Added Anime.js hero/stagger/micro animations with graceful fallback if the CDN is unavailable.
- Added responsive nav state, animated orb system, project depth/shine, a constant-speed seamless tech marquee, staggered skill cards, and refined hover states.
- Reworked the full mobile layout: safer typography, 44px+ tap targets, better section heights, mobile project aspect ratios, safe-area support, cleaner contact links, and reduced visual overload.
- Consolidated scroll work into a single requestAnimationFrame pipeline and removed scroll-linked behavior from the tech marquee.
- Heavy interactions automatically disable on touch, reduced-motion, data-saver, and lower-memory devices.
- Off-screen memory-card animation pauses automatically.
- Loader is faster and nearly instant on same-tab revisits.
- Reduced-motion and reduced-data fallbacks are included.
- Tech stack is limited to C++, Java, HTML/CSS, JavaScript, and MySQL.
- Native browser scrollbars are visually hidden while normal scrolling remains enabled.

Animation references supplied by the project:
- https://lenis.dev
- https://anime.js
- https://motion.dev
- https://motion-primitives.com
- https://21st.dev
- https://kokonut.ui
- https://ui.watermelon.sh

The implementation intentionally uses only Lenis + Anime.js as runtime libraries to avoid slowing the portfolio down with several overlapping animation libraries. The remaining references were used as interaction/design inspiration.
