import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recipientTagAssignments, recipientTags } from "@/db/schema";
import { tagColorClasses, TAG_COLORS } from "@/lib/tags";
import { requireAdmin } from "@/server/auth/session";
import { EmptyState, PageHeader } from "@/components/ui";
import { createRecipientTagAction, deleteRecipientTagAction } from "./actions";

export default async function RecipientTagsPage() {
  const admin = await requireAdmin();
  const tags = await db
    .select({
      id: recipientTags.id,
      name: recipientTags.name,
      slug: recipientTags.slug,
      color: recipientTags.color,
      description: recipientTags.description,
      createdAt: recipientTags.createdAt,
      recipientCount: count(recipientTagAssignments.id),
    })
    .from(recipientTags)
    .leftJoin(
      recipientTagAssignments,
      eq(recipientTagAssignments.tagId, recipientTags.id),
    )
    .where(eq(recipientTags.workspaceId, admin.workspaceId))
    .groupBy(recipientTags.id)
    .orderBy(desc(recipientTags.createdAt));

  return (
    <>
      <PageHeader title="Recipient Tags" />
      <section className="rounded border border-line bg-white p-5">
        <h2 className="font-semibold">Create tag</h2>
        <p className="mt-1 text-sm text-muted">
          Tags are reusable recipient labels for segmentation, prioritization
          and campaign filters.
        </p>
        <form
          action={createRecipientTagAction}
          className="mt-4 grid gap-3 md:grid-cols-[minmax(180px,1fr)_150px_minmax(220px,1.5fr)_auto]"
        >
          <label className="text-sm font-medium">
            Name
            <input
              name="name"
              required
              placeholder="High intent"
              className="mt-1 w-full rounded border-line text-sm"
            />
          </label>
          <label className="text-sm font-medium">
            Color
            <select
              name="color"
              defaultValue="teal"
              className="mt-1 w-full rounded border-line text-sm"
            >
              {TAG_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Description
            <input
              name="description"
              placeholder="Optional internal note"
              className="mt-1 w-full rounded border-line text-sm"
            />
          </label>
          <button className="self-end rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            Save tag
          </button>
        </form>
      </section>

      <section className="mt-6">
        {tags.length === 0 ? (
          <EmptyState
            title="No tags yet"
            detail="Create tags such as beta users, founders, paid customers or high intent leads, then assign them to recipients."
          />
        ) : (
          <div className="overflow-hidden rounded border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="p-3">Tag</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Recipients</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-t border-line">
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tagColorClasses(tag.color)}`}
                      >
                        {tag.name}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-muted">{tag.slug}</td>
                    <td className="max-w-md text-muted">
                      {tag.description || "No description"}
                    </td>
                    <td>{tag.recipientCount}</td>
                    <td className="p-3 text-right">
                      <form action={deleteRecipientTagAction}>
                        <input type="hidden" name="tagId" value={tag.id} />
                        <button className="rounded border border-line px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
