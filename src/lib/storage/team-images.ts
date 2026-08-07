export const TEAM_IMAGE_BUCKET = "team-assets";

export const TEAM_IMAGE_RULES = {
  logo: {
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 2 * 1024 * 1024,
    preferredAspectRatio: "1:1",
  },
  banner: {
    acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 5 * 1024 * 1024,
    preferredAspectRatio: "wide",
  },
} as const;

export type TeamImageKind = keyof typeof TEAM_IMAGE_RULES;
