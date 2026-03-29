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
      "Connect your X account so Sotion can help prepare and publish text posts.",
    providerType: "social",
    availability: "available",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    initials: "in",
    logoPath: "/social-icons/linkedin.svg",
    summary:
      "Connect LinkedIn so Sotion can help prepare and publish text updates.",
    providerType: "social",
    availability: "available",
  },
  {
    id: "threads",
    label: "Threads",
    initials: "@",
    logoPath: "/social-icons/threads.svg",
    summary:
      "Threads is not available yet.",
    providerType: "oauth2",
    availability: "disabled",
    availabilityLabel: "Not available yet",
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
