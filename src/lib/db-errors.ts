export function isMissingTableError(error: unknown, tableNames: string[]) {
  const text =
    error instanceof Error
      ? `${error.message} ${String(error.cause ?? "")}`
      : String(error);
  return (
    text.includes("42P01") ||
    tableNames.some((tableName) => text.includes(tableName))
  );
}

export function isMissingRecipientTagTableError(error: unknown) {
  return isMissingTableError(error, [
    "recipient_tags",
    "recipient_tag_assignments",
  ]);
}
