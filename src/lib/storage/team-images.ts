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

type UploadCandidate = { size: number; type: string };

export function validateTeamImage(kind: TeamImageKind, file: UploadCandidate) {
  const rules = TEAM_IMAGE_RULES[kind];
  if (file.size <= 0) return "Choose an image to upload.";
  if (!(rules.acceptedMimeTypes as readonly string[]).includes(file.type)) return "Use a PNG, JPEG or WEBP image.";
  if (file.size > rules.maxBytes) return `${kind === "logo" ? "Logo" : "Banner"} must be ${kind === "logo" ? "2" : "5"} MB or smaller.`;
  return null;
}

export function teamImageExtension(mimeType: string) {
  return mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
}

export function buildTeamImagePath(teamId: string, kind: TeamImageKind, mimeType: string, timestamp = Date.now(), uniqueId = crypto.randomUUID()) {
  const safeId = uniqueId.replace(/[^a-zA-Z0-9-]/g, "");
  return `teams/${teamId}/${kind}/${kind}-${timestamp}-${safeId}.${teamImageExtension(mimeType)}`;
}
