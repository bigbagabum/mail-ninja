import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients, campaigns, recipients } from "@/db/schema";
import { unsubscribeRecipient } from "./actions";

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [row] = await db
    .select({
      email: recipients.email,
      campaignName: campaigns.name,
      unsubscribedAt: campaignRecipients.unsubscribedAt,
    })
    .from(campaignRecipients)
    .innerJoin(recipients, eq(campaignRecipients.recipientId, recipients.id))
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(eq(campaignRecipients.id, id))
    .limit(1);

  if (!row || query.missing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <h1 className="text-2xl font-semibold">Unsubscribe link not found</h1>
        <p className="mt-3 text-sm text-muted">
          This unsubscribe link is no longer available. Contact the sender if
          you need help.
        </p>
      </main>
    );
  }

  const done = query.done || row.unsubscribedAt;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">
        {done ? "You are unsubscribed" : "Unsubscribe from this list"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {done
          ? `${row.email} will no longer receive this type of campaign.`
          : `Confirm that ${row.email} should stop receiving messages related to ${row.campaignName}.`}
      </p>
      {!done ? (
        <form action={unsubscribeRecipient.bind(null, id)} className="mt-6">
          <button
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            type="submit"
          >
            Unsubscribe
          </button>
        </form>
      ) : null}
    </main>
  );
}
