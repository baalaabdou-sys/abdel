import type { Act2ClipKey } from "@/data/act2";

/**
 * Act 2's footage. Nothing here is fetched until the visitor presses
 * Continue on the interstitial — a viewer who stops after Act 1 never
 * downloads a byte of it.
 */
const BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/";

export const ACT2_CLIPS: Record<Act2ClipKey, { url: string }> = {
  a2_cursor_pull: { url: `${BASE}hf_20260811_165535_94fcb2ed-3b7f-465c-a1ab-e5cc62490b9c.mp4` },
  a2_city_surf: { url: `${BASE}hf_20260811_165535_62084e5c-ec38-4ee4-96cc-88a8899b5cbe.mp4` },
  a2_code_run: { url: `${BASE}hf_20260811_165535_419bbcb7-8e19-4764-8c5e-6f2e82e09dfc.mp4` },
  a2_error_fall: { url: `${BASE}hf_20260811_165535_9deb937e-1a93-4e02-8a93-dbefaecb22a3.mp4` },
  a2_chase: { url: `${BASE}hf_20260811_165535_b5395e59-5402-4953-a101-64448136dc55.mp4` },
};
