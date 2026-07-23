"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { updateCampaignAudienceAction } from "@/app/campaigns/actions";

type AudienceMode = "all" | "segment" | "manual";

type SegmentOption = {
  id: string;
  name: string;
  segmentType: string;
};

type RecipientOption = {
  id: string;
  email: string;
  name: string;
};

export function CampaignAudienceForm({
  campaignId,
  initialMode,
  initialSegmentId,
  initialManualRecipientIds,
  segments,
  recipients,
  selectedCount,
  summary,
}: {
  campaignId: string;
  initialMode: AudienceMode;
  initialSegmentId: string;
  initialManualRecipientIds: string[];
  segments: SegmentOption[];
  recipients: RecipientOption[];
  selectedCount: number;
  summary: string;
}) {
  const [mode, setMode] = useState<AudienceMode>(initialMode);
  const [segmentId, setSegmentId] = useState(initialSegmentId);
  const [manualRecipientIds, setManualRecipientIds] = useState(
    new Set(initialManualRecipientIds),
  );
  const manualCount = manualRecipientIds.size;
  const validationMessage = useMemo(() => {
    if (mode === "segment" && !segmentId) return "Choose a segment first.";
    if (mode === "manual" && manualCount === 0)
      return "Select at least one recipient.";
    return null;
  }, [manualCount, mode, segmentId]);
  const modeClass = (target: AudienceMode) =>
    mode === target
      ? "border-emerald-300 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200"
      : "border-line bg-white";

  return (
    <form
      action={updateCampaignAudienceAction}
      className="mt-6 rounded border border-line bg-white p-5"
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Audience selection</h2>
          <p className="mt-1 text-sm text-muted">Current: {summary}</p>
        </div>
        <Badge tone={selectedCount > 0 ? "good" : "warn"}>
          {selectedCount} selected
        </Badge>
      </div>
      <fieldset className="mt-4 grid gap-3 md:grid-cols-3">
        {(["all", "segment", "manual"] as const).map((target) => (
          <label
            key={target}
            className={`rounded border p-3 text-sm ${modeClass(target)}`}
          >
            <input
              className="mr-2"
              name="audienceMode"
              type="radio"
              value={target}
              checked={mode === target}
              onChange={() => setMode(target)}
            />
            {target === "all"
              ? "All recipients"
              : target === "segment"
                ? "Saved segment"
                : "Manual selection"}
            {mode === target ? <Badge tone="good">selected</Badge> : null}
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block text-sm font-medium">
        Segment
        <select
          name="segmentId"
          value={segmentId}
          onChange={(event) => setSegmentId(event.target.value)}
          className="mt-1 w-full rounded border-line"
        >
          <option value="">Choose segment</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>
              {segment.name} ({segment.segmentType})
              {segment.id === initialSegmentId ? " - selected" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 rounded border border-line">
        <div className="border-b border-line bg-panel px-3 py-2 text-sm font-medium">
          Manual recipients
        </div>
        <div className="max-h-80 overflow-auto">
          {recipients.map((recipient) => (
            <label
              key={recipient.id}
              className="flex items-center gap-3 border-t border-line px-3 py-2 text-sm first:border-t-0"
            >
              <input
                name="manualRecipientIds"
                type="checkbox"
                value={recipient.id}
                checked={manualRecipientIds.has(recipient.id)}
                onChange={(event) => {
                  const next = new Set(manualRecipientIds);
                  if (event.target.checked) next.add(recipient.id);
                  else next.delete(recipient.id);
                  setManualRecipientIds(next);
                }}
                className="rounded border-line"
              />
              <span className="font-medium">{recipient.email}</span>
              <span className="text-muted">{recipient.name}</span>
            </label>
          ))}
          {recipients.length === 0 ? (
            <p className="p-3 text-sm text-muted">No recipients yet.</p>
          ) : null}
        </div>
      </div>
      {validationMessage ? (
        <p className="mt-3 text-sm text-amber-800">{validationMessage}</p>
      ) : null}
      <button
        disabled={Boolean(validationMessage)}
        className="mt-4 rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Save audience
      </button>
    </form>
  );
}
