import { useEffect, useRef, useState } from "react";
import CategoryScroll from "./CategoryScroll.jsx";

/* 3D Spotlight Carousel for event vases:
   - Circular depth placement with center spotlight
   - Touch swiping, ornate left/right arrows, keyboard nav
   - Focused vase tap opens the category popup; side vase tap rotates to focus
   - Desktop hover reveals the unrolling parchment preview */
export default function VaseRow({ categories, onSelect }) {
  const [focus, setFocus] = useState(2);
  const [active, setActive] = useState(null); // { id, cx, top } of the hovered vase
  const touchX = useRef(null);
  const timer = useRef(0);

  const stepFocus = d => setFocus(f => (f + d + categories.length) % categories.length);

  // Keyboard navigation when no popup is open
  useEffect(() => {
    const key = e => {
      if (document.querySelector(".evp") || document.querySelector("#modal:not([hidden])")) return;
      if (e.key === "ArrowLeft") stepFocus(-1);
      if (e.key === "ArrowRight") stepFocus(1);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [categories.length]);

  const cancelHide = () => clearTimeout(timer.current);
  const show = (cat, btn) => {
    cancelHide();
    const r = (btn.querySelector("img") || btn).getBoundingClientRect();
    setActive({ id: cat.id, cx: r.left + r.width / 2, top: r.top });
  };
  const hideSoon = () => { cancelHide(); timer.current = setTimeout(() => setActive(null), 160); };
  const hideNow = () => { cancelHide(); setActive(null); };
  const select = id => { hideNow(); onSelect?.(id); };

  useEffect(() => {
    if (!active) return;
    addEventListener("scroll", hideNow, true);
    addEventListener("resize", hideNow);
    return () => { removeEventListener("scroll", hideNow, true); removeEventListener("resize", hideNow); };
  }, [active]);
  useEffect(() => cancelHide, []);

  return (
    <div
      className="vase-row"
      id="vases"
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 32) stepFocus(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        className="vase-arrow prev"
        aria-label="Previous event category"
        onClick={() => stepFocus(-1)}
      >
        ‹
      </button>

      <div className="vases">
        {categories.map((c, i) => {
          const n = categories.length;
          const raw = i - focus;
          const off = raw - n * Math.round(raw / n);
          const isFocus = off === 0;
          return (
            <button
              key={c.id}
              type="button"
              className={`vase ${isFocus ? "focus" : ""}`}
              style={{ "--off": off, "--mag": Math.abs(off) }}
              aria-current={isFocus ? "true" : undefined}
              tabIndex={isFocus ? 0 : -1}
              onClick={() => isFocus ? select(c.id) : stepFocus(off)}
              onPointerEnter={e => {
                if (isFocus && e.pointerType === "mouse") show(c, e.currentTarget);
              }}
              onPointerLeave={e => {
                if (e.pointerType === "mouse") hideSoon();
              }}
            >
              <div className="vase-aura" aria-hidden="true" />
              <span className="vase-art">
                <img src="/assets/vase.webp" alt="" draggable="false" />
              </span>
              <div className="vase-floor-shadow" aria-hidden="true" />
              <span className="vase-name">{c.name}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="vase-arrow next"
        aria-label="Next event category"
        onClick={() => stepFocus(1)}
      >
        ›
      </button>

      {active && (
        <CategoryScroll
          category={categories.find(c => c.id === active.id)}
          pos={active}
          onEnter={cancelHide}
          onLeave={hideSoon}
          onSelect={select}
        />
      )}
    </div>
  );
}
