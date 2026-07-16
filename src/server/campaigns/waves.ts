export type WaveConfig = { id: string; position: number; recipientLimit: number | null };

export function assignWave(recipientIndex: number, waves: WaveConfig[]) {
  let remainingIndex = recipientIndex;
  const ordered = [...waves].sort((a, b) => a.position - b.position);
  for (const wave of ordered) {
    if (wave.recipientLimit == null) return wave.id;
    if (remainingIndex < wave.recipientLimit) return wave.id;
    remainingIndex -= wave.recipientLimit;
  }
  return ordered.at(-1)?.id ?? null;
}
