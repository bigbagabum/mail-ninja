import { createCampaignAction } from "../actions";
import { requireAdmin } from "@/server/auth/session";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui";

export default async function NewCampaignPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="New Campaign" />
      <form
        action={createCampaignAction}
        className="grid max-w-2xl gap-4 rounded border border-line bg-white p-5"
      >
        <label className="text-sm font-medium">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Campaign key
          <input
            name="campaignKey"
            placeholder="newsletter-2026-07"
            maxLength={120}
            className="mt-1 w-full rounded border-line"
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Stable unique slug used for retries, analytics, and Resend resource
            names. Spaces, underscores, and uppercase letters are converted
            automatically.
          </span>
        </label>
        <label className="text-sm font-medium">
          Description
          <textarea
            name="description"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Type
          <select
            name="campaignType"
            className="mt-1 w-full rounded border-line"
          >
            <option value="newsletter">Newsletter</option>
            <option value="marketing">Marketing</option>
            <option value="announcement">Announcement</option>
            <option value="service_update">Service update</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Default locale
          <input
            name="defaultLocale"
            defaultValue="en"
            required
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          From name
          <input
            name="fromName"
            defaultValue={env.DEFAULT_FROM_NAME}
            required
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          From email
          <input
            name="fromEmail"
            type="email"
            defaultValue={env.DEFAULT_FROM_EMAIL}
            required
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Reply-to
          <input
            name="replyTo"
            type="email"
            defaultValue={env.DEFAULT_REPLY_TO}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Create campaign
        </button>
      </form>
    </>
  );
}
