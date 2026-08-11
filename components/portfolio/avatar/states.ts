import type { ClipKey } from "./clips";

/**
 * The character's vocabulary. Sections set an *ambient* state; events fire
 * *actions* that temporarily override it and then fall back automatically.
 */
export type CharacterState =
  | "idle"
  | "sitting"
  | "noticing"
  | "pointing"
  | "grabbing"
  | "throwing"
  | "tapping"
  | "jumping"
  | "confused"
  | "celebrating"
  | "portal_enter"
  | "portal_exit"
  | "building_website"
  | "building_app"
  | "building_qr"
  | "arriving"
  | "permission"
  | "reaching"
  | "slamming"
  | "signing_off"
  | "brain_invite"
  | "brain_idle"
  | "brain_arrange"
  | "brain_present"
  | "brain_hide"
  | "brain_pull"
  | "brain_catch";

type StateDef = {
  clip: ClipKey;
  /** Higher wins when two things want the character at once. */
  priority: number;
  /** How long an action holds before falling back to ambient (ms). */
  hold: number;
  /** Optional state to run immediately after this one finishes. */
  then?: CharacterState;
};

export const STATES: Record<CharacterState, StateDef> = {
  idle: { clip: "idle_loop", priority: 0, hold: 0 },
  sitting: { clip: "sit_lean", priority: 0, hold: 0 },

  // Reactions to the visitor — low priority, easily interrupted.
  noticing: { clip: "point_action", priority: 10, hold: 1500 },
  pointing: { clip: "point_action", priority: 20, hold: 2600 },
  tapping: { clip: "skills_tap", priority: 20, hold: 1800 },

  // Physical interaction with the interface.
  grabbing: { clip: "grab_catch", priority: 40, hold: 3000 },
  throwing: { clip: "throw", priority: 40, hold: 2600 },
  jumping: { clip: "jump", priority: 45, hold: 2400 },

  // Set pieces — these should not be interrupted by hover noise.
  confused: { clip: "confused_fix", priority: 80, hold: 4600 },
  celebrating: { clip: "celebrate", priority: 60, hold: 3200 },
  portal_enter: { clip: "portal_enter", priority: 90, hold: 3000 },
  portal_exit: { clip: "portal_exit", priority: 90, hold: 3000 },
  arriving: { clip: "hero_entrance", priority: 70, hold: 6800 },

  // "Break the portfolio". These run above everything else: once the visitor
  // has started the sequence, nothing ambient may cut into it.
  permission: { clip: "permission_smirk", priority: 95, hold: 1100 },
  reaching: { clip: "reach_pull", priority: 95, hold: 1200 },
  slamming: { clip: "slam_down", priority: 95, hold: 1400 },
  signing_off: { clip: "sign_off", priority: 95, hold: 2400 },

  // Inside his own head. brain_idle is ambient (he is comfortable in there);
  // the rest are set-piece beats that must not be interrupted.
  brain_idle: { clip: "brain_sit", priority: 0, hold: 0 },
  brain_invite: { clip: "brain_invite", priority: 95, hold: 1700 },
  brain_arrange: { clip: "brain_arrange", priority: 95, hold: 3400 },
  brain_present: { clip: "brain_present", priority: 95, hold: 3000 },
  brain_hide: { clip: "brain_hide", priority: 95, hold: 2600 },
  brain_pull: { clip: "brain_pull", priority: 95, hold: 2000 },
  brain_catch: { clip: "brain_catch", priority: 95, hold: 2400 },

  // Workshop.
  building_website: { clip: "build_website", priority: 50, hold: 6500 },
  building_app: { clip: "build_app", priority: 50, hold: 6500 },
  building_qr: { clip: "build_qr", priority: 50, hold: 7200 },
};

export function clipFor(state: CharacterState): ClipKey {
  return STATES[state].clip;
}

/** Which clips a section is likely to need next, for predictive preloading. */
export const SECTION_CLIPS: Record<string, ClipKey[]> = {
  hero: ["idle_loop", "hero_entrance", "grab_catch"],
  work: ["point_action", "grab_catch", "portal_enter", "jump"],
  skills: ["skills_tap", "throw", "idle_loop"],
  build: ["build_website", "build_app", "build_qr"],
  about: ["sit_lean", "confused_fix"],
  contact: ["celebrate", "idle_loop", "portal_exit"],
};
