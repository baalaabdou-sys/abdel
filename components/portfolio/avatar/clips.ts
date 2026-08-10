export type ClipKey =
  | "hero_entrance"
  | "idle_loop"
  | "point_action"
  | "skills_tap"
  | "sit_lean"
  | "celebrate";

export const clips: Record<ClipKey, { url: string; loop: boolean }> = {
  hero_entrance: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105823_29d91069-9b76-49aa-9360-885f70b33330.mp4",
    loop: false,
  },
  idle_loop: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105812_43f75eee-1b54-465a-8baf-ab813dcd5b52.mp4",
    loop: true,
  },
  point_action: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105812_cdd8b281-7b5a-4b7a-ba2f-5a09ef4eb8c4.mp4",
    loop: false,
  },
  skills_tap: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105812_d69b6997-ba22-4695-9544-6328ba7e8a0c.mp4",
    loop: false,
  },
  sit_lean: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105812_0108e34a-3173-4351-813f-d461ac7eb1e2.mp4",
    loop: true,
  },
  celebrate: {
    url: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_105823_b6c65424-053d-49ab-877c-75b58e771cc3.mp4",
    loop: false,
  },
};

export const posterFallback =
  "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104324_b90fb3ec-26e1-4de2-9a79-353452e67cba.png";
