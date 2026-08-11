import { clips } from "../avatar/clips";
import { INTRO } from "./introClip";

/** The one asset worth fetching before anything else on the page. */
export const INTRO_PRELOAD =
  INTRO.mode === "scene" ? INTRO.srcWebm ?? INTRO.src! : clips[INTRO.clip!].url;
