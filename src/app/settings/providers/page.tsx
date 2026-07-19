import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { providerAccounts } from "@/db/schema";
import { CopyButton } from "@/components/copy-button";
import { Badge, PageHeader } from "@/components/ui";
import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/session";
import {
  createProviderAccountAction,
  deleteProviderAccountAction,
  setProviderAccountStatusAction,
  testProviderAccountAction,
} from "./actions";

export default async function ProviderAccountsPage() {
  const admin = await requireAdmin();
  const webhookEndpoint = `${env.APP_BASE_URL.replace(/\/$/, "")}/api/webhooks/resend`;
  const accounts = await db.query.providerAccounts.findMany({
    where: eq(providerAccounts.workspaceId, admin.workspaceId),
    orderBy: (table, { asc }) => [
      asc(table.provider),
      asc(table.routingOrder),
      asc(table.name),
    ],
  });

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
          The value is built from APP_BASE_URL plus /api/webhooks/resend.
        </p>
      </section>
      <section className="rounded border border-line bg-white p-5">
        <h2 className="font-semibold">Add API Key</h2>
        <p className="mt-1 text-sm text-muted">
          API keys are encrypted before storage and validated immediately after
          saving. Existing keys are never shown back in the browser.
        </p>
        <form
          action={createProviderAccountAction}
          autoComplete="off"
          className="mt-4 grid gap-3 lg:grid-cols-[140px_1fr_1fr_1fr_120px_auto]"
        >
          <select
            name="provider"
            defaultValue="resend"
            className="rounded border-line text-sm"
          >
            <option value="resend">Resend</option>
            <option value="custom">Other service</option>
          </select>
          <input
            name="name"
            required
            placeholder="Key label, e.g. Production"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            className="rounded border-line text-sm"
          />
          <input
            name="apiKey"
            required
            type="password"
            placeholder="Resend API key"
            autoComplete="new-password"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            className="rounded border-line text-sm"
          />
          <input
            name="webhookSecret"
            type="password"
            placeholder="Webhook secret optional"
            autoComplete="new-password"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            className="rounded border-line text-sm"
          />
          <input
            name="routingOrder"
            type="number"
            min="0"
            defaultValue="100"
            autoComplete="off"
            className="rounded border-line text-sm"
          />
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            Save key
          </button>
        </form>
      </section>

      <div className="mt-6 overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Provider</th>
              <th>Name</th>
              <th>Key</th>
              <th>Status</th>
              <th>Last check</th>
              <th>Order</th>
              <th>Usage</th>
              <th>Last used</th>
              <th>Last error</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-line">
                <td className="p-3">{account.provider}</td>
                <td className="font-medium">{account.name}</td>
                <td>{account.apiKeyHint}</td>
                <td>
                  {account.status === "active" ? (
                    <Badge tone="good">active</Badge>
                  ) : account.status === "failed" ? (
                    <Badge tone="bad">failed</Badge>
                  ) : (
                    <Badge tone="warn">paused</Badge>
                  )}
                </td>
                <td>
                  {account.lastCheckedAt
                    ? account.lastCheckedAt.toLocaleString()
                    : "never"}
                </td>
                <td>{account.routingOrder}</td>
                <td>{account.usageCount}</td>
                <td>{account.lastUsedAt?.toISOString() ?? "never"}</td>
                <td className="max-w-xs truncate text-danger">
                  {account.lastError}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <form action={testProviderAccountAction}>
                      <input
                        type="hidden"
                        name="providerAccountId"
                        value={account.id}
                      />
                      <button className="rounded border border-line px-2 py-1 text-sm hover:bg-panel">
                        Re-test
                      </button>
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
                        value={
                          account.status === "active" ? "paused" : "active"
                        }
                      />
                      <button className="rounded border border-line px-2 py-1 text-sm hover:bg-panel">
                        {account.status === "active" ? "Pause" : "Activate"}
                      </button>
                    </form>
                    <form action={deleteProviderAccountAction}>
                      <input
                        type="hidden"
                        name="providerAccountId"
                        value={account.id}
                      />
                      <button className="rounded border border-red-200 px-2 py-1 text-sm text-danger hover:bg-red-50">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-3 text-muted">
                  No provider accounts yet. Environment variables can still be
                  used as a fallback.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
