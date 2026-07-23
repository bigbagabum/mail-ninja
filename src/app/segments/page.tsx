import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { audienceSegments, recipientTags } from "@/db/schema";
import { AudienceNav } from "@/components/audience-nav";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { tagColorClasses } from "@/lib/tags";
import { requireAdmin } from "@/server/auth/session";
import {
  loadSegmentRecipients,
  parseSegmentRules,
} from "@/server/campaigns/recipient-filters";
import { createSegmentAction } from "./actions";

export default async function SegmentsPage() {
  const admin = await requireAdmin();
  const [segments, tags] = await Promise.all([
    db.query.audienceSegments.findMany({
      where: eq(audienceSegments.workspaceId, admin.workspaceId),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
    }),
    db.query.recipientTags.findMany({
      where: eq(recipientTags.workspaceId, admin.workspaceId),
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
  ]);
  const counts = new Map<string, number>();
  for (const segment of segments) {
    counts.set(
      segment.id,
      (await loadSegmentRecipients(admin.workspaceId, segment)).length,
    );
  }
  return (
    <>
      <PageHeader title="Audience Segments" />
      <AudienceNav />
      <section className="rounded border border-line bg-white p-5">
        <h2 className="font-semibold">Create segment</h2>
        <form action={createSegmentAction} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <input
                name="name"
                required
                placeholder="React leads"
                className="mt-1 w-full rounded border-line"
              />
            </label>
            <label className="text-sm font-medium">
              Type
              <select
                name="segmentType"
                defaultValue="manual"
                className="mt-1 w-full rounded border-line"
              >
                <option value="manual">Manual</option>
                <option value="dynamic">Dynamic by tags</option>
              </select>
            </label>
          </div>
          <label className="text-sm font-medium">
            Description
            <input
              name="description"
              placeholder="Optional internal note"
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <fieldset className="rounded border border-line bg-panel p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Dynamic tag rules
            </legend>
            <div className="mb-3 flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  name="tagMatchMode"
                  type="radio"
                  value="any"
                  defaultChecked
                />{" "}
                Match any selected tag
              </label>
              <label className="inline-flex items-center gap-2">
                <input name="tagMatchMode" type="radio" value="all" /> Match all
                selected tags
              </label>
            </div>
            {tags.length === 0 ? (
              <p className="text-sm text-muted">
                Create tags first to use dynamic segments.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tagColorClasses(tag.color)}`}
                  >
                    <input
                      name="tagIds"
                      type="checkbox"
                      value={tag.id}
                      className="h-3.5 w-3.5 rounded border-line"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <SubmitButton
            pendingLabel="Saving segment..."
            className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white"
          >
            Save segment
          </SubmitButton>
        </form>
      </section>
      <section className="mt-6">
        {segments.length === 0 ? (
          <EmptyState
            title="No segments yet"
            detail="Create a manual or dynamic segment, then choose it from a campaign."
          />
        ) : (
          <div className="overflow-hidden rounded border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="p-3">Segment</th>
                  <th>Type</th>
                  <th>Rules</th>
                  <th>Recipients</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment) => {
                  const rules = parseSegmentRules(segment.rules);
                  return (
                    <tr key={segment.id} className="border-t border-line">
                      <td className="p-3">
                        <Link
                          href={`/segments/${segment.id}`}
                          className="font-medium hover:underline"
                        >
                          {segment.name}
                        </Link>
                      </td>
                      <td>
                        <Badge>{segment.segmentType}</Badge>
                      </td>
                      <td className="text-muted">
                        {segment.segmentType === "dynamic"
                          ? `${segment.tagMatchMode}: ${rules.tagSlugs.join(", ") || "no tags"}`
                          : "manual selection"}
                      </td>
                      <td>{counts.get(segment.id) ?? 0}</td>
                      <td>{segment.updatedAt.toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
