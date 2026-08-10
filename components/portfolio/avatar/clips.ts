export type ClipKey =
  | "hero_entrance"
  | "idle_loop"
  | "point_action"
  | "skills_tap"
  | "sit_lean"
  | "celebrate";

export const clips: Record<ClipKey, { url: string; loop: boolean }> = {
  hero_entrance: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111723_b3857ed8-580d-49d8-a63a-dca67ae3f263.mp4",
    loop: false,
  },
  idle_loop: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_111643_9fc00191-1b79-46df-b6df-f79408012c32.mp4",
    loop: true,
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
};

export const posterFallback =
  "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104324_b90fb3ec-26e1-4de2-9a79-353452e67cba.png";
