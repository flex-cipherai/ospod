/** Ospod's plans. One source of truth for the pricing page, the app and the admin console's revenue figures. */

export type PlanId = "starter" | "creator" | "pro" | "studio" | "network";

export type Plan = {
  id: PlanId;
  name: string;
  /** US dollars per month, billed monthly. null = custom pricing. */
  monthly: number | null;
  tagline: string;
  /** Combined downloads and streams per month. null = custom. */
  downloads: number | null;
  shows: number | null;
  clipsPerMonth: number | null;
  trailersPerMonth: number | null;
  video: boolean;
  highlight?: boolean;
  features: string[];
};

/** Yearly billing discount. */
export const YEARLY_DISCOUNT = 0.2;
/** Founding members (first 500 on the waitlist) pay half, for life. */
export const FOUNDING_DISCOUNT = 0.5;
export const TRIAL_DAYS = 14;

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 19,
    tagline: "For new audio shows getting off the ground.",
    downloads: 15_000,
    shows: 1,
    clipsPerMonth: 0,
    trailersPerMonth: 0,
    video: false,
    features: [
      "1 audio show",
      "15,000 downloads a month",
      "Publish to Apple, Spotify, Amazon and every podcast app",
      "AI titles, show notes and transcripts",
      "Download analytics",
      "Import your show from any host",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    monthly: 49,
    tagline: "Audio and video, everywhere your audience is.",
    downloads: 50_000,
    shows: 1,
    clipsPerMonth: 10,
    trailersPerMonth: 0,
    video: true,
    features: [
      "Video podcasts on YouTube, Spotify and Apple",
      "50,000 downloads a month",
      "AI chapters",
      "10 AI clips a month",
      "YouTube and podcast analytics in one place",
      "Ask Ospod: chat with your analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 99,
    tagline: "For shows that publish often and want to grow on social.",
    downloads: 100_000,
    shows: 1,
    clipsPerMonth: 40,
    trailersPerMonth: 1,
    video: true,
    highlight: true,
    features: [
      "100,000 downloads a month",
      "40 AI clips and 1 AI trailer a month",
      "Post clips to TikTok, Reels and Shorts",
      "Turn your YouTube channel into a podcast",
      "Podcast website and smart links",
      "Weekly AI insights email",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 249,
    tagline: "For teams and high-volume shows with big back catalogues.",
    downloads: 250_000,
    shows: 3,
    clipsPerMonth: 150,
    trailersPerMonth: 4,
    video: true,
    features: [
      "Up to 3 shows",
      "250,000 downloads a month",
      "150 AI clips and 4 AI trailers a month",
      "Team roles and approval before publishing",
      "Edit episodes together in real time",
      "1:1 set-up call",
    ],
  },
  {
    id: "network",
    name: "Network",
    monthly: null,
    tagline: "For networks, agencies and studios running many shows.",
    downloads: null,
    shows: null,
    clipsPerMonth: null,
    trailersPerMonth: null,
    video: true,
    features: [
      "Unlimited shows",
      "Custom limits, contract and SLA",
      "White-label",
      "API access",
      "Dedicated support channel",
      "White-glove migration",
    ],
  },
];

export const planById = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);

/** Monthly price shown for yearly billing (rounded to whole dollars). */
export const yearlyMonthlyPrice = (monthly: number) => Math.round(monthly * (1 - YEARLY_DISCOUNT));

/** Monthly recurring revenue of one paying workspace, in US dollars. Custom (Network) plans count as 0 until invoiced. */
export function monthlyRevenue(plan: PlanId, interval: "month" | "year", founding: boolean): number {
  const base = planById(plan)?.monthly ?? 0;
  const afterInterval = interval === "year" ? base * (1 - YEARLY_DISCOUNT) : base;
  return founding ? afterInterval * (1 - FOUNDING_DISCOUNT) : afterInterval;
}

export const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const formatUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
