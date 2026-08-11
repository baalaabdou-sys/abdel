export type ClipKey =
  | "hero_entrance"
  | "idle_loop"
  | "point_action"
  | "skills_tap"
  | "sit_lean"
  | "celebrate"
  | "build_website"
  | "build_app"
  | "build_qr"
  | "grab_catch"
  | "throw"
  | "portal_enter"
  | "portal_exit"
  | "confused_fix"
  | "jump";

/**
 * `eager` clips preload fully on page load. The rest only fetch metadata
 * until something warms them (see AvatarContext.warmClip) — this keeps the
 * initial mobile payload down now that there are eight clips.
 */
export const clips: Record<ClipKey, { url: string; loop: boolean; eager?: boolean }> = {
  hero_entrance: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_123014_b6585b29-10dd-42fe-8640-0453510534e2.mp4",
    loop: false,
    eager: true,
  },
  idle_loop: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111643_9fc00191-1b79-46df-b6df-f79408012c32.mp4",
    loop: true,
    eager: true,
  },
  point_action: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111651_288202a4-7b2d-417c-ba7e-96b9eac09fe2.mp4",
    loop: false,
  },
  skills_tap: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111655_5af49f13-a168-43f2-8a20-a87fb7bd6b15.mp4",
    loop: false,
  },
  sit_lean: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111642_7df985fd-2c3b-429e-872d-222df6ff7805.mp4",
    loop: true,
  },
  celebrate: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111731_4b33e4bb-9727-4ad7-b96a-9154c4ed8d13.mp4",
    loop: false,
  },
  build_website: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_164327_bb783204-e359-45df-b728-bb09ead595f6.mp4",
    loop: false,
  },
  build_app: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_164327_02646b94-4594-487c-94c3-942d3770a8b0.mp4",
    loop: false,
  },
  build_qr: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_171523_76f02afc-e4a8-411d-a09b-69a08747f8c0.mp4",
    loop: false,
  },
  grab_catch: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214722_79e7e5a8-4218-4ad6-9d6e-780d9af3cb5d.mp4",
    loop: false,
  },
  throw: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214722_6ba18ba6-abde-40bb-9d45-1fa29ebb2f09.mp4",
    loop: false,
  },
  portal_enter: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214722_87667c0d-ceaa-42dc-a858-50cfe00b601e.mp4",
    loop: false,
  },
  portal_exit: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214722_4db02d61-4438-4e6d-b538-71cae9619b79.mp4",
    loop: false,
  },
  confused_fix: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214723_97065ed1-2405-48c2-8694-f52d2cc55ef3.mp4",
    loop: false,
  },
  jump: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_214724_b68ad658-b064-45b6-9cc4-d8da03ca1ef2.mp4",
    loop: false,
  },
};

export const posterFallback =
  "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104324_b90fb3ec-26e1-4de2-9a79-353452e67cba.png";
