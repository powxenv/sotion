export const SOCIAL_CONNECTION_PROVIDERS = [
  {
    id: "twitter",
    label: "Twitter",
    initials: "T",
    summary:
      "Link your Twitter account so Sotion can prepare previews and posting actions later.",
    providerType: "social",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    initials: "in",
    summary:
      "Connect LinkedIn to keep your publishing setup attached to this Sotion account.",
    providerType: "social",
  },
  {
    id: "threads",
    label: "Threads",
    initials: "@",
    summary:
      "Attach Threads now so the app is ready for platform-specific AI post previews later.",
    providerType: "oauth2",
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
