function dbErrorMessage(error: unknown) {
  return error instanceof Error
    ? `${error.message} ${String(error.cause ?? "")}`
    : String(error);
}

export function isMissingTableError(error: unknown, tableNames: string[]) {
  const message = dbErrorMessage(error);
  return (
    message.includes("42P01") ||
    tableNames.some((tableName) => message.includes(tableName))
  );
}

function isMissingColumnError(error: unknown, columnNames: string[]) {
  const message = dbErrorMessage(error);
  return (
    message.includes("42703") ||
    columnNames.some((columnName) => message.includes(columnName))
  );
}

export function isMissingEmailTemplatesSchemaError(error: unknown) {
  return (
    isMissingTableError(error, ["email_templates"]) ||
    isMissingColumnError(error, ["deleted_at", '"deleted_at"'])
  );
}

export function isMissingRecipientTagTableError(error: unknown) {
  return isMissingTableError(error, [
    "recipient_tags",
    "recipient_tag_assignments",
  ]);
}
