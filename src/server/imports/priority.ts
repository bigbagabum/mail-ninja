import type { parseBoolean, parseDate } from "@/lib/normalization";

export type PriorityInput = {
  emailVerified: ReturnType<typeof parseBoolean>;
  marketingConsent: ReturnType<typeof parseBoolean>;
  lastActiveAt: ReturnType<typeof parseDate>;
  locale?: string | null;
  role?: string | null;
  platform?: string | null;
  externalId?: string | null;
};

export function scoreRecipientPriority(input: PriorityInput) {
  let score = 0;
  const reasons: string[] = [];

  if (input.emailVerified === true) {
    score += 25;
    reasons.push("verified email");
  }
  if (input.marketingConsent === true) {
    score += 25;
    reasons.push("marketing consent");
  }
  if (input.externalId) {
    score += 10;
    reasons.push("known external id");
  }
  if (input.locale) {
    score += 5;
    reasons.push("known locale");
  }
  if (input.role) {
    score += 5;
    reasons.push("known role");
  }
  if (input.platform) {
    score += 5;
    reasons.push("known platform");
  }
  if (input.lastActiveAt) {
    const ageDays = (Date.now() - input.lastActiveAt.getTime()) / 86_400_000;
    if (ageDays <= 30) {
      score += 25;
      reasons.push("active within 30 days");
    } else if (ageDays <= 90) {
      score += 15;
      reasons.push("active within 90 days");
    } else if (ageDays <= 365) {
      score += 5;
      reasons.push("active within 365 days");
    }
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const cohort =
    boundedScore >= 80 ? "high_intent" : boundedScore >= 55 ? "engaged" : boundedScore >= 25 ? "standard" : "low_confidence";

  return {
    priorityScore: boundedScore,
    priorityCohort: cohort,
    prioritySource: "auto_import",
    priorityNotes: reasons.join(", ") || "no priority signals"
  };
}
