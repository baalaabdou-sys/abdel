import type { Act2ClipKey } from "@/data/act2";

/**
 * Act 2's footage, served from this site rather than from the generator's
 * bucket. All five are 5.042s at 1280x720, read from the containers
 * themselves — which is what the edit's five-second windows are cut against.
 *
 * Two encodings of each. VP9 is roughly a third of the size of the H.264 and
 * is what Chrome, Firefox and Android take; Safari falls back to the mp4. On a
 * phone that is the difference between 13MB of film and about 4MB.
 */
export type AdSource = { webm: string; mp4: string };

const pair = (name: string): AdSource => ({
  webm: `/clips/${name}.webm`,
  mp4: `/clips/${name}.mp4`,
});

export const ACT2_CLIPS: Record<Act2ClipKey, AdSource> = {
  a2_cursor_pull: pair("a2_cursor_pull"),
  a2_city_surf: pair("a2_city_surf"),
  a2_code_run: pair("a2_code_run"),
  a2_error_fall: pair("a2_error_fall"),
  a2_chase: pair("a2_chase"),
};
