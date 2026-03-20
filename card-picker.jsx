import { useState, useRef, useEffect } from "react";

const cards = [
  { id: 1, type: "Credit Card", bank: "VISA", balance: "$72,738.20", number: "9192 .... 8345", color: "#FF4D4D", accent: "#FF1A1A" },
  { id: 2, type: "Debit Card", bank: "NLB Banka", balance: "$2,002.00", number: "6358 .... 8933", color: "#6C63FF", accent: "#4B44CC" },
  { id: 3, type: "Internet Card", bank: "G Pay", balance: "$230.10", number: "8112 .... 1243", color: "#43C6AC", accent: "#2A9D8F" },
  { id: 4, type: "Crypto Card", bank: "Binance", balance: "$15,410.00", number: "3991 .... 6187", color: "#F7B731", accent: "#E5A800" },
  { id: 5, type: "Bonus Card", bank: "Amex", balance: "$652.00", number: "2221 .... 1243", color: "#A8E063", accent: "#78C800" },
  { id: 6, type: "Club Card", bank: "MasterCard", balance: "$123,944.99", number: "1234 .... 6789", color: "#F8A5C2", accent: "#E8749F" },
  { id: 7, type: "Savings Card", bank: "Revolut", balance: "$8,320.50", number: "5512 .... 3310", color: "#45B7D1", accent: "#2196A8" },
];

const CARD_HEIGHT = 180;
const CARD_GAP = 8;
const ITEM_SIZE = CARD_HEIGHT + CARD_GAP;
const VISIBLE = 3;
const CONTAINER_HEIGHT = ITEM_SIZE * VISIBLE + CARD_HEIGHT * 0.5;

export default function CardPicker() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScroll, setStartScroll] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [lastTime, setLastTime] = useState(0);
  const animRef = useRef(null);
  const scrollRef = useRef(0);
  const containerRef = useRef(null);

  const maxScroll = (cards.length - 1) * ITEM_SIZE;

  const snapToIndex = (idx) => {
    const target = idx * ITEM_SIZE;
    const current = scrollRef.current;
    const diff = target - current;
    let start = null;
    const duration = 350;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const newScroll = current + diff * ease;
      scrollRef.current = newScroll;
      setScrollY(newScroll);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        scrollRef.current = target;
        setScrollY(target);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    setActiveIndex(idx);
  };

  const handlePointerDown = (e) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsDragging(true);
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setStartY(y);
    setLastY(y);
    setLastTime(Date.now());
    setStartScroll(scrollRef.current);
    setVelocity(0);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) setVelocity((lastY - y) / dt);
    setLastY(y);
    setLastTime(now);
    const delta = startY - y;
    const newScroll = Math.max(0, Math.min(maxScroll, startScroll + delta));
    scrollRef.current = newScroll;
    setScrollY(newScroll);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const momentum = velocity * 120;
    const projected = Math.max(0, Math.min(maxScroll, scrollRef.current + momentum));
    const nearestIndex = Math.round(projected / ITEM_SIZE);
    const clamped = Math.max(0, Math.min(cards.length - 1, nearestIndex));
    snapToIndex(clamped);
  };

  const getCardStyle = (index) => {
    const offset = (index * ITEM_SIZE - scrollY) / ITEM_SIZE;
    const absOffset = Math.abs(offset);
    const isActive = Math.round(scrollY / ITEM_SIZE) === index;
    const scale = Math.max(0.78, 1 - absOffset * 0.10);
    const opacity = Math.max(0.35, 1 - absOffset * 0.22);
    const translateY = offset * ITEM_SIZE * 0.38;
    const blur = isActive ? 0 : Math.min(absOffset * 1.5, 4);
    const zIndex = isActive ? 999 : Math.round(100 - absOffset * 20);
    return { scale, opacity, translateY, blur, zIndex, isActive };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>

      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Manage</h1>
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "var(--color-text-secondary)", margin: 0 }}>Your Cards</h2>
      </div>

      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", maxWidth: 340, height: CONTAINER_HEIGHT, overflow: "hidden", cursor: isDragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {cards.map((card, index) => {
            const { scale, opacity, translateY, blur, zIndex, isActive } = getCardStyle(index);
            const centerOffset = CONTAINER_HEIGHT / 2 - CARD_HEIGHT / 2;
            return (
              <div
                key={card.id}
                onClick={() => snapToIndex(index)}
                style={{
                  position: "absolute",
                  top: centerOffset + translateY,
                  left: 0, right: 0,
                  height: CARD_HEIGHT,
                  margin: "0 12px",
                  transform: `scale(${scale})`,
                  opacity,
                  filter: blur > 0.3 ? `blur(${blur}px)` : "none",
                  zIndex,
                  transition: isDragging ? "none" : "filter 0.15s",
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${card.color}, ${card.accent})`,
                  padding: "20px 24px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pointerEvents: "auto",
                  cursor: isActive ? "default" : "pointer",
                  boxShadow: isActive ? "0 12px 40px rgba(0,0,0,0.22)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: 2 }}>{card.type}</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "white" }}>{card.bank}</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "white" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 500, color: "white", marginBottom: 4 }}>{card.balance}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>{card.number}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
        {cards.map((_, i) => (
          <div key={i} onClick={() => snapToIndex(i)} style={{ width: i === activeIndex ? 20 : 6, height: 6, borderRadius: 3, background: i === activeIndex ? "var(--color-text-primary)" : "var(--color-border-secondary)", transition: "all 0.3s", cursor: "pointer" }} />
        ))}
      </div>

      <div style={{ marginTop: 28, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "16px 24px", width: "100%", maxWidth: 340, boxSizing: "border-box" }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Active Card</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>{cards[activeIndex].type}</div>
        <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 2 }}>{cards[activeIndex].number}</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginTop: 8 }}>{cards[activeIndex].balance}</div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "var(--color-text-secondary)" }}>scroll or drag the cards ↑↓</div>
    </div>
  );
}
