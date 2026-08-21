import { useState, useRef, useCallback } from "react";

/* Drives page-turn progress directly off drag position (0 = resting on the
   right page, 1 = fully turned to reveal the next page) rather than
   release-then-animate. `width` is the drag surface width in px used to
   normalize deltaX into a 0..1 progress value. */
export default function useDragPage({ width = 320, onCommit } = {}) {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onStart = useCallback((clientX) => {
    startX.current = clientX;
    setDragging(true);
  }, []);

  const onMove = useCallback(
    (clientX) => {
      const delta = startX.current - clientX; // dragging left = turning forward
      const p = Math.max(-1, Math.min(1, delta / width));
      setProgress(p);
    },
    [width]
  );

  const onEnd = useCallback(() => {
    setDragging(false);
    const committed = progress > 0.28 ? 1 : progress < -0.28 ? -1 : 0;
    setProgress(0);
    if (committed !== 0) onCommit?.(committed);
  }, [progress, onCommit]);

  return { progress, dragging, onStart, onMove, onEnd };
}
