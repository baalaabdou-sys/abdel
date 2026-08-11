"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * The frame the film is played in.
 *
 * The footage is 16:9. Filling a portrait phone with it crops 74% of every
 * shot away — you end up watching a narrow strip of background while the
 * action happens off either side. So on a portrait screen the film is played
 * in a real 16:9 stage, centred, with the rest of the screen as frame. You
 * lose size and gain the entire composition, which is the right trade for
 * shots that were staged wide.
 *
 * Landscape and desktop are close enough to 16:9 to fill edge to edge.
 *
 * Everything renders inside this — generated shots and drawn scenes alike —
 * so the two halves of Act 2 stay one continuous frame.
 */
export function useStagePortrait() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const read = () => setPortrait(window.innerWidth / window.innerHeight < 1.2);
    read();
    window.addEventListener("resize", read);
    window.addEventListener("orientationchange", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);
  return portrait;
}

export default function FilmStage({
  portrait,
  expand = false,
  children,
}: {
  portrait: boolean;
  /**
   * Break the frame. Used for the one scene whose subject *is* the visitor's
   * screen — letterboxing the moment he knocks on the glass would undo it.
   * The frame opening out as he pushes is the point, not a compromise.
   */
  expand?: boolean;
  children: React.ReactNode;
}) {
  const letterboxed = portrait && !expand;
  return (
    <motion.div
      data-film-stage={letterboxed ? "letterbox" : "full"}
      className="absolute left-0 right-0 overflow-hidden"
      style={{ top: "50%", y: "-50%" }}
      animate={{ height: letterboxed ? "min(56.25vw, 100vh)" : "100vh" }}
      transition={{ duration: expand ? 0.7 : 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
