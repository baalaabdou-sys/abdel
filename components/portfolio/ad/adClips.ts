import type { AdClipKey } from "@/data/adCut";

/**
 * The eight shots the film is cut from.
 *
 * None of these are referenced on first paint. The opening shot is fetched as
 * metadata once the Watch ad button comes near the viewport, the second on
 * hover or press, and the rest are pulled in one shot ahead of the cut while
 * the film runs — so a visitor who never presses the button pays nothing.
 */
const BASE = "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/";

export const AD_CLIPS: Record<AdClipKey, { url: string }> = {
  ad_open: { url: `${BASE}hf_20260811_124216_1f98f9ce-a188-4064-b016-ef2ca7fd0a30.mp4` },
  ad_dev: { url: `${BASE}hf_20260811_124216_a412c14f-456b-4f92-8f18-afaad079778c.mp4` },
  ad_web: { url: `${BASE}hf_20260811_124216_06bea1dd-2cca-4d82-867a-f5bb80681395.mp4` },
  ad_apps: { url: `${BASE}hf_20260811_124216_733e073f-4b73-4a4f-9ded-ef950514a4c1.mp4` },
  ad_qr: { url: `${BASE}hf_20260811_124216_d5293de9-8c77-4306-ba29-fe7559973d45.mp4` },
  ad_ai: { url: `${BASE}hf_20260811_124216_fc53ed5a-a9e1-4e36-87aa-62fb1a46744a.mp4` },
  ad_montage: { url: `${BASE}hf_20260811_124216_b8ed894d-87d8-4067-9f94-b66c8dd9287d.mp4` },
  ad_hero: { url: `${BASE}hf_20260811_124216_d6377531-935c-4991-88e3-3bb7aea5ab48.mp4` },
};
