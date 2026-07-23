import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  audienceSegmentMembers,
  audienceSegments,
  recipients,
} from "@/db/schema";
import { AudienceNav } from "@/components/audience-nav";
import { Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/server/auth/session";
import {
  loadSegmentRecipients,
  parseSegmentRules,
} from "@/server/campaigns/recipient-filters";
import {
  addFilteredRecipientsToSegmentAction,
  addSelectedRecipientsToSegmentAction,
  removeRecipientFromSegmentAction,
} from "../actions";

export default async function SegmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const segment = await db.query.audienceSegments.findFirst({
    where: and(
      eq(audienceSegments.workspaceId, admin.workspaceId),
      eq(audienceSegments.id, id),
    ),
  });
  if (!segment) return <PageHeader title="Segment not found" />;
  const segmentRecipients = await loadSegmentRecipients(
    admin.workspaceId,
    segment,
  );
  const memberIds = new Set(segmentRecipients.map((recipient) => recipient.id));
  const availableRecipients =
    segment.segmentType === "manual"
      ? await db.query.recipients.findMany({
          where:
            memberIds.size > 0
              ? and(
                  eq(recipients.workspaceId, admin.workspaceId),
                  notInArray(recipients.id, [...memberIds]),
                )
              : eq(recipients.workspaceId, admin.workspaceId),
          limit: 100,
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        })
      : [];
  const dynamicSegments =
    segment.segmentType === "manual"
      ? await db.query.audienceSegments.findMany({
          where: and(
            eq(audienceSegments.workspaceId, admin.workspaceId),
            eq(audienceSegments.segmentType, "dynamic"),
          ),
          orderBy: (table, { asc }) => [asc(table.name)],
        })
      : [];
  const rules = parseSegmentRules(segment.rules);
  return (
    <>
      <PageHeader
        title={segment.name}
        action={<Badge>{segment.segmentType}</Badge>}
      />
      <AudienceNav />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Recipients</div>
          <div className="mt-2 text-2xl font-semibold">
            {segmentRecipients.length}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Match mode</div>
          <div className="mt-2 font-medium">
            {segment.segmentType === "dynamic"
              ? segment.tagMatchMode
              : "manual"}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Rules</div>
          <div className="mt-2 text-sm">
            {segment.segmentType === "dynamic"
              ? rules.tagSlugs.join(", ") || "No tags"
              : "Selected contacts"}
          </div>
        </div>
      </section>
      {segment.segmentType === "manual" ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            action={addSelectedRecipientsToSegmentAction}
            className="rounded border border-line bg-white p-4"
          >
            <input type="hidden" name="segmentId" value={segment.id} />
            <h2 className="font-semibold">Add contacts manually</h2>
            <div className="mt-3 max-h-96 overflow-auto rounded border border-line">
              {availableRecipients.map((recipient) => (
                <label
                  key={recipient.id}
                  className="flex items-center gap-3 border-t border-line px-3 py-2 text-sm first:border-t-0"
                >
                  <input
                    name="recipientIds"
                    value={recipient.id}
                    type="checkbox"
                    className="rounded border-line"
                  />
                  <span>{recipient.email}</span>
                </label>
              ))}
              {availableRecipients.length === 0 ? (
                <p className="p-3 text-sm text-muted">
                  No available recipients to add.
                </p>
              ) : null}
            </div>
            <SubmitButton
              pendingLabel="Adding..."
              className="mt-3 rounded bg-accent px-3 py-2 text-sm font-medium text-white"
            >
              Add selected
            </SubmitButton>
          </form>
          <form
            action={addFilteredRecipientsToSegmentAction}
            className="rounded border border-line bg-white p-4"
          >
            <input type="hidden" name="segmentId" value={segment.id} />
            <h2 className="font-semibold">Add all from dynamic segment</h2>
            <select
              name="sourceSegmentId"
              required
              className="mt-3 w-full rounded border-line text-sm"
            >
              <option value="">Choose source segment</option>
              {dynamicSegments.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            <SubmitButton
              pendingLabel="Adding..."
              className="mt-3 rounded border border-line px-3 py-2 text-sm font-medium hover:bg-bg"
            >
              Add all filtered results
            </SubmitButton>
          </form>
        </section>
      ) : null}
      <section className="mt-6 overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Email</th>
              <th>Name</th>
              <th>Locale</th>
              <th>Consent</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {segmentRecipients.map((recipient) => (
              <tr key={recipient.id} className="border-t border-line">
                <td className="p-3">{recipient.email}</td>
                <td>
                  {[recipient.firstName, recipient.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </td>
                <td>{recipient.locale}</td>
                <td>{recipient.marketingConsent ? "yes" : "no"}</td>
                <td className="p-3 text-right">
                  {segment.segmentType === "manual" ? (
                    <form action={removeRecipientFromSegmentAction}>
                      <input
                        type="hidden"
                        name="segmentId"
                        value={segment.id}
                      />
                      <input
                        type="hidden"
                        name="recipientId"
                        value={recipient.id}
                      />
                      <button className="rounded border border-line px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
