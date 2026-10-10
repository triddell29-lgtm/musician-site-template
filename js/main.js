/* =========================================================
   Musician Site Template — main.js
   Libraries: GSAP + ScrollTrigger, Lenis, SplitType,
              Swiper, GLightbox, Vanilla-Tilt
   ========================================================= */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  document.body.classList.add("is-loading");
  $(".year").textContent = new Date().getFullYear();

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.7, smoothWheel: true, wheelMultiplier: 0.85 });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
  }

  // Anchor links scroll through Lenis
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -60, duration: 2.6 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- Header behavior + progress ---------- */
  const header = $(".header");
  const progress = $(".scroll-progress");
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    header.classList.toggle("is-hidden", y > lastY && y > 400 && !menuOpen);
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $(".burger");
  const menu = $(".mobile-menu");
  let menuOpen = false;
  function openMenu() {
    menuOpen = true;
    burger.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    lenis && lenis.stop();
    if (hasGSAP) gsap.fromTo($$("a", menu), { yPercent: 110 }, { yPercent: 0, stagger: 0.08, duration: 1.4, delay: 0.35, ease: "power3.out" });
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    lenis && lenis.start();
  }
  burger.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
  addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  /* ---------- Magnetic buttons (subtle) ---------- */
  if (finePointer && hasGSAP) {
    $$(".magnetic").forEach((el) => {
      const strength = 0.2;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 1, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 1.4, ease: "power3.out" }));
    });
  }

  /* ---------- Ambient sound toggle ---------- */
  const Sound = window.SiteSound;
  const soundBtn = $(".sound-toggle");
  if (!Sound || !Sound.supported) {
    soundBtn.remove();
  } else {
    soundBtn.addEventListener("click", () => Sound.toggle());
    Sound.onChange((on) => {
      soundBtn.classList.toggle("is-sound-on", on);
      soundBtn.setAttribute("aria-pressed", String(on));
      $(".sound-toggle__label", soundBtn).textContent = on ? "Sound on" : "Sound off";
      document.body.classList.toggle("is-sound-on-page", on);
    });
  }

  /* ---------- Hero: interactive guitar strings canvas ---------- */
  const canvas = $(".hero__strings");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, strings = [], dust = [];
  const mouse = { x: -999, y: -999, py: -999, vy: 0 };

  function setupCanvas() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = 6, top = H * 0.34, gap = H * 0.065;
    strings = Array.from({ length: count }, (_, i) => ({
      y: top + i * gap,
      width: 0.6 + i * 0.32,         // bass strings are thicker
      amp: 0, pos: 0.5, phase: 0,
      freq: 0.55 - i * 0.05,
    }));
    dust = Array.from({ length: Math.round(W / 22) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3, s: Math.random() * 0.25 + 0.05, a: Math.random() * 0.5 + 0.1,
    }));
  }

  function pluck(s, x, force) {
    s.pos = Math.min(0.95, Math.max(0.05, x / W));
    s.amp = Math.min(28, Math.max(s.amp, force));
    s.phase = 0;
  }

  const heroEl = $(".hero");
  function movePointer(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    mouse.py = mouse.y;
    mouse.x = clientX - r.left;
    mouse.y = clientY - r.top;
    if (mouse.py < -100) return;
    const speed = Math.abs(mouse.y - mouse.py);
    strings.forEach((s, i) => {
      if ((mouse.py - s.y) * (mouse.y - s.y) < 0) {
        pluck(s, mouse.x, speed * 0.9 + 6);
        Sound && Sound.strum(i, Math.min(1, speed / 40 + 0.25), mouse.x / W);
      }
    });
  }
  heroEl.addEventListener("mousemove", (e) => movePointer(e.clientX, e.clientY));
  heroEl.addEventListener("touchmove", (e) => movePointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  const resetPointer = () => { mouse.y = mouse.py = -999; };
  heroEl.addEventListener("mouseleave", resetPointer);
  heroEl.addEventListener("touchend", resetPointer);

  let t = 0, heroVisible = true;
  function drawStrings() {
    t += 1;
    ctx.clearRect(0, 0, W, H);

    // floating dust
    dust.forEach((d) => {
      d.y -= d.s; d.x += Math.sin((t + d.y) * 0.004) * 0.15;
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      ctx.beginPath();
      ctx.fillStyle = `rgba(226,197,138,${d.a * 0.6})`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // strings
    strings.forEach((s, i) => {
      s.phase += s.freq;
      s.amp *= 0.965;
      const idle = Math.sin(t * 0.012 + i) * 0.6;
      const osc = Math.cos(s.phase) * s.amp;
      const glow = Math.min(1, s.amp / 14);

      ctx.beginPath();
      const steps = 80;
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const shape = u < s.pos ? u / s.pos : (1 - u) / (1 - s.pos); // triangle pluck shape
        const y = s.y + shape * osc + Math.sin(u * Math.PI) * idle;
        k === 0 ? ctx.moveTo(0, y) : ctx.lineTo(u * W, y);
      }
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(198,161,91,0)");
      g.addColorStop(0.2, `rgba(226,197,138,${0.18 + glow * 0.5})`);
      g.addColorStop(0.8, `rgba(226,197,138,${0.18 + glow * 0.5})`);
      g.addColorStop(1, "rgba(198,161,91,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = s.width;
      ctx.shadowColor = "rgba(226,197,138,.8)";
      ctx.shadowBlur = glow * 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    if (heroVisible) requestAnimationFrame(drawStrings);
  }
  setupCanvas();
  addEventListener("resize", setupCanvas);
  if (!reduceMotion) {
    requestAnimationFrame(drawStrings);
    new IntersectionObserver(([e]) => {
      const was = heroVisible;
      heroVisible = e.isIntersecting;
      if (heroVisible && !was) requestAnimationFrame(drawStrings);
    }).observe(heroEl);
  }

  /* ---------- Music player ---------- */
  const player = $(".player");
  const audio = $(".player__audio", player);
  const tracks = $$(".track", player);
  const wave = $(".player__wave", player);
  const bar = $(".player__progress span", player);
  const curEl = $(".player__cur", player), durEl = $(".player__dur", player);
  const BARS = 56;
  for (let i = 0; i < BARS; i++) {
    const b = document.createElement("i");
    b.style.height = `${18 + Math.abs(Math.sin(i * 0.45) * 50) + Math.random() * 32}%`;
    wave.appendChild(b);
  }
  const waveBars = $$("i", wave);
  let current = 0, playing = false, demoTime = 0, demoTimer = null;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function trackDuration() { return audio.src && isFinite(audio.duration) ? audio.duration : +tracks[current].dataset.duration; }
  function trackTime() { return audio.src ? audio.currentTime : demoTime; }

  function render() {
    const d = trackDuration(), c = trackTime(), p = d ? c / d : 0;
    bar.style.transform = `scaleX(${p})`;
    curEl.textContent = fmt(c); durEl.textContent = fmt(d);
    const cut = Math.floor(p * BARS);
    waveBars.forEach((b, i) => b.classList.toggle("is-past", i < cut));
  }

  function load(i) {
    current = (i + tracks.length) % tracks.length;
    tracks.forEach((tr, k) => tr.classList.toggle("is-active", k === current));
    const tr = tracks[current];
    $(".player__title", player).textContent = tr.querySelector(".track__t").firstChild.textContent.trim();
    $(".player__artist", player).textContent = tr.querySelector("small").textContent;
    demoTime = 0;
    if (tr.dataset.src) audio.src = tr.dataset.src; else audio.removeAttribute("src");
    if (hasGSAP) gsap.fromTo(waveBars, { scaleY: 0.2 }, { scaleY: 1, stagger: 0.008, duration: 0.6, ease: "power3.out", transformOrigin: "center" });
    render();
  }

  function play() {
    playing = true; player.classList.add("is-playing");
    if (audio.src) { audio.play().catch(() => {}); Sound && Sound.duck(true); return; }
    // Demo mode (no audio file yet): simulate playback
    clearInterval(demoTimer);
    demoTimer = setInterval(() => {
      demoTime += 0.25;
      if (demoTime >= trackDuration()) { load(current + 1); }
      render();
    }, 250);
  }
  function pause() {
    playing = false; player.classList.remove("is-playing");
    audio.pause(); clearInterval(demoTimer);
    Sound && Sound.duck(false);
  }

  $$("[data-action]", player).forEach((btn) => btn.addEventListener("click", () => {
    const a = btn.dataset.action;
    if (a === "play") return playing ? pause() : play();
    load(current + (a === "next" ? 1 : -1));
    if (playing) play();
  }));
  tracks.forEach((tr, i) => tr.addEventListener("click", () => { load(i); play(); }));
  $(".player__progress", player).addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    if (audio.src) audio.currentTime = p * trackDuration(); else demoTime = p * trackDuration();
    render();
  });
  audio.addEventListener("timeupdate", render);
  audio.addEventListener("loadedmetadata", render);
  audio.addEventListener("ended", () => { load(current + 1); play(); });
  load(0);

  /* ---------- Third-party UI libs ---------- */
  if (window.Swiper) {
    new Swiper(".testimonial-swiper", {
      loop: true, speed: 1800, grabCursor: true, spaceBetween: 40,
      effect: "fade", fadeEffect: { crossFade: true },
      autoplay: { delay: 9000, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  }
  if (window.GLightbox) GLightbox({ selector: ".glightbox", touchNavigation: true, loop: true, openEffect: "zoom", closeEffect: "fade" });
  if (window.VanillaTilt && finePointer) VanillaTilt.init($$("[data-tilt]"), { speed: 900, perspective: 1200 });

  /* ---------- FAQ accordion (animated) ---------- */
  $$(".acc").forEach((d) => {
    const summary = $("summary", d), body = $(".acc__body", d);
    summary.addEventListener("click", (e) => {
      if (!hasGSAP) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, duration: 0.9, ease: "power2.inOut", onComplete: () => { d.open = false; body.style.height = ""; } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, duration: 1.1, ease: "power2.out" });
      }
    });
  });

  /* ---------- Contact form ---------- */
  const form = $(".form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("[required]", form).forEach((f) => {
      const valid = f.value.trim() && (f.type !== "email" || /^\S+@\S+\.\S+$/.test(f.value));
      f.closest(".field").classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    const status = $(".form__status", form);
    if (!ok) { status.textContent = "Please complete the highlighted fields."; return; }
    // TODO: send to Formspree / Netlify / backend here (fetch(form.action, { method: "POST", body: new FormData(form) }))
    status.textContent = "Thank you — your inquiry has been received. I'll reply within 24 hours.";
    form.reset();
  });

  /* ---------- GSAP: preloader, intro & scroll animations ----------
     Timing is deliberately slow and soft so text can be read as it
     arrives: long durations, gentle "power" eases, generous staggers. */
  const ENTER = $(".preloader__enter");

  function enterSite(withSound) {
    if (withSound && Sound && Sound.supported) Sound.start();
  }

  if (!hasGSAP || reduceMotion) {
    // No animation: still offer the sound choice, then reveal the page
    $(".preloader__strings").remove();
    $(".preloader__count").remove();
    ENTER.style.opacity = 1; ENTER.style.visibility = "visible";
    $$("[data-sound]", ENTER).forEach((b) => b.addEventListener("click", () => {
      enterSite(b.dataset.sound === "on");
      $(".preloader").remove();
      document.body.classList.remove("is-loading");
      lenis && lenis.start();
    }));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const EASE = "power3.out";
  const EASE_IO = "power2.inOut";

  // Split headings into lines/words for reveal
  const splits = [];
  if (window.SplitType) {
    $$(".split").forEach((el) => splits.push(new SplitType(el, { types: "lines, words" })));
  }

  // Preloader → wait for "Enter with sound / in silence" → reveal
  const counter = { v: 0 };
  const pre = gsap.timeline();
  pre
    .to(".preloader__strings span", { scaleX: 1, stagger: 0.14, duration: 1.4, ease: EASE_IO }, 0)
    .to(counter, { v: 100, duration: 2.2, ease: EASE_IO, onUpdate: () => ($(".preloader__count").textContent = Math.round(counter.v)) }, 0)
    .to(".preloader__count", { opacity: 0, duration: 0.6 })
    .to(ENTER, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE }, "-=0.2")
    .from(ENTER.children, { y: 14, opacity: 0, stagger: 0.15, duration: 1.2, ease: EASE }, "<")
    .addPause()
    .to(".preloader__inner", { opacity: 0, y: -20, duration: 0.9, ease: EASE_IO })
    .to(".preloader", { yPercent: -100, duration: 1.8, ease: "power3.inOut" }, "-=0.2")
    .add(heroIntro(), "-=0.9")
    .set(".preloader", { display: "none" })
    .call(() => {
      document.body.classList.remove("is-loading");
      lenis && lenis.start();
      ScrollTrigger.refresh();
    }, null, "-=3.2");

  $$("[data-sound]", ENTER).forEach((b) => b.addEventListener("click", () => {
    enterSite(b.dataset.sound === "on");
    pre.play();
  }));

  function heroIntro() {
    const tl = gsap.timeline();
    tl.from(".hero__media img", { scale: 1.2, opacity: 0, duration: 3.6, ease: "power2.out" }, 0)
      .from(".header > *", { y: -20, opacity: 0, stagger: 0.12, duration: 1.6, ease: EASE }, 0.4)
      .from(".hero__eyebrow", { x: -24, opacity: 0, duration: 1.6, ease: EASE }, 0.5)
      .from(".hero__title .script", { opacity: 0, y: 24, duration: 2, ease: EASE }, 0.7)
      .from(".hero__name .word", { yPercent: 100, opacity: 0, duration: 2.2, stagger: 0.22, ease: EASE }, 0.9)
      .from(".hero__lede", { opacity: 0, y: 18, duration: 1.8, ease: EASE }, 1.6)
      .from(".hero__actions .btn", { opacity: 0, y: 18, stagger: 0.18, duration: 1.6, ease: EASE }, 1.9)
      .from(".hero__meta, .scroll-cue", { opacity: 0, duration: 2 }, 2.3);
    // Strum all six strings (bass → treble) as the hero arrives
    tl.call(() => strings.slice().reverse().forEach((s, k) => setTimeout(() => {
      const i = strings.length - 1 - k;
      pluck(s, W * (0.3 + k * 0.06), 14);
      Sound && Sound.strum(i, 0.45, 0.3 + k * 0.06);
    }, k * 110)), null, 1.2);
    return tl;
  }

  // Heading reveals (all except hero) — word by word, unhurried
  $$(".split").forEach((el) => {
    if (el.classList.contains("hero__name")) return;
    gsap.from($$(".word", el), {
      yPercent: 100, opacity: 0, duration: 1.9, stagger: 0.09, ease: EASE,
      scrollTrigger: { trigger: el, start: "top 82%" },
    });
  });

  // Paragraph / block fade-ups
  gsap.set(".fade-up", { opacity: 0 });
  ScrollTrigger.batch(".fade-up", {
    start: "top 85%",
    onEnter: (els) => gsap.fromTo(els, { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.22, duration: 2, ease: "power2.out", delay: 0.2, overwrite: true }),
  });

  // Image clip reveals
  $$(".reveal-img").forEach((el) => {
    gsap.fromTo(el, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 2.6, ease: "power3.inOut", scrollTrigger: { trigger: el, start: "top 78%" } });
    gsap.from($("img", el), { scale: 1.25, duration: 3.4, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 78%" } });
  });

  // Counters
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, { v: end, duration: 3.2, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  // Parallax (scrub with smoothing so it glides rather than tracks 1:1)
  gsap.to(".hero__media img", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1.5 } });
  gsap.to(".hero__content", { yPercent: 20, opacity: 0.25, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1.5 } });
  $$(".parallax").forEach((el) => gsap.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: el.parentElement, scrub: 2 } }));
  $$(".gallery__item img").forEach((img) => gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentElement, scrub: 2 } }));

  // Timeline progress line + entries
  gsap.to(".timeline__line span", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".timeline", start: "top 80%", end: "bottom 55%", scrub: 2 } });
  gsap.from(".timeline__item", { y: 30, opacity: 0, stagger: 0.3, duration: 2, ease: EASE, scrollTrigger: { trigger: ".timeline", start: "top 80%" } });

  // Cards / gallery / occasions stagger
  [".cards .card", ".gallery__item", ".occasion"].forEach((sel) => {
    const items = $$(sel);
    if (!items.length) return;
    gsap.from(items, { y: 40, opacity: 0, stagger: 0.25, duration: 2.1, ease: EASE, scrollTrigger: { trigger: items[0].parentElement, start: "top 80%" } });
  });

  // Player entrance
  gsap.from(".player", { y: 50, opacity: 0, rotateX: 8, duration: 2.4, ease: EASE, scrollTrigger: { trigger: ".player", start: "top 85%" } });

  // Video zoom-in
  gsap.fromTo(".video__feature", { clipPath: "inset(12% 10% 12% 10% round 8px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: ".video__feature", start: "top 90%", end: "center 55%", scrub: 2 } });

  // Footer big name
  gsap.from(".footer__big .word", { yPercent: 100, opacity: 0, duration: 2.4, ease: EASE, scrollTrigger: { trigger: ".footer", start: "top 85%" } });

  // Honors: border traces itself, box fills, star spins in with a glow,
  // title decodes letter by letter, then the subtitle settles in.
  const SCRAMBLE = "✦ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function decode(el, duration) {
    const text = el.dataset.text, o = { p: 0 };
    return gsap.to(o, {
      p: 1, duration, ease: "none",
      onUpdate: () => {
        const shown = Math.floor(o.p * text.length);
        let out = text.slice(0, shown);
        for (let i = shown; i < text.length; i++) {
          out += text[i] === " " ? " " : `<span class="scr">${SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]}</span>`;
        }
        el.innerHTML = out;
      },
      onComplete: () => (el.textContent = text),
    });
  }

  const honors = $$(".honor");
  honors.forEach((box) => {
    const [top, right, bottom, left] = $$(".honor__border i", box);
    gsap.set([top, bottom], { scaleX: 0 });
    gsap.set([right, left], { scaleY: 0 });
    gsap.set(box, { backgroundColor: "rgba(21,19,17,0)" });
    gsap.set($(".honor__icon", box), { scale: 0, rotate: -180, opacity: 0 });
    gsap.set($("p", box), { opacity: 0, y: 12, letterSpacing: "0.4em" });
    $("h4", box).textContent = "";

    // Spotlight follows the mouse
    box.addEventListener("mousemove", (e) => {
      const r = box.getBoundingClientRect();
      box.style.setProperty("--mx", `${e.clientX - r.left}px`);
      box.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  const honorsTl = gsap.timeline({ scrollTrigger: { trigger: ".honors", start: "top 80%" } });
  honors.forEach((box, i) => {
    const [top, right, bottom, left] = $$(".honor__border i", box);
    const at = i * 0.45;
    honorsTl
      .to(top,    { scaleX: 1, duration: 0.7, ease: "power1.in" }, at)
      .to(right,  { scaleY: 1, duration: 0.5, ease: "none" }, at + 0.7)
      .to(bottom, { scaleX: 1, duration: 0.7, ease: "none" }, at + 1.2)
      .to(left,   { scaleY: 1, duration: 0.5, ease: "power1.out" }, at + 1.9)
      .to(box, { backgroundColor: "rgba(21,19,17,1)", duration: 1.6, ease: "power2.inOut" }, at + 0.6)
      .to($(".honor__icon", box), { scale: 1, rotate: 0, opacity: 1, duration: 1.6, ease: "back.out(2)" }, at + 1)
      .fromTo($(".honor__glow", box), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.6, duration: 0.9, ease: "power2.out" }, at + 1.1)
      .to($(".honor__glow", box), { opacity: 0, scale: 2.2, duration: 1.6, ease: "power2.in" }, at + 2)
      .add(decode($("h4", box), 1.4), at + 1.4)
      .to($("p", box), { opacity: 1, y: 0, letterSpacing: "0.14em", duration: 1.8, ease: "power3.out" }, at + 2.3);
  });
  // After the entrance, the stars keep a slow, gentle turn
  honorsTl.add(() => gsap.to(".honor__icon", { rotate: 360, duration: 24, ease: "none", repeat: -1 }));

  // Horizontal scroll for "Other Occasions" (desktop only)
  ScrollTrigger.matchMedia({
    "(min-width: 861px)": () => {
      const trackEl = $(".occasions__track");
      const dist = () => trackEl.scrollWidth - innerWidth;
      gsap.to(trackEl, {
        x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: ".occasions", pin: ".occasions__pin", start: "top top", end: () => `+=${dist() * 1.3}`, scrub: 2, invalidateOnRefresh: true },
      });
    },
  });

  // Re-split on resize so lines stay correct
  let rw = innerWidth;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - rw) < 50) return;
    rw = innerWidth;
    splits.forEach((s) => s.split());
    ScrollTrigger.refresh();
  });
})();
