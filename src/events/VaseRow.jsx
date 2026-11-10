import { useEffect, useRef, useState } from "react";
import CategoryScroll from "./CategoryScroll.jsx";

/* Continuous Left-to-Right Rotating Carousel for Event Vases:
   - Infinite, seamless continuous rotation moving earthen vases from left to right
   - Automatically halts/stops rotation whenever the user hovers on a particular vase
   - Hover reveals the unrolling parchment preview, golden aura, and celestial sparks
   - Clicking opens the full-screen category popup
   - Supports touch interaction and keyboard navigation */
export default function VaseRow({ categories, onSelect }) {
  const [hoveredVase, setHoveredVase] = useState(null); // category id
  const [activeScroll, setActiveScroll] = useState(null); // { id, cx, top }
  const timer = useRef(0);

  // Duplicate categories to produce a seamless, continuous infinite loop
  const duplicatedCategories = [...categories, ...categories];

  const cancelHide = () => clearTimeout(timer.current);
  const show = (cat, btn) => {
    cancelHide();
    setHoveredVase(cat.id);
    const r = (btn.querySelector("img") || btn).getBoundingClientRect();
    setActiveScroll({ id: cat.id, cx: r.left + r.width / 2, top: r.top });
  };
  const hideSoon = () => {
    cancelHide();
    timer.current = setTimeout(() => {
      setHoveredVase(null);
      setActiveScroll(null);
    }, 160);
  };
  const hideNow = () => {
    cancelHide();
    setHoveredVase(null);
    setActiveScroll(null);
  };
  const select = id => {
    hideNow();
    onSelect?.(id);
  };

  useEffect(() => {
    if (!activeScroll) return;
    addEventListener("scroll", hideNow, true);
    addEventListener("resize", hideNow);
    return () => {
      removeEventListener("scroll", hideNow, true);
      removeEventListener("resize", hideNow);
    };
  }, [activeScroll]);
  useEffect(() => cancelHide, []);

  return (
    <div className={`vase-row ${hoveredVase ? "is-paused" : ""}`} id="vases">
      <div className="vases-track-wrapper">
        <div className={`vases-track ${hoveredVase ? "paused" : ""}`}>
          {duplicatedCategories.map((c, idx) => {
            const isHovered = hoveredVase === c.id;
            return (
              <button
                key={`${c.id}-${idx}`}
                type="button"
                className={`vase ${isHovered ? "focus hovered" : ""}`}
                aria-label={c.name}
                onClick={() => select(c.id)}
                onPointerEnter={e => {
                  if (e.pointerType === "mouse") show(c, e.currentTarget);
                }}
                onPointerLeave={e => {
                  if (e.pointerType === "mouse") hideSoon();
                }}
                onFocus={e => show(c, e.currentTarget)}
                onBlur={hideSoon}
              >
                <div className="vase-aura" aria-hidden="true" />
                <span className="vase-art">
                  <img
                    className="vase-img"
                    src="/assets/vase.webp"
                    alt=""
                    draggable="false"
                  />
                </span>
                <div className="vase-floor-shadow" aria-hidden="true" />
                <span className="vase-name">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeScroll && (
        <CategoryScroll
          category={categories.find(c => c.id === activeScroll.id)}
          pos={activeScroll}
          onEnter={cancelHide}
          onLeave={hideSoon}
          onSelect={select}
        />
      )}
    </div>
  );
}
