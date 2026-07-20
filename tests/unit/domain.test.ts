import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizeLocale,
  parseBoolean,
} from "@/lib/normalization";
import { resolveVariant } from "@/server/campaigns/variants";
import { assignWave } from "@/server/campaigns/waves";
import { calculateRates } from "@/server/analytics/rates";
import { normalizeClickedUrl, classifyLink } from "@/server/webhooks/links";
import { retryBackoffMs } from "@/server/jobs/backoff";
import { mapResendEventType } from "@/server/webhooks/mapping";
import { scoreRecipientPriority } from "@/server/imports/priority";
import { parseTagList } from "@/lib/tags";
import { htmlToPlainText, normalizeTemplateHtml } from "@/lib/templates";

describe("domain utilities", () => {
  it("normalizes email without unsafe mailbox transformations", () => {
    expect(normalizeEmail(" User+Tag@Example.COM ")).toBe(
      "user+tag@example.com",
    );
  });

  it("normalizes locales and booleans", () => {
    expect(normalizeLocale("de_DE")).toBe("de-de");
    expect(parseBoolean("yes")).toBe(true);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean("maybe")).toBeNull();
  });

  it("resolves templates in the required order", () => {
    const variants = [
      {
        id: "default",
        locale: "en",
        recipientRole: "generic",
      },
      { id: "role", locale: "en", recipientRole: "admin" },
      {
        id: "locale",
        locale: "de",
        recipientRole: "generic",
      },
    ];
    expect(
      resolveVariant(variants, {
        locale: "de",
        role: "admin",
        defaultLocale: "en",
      })?.id,
    ).toBe("locale");
    expect(
      resolveVariant(variants, {
        locale: "fr",
        role: "admin",
        defaultLocale: "en",
      })?.id,
    ).toBe("role");
    expect(
      resolveVariant(
        [
          {
            id: "only",
            locale: "en",
            recipientRole: "member",
          },
        ],
        {
          locale: "fr",
          role: "lead",
          defaultLocale: "en",
        },
      ),
    ).toBeNull();
  });

  it("assigns waves deterministically", () => {
    const waves = [
      { id: "a", position: 1, recipientLimit: 2 },
      { id: "b", position: 2, recipientLimit: null },
    ];
    expect(assignWave(0, waves)).toBe("a");
    expect(assignWave(2, waves)).toBe("b");
    expect(assignWave(99, waves)).toBe("b");
  });

  it("calculates rates with zero guards", () => {
    expect(
      calculateRates({
        sent: 0,
        delivered: 0,
        uniqueOpened: 0,
        uniqueClicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
      }).deliveryRate,
    ).toBe(0);
    expect(
      calculateRates({
        sent: 10,
        delivered: 8,
        uniqueOpened: 4,
        uniqueClicked: 2,
        bounced: 1,
        complained: 0,
        unsubscribed: 1,
      }).deliveryRate,
    ).toBe(0.8);
  });

  it("normalizes and classifies clicked links", () => {
    const url = normalizeClickedUrl(
      "https://example.com/reset?token=abc&utm=1#frag",
    );
    expect(url).toContain("token=%5Bredacted%5D");
    expect(url).not.toContain("#frag");
    expect(classifyLink(url)).toBe("password_reset");
  });

  it("maps webhooks and retry backoff", () => {
    expect(mapResendEventType("email.clicked")).toBe("clicked");
    expect(mapResendEventType("other")).toBe("unknown");
    expect(retryBackoffMs(2)).toBeGreaterThan(retryBackoffMs(1));
  });

  it("generates plain text from email HTML", () => {
    expect(
      htmlToPlainText(
        "<h2>Hello&nbsp;{{first_name}}</h2><p>Visit &amp; read</p>",
      ),
    ).toBe("Hello {{first_name}}\nVisit & read");
  });

  it("normalizes escaped HTML source before previewing or saving", () => {
    const escaped = "&lt;h1&gt;Hello {{first_name}}&lt;/h1&gt;";
    expect(normalizeTemplateHtml(escaped)).toBe(
      "<h1>Hello {{first_name}}</h1>",
    );
    expect(htmlToPlainText(escaped)).toBe("Hello {{first_name}}");
  });

  it("scores recipient priority cohorts", () => {
    const high = scoreRecipientPriority({
      emailVerified: true,
      marketingConsent: true,
      lastActiveAt: new Date(),
      locale: "en",
      role: "buyer",
      platform: "web",
      externalId: "user-1",
    });
    expect(high.priorityScore).toBeGreaterThanOrEqual(80);
    expect(high.priorityCohort).toBe("high_intent");

    const low = scoreRecipientPriority({
      emailVerified: false,
      marketingConsent: false,
      lastActiveAt: null,
    });
    expect(low.priorityCohort).toBe("low_confidence");
  });

  it("parses imported recipient tags", () => {
    expect(parseTagList("Paid users, beta | Paid users;VIP")).toEqual([
      { name: "Paid users", slug: "paid-users" },
      { name: "beta", slug: "beta" },
      { name: "VIP", slug: "vip" },
    ]);
  });
});
