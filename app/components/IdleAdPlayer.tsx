"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const ADS = [
  "/ads/WhatsApp Video 2026-06-15 at 16.57.41.mp4",
  "/ads/WhatsApp Video 2026-06-15 at 16.57.46.mp4",
  "/ads/WhatsApp Video 2026-06-15 at 16.57.53.mp4",
  "/ads/WhatsApp Video 2026-06-15 at 16.57.58.mp4",
];

const IDLE_MS = 15_000;

export default function IdleAdPlayer() {
  const pathname = usePathname();
  const [active, setActive]     = useState(false);
  const [adIndex, setAdIndex]   = useState(0);
  const [showX, setShowX]       = useState(false);
  const xTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef                = useRef<HTMLVideoElement>(null);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef               = useRef(false);

  // keep ref in sync so event handler always sees latest value
  useEffect(() => { activeRef.current = active; }, [active]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActive(true);
      setAdIndex(0);
    }, IDLE_MS);
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    setShowX(false);
    if (xTimerRef.current) clearTimeout(xTimerRef.current);
    if (videoRef.current) videoRef.current.pause();
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    function onActivity() {
      if (!activeRef.current) startTimer();
    }

    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    startTimer();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer, dismiss]);

  // Play video whenever ad becomes active or index changes
  useEffect(() => {
    if (!active) return;
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [active, adIndex]);

  if (pathname?.startsWith("/admin")) return null;
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 bg-black"
      style={{ zIndex: 99999 }}
      onClick={() => {
        setShowX(true);
        if (xTimerRef.current) clearTimeout(xTimerRef.current);
        xTimerRef.current = setTimeout(() => setShowX(false), 2000);
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        onEnded={() => setAdIndex((i) => (i + 1) % ADS.length)}
      >
        <source src={ADS[adIndex]} type="video/mp4" />
      </video>

      {/* Dismiss X — only visible after first tap */}
      {showX && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", border: "1.5px solid rgba(255,255,255,0.3)" }}
        >
          <span className="text-white/80 text-lg font-black leading-none">✕</span>
        </button>
      )}
    </div>
  );
}
