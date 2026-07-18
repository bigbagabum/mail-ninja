import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  recipients,
  recipientTagAssignments,
  recipientTags,
} from "@/db/schema";
import { tagColorClasses } from "@/lib/tags";
import { requireAdmin } from "@/server/auth/session";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { addRecipientAction } from "./actions";

function isMissingTagTableError(error: unknown) {
  const text =
    error instanceof Error ? `${error.message} ${error.cause}` : String(error);
  return (
    text.includes("42P01") ||
    text.includes("recipient_tags") ||
    text.includes("recipient_tag_assignments")
  );
}

export default async function RecipientsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.recipients.findMany({
    where: eq(recipients.workspaceId, admin.workspaceId),
    limit: 100,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  let tagTablesMissing = false;
  let tags: (typeof recipientTags.$inferSelect)[] = [];
  let assignments: Array<{
    recipientId: string;
    name: string;
    slug: string;
    color: string;
  }> = [];
  try {
    tags = await db.query.recipientTags.findMany({
      where: eq(recipientTags.workspaceId, admin.workspaceId),
      orderBy: (table, { asc }) => [asc(table.name)],
    });
    assignments = rows.length
      ? await db
          .select({
            recipientId: recipientTagAssignments.recipientId,
            name: recipientTags.name,
            slug: recipientTags.slug,
            color: recipientTags.color,
          })
          .from(recipientTagAssignments)
          .innerJoin(
            recipientTags,
            eq(recipientTagAssignments.tagId, recipientTags.id),
          )
          .where(
            and(
              eq(recipientTagAssignments.workspaceId, admin.workspaceId),
              inArray(
                recipientTagAssignments.recipientId,
                rows.map((row) => row.id),
              ),
            ),
          )
      : [];
  } catch (error) {
    if (!isMissingTagTableError(error)) throw error;
    tagTablesMissing = true;
  }
  const tagsByRecipient = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const current = tagsByRecipient.get(assignment.recipientId) ?? [];
    current.push(assignment);
    tagsByRecipient.set(assignment.recipientId, current);
  }
  return (
    <>
      <PageHeader
        title="Recipients"
        action={
          <>
            <ButtonLink href="/settings/tags">Edit tags</ButtonLink>
            <ButtonLink href="/imports/new">Import recipients</ButtonLink>
          </>
        }
      />
      {tagTablesMissing ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Recipient tags are not available because the database migration
          <code className="mx-1 rounded bg-white px-1">
            0005_recipient_tags.sql
          </code>
          has not been applied on this database yet. Recipients can still be
          viewed and added without tags.
        </div>
      ) : null}
      <form
        action={addRecipientAction}
        className="mb-6 grid gap-4 rounded border border-line bg-white p-4"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_140px_140px_120px_140px_auto]">
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="rounded border-line text-sm"
          />
          <input
            name="firstName"
            placeholder="First name"
            className="rounded border-line text-sm"
          />
          <input
            name="lastName"
            placeholder="Last name"
            className="rounded border-line text-sm"
          />
          <input
            name="locale"
            placeholder="en"
            className="rounded border-line text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="marketingConsent"
              value="true"
              className="rounded border-line"
            />
            Consent
          </label>
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            Add recipient
          </button>
        </div>
        <fieldset className="rounded border border-line bg-panel p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Tags
          </legend>
          {tags.length === 0 ? (
            <p className="text-sm text-muted">
              {tagTablesMissing ? (
                "Tags will appear here after the recipient tags migration is applied."
              ) : (
                <>
                  No tags yet.{" "}
                  <Link
                    href="/settings/tags"
                    className="text-accent hover:underline"
                  >
                    Create recipient tags
                  </Link>{" "}
                  to segment people like in Mailchimp.
                </>
              )}
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
      </form>
      {rows.length === 0 ? (
        <div className="grid gap-4">
          <EmptyState
            title="No recipients yet"
            detail="Recipients can be added manually here or imported in bulk through CSV uploads."
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/imports/new" className="text-accent hover:underline">
              Open import page
            </Link>
            <Link
              href="/api/imports/template"
              className="text-accent hover:underline"
            >
              Download CSV template
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Email</th>
                <th>Name</th>
                <th>Locale</th>
                <th>Tags</th>
                <th>Platform</th>
                <th>Priority</th>
                <th>Cohort</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((recipient) => {
                const recipientTags = tagsByRecipient.get(recipient.id) ?? [];
                return (
                  <tr key={recipient.id} className="border-t border-line">
                    <td className="p-3">
                      <Link
                        href={`/recipients/${recipient.id}`}
                        className="font-medium hover:underline"
                      >
                        {recipient.email}
                      </Link>
                    </td>
                    <td>
                      {[recipient.firstName, recipient.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    <td>{recipient.locale}</td>
                    <td>
                      {recipientTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {recipientTags.map((tag) => (
                            <span
                              key={tag.slug}
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tagColorClasses(tag.color)}`}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : recipient.role ? (
                        <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {recipient.role}
                        </span>
                      ) : (
                        <span className="text-muted">No tags</span>
                      )}
                    </td>
                    <td>{recipient.platform}</td>
                    <td>{recipient.priorityScore}</td>
                    <td>{recipient.priorityCohort}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
