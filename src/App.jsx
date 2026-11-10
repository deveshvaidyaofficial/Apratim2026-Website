import { useEffect, useRef, useState } from "react";
import events from "./data/events.js";
import { contacts, committee } from "./data/depts.js";
import EventsSection from "./events/EventsSection.jsx";

const cats = Object.keys(events);
const NAV = [["home", "Home"], ["events", "Events"], ["about", "About Us"], ["contact", "Contact Us"]];

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const read = () => setHash(location.hash);
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  return hash;
}

export default function App() {
  const [cat, setCat] = useState(null); // open modal category, null = closed
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState("contact"); // "contact" | "committee"
  const [dept, setDept] = useState(0);
  const [active, setActive] = useState("");
  const [pct, setPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [soundPrompt, setSoundPrompt] = useState(false);
  const [sealStamp, setSealStamp] = useState(false);
  const [focus, setFocus] = useState(2); // index of the vase in the spotlight (centre, "Drama")
  const stepFocus = d => setFocus(f => (f + d + cats.length) % cats.length);
  const audioRef = useRef(null);
  const curtain = useRef(null);
  const polaroid = useRef(null);
  const stardustRef = useRef(null);
  const timers = useRef([]);
  const touchX = useRef(null);
  const touchVaseX = useRef(null);
  const list = cat ? events[cat] : [];

  useEffect(() => {
    const key = e => {
      const modal = document.getElementById("modal");
      if (modal && !modal.hidden) return;
      if (e.key === "ArrowLeft") stepFocus(-1);
      if (e.key === "ArrowRight") stepFocus(1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);

  // ambient audio is opt-in: the pill invites a tap, nothing plays on its own
  // Guarantee top of page on fresh load or reload (prevent browser auto-scrolling elsewhere)
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    if (!location.hash || location.hash === "#home" || location.hash === "#") {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    let seen = false;
    try { seen = localStorage.getItem("apratim-sound-prompt") === "1"; } catch {}
    if (!seen) setSoundPrompt(true);
    const dismiss = () => {
      setSoundPrompt(false);
      try { localStorage.setItem("apratim-sound-prompt", "1"); } catch {}
    };
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Loader: count to 100% as images load
  useEffect(() => {
    const imgs = [...document.images];
    let done = 0;
    const end = () => {
      document.body.classList.remove("loading");
      if (!location.hash || location.hash === "#home" || location.hash === "#") {
        window.scrollTo(0, 0);
      }
    };
    const tick = () => {
      setPct(Math.round(100 * ++done / imgs.length));
      if (done === imgs.length) setTimeout(end, 400);
    };
    imgs.forEach(i => i.complete ? tick() : (i.addEventListener("load", tick), i.addEventListener("error", tick)));
    const t = setTimeout(end, 2500); // first paint matters more than every image
    return () => clearTimeout(t);
  }, []);

  // Scenes are skipped by the browser until near the viewport; wake up neighbours early so the wipe reveals a ready scene
  useEffect(() => {
    const order = NAV.map(([id]) => id);
    const wake = () => {
      const near = order.map(id => ({ el: document.getElementById(id), top: document.getElementById(id).getBoundingClientRect().top }))
        .sort((a, b) => Math.abs(a.top) - Math.abs(b.top))
        .slice(0, scrollY > 40 ? 3 : 2);
      near.forEach(({ el }) => el.style.contentVisibility = "visible");
    };
    addEventListener("scroll", wake, { passive: true });
    wake();
    return () => removeEventListener("scroll", wake);
  }, []);

  // Scroll progress thread
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(scrollY / max, 1) : 0);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", wake);
    wake();
    return () => {
      removeEventListener("scroll", wake);
      removeEventListener("resize", wake);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Section modal deep links: #events/<slug> survives reloads and is shareable.
  // Tracking the raw hash keeps this effect from re-running on unrelated renders.
  const hash = useHash();
  useEffect(() => {
    const [id, slug] = decodeURIComponent(hash.slice(1)).split("/");
    if (id !== "events") return;
    if (slug && events[slug]) {
      setCat(slug);
      setIdx(0);
      setTimeout(() => document.getElementById("events").scrollIntoView({ behavior: "instant" }), 0);
    } else if (!slug) {
      setCat(null);
    }
  }, [hash]);

  useEffect(() => {
    const next = cat ? "#events/" + cat : location.hash.startsWith("#events/") ? "#events" : null;
    if (!next) return;
    history.replaceState(null, "", next);
    setActive("events");
  }, [cat]);

  // Active nav link
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { threshold: 0.5 });
    document.querySelectorAll(".scene").forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);

  // Scroll reveal + count-up
  useEffect(() => {
    const countUp = el => {
      const end = +el.dataset.count; let t0;
      const step = t => {
        t0 ??= t; const p = Math.min((t - t0) / 1500, 1);
        el.textContent = Math.round(end * p).toLocaleString(); if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(countUp);
      io.unobserve(e.target);
    }), { threshold: 0.2 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Stardust particle trail on desktop
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const canvas = stardustRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize, { passive: true });

    const particles = [];
    let mouse = { x: -100, y: -100, lastX: -100, lastY: -100 };
    let animId = 0;

    const onPointerMove = e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const dx = mouse.x - mouse.lastX;
      const dy = mouse.y - mouse.lastY;
      const dist = Math.hypot(dx, dy);
      if (dist > 7) {
        const count = Math.min(Math.floor(dist / 8), 3);
        for (let i = 0; i < count; i++) {
          particles.push({
            x: mouse.x + (Math.random() - 0.5) * 8,
            y: mouse.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -Math.random() * 0.8 - 0.3,
            size: Math.random() * 2.2 + 0.9,
            alpha: 0.85,
            hue: Math.random() > 0.35 ? "43, 85%, 62%" : "30, 95%, 74%",
          });
        }
        mouse.lastX = mouse.x;
        mouse.lastY = mouse.y;
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.024;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.fillStyle = `hsla(${p.hue}, ${p.alpha})`;
        ctx.shadowColor = "#e5ad2f";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Parallax on hero layers + 3D Mouse perspective + Camel walking progression
  useEffect(() => {
    const hero = document.getElementById("home");
    const layers = document.querySelectorAll("[data-speed]");
    let y = scrollY, raf = 0;
    let targetMx = 0, targetMy = 0;
    let currMx = 0, currMy = 0;

    const onMove = e => {
      targetMx = (e.clientX / innerWidth - 0.5) * 2;
      targetMy = (e.clientY / innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const frame = () => {
      y += (scrollY - y) * 0.12;
      currMx += (targetMx - currMx) * 0.07;
      currMy += (targetMy - currMy) * 0.07;

      if (hero) {
        hero.style.setProperty("--mx", currMx.toFixed(4));
        hero.style.setProperty("--my", currMy.toFixed(4));
        hero.style.setProperty("--camels-walk", `${(y * 0.35).toFixed(2)}px`);
      }

      layers.forEach(l => {
        const speed = parseFloat(l.dataset.speed) || 0;
        l.style.setProperty("--y", `${(y * speed).toFixed(2)}px`);
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Modal keyboard controls
  useEffect(() => {
    if (!cat) return;
    const n = events[cat].length;
    const key = e => {
      if (e.key === "Escape") setCat(null);
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + n) % n);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % n);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [cat]);

  // Keep the picked department visible inside the scrollable letter (skip on initial mount)
  const deptMounted = useRef(false);
  useEffect(() => {
    if (!deptMounted.current) {
      deptMounted.current = true;
      return;
    }
    const item = document.querySelector(`#depts li:nth-child(${dept + 1})`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [dept, tab]);

  // Replay the polaroid "swap" animation on each pick (skip initial mount)
  const polaroidMounted = useRef(false);
  useEffect(() => {
    if (!polaroidMounted.current) {
      polaroidMounted.current = true;
      return;
    }
    const p = polaroid.current;
    if (!p) return;
    p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap");
  }, [dept, tab]);

  // Curtain wipe between sections
  const go = e => {
    const a = e.currentTarget;
    const href = a.getAttribute("href");
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    history.replaceState(null, "", href);
    setActive(href.slice(1));
    if (a.classList.contains("btn")) a.classList.add("pop");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const c = curtain.current;
    if (!c) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Phase 1: Curtain sweeps in from bottom
    c.style.animationDelay = "";
    c.className = "in";

    // Phase 2: Once fully covering the viewport (520ms), swap scene invisibly and sweep out upward
    timers.current.push(setTimeout(() => {
      document.documentElement.style.scrollBehavior = "auto";
      target.scrollIntoView();
      document.documentElement.style.scrollBehavior = "";
      c.className = "out";
      a.classList.remove("pop");
    }, 520));

    // Phase 3: Transition complete (1100ms) - clean reset
    timers.current.push(setTimeout(() => {
      c.className = "";
      c.style.animationDelay = "";
    }, 1100));
  };

  const [title, desc, loc, formUrl, , rulebookUrl, organizers] = list[idx] || [];
  const currentList = tab === "committee" ? committee : contacts;
  const [, pName, pContact, pSub] = currentList[dept] || currentList[0];

  return (
    <>
      <canvas ref={stardustRef} className="stardust-canvas" aria-hidden="true" />
      <audio ref={audioRef} src="/assets/bg-music.mp3" loop preload="none" />
      <a className="skip-link" href="#contact">Skip to contacts</a>
      <div className="thread" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div id="loader"><div className="stars"></div><b id="pct">{pct}%</b></div>
      <div id="curtain" ref={curtain}>
        <div className="curtain-layer">
          <img className="curtain-moon" src="/assets/moon.webp" alt="" />
          <img className="tc t1" src="/assets/cloud1.webp" alt="" />
          <img className="tc t2" src="/assets/cloud2.webp" alt="" />
          <img className="tc t3" src="/assets/cloud1.webp" alt="" />
          <img className="tc t4" src="/assets/cloud2.webp" alt="" />
          <span>APRATIM 2K26</span>
        </div>
      </div>

      <nav>
        <a href="#home" className="logo" onClick={go}>APRATIM</a>
        <div className="nav-controls">
          <div className="pill">
            {NAV.map(([id, label]) =>
              <a key={id} href={"#" + id} className={active === id ? "active" : undefined} onClick={go}>
                <span className="nav-label-full">{label}</span>
                <span className="nav-label-short">{id === "home" ? "Home" : id === "events" ? "Events" : id === "about" ? "About" : "Contact"}</span>
              </a>)}
          </div>
          <button
            className={`sound-btn ${isPlaying ? "playing" : "muted"}`}
            onClick={toggleSound}
            aria-label={isPlaying ? "Mute background music" : "Play background music"}
            title={isPlaying ? "Mute Sound" : "Play Sound"}
          >
            {isPlaying && <span className="sound-ripple" aria-hidden="true" />}
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="sound-icon" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="sound-icon" aria-hidden="true">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            )}
          </button>
          {soundPrompt && (
            <button className="sound-hint" onClick={toggleSound}>
              ✦ Tap for desert ambience
            </button>
          )}
        </div>
      </nav>

      <section id="home" className="scene night">
        <div className="shooting-stars" aria-hidden="true">
          <span className="star-comet sc-1" />
          <span className="star-comet sc-2" />
          <span className="star-comet sc-3" />
        </div>
        <img className="cloud c1" src="/assets/cloud1.webp" alt="" data-speed="0.22" />
        <img className="cloud c2" src="/assets/cloud2.webp" alt="" data-speed="0.32" />
        <img className="palace" src="/assets/palace.webp" alt="" data-speed="0.18" />
        <img className="dune d1" src="/assets/dune-back.webp" alt="" data-speed="0.28" />
        <img className="camels" src="/assets/camels.webp" alt="" data-speed="0.38" />
        <img className="dune d2" src="/assets/dune-front.webp" alt="" data-speed="0.48" />
        <div className="hero">
          {/* Royal Arabian Title with Golden Arch & Under-Swoosh */}
          <div className="hero-title-lockup">
            <svg className="logo-draw" viewBox="140 0 640 185" role="img" aria-label="APRATIM">
              <defs>
                <linearGradient id="gold-metal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fffbe8" />
                  <stop offset="16%" stopColor="#ffe396" />
                  <stop offset="42%" stopColor="#f5ba38" />
                  <stop offset="70%" stopColor="#c98a1e" />
                  <stop offset="88%" stopColor="#8c580f" />
                  <stop offset="100%" stopColor="#4d2b04" />
                </linearGradient>
                <linearGradient id="gold-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9e640e" />
                  <stop offset="25%" stopColor="#f7cb59" />
                  <stop offset="50%" stopColor="#fff7db" />
                  <stop offset="75%" stopColor="#f7cb59" />
                  <stop offset="100%" stopColor="#9e640e" />
                </linearGradient>
                <linearGradient id="star-sparkle" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#ffe8a3" />
                  <stop offset="100%" stopColor="#e5ad2f" />
                </linearGradient>
                <filter id="royal-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.85" />
                  <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#e5ad2f" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Golden Arabian Dome Arch above APRATIM */}
              <g className="hero-arch-crest" filter="url(#royal-glow)">
                <line x1="280" y1="48" x2="395" y2="48" stroke="url(#gold-stroke)" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="525" y1="48" x2="640" y2="48" stroke="url(#gold-stroke)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 280 43 Q 280 48, 285 48 Q 280 48, 280 53 Q 280 48, 275 48 Q 280 48, 280 43 Z" fill="url(#star-sparkle)" />
                <path d="M 640 43 Q 640 48, 645 48 Q 640 48, 640 53 Q 640 48, 635 48 Q 640 48, 640 43 Z" fill="url(#star-sparkle)" />
                <path
                  d="M 395 48 C 418 48, 428 34, 444 26 C 458 18, 464 12, 460 6 C 456 12, 462 18, 476 26 C 492 34, 502 48, 525 48"
                  fill="none"
                  stroke="url(#gold-stroke)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 405 48 C 424 48, 432 38, 446 32 C 458 26, 462 18, 460 14 C 458 18, 462 26, 474 32 C 488 38, 496 48, 515 48"
                  fill="none"
                  stroke="url(#gold-stroke)"
                  strokeWidth="1"
                  opacity="0.75"
                />
                <path d="M 460 0 Q 460 10, 470 10 Q 460 10, 460 20 Q 460 10, 450 10 Q 460 10, 460 0 Z" fill="url(#star-sparkle)" />
                <circle cx="460" cy="10" r="1.5" fill="#ffffff" />
              </g>

              {/* Natural Classical Typography without horizontal warping */}
              <text
                x="460"
                y="126"
                textAnchor="middle"
                fill="url(#gold-metal)"
                stroke="url(#gold-stroke)"
                strokeWidth="1.2"
                filter="url(#royal-glow)"
                fontFamily="'Cinzel Decorative', Georgia, serif"
                fontSize="102"
                fontWeight="700"
                letterSpacing="0.12em"
              >
                APRATIM
              </text>

              {/* Calligraphic Under-Swoosh with Pendant Star */}
              <g className="hero-swoosh-flourish" filter="url(#royal-glow)">
                <path
                  d="M 230 134 C 255 158, 315 168, 395 163 C 430 160, 450 166, 460 174 C 470 166, 490 160, 525 163 C 605 168, 665 158, 690 134 C 665 150, 608 158, 525 155 C 488 153, 468 160, 460 166 C 452 160, 432 153, 395 155 C 312 158, 255 150, 230 134 Z"
                  fill="url(#gold-metal)"
                />
                <path d="M 460 170 Q 460 177, 467 177 Q 460 177, 460 184 Q 460 177, 453 177 Q 460 177, 460 170 Z" fill="url(#star-sparkle)" />
              </g>
            </svg>
          </div>

          {/* Starlit 2026 Edition Cartouche */}
          <div className="hero-edition-row">
            <span className="hero-edition-star" aria-hidden="true">✦</span>
            <span className="hero-edition-line left" aria-hidden="true" />
            <span className="hero-year-pill">2026</span>
            <span className="hero-edition-line right" aria-hidden="true" />
            <span className="hero-edition-star" aria-hidden="true">✦</span>
          </div>

          {/* Glassmorphic Ambient Date & Venue Pill */}
          <p className="hero-venue-pill">
            <span className="venue-dot">◆</span>
            <span>18 – 19 Nov</span>
            <span className="venue-sep">·</span>
            <span>CCET Sector 26, Chandigarh</span>
            <span className="venue-dot">◆</span>
          </p>

          {/* Sultan's Seal Royal REGISTER Button */}
          <a className="btn hero-cta-btn" href="#events" onClick={go}>
            <span className="btn-specular" aria-hidden="true" />
            <span className="btn-filigree-inner" aria-hidden="true" />
            <span className="btn-content">
              <span className="btn-star">✦</span>
              <span className="btn-text">REGISTER</span>
              <span className="btn-star">✦</span>
            </span>
          </a>
        </div>
        <div className="dust" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => <span key={i} style={{ "--i": i }} />)}
        </div>
        <div className="scroll-hint" onClick={() => document.getElementById("events")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="scroll-arrow">↓</span>
          <span>EXPLORE FEST</span>
        </div>
      </section>

      <section id="events" className="scene dusk">
        <h2 className="sign reveal">Events</h2>
        <EventsSection />
      </section>

      <div id="modal" hidden={!cat} onClick={e => e.target.id === "modal" && setCat(null)}>
        <div className="m-card swap" key={cat + idx}>
          <button className="m-close" aria-label="Close" onClick={() => setCat(null)}>×</button>
          <div className="m-text">
            <h3 id="m-title">{title}</h3><p id="m-desc">{desc}</p><p className="m-loc" id="m-loc">{loc}</p>
            <a href="#" id="m-rule">Rulebook</a>
            {formUrl && <a href={formUrl} id="m-reg" target="_blank" rel="noopener noreferrer">Register</a>}
          </div>
          {/* shortcut: placeholder photo (same as mockup), swap per event later */}
          <div className="m-img" id="m-img" style={{ backgroundImage: "url(/assets/about-bg.webp)" }}></div>
          <div className="m-nav">
            <button id="m-prev" aria-label="Previous" onClick={() => setIdx((idx - 1 + list.length) % list.length)}>‹</button>
            <span id="m-count">{cat && `${idx + 1} / ${list.length}`}</span>
            <button id="m-next" aria-label="Next" onClick={() => setIdx((idx + 1) % list.length)}>›</button>
          </div>
        </div>
      </div>

      <section id="about" className="scene plum">
        <div className="lantern lantern-interactive" style={{ left: "10%" }}>
          <img src="/assets/lantern.webp" alt="Arabian Lantern" />
          <div className="lantern-beam" aria-hidden="true" />
        </div>
        <div className="lantern lantern-interactive" style={{ left: "84%", animationDelay: "-1.5s,-.4s" }}>
          <img src="/assets/lantern.webp" alt="Arabian Lantern" />
          <div className="lantern-beam" aria-hidden="true" />
        </div>
        <div className="about reveal">
          <h2>About Us</h2>
          <p>A student-run festival of dance, drama, music, art and ideas, uniting thousands for two unforgettable days at Chandigarh College of Engineering & Technology.</p>
          <div className="stats">
            <div><b data-count="30">0</b><small>Events</small></div>
            <div><b data-count="12000">0</b><small>Footfall</small></div>
            <div><b data-count="2026">0</b><small>Edition</small></div>
          </div>
        </div>
      </section>

      <section id="contact" className="scene dawn">
        <div className="contact-stage">
          <div className="contact-wrap">
            <div className="parchment reveal">
              <span className={`parch-seal ${sealStamp ? "stamp-press" : ""}`} aria-hidden="true">A</span>
              <div className="parchment-tabs">
                <button
                  className={tab === "contact" ? "active" : undefined}
                  onClick={() => {
                    setTab("contact");
                    setDept(0);
                    setSealStamp(true);
                    setTimeout(() => setSealStamp(false), 550);
                  }}
                >
                  Contact Us
                </button>
                <button
                  className={tab === "committee" ? "active" : undefined}
                  onClick={() => {
                    setTab("committee");
                    setDept(0);
                    setSealStamp(true);
                    setTimeout(() => setSealStamp(false), 550);
                  }}
                >
                  Organizing Committee
                </button>
              </div>
              <ul id="depts">
                {currentList.map((d, i) =>
                  <li key={i}>
                    <button className={dept === i ? "active" : undefined} onClick={() => setDept(i)}>
                      <span className="dept-mark" aria-hidden="true">✦</span>
                      <span className="dept-label">{d[0]}</span>
                      <span className="dept-arrow" aria-hidden="true">→</span>
                    </button>
                  </li>)}
              </ul>
              <p className="parchment-hint">Select a department to reveal its contact</p>
            </div>

            <div className="map-side">
              <div className="map-pins" aria-hidden="true">
                <svg className="map-route-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path
                    key={`${tab}-${dept}`}
                    className="map-route-trail"
                    d={`M 0 10 Q ${(dept % 5) * 12.5 + 5} ${(dept % 2 === 0) ? 2 : 18}, ${(dept % 5) * 25} 10`}
                  />
                </svg>
                {currentList.map((_, i) =>
                  <span key={i} className={`map-pin pin-${i % 5}${dept === i ? " active" : ""}`} />)}
              </div>
              <div
                className="polaroid reveal"
                id="polaroid"
                ref={polaroid}
                onPointerMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  e.currentTarget.style.setProperty("--tilt-x", `${(-y * 14).toFixed(1)}deg`);
                  e.currentTarget.style.setProperty("--tilt-y", `${(x * 14).toFixed(1)}deg`);
                }}
                onPointerLeave={e => {
                  e.currentTarget.style.setProperty("--tilt-x", "0deg");
                  e.currentTarget.style.setProperty("--tilt-y", "0deg");
                }}
              >
                <span className="p-tape" aria-hidden="true" />
                <span className="p-photo" aria-hidden="true">
                  <span className="p-photo-mark">{pName.split(" ").map(w => w[0]).slice(0, 2).join("")}</span>
                </span>
                <b id="p-name">{pName}</b>
                {pSub && <span className="p-sub">{pSub}</span>}
                <span className="p-contact">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {pContact.includes("@")
                      ? <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13Zm2.2.3 7.8 5.6 7.8-5.6M4 19h16" />
                      : <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1l-2.22 2.2Z" />}
                  </svg>
                  {pContact}
                </span>
              </div>
            </div>
          </div>
        </div>
        <footer>© 2026 APRATIM</footer>
      </section>
    </>
  );
}
