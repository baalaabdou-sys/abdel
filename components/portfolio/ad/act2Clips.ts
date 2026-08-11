import type { Act2ClipKey } from "@/data/act2";

/**
 * Act 2's footage, served from this site rather than from the generator's
 * bucket. Same origin, no third-party dependency, and nothing that can rot
 * out from under the film later.
 *
 * All five are 5.042s at 1280x720, read from the containers themselves — which
 * is what the edit's five-second windows are cut against.
 */
export const ACT2_CLIPS: Record<Act2ClipKey, { url: string }> = {
  a2_cursor_pull: { url: "/clips/a2_cursor_pull.mp4" },
  a2_city_surf: { url: "/clips/a2_city_surf.mp4" },
  a2_code_run: { url: "/clips/a2_code_run.mp4" },
  a2_error_fall: { url: "/clips/a2_error_fall.mp4" },
  a2_chase: { url: "/clips/a2_chase.mp4" },
};
