import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/session";
import { PageHeader, Badge, ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getWorkspaceSettings, updateSettingsAction } from "./actions";
import { db } from "@/db";
import { providerAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const settings = await getWorkspaceSettings(admin.workspaceId);
  const activeProviderAccounts = await db.query.providerAccounts.findMany({
    where: and(
      eq(providerAccounts.workspaceId, admin.workspaceId),
      eq(providerAccounts.provider, "resend"),
      eq(providerAccounts.status, "active"),
    ),
  });
  const webhookUrl = `${settings?.publicBaseUrl ?? env.APP_BASE_URL}/api/webhooks/resend`;
  const checks = [
    [
      "Active Resend API keys",
      activeProviderAccounts.length > 0 || Boolean(env.RESEND_API_KEY),
    ],
    [
      "Webhook secret",
      activeProviderAccounts.some(
        (account) => account.webhookSecretEncrypted,
      ) || Boolean(env.RESEND_WEBHOOK_SECRET),
    ],
    [
      "Default sender email",
      Boolean(settings?.defaultFromEmail ?? env.DEFAULT_FROM_EMAIL),
    ],
    ["Public base URL", Boolean(settings?.publicBaseUrl ?? env.APP_BASE_URL)],
  ] as const;
  return (
    <>
      <PageHeader
        title="Settings"
        action={
          <div className="flex gap-2">
            <ButtonLink href="/settings/tags">Recipient Tags</ButtonLink>
            <ButtonLink href="/settings/providers">Provider Keys</ButtonLink>
            <ButtonLink href="/settings/admins">Administrators</ButtonLink>
          </div>
        }
      />
      <div className="rounded border border-line bg-white p-5 text-sm">
        <dl className="grid gap-3 md:grid-cols-[220px_1fr]">
          <dt className="text-muted">Product name</dt>
          <dd>{settings?.productName ?? env.APP_NAME}</dd>
          <dt className="text-muted">Base URL</dt>
          <dd>{settings?.publicBaseUrl ?? env.APP_BASE_URL}</dd>
          <dt className="text-muted">Timezone</dt>
          <dd>{settings?.timezone ?? env.APP_TIMEZONE}</dd>
          <dt className="text-muted">Sending</dt>
          <dd>
            {activeProviderAccounts.length > 0 || env.RESEND_API_KEY ? (
              <Badge tone="good">configured</Badge>
            ) : (
              <Badge tone="warn">disabled</Badge>
            )}
          </dd>
          <dt className="text-muted">Provider</dt>
          <dd>resend</dd>
          <dt className="text-muted">Routing strategy</dt>
          <dd>{settings?.providerRoutingStrategy ?? "sequential"}</dd>
          <dt className="text-muted">Metrics mode</dt>
          <dd>{settings?.providerMetricsMode ?? "combined"}</dd>
          <dt className="text-muted">Active API keys</dt>
          <dd>{activeProviderAccounts.length}</dd>
        </dl>
      </div>
      <section className="mt-6 rounded border border-line bg-white p-5">
        <h2 className="font-semibold">Resend Connection</h2>
        <p className="mt-1 text-sm text-muted">
          Secrets stay in environment variables. This page only shows whether
          they are present and stores non-secret sender settings.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {checks.map(([label, ok]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded border border-line p-3 text-sm"
            >
              <span>{label}</span>
              {ok ? (
                <Badge tone="good">configured</Badge>
              ) : (
                <Badge tone="warn">missing</Badge>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded border border-line bg-panel p-3 text-sm">
          <div className="text-muted">Webhook URL</div>
          <code className="mt-1 block break-all">{webhookUrl}</code>
        </div>
      </section>
      <form
        action={updateSettingsAction}
        className="mt-6 grid max-w-2xl gap-4 rounded border border-line bg-white p-5"
      >
        <h2 className="font-semibold">Sender Settings</h2>
        <label className="text-sm font-medium">
          Product name
          <input
            name="productName"
            required
            defaultValue={settings?.productName ?? env.APP_NAME}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Public base URL
          <input
            name="publicBaseUrl"
            type="url"
            defaultValue={settings?.publicBaseUrl ?? env.APP_BASE_URL}
            className="mt-1 w-full rounded border-line"
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Use the public Vercel or custom domain, for example
            https://your-app.vercel.app. Resend webhooks cannot reach localhost.
          </span>
        </label>
        <label className="text-sm font-medium">
          Default from name
          <input
            name="defaultFromName"
            required
            defaultValue={settings?.defaultFromName ?? env.DEFAULT_FROM_NAME}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Default from email
          <input
            name="defaultFromEmail"
            type="email"
            defaultValue={settings?.defaultFromEmail ?? env.DEFAULT_FROM_EMAIL}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Default reply-to
          <input
            name="defaultReplyTo"
            type="email"
            defaultValue={settings?.defaultReplyTo ?? env.DEFAULT_REPLY_TO}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Default locale
          <input
            name="defaultLocale"
            required
            defaultValue={settings?.defaultLocale ?? "en"}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Timezone
          <input
            name="timezone"
            required
            defaultValue={settings?.timezone ?? env.APP_TIMEZONE}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          API key routing
          <select
            name="providerRoutingStrategy"
            defaultValue={settings?.providerRoutingStrategy ?? "sequential"}
            className="mt-1 w-full rounded border-line"
          >
            <option value="sequential">Sequential</option>
            <option value="parallel">Parallel</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Provider metrics
          <select
            name="providerMetricsMode"
            defaultValue={settings?.providerMetricsMode ?? "combined"}
            className="mt-1 w-full rounded border-line"
          >
            <option value="combined">Combined</option>
            <option value="by_provider_account">By API key</option>
          </select>
        </label>
        <SubmitButton
          pendingLabel="Saving settings..."
          className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white"
        >
          Save settings
        </SubmitButton>
      </form>
    </>
  );
}
