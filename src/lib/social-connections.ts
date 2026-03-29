type SocialConnectionProviderDefinition = {
  availability: "available" | "disabled";
  availabilityLabel?: string;
  id: "twitter" | "linkedin" | "threads";
  initials: string;
  label: string;
  logoPath: string;
  providerType: "social" | "oauth2";
  summary: string;
};

export const SOCIAL_CONNECTION_PROVIDERS: readonly SocialConnectionProviderDefinition[] = [
  {
    id: "twitter",
    label: "X",
    initials: "X",
    logoPath: "/social-icons/x.svg",
    summary:
      "Link your X account with publish-ready scopes so Sotion can publish text posts later.",
    providerType: "social",
    availability: "available",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    initials: "in",
    logoPath: "/social-icons/linkedin.svg",
    summary:
      "Connect LinkedIn with member publishing access so Sotion can publish text updates on your behalf later.",
    providerType: "social",
    availability: "available",
  },
  {
    id: "threads",
    label: "Threads",
    initials: "@",
    logoPath: "/social-icons/threads.svg",
    summary:
      "Threads connection is currently unavailable.",
    providerType: "oauth2",
    availability: "disabled",
    availabilityLabel: "Currently unavailable",
  },
];

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
