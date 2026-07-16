export const recipientImportColumns = [
  { name: "email", required: true, type: "string email", description: "Recipient email address. Required." },
  { name: "external_id", required: false, type: "string", description: "Stable ID from the source system." },
  { name: "first_name", required: false, type: "string", description: "Recipient first name." },
  { name: "last_name", required: false, type: "string", description: "Recipient last name." },
  { name: "locale", required: false, type: "string", description: "Locale such as en, de, en-US, de-DE." },
  { name: "role", required: false, type: "string", description: "Recipient role or segment label." },
  { name: "platform", required: false, type: "string", description: "Source platform such as web, ios, android." },
  { name: "email_verified", required: false, type: "boolean", description: "true/false, yes/no, 1/0." },
  { name: "marketing_consent", required: false, type: "boolean", description: "true/false, yes/no, 1/0." },
  { name: "last_active_at", required: false, type: "timestamp", description: "ISO timestamp or database timestamp." },
  { name: "attributes", required: false, type: "json/string", description: "Optional JSON object or source-specific notes." }
] as const;

export const recipientImportCsvHeader = recipientImportColumns.map((column) => column.name);

export const recipientImportSampleRows = [
  [
    "alex@example.com",
    "user_1001",
    "Alex",
    "Example",
    "en",
    "customer",
    "web",
    "true",
    "true",
    "2026-07-01T12:00:00Z",
    "{\"plan\":\"pro\",\"country\":\"DE\"}"
  ],
  [
    "maria@example.com",
    "user_1002",
    "Maria",
    "Example",
    "de",
    "lead",
    "ios",
    "true",
    "false",
    "2026-06-15T09:30:00Z",
    "{\"source\":\"newsletter\"}"
  ]
];

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildRecipientImportCsvTemplate() {
  return [recipientImportCsvHeader, ...recipientImportSampleRows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

export function buildRecipientImportStructureText() {
  const columns = recipientImportColumns
    .map((column) => `${column.name}${column.required ? " REQUIRED" : ""}: ${column.type} - ${column.description}`)
    .join("\n");
  const sql = `select
  email,
  id::text as external_id,
  first_name,
  last_name,
  locale,
  role,
  platform,
  email_verified,
  marketing_consent,
  last_active_at,
  '{}'::jsonb as attributes
from your_recipients_table
where email is not null;`;

  return `Mail Ninja recipient import structure

CSV columns:
${recipientImportCsvHeader.join(",")}

Field reference:
${columns}

Example SQL export:
${sql}`;
}
