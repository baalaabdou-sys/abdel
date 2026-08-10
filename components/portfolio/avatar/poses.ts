export type Pose =
  | "idle"
  | "waving"
  | "pointing"
  | "thinking"
  | "typing"
  | "celebrating"
  | "sitting";

export const poses: Record<Pose, string> = {
  idle: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104324_b90fb3ec-26e1-4de2-9a79-353452e67cba.png",
  waving: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_fc078d8f-37a6-4c20-92cf-2a79fc0fe307.png",
  pointing: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_1ff20a02-4a46-499d-b5ab-c29f24f09c94.png",
  thinking: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_0b6c4889-99ef-4bfd-8b42-dc7ee670118f.png",
  typing: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_5cd53a51-138b-4a16-8397-91e5dea29f79.png",
  celebrating: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_2a4d0a22-9c66-40ae-8d3d-29494bdaed0a.png",
  sitting: "https://d8j0ntlcm91z4.cloudfront.net/user_31t8p9DkfiUU7vdjNVuT6n8wKxq/hf_20260810_104407_e4e65ebe-b58a-45a5-ac3a-0fc5c6fec0cc.png",
};
