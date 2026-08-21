import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTRO } from "../data/bookAssetManifest";
import useReducedMotion from "../hooks/useReducedMotion";

const SESSION_KEY = "bookIntroSeen";
/* Fallback in case the video's `onEnded` never fires (autoplay blocked,
   codec issue, etc.) — the cinematic must never trap the customer. */
const VIDEO_FALLBACK_MS = 6000;

/* Two ceremonial phases, both full-bleed with zero chrome (no header,
   search, or nav visible):
     1. "video"   — full-screen logo cinematic (skips straight to a static
                    logo frame under prefers-reduced-motion).
     2. "welcome" — dedicated Welcome screen with one CONTINUE button.
   The whole sequence plays once per browser session. The sessionStorage
   flag is set ONLY when the customer taps CONTINUE (or, for
   prefers-reduced-motion, once the static Welcome screen has been shown
   and dismissed) — never merely because the video finished — so a reload
   before CONTINUE replays the intro, and a reload after it goes straight
   to Hero. */
export default function IntroSequence({ onDone }) {
  const reduced = useReducedMotion();
  const videoRef = useRef(null);
  const [phase, setPhase] = useState(() => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1" ? "done" : "video";
    } catch {
      return "video";
    }
  });

  useEffect(() => {
    // Already-seen-this-session case: nothing to animate, tell the parent
    // immediately so Hero mounts with no delay.
    if (phase === "done") {
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "video") return undefined;
    if (reduced) {
      // Static logo frame only — no autoplay video, advance to Welcome
      // immediately (Welcome itself still requires an explicit CONTINUE
      // tap before the session flag is set).
      setPhase("welcome");
      return undefined;
    }
    const t = setTimeout(() => setPhase("welcome"), VIDEO_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  const finishIntro = () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore (private browsing etc.)
    }
    setPhase("done");
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={() => phase === "done" && onDone?.()}>
      {phase === "video" && (
        <motion.div
          key="video"
          className="bk-intro bk-intro--video"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <video
            ref={videoRef}
            className="bk-intro-video"
            src={INTRO.logoVideo}
            autoPlay
            muted
            playsInline
            loop={false}
            onEnded={() => setPhase("welcome")}
          />
        </motion.div>
      )}

      {phase === "welcome" && (
        <motion.div
          key="welcome"
          className="bk-intro bk-intro--welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="bk-welcome-mark">
            <img className="bk-welcome-logo" src={INTRO.logoMark} alt="Al Haramain" />
            <p className="bk-welcome-eyebrow">WELCOME TO<br />AL HARAMAIN</p>
            <h1 className="bk-welcome-title">THE BOOK<br />OF FRAGRANCES</h1>
            <p className="bk-welcome-sub">Explore the House of Al Haramain.</p>
          </div>
          <button type="button" className="bk-welcome-continue" onClick={finishIntro}>
            OPEN THE BOOK
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
