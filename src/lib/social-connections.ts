export const SOCIAL_CONNECTION_PROVIDERS = [
  {
    id: "twitter",
    label: "Twitter",
    initials: "T",
    logoPath: "/social-icons/x.svg",
    summary:
      "Link your X account with publish-ready scopes so Sotion can post text and media later.",
    providerType: "social",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    initials: "in",
    logoPath: "/social-icons/linkedin.svg",
    summary:
      "Connect LinkedIn with member publishing access so Sotion can publish on your behalf later.",
    providerType: "social",
  },
  {
    id: "facebook",
    label: "Facebook",
    initials: "f",
    logoPath: "/social-icons/facebook.svg",
    summary:
      "Connect Facebook with Page publishing permissions so Sotion can publish posts and videos later.",
    providerType: "social",
  },
  {
    id: "instagram",
    label: "Instagram",
    initials: "IG",
    logoPath: "/social-icons/instagram.svg",
    summary:
      "Attach Instagram with business publishing access so Sotion can publish feed content later.",
    providerType: "oauth2",
  },
  {
    id: "threads",
    label: "Threads",
    initials: "@",
    logoPath: "/social-icons/threads.svg",
    summary:
      "Attach Threads with content publishing access so Sotion can publish Threads posts later.",
    providerType: "oauth2",
  },
  {
    id: "tiktok",
    label: "TikTok",
    initials: "TT",
    logoPath: "/social-icons/tiktok.svg",
    summary:
      "Link TikTok with direct-post access so Sotion can publish videos later.",
    providerType: "social",
  },
] as const;

export type SocialConnectionProvider =
  (typeof SOCIAL_CONNECTION_PROVIDERS)[number];
export type SocialConnectionProviderId = SocialConnectionProvider["id"];

const SOCIAL_CONNECTION_PROVIDER_IDS = new Set<string>(
  SOCIAL_CONNECTION_PROVIDERS.map((provider) => provider.id),
);

export function isSocialConnectionProviderId(
  value: string,
): value is SocialConnectionProviderId {
  return SOCIAL_CONNECTION_PROVIDER_IDS.has(value);
}

export function getSocialConnectionProvider(
  providerId: SocialConnectionProviderId,
) {
  return SOCIAL_CONNECTION_PROVIDERS.find(
    (provider) => provider.id === providerId,
  )!;
}
