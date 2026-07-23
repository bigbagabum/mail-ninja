import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { emailEvents, recipients, suppressions } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";
import { updateRecipientPriorityAction } from "./actions";

export default async function RecipientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const recipient = await db.query.recipients.findFirst({
    where: eq(recipients.id, id),
  });
  if (!recipient) return <PageHeader title="Recipient not found" />;
  const suppression = await db.query.suppressions.findFirst({
    where: eq(suppressions.normalizedEmail, recipient.normalizedEmail),
  });
  const events = await db.query.emailEvents.findMany({
    where: or(
      eq(emailEvents.recipientId, id),
      eq(emailEvents.email, recipient.email),
    ),
    limit: 50,
  });
  return (
    <>
      <PageHeader title={recipient.email} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-line bg-white p-4">
          <h2 className="font-medium">Profile</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm">
            {JSON.stringify(recipient, null, 2)}
          </pre>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <h2 className="font-medium">Suppression</h2>
          <div className="mt-3">
            {suppression ? (
              <Badge tone="warn">{suppression.reason}</Badge>
            ) : (
              <Badge tone="good">not suppressed</Badge>
            )}
          </div>
        </div>
      </div>
      <form
        action={updateRecipientPriorityAction}
        className="mt-6 grid max-w-xl gap-3 rounded border border-line bg-white p-4"
      >
        <input type="hidden" name="recipientId" value={recipient.id} />
        <h2 className="font-medium">Priority</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Score
            <input
              name="priorityScore"
              type="number"
              min="0"
              max="100"
              defaultValue={recipient.priorityScore}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Cohort
            <select
              name="priorityCohort"
              defaultValue={recipient.priorityCohort}
              className="mt-1 w-full rounded border-line"
            >
              <option value="high_intent">high_intent</option>
              <option value="engaged">engaged</option>
              <option value="standard">standard</option>
              <option value="low_confidence">low_confidence</option>
              <option value="manual_priority">manual_priority</option>
            </select>
          </label>
        </div>
        <label className="text-sm font-medium">
          Notes
          <textarea
            name="priorityNotes"
            defaultValue={recipient.priorityNotes ?? ""}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <p className="text-sm text-muted">
          Higher priority recipients are prepared first. Manual changes override
          import scoring.
        </p>
        <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Save priority
        </button>
      </form>
      <h2 className="mb-3 mt-6 font-medium">Event history</h2>
      <div className="rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-line">
                <td className="p-3">{event.eventType}</td>
                <td>{event.eventTimestamp.toISOString()}</td>
                <td>{event.clickedUrlNormalized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
