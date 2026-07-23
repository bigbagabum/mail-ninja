import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  campaignRecipients,
  emailEvents,
  providerAccounts,
  workspaceSettings,
} from "@/db/schema";
import { CopyButton } from "@/components/copy-button";
import { Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/session";
import {
  createProviderAccountAction,
  deleteProviderAccountAction,
  setProviderAccountStatusAction,
  testProviderAccountAction,
  updateProviderAccountAction,
} from "./actions";

export default async function ProviderAccountsPage() {
  const admin = await requireAdmin();
  const settings = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, admin.workspaceId),
  });
  const publicBaseUrl = settings?.publicBaseUrl ?? env.APP_BASE_URL;
  const webhookEndpoint = `${publicBaseUrl.replace(/\/$/, "")}/api/webhooks/resend`;
  const accounts = await db.query.providerAccounts.findMany({
    where: eq(providerAccounts.workspaceId, admin.workspaceId),
    orderBy: (table, { asc }) => [
      asc(table.provider),
      asc(table.routingOrder),
      asc(table.name),
    ],
  });
  const usageRows = await db
    .select({
      providerAccountId: campaignRecipients.providerAccountId,
      today: sql<number>`count(*) filter (where ${campaignRecipients.sentAt} >= date_trunc('day', now()))::int`,
      month: sql<number>`count(*) filter (where ${campaignRecipients.sentAt} >= date_trunc('month', now()))::int`,
    })
    .from(campaignRecipients)
    .where(sql`${campaignRecipients.providerAccountId} is not null`)
    .groupBy(campaignRecipients.providerAccountId);
  const usageByAccount = new Map(
    usageRows.map((row) => [row.providerAccountId, row]),
  );
  const [webhookStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last24h: sql<number>`count(*) filter (where ${emailEvents.receivedAt} >= now() - interval '24 hours')::int`,
      opened24h: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'opened' and ${emailEvents.receivedAt} >= now() - interval '24 hours')::int`,
      clicked24h: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'clicked' and ${emailEvents.receivedAt} >= now() - interval '24 hours')::int`,
      latestReceivedAt: sql<Date | null>`max(${emailEvents.receivedAt})`,
    })
    .from(emailEvents);
  const latestEvents = await db.query.emailEvents.findMany({
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.receivedAt)],
  });
  const hasWebhookSecret = accounts.some(
    (account) => account.webhookSecretEncrypted,
  );
  const webhookLooksPublic =
    !webhookEndpoint.includes("localhost") &&
    !webhookEndpoint.includes("127.0.0.1");
  const fieldClass = "grid gap-1 text-sm";
  const labelClass = "text-xs font-medium text-muted";
  const inputClass = "rounded border-line text-sm";

  return (
    <>
      <PageHeader
        title="Provider Accounts"
        action={
          <Link href="/settings" className="text-sm text-muted hover:text-ink">
            Back to settings
          </Link>
        }
      />
      <section className="mb-6 rounded border border-blue-100 bg-blue-50 p-5 text-sm text-blue-950">
        <h2 className="font-semibold">Resend webhook endpoint</h2>
        <p className="mt-1">
          In Resend, create a webhook and set its endpoint URL to this address.
          The webhook secret from Resend should be saved with the matching API
          key below.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto rounded border border-blue-100 bg-white px-3 py-2 text-xs text-ink">
            {webhookEndpoint}
          </code>
          <CopyButton value={webhookEndpoint} label="Copy endpoint" />
        </div>
        <p className="mt-2 text-xs text-blue-800">
          The value is built from Settings public base URL, falling back to
          APP_BASE_URL.
        </p>
      </section>
      <section className="mb-6 rounded border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Webhook diagnostics</h2>
          <Badge
            tone={webhookLooksPublic && hasWebhookSecret ? "good" : "warn"}
          >
            {webhookLooksPublic && hasWebhookSecret
              ? "configured"
              : "check setup"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded border border-line p-3">
            <div className="text-xs text-muted">Endpoint</div>
            <div className="mt-1 font-medium">
              {webhookLooksPublic ? "public URL" : "local URL"}
            </div>
          </div>
          <div className="rounded border border-line p-3">
            <div className="text-xs text-muted">Webhook secret</div>
            <div className="mt-1 font-medium">
              {hasWebhookSecret ? "saved" : "missing"}
            </div>
          </div>
          <div className="rounded border border-line p-3">
            <div className="text-xs text-muted">Events 24h</div>
            <div className="mt-1 font-medium">{webhookStats.last24h}</div>
          </div>
          <div className="rounded border border-line p-3">
            <div className="text-xs text-muted">Open / click 24h</div>
            <div className="mt-1 font-medium">
              {webhookStats.opened24h} / {webhookStats.clicked24h}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Latest webhook event:{" "}
          {webhookStats.latestReceivedAt?.toISOString() ?? "none recorded yet"}.
        </p>
        <div className="mt-4 overflow-hidden rounded border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Type</th>
                <th>Status</th>
                <th>Email</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {latestEvents.map((event) => (
                <tr key={event.id} className="border-t border-line">
                  <td className="p-3">{event.eventType}</td>
                  <td>
                    <Badge>{event.processingStatus}</Badge>
                  </td>
                  <td>{event.email}</td>
                  <td>{event.receivedAt.toISOString()}</td>
                </tr>
              ))}
              {latestEvents.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted" colSpan={4}>
                    No webhook events have been recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded border border-line bg-white p-5">
        <h2 className="font-semibold">Add API Key</h2>
        <p className="mt-1 text-sm text-muted">
          API keys are encrypted before storage and validated immediately after
          saving. Existing keys are never shown back in the browser.
        </p>
        <p className="mt-1 text-xs text-muted">
          Lower priority numbers are used first when sending through multiple
          keys.
        </p>
        <form
          action={createProviderAccountAction}
          autoComplete="off"
          className="mt-4 grid gap-3 lg:grid-cols-[120px_minmax(140px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px_120px_130px_auto]"
        >
          <label className={fieldClass}>
            <span className={labelClass}>Provider</span>
            <select
              name="provider"
              defaultValue="resend"
              className={inputClass}
            >
              <option value="resend">Resend</option>
              <option value="custom">Other service</option>
            </select>
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>Key name</span>
            <input
              name="name"
              required
              placeholder="Production"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>API key</span>
            <input
              name="apiKey"
              required
              type="password"
              placeholder="re_..."
              autoComplete="new-password"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>Webhook secret</span>
            <input
              name="webhookSecret"
              type="password"
              placeholder="Optional"
              autoComplete="new-password"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>
              Priority{" "}
              <span title="Lower number sends first." className="cursor-help">
                (?)
              </span>
            </span>
            <input
              name="routingOrder"
              type="number"
              min="0"
              defaultValue="100"
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>Daily limit</span>
            <input
              name="dailySendLimit"
              type="number"
              min="1"
              required
              defaultValue="100"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span className={labelClass}>Monthly limit</span>
            <input
              name="monthlySendLimit"
              type="number"
              min="1"
              required
              defaultValue="3000"
              className={inputClass}
            />
          </label>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Saving key...">Save key</SubmitButton>
          </div>
        </form>
      </section>

      <div className="mt-6 grid gap-4">
        {accounts.map((account) => {
          const usage = usageByAccount.get(account.id);
          const today = usage?.today ?? 0;
          const month = usage?.month ?? 0;
          return (
            <section
              key={account.id}
              className="rounded border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{account.name}</h2>
                    {account.status === "active" ? (
                      <Badge tone="good">active</Badge>
                    ) : account.status === "failed" ? (
                      <Badge tone="bad">failed</Badge>
                    ) : (
                      <Badge tone="warn">paused</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {account.provider} key {account.apiKeyHint}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={testProviderAccountAction}>
                    <input
                      type="hidden"
                      name="providerAccountId"
                      value={account.id}
                    />
                    <SubmitButton
                      pendingLabel="Testing..."
                      className="rounded border border-line px-3 py-2 text-sm hover:bg-panel"
                    >
                      Re-test
                    </SubmitButton>
                  </form>
                  <form action={setProviderAccountStatusAction}>
                    <input
                      type="hidden"
                      name="providerAccountId"
                      value={account.id}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={account.status === "active" ? "paused" : "active"}
                    />
                    <SubmitButton
                      pendingLabel="Updating..."
                      className="rounded border border-line px-3 py-2 text-sm hover:bg-panel"
                    >
                      {account.status === "active" ? "Pause" : "Activate"}
                    </SubmitButton>
                  </form>
                  <form action={deleteProviderAccountAction}>
                    <input
                      type="hidden"
                      name="providerAccountId"
                      value={account.id}
                    />
                    <SubmitButton
                      pendingLabel="Deleting..."
                      className="rounded border border-red-200 px-3 py-2 text-sm text-danger hover:bg-red-50"
                    >
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <div className="rounded border border-line p-3">
                  <div className="text-xs text-muted">Emails sent today</div>
                  <div className="mt-1 font-medium">
                    {today} / {account.dailySendLimit}
                  </div>
                </div>
                <div className="rounded border border-line p-3">
                  <div className="text-xs text-muted">
                    Emails sent this month
                  </div>
                  <div className="mt-1 font-medium">
                    {month} / {account.monthlySendLimit}
                  </div>
                </div>
                <div className="rounded border border-line p-3">
                  <div className="text-xs text-muted">Last key test</div>
                  <div className="mt-1 font-medium">
                    {account.lastCheckedAt
                      ? account.lastCheckedAt.toLocaleString()
                      : "never"}
                  </div>
                </div>
                <div className="rounded border border-line p-3">
                  <div className="text-xs text-muted">Last used</div>
                  <div className="mt-1 font-medium">
                    {account.lastUsedAt?.toISOString() ?? "never"}
                  </div>
                </div>
              </div>

              {account.lastError ? (
                <p className="mt-3 rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-danger">
                  {account.lastError}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-muted">
                Lower priority numbers are used first. Leave replacement secret
                fields empty to keep the current values.
              </p>

              <form
                action={updateProviderAccountAction}
                autoComplete="off"
                className="mt-4 grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_100px_120px_130px_auto]"
              >
                <input
                  type="hidden"
                  name="providerAccountId"
                  value={account.id}
                />
                <label className={fieldClass}>
                  <span className={labelClass}>Key name</span>
                  <input
                    name="name"
                    required
                    defaultValue={account.name}
                    placeholder="Production"
                    autoComplete="off"
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Replace API key</span>
                  <input
                    name="apiKey"
                    type="password"
                    placeholder="Leave empty to keep current"
                    autoComplete="new-password"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Replace webhook secret</span>
                  <input
                    name="webhookSecret"
                    type="password"
                    placeholder="Leave empty to keep current"
                    autoComplete="new-password"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>
                    Priority{" "}
                    <span
                      title="Lower number sends first."
                      className="cursor-help"
                    >
                      (?)
                    </span>
                  </span>
                  <input
                    name="routingOrder"
                    type="number"
                    min="0"
                    defaultValue={account.routingOrder}
                    autoComplete="off"
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Daily limit</span>
                  <input
                    name="dailySendLimit"
                    type="number"
                    min="1"
                    required
                    defaultValue={account.dailySendLimit}
                    className={inputClass}
                  />
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>Monthly limit</span>
                  <input
                    name="monthlySendLimit"
                    type="number"
                    min="1"
                    required
                    defaultValue={account.monthlySendLimit}
                    className={inputClass}
                  />
                </label>
                <div className="flex items-end">
                  <SubmitButton pendingLabel="Saving...">
                    Save changes
                  </SubmitButton>
                </div>
              </form>
            </section>
          );
        })}
        {accounts.length === 0 ? (
          <section className="rounded border border-line bg-white p-5 text-sm text-muted">
            No provider accounts yet. Environment variables can still be used as
            a fallback.
          </section>
        ) : null}
      </div>
    </>
  );
}
