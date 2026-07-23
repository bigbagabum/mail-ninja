"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepareCampaignByIdAction } from "@/app/campaigns/actions";

export function PrepareCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">
        Preparation excludes active suppressions, resolves variants and locks
        the selected audience for this campaign.
      </p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await prepareCampaignByIdAction(campaignId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push(`/campaigns/${campaignId}/send`);
              router.refresh();
            } catch (caught) {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Campaign preparation failed.",
              );
            }
          });
        }}
        className="mt-3 rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Preparing..." : "Prepare campaign"}
      </button>
    </div>
  );
}
