import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const importStatusEnum = pgEnum("import_status", [
  "uploaded",
  "analyzing",
  "awaiting_mapping",
  "ready",
  "importing",
  "completed",
  "failed",
  "cancelled",
]);
export const importRowStatusEnum = pgEnum("import_row_status", [
  "pending",
  "valid",
  "invalid",
  "duplicate_in_file",
  "duplicate_in_database",
  "suppressed",
  "imported",
  "skipped",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "preparing",
  "ready",
  "sending",
  "paused",
  "completed",
  "cancelled",
  "failed",
  "archived",
]);
export const campaignTypeEnum = pgEnum("campaign_type", [
  "service_update",
  "marketing",
  "newsletter",
  "announcement",
]);
export const waveStatusEnum = pgEnum("wave_status", [
  "draft",
  "ready",
  "sending",
  "paused",
  "completed",
  "cancelled",
  "failed",
]);
export const campaignRecipientStatusEnum = pgEnum("campaign_recipient_status", [
  "pending",
  "excluded",
  "prepared",
  "synced",
  "scheduled",
  "sent",
  "delivered",
  "delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "unsubscribed",
  "suppressed",
  "failed",
  "cancelled",
]);
export const eventProcessingStatusEnum = pgEnum("event_processing_status", [
  "received",
  "queued",
  "processed",
  "ignored",
  "failed",
]);
export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "delivery_delayed",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
  "suppressed",
  "unsubscribed",
  "unknown",
]);
export const suppressionReasonEnum = pgEnum("suppression_reason", [
  "manual",
  "unsubscribe",
  "hard_bounce",
  "soft_bounce_limit",
  "complaint",
  "provider_suppressed",
  "invalid_email",
  "deleted_recipient",
  "other",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "retrying",
  "completed",
  "failed",
  "cancelled",
]);
export const jobTypeEnum = pgEnum("job_type", [
  "analyze_import",
  "apply_import",
  "prepare_campaign",
  "sync_contacts",
  "create_provider_segment",
  "populate_provider_segment",
  "create_provider_broadcast",
  "send_provider_broadcast",
  "process_webhook_event",
  "recalculate_campaign_analytics",
  "cleanup_import_data",
]);

export const providerRoutingStrategyEnum = pgEnum("provider_routing_strategy", [
  "sequential",
  "parallel",
]);
export const providerMetricsModeEnum = pgEnum("provider_metrics_mode", [
  "combined",
  "by_provider_account",
]);
export const providerAccountStatusEnum = pgEnum("provider_account_status", [
  "active",
  "paused",
  "failed",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  defaultLocale: text("default_locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  ...timestamps,
});

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({ uniq: unique().on(table.workspaceId, table.normalizedEmail) }),
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: uuid("admin_user_id")
      .references(() => adminUsers.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    expiresIdx: index("admin_sessions_expires_idx").on(table.expiresAt),
  }),
);

export const workspaceSettings = pgTable("workspace_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  productName: text("product_name").notNull().default("Mail Ninja"),
  publicBaseUrl: text("public_base_url"),
  defaultFromName: text("default_from_name"),
  defaultFromEmail: text("default_from_email"),
  defaultReplyTo: text("default_reply_to"),
  defaultLocale: text("default_locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  provider: text("provider").notNull().default("resend"),
  providerRoutingStrategy: providerRoutingStrategyEnum(
    "provider_routing_strategy",
  )
    .notNull()
    .default("sequential"),
  providerMetricsMode: providerMetricsModeEnum("provider_metrics_mode")
    .notNull()
    .default("combined"),
  providerSettingsEncrypted: text("provider_settings_encrypted"),
  ...timestamps,
});

export const providerAccounts = pgTable(
  "provider_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull().default("resend"),
    name: text("name").notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    apiKeyHint: text("api_key_hint").notNull(),
    webhookSecretEncrypted: text("webhook_secret_encrypted"),
    status: providerAccountStatusEnum("status").notNull().default("active"),
    routingOrder: integer("routing_order").notNull().default(100),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    workspaceProviderIdx: index("provider_accounts_workspace_provider_idx").on(
      table.workspaceId,
      table.provider,
      table.status,
    ),
    uniqName: unique().on(table.workspaceId, table.provider, table.name),
  }),
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    locale: text("locale").notNull().default("en"),
    recipientRole: text("recipient_role").notNull().default("generic"),
    subject: text("subject").notNull(),
    previewText: text("preview_text"),
    htmlContent: text("html_content").notNull(),
    textContent: text("text_content"),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    workspaceIdx: index("email_templates_workspace_idx").on(table.workspaceId),
    uniqSlug: unique().on(table.workspaceId, table.slug),
  }),
);

export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    externalId: text("external_id"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    locale: text("locale"),
    role: text("role"),
    platform: text("platform"),
    emailVerified: boolean("email_verified"),
    marketingConsent: boolean("marketing_consent"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    priorityScore: integer("priority_score").notNull().default(0),
    priorityCohort: text("priority_cohort").notNull().default("standard"),
    prioritySource: text("priority_source").notNull().default("manual"),
    priorityNotes: text("priority_notes"),
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.workspaceId, table.normalizedEmail),
    workspaceIdx: index("recipients_workspace_idx").on(table.workspaceId),
    priorityIdx: index("recipients_priority_idx").on(
      table.workspaceId,
      table.priorityScore,
      table.id,
    ),
  }),
);

export const recipientTags = pgTable(
  "recipient_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("teal"),
    description: text("description"),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.workspaceId, table.slug),
    workspaceIdx: index("recipient_tags_workspace_idx").on(table.workspaceId),
  }),
);

export const recipientTagAssignments = pgTable(
  "recipient_tag_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    recipientId: uuid("recipient_id")
      .references(() => recipients.id, { onDelete: "cascade" })
      .notNull(),
    tagId: uuid("tag_id")
      .references(() => recipientTags.id, { onDelete: "cascade" })
      .notNull(),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniq: unique().on(table.recipientId, table.tagId),
    workspaceIdx: index("recipient_tag_assignments_workspace_idx").on(
      table.workspaceId,
    ),
    recipientIdx: index("recipient_tag_assignments_recipient_idx").on(
      table.recipientId,
    ),
  }),
);

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  originalFilename: text("original_filename").notNull(),
  storedFilename: text("stored_filename").notNull(),
  fileType: text("file_type").notNull().default("csv"),
  status: importStatusEnum("status").notNull().default("uploaded"),
  columnMapping: jsonb("column_mapping")
    .$type<Record<string, string>>()
    .default({})
    .notNull(),
  importOptions: jsonb("import_options")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  validRows: integer("valid_rows").notNull().default(0),
  invalidRows: integer("invalid_rows").notNull().default(0),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  suppressedRows: integer("suppressed_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdBy: uuid("created_by").references(() => adminUsers.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importId: uuid("import_id")
      .references(() => imports.id, { onDelete: "cascade" })
      .notNull(),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull(),
    normalizedData: jsonb("normalized_data")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    status: importRowStatusEnum("status").notNull().default("pending"),
    validationErrors: jsonb("validation_errors")
      .$type<string[]>()
      .default([])
      .notNull(),
    duplicateOfRecipientId: uuid("duplicate_of_recipient_id").references(
      () => recipients.id,
    ),
    recipientId: uuid("recipient_id").references(() => recipients.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqRow: unique().on(table.importId, table.rowNumber),
    importIdx: index("import_rows_import_idx").on(table.importId),
  }),
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    campaignKey: text("campaign_key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    campaignType: campaignTypeEnum("campaign_type").notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    defaultLocale: text("default_locale").notNull().default("en"),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email").notNull(),
    replyTo: text("reply_to"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.workspaceId, table.campaignKey),
    workspaceIdx: index("campaigns_workspace_idx").on(table.workspaceId),
  }),
);

export const campaignVariants = pgTable(
  "campaign_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    locale: text("locale").notNull(),
    recipientRole: text("recipient_role").notNull().default("generic"),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    previewText: text("preview_text"),
    htmlContent: text("html_content").notNull(),
    textContent: text("text_content"),
    isFallback: boolean("is_fallback").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.campaignId, table.locale, table.recipientRole),
  }),
);

export const campaignWaves = pgTable(
  "campaign_waves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    status: waveStatusEnum("status").notNull().default("draft"),
    recipientLimit: integer("recipient_limit"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({ uniq: unique().on(table.campaignId, table.position) }),
);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    recipientId: uuid("recipient_id")
      .references(() => recipients.id, { onDelete: "cascade" })
      .notNull(),
    variantId: uuid("variant_id").references(() => campaignVariants.id, {
      onDelete: "restrict",
    }),
    waveId: uuid("wave_id").references(() => campaignWaves.id, {
      onDelete: "set null",
    }),
    status: campaignRecipientStatusEnum("status").notNull().default("pending"),
    providerContactId: text("provider_contact_id"),
    providerMessageId: text("provider_message_id"),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveryDelayedAt: timestamp("delivery_delayed_at", { withTimezone: true }),
    firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    firstClickedAt: timestamp("first_clicked_at", { withTimezone: true }),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    complainedAt: timestamp("complained_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    suppressedAt: timestamp("suppressed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    openCount: integer("open_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    lastError: text("last_error"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.campaignId, table.recipientId),
    messageIdx: index("campaign_recipients_message_idx").on(
      table.providerMessageId,
    ),
  }),
);

export const providerSegments = pgTable("provider_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  campaignId: uuid("campaign_id")
    .references(() => campaigns.id, { onDelete: "cascade" })
    .notNull(),
  waveId: uuid("wave_id")
    .references(() => campaignWaves.id, { onDelete: "cascade" })
    .notNull(),
  variantId: uuid("variant_id")
    .references(() => campaignVariants.id, { onDelete: "cascade" })
    .notNull(),
  providerAccountId: uuid("provider_account_id").references(
    () => providerAccounts.id,
    { onDelete: "set null" },
  ),
  provider: text("provider").notNull(),
  providerSegmentId: text("provider_segment_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  recipientCount: integer("recipient_count").notNull().default(0),
  lastError: text("last_error"),
  ...timestamps,
});

export const providerBroadcasts = pgTable(
  "provider_broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    waveId: uuid("wave_id")
      .references(() => campaignWaves.id, { onDelete: "cascade" })
      .notNull(),
    variantId: uuid("variant_id")
      .references(() => campaignVariants.id, { onDelete: "cascade" })
      .notNull(),
    providerAccountId: uuid("provider_account_id").references(
      () => providerAccounts.id,
      { onDelete: "set null" },
    ),
    providerSegmentId: uuid("provider_segment_id").references(
      () => providerSegments.id,
      { onDelete: "restrict" },
    ),
    provider: text("provider").notNull(),
    providerBroadcastId: text("provider_broadcast_id"),
    status: text("status").notNull().default("pending"),
    recipientCount: integer("recipient_count").notNull().default(0),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastError: text("last_error"),
    providerMetadata: jsonb("provider_metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.campaignId, table.waveId, table.variantId),
  }),
);

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull(),
    providerAccountId: uuid("provider_account_id").references(
      () => providerAccounts.id,
      { onDelete: "set null" },
    ),
    providerEventId: text("provider_event_id").notNull(),
    providerMessageId: text("provider_message_id"),
    providerBroadcastId: text("provider_broadcast_id"),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    campaignRecipientId: uuid("campaign_recipient_id").references(
      () => campaignRecipients.id,
      { onDelete: "set null" },
    ),
    recipientId: uuid("recipient_id").references(() => recipients.id, {
      onDelete: "set null",
    }),
    eventType: emailEventTypeEnum("event_type").notNull(),
    eventTimestamp: timestamp("event_timestamp", {
      withTimezone: true,
    }).notNull(),
    email: text("email"),
    clickedUrl: text("clicked_url"),
    clickedUrlNormalized: text("clicked_url_normalized"),
    linkCategory: text("link_category"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    processingStatus: eventProcessingStatusEnum("processing_status")
      .notNull()
      .default("received"),
    processingError: text("processing_error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    uniq: unique().on(table.provider, table.providerEventId),
    messageIdx: index("email_events_message_idx").on(table.providerMessageId),
    campaignIdx: index("email_events_campaign_idx").on(table.campaignId),
    providerAccountIdx: index("email_events_provider_account_idx").on(
      table.providerAccountId,
    ),
  }),
);

export const suppressions = pgTable(
  "suppressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    reason: suppressionReasonEnum("reason").notNull(),
    source: text("source").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    emailEventId: uuid("email_event_id").references(() => emailEvents.id, {
      onDelete: "set null",
    }),
    isPermanent: boolean("is_permanent").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => adminUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    uniq: unique().on(table.workspaceId, table.normalizedEmail),
    activeIdx: index("suppressions_active_idx").on(
      table.workspaceId,
      table.normalizedEmail,
      table.expiresAt,
    ),
  }),
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    result: jsonb("result")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    priority: integer("priority").notNull().default(100),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAfter: timestamp("run_after", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    claimIdx: index("jobs_claim_idx").on(
      table.status,
      table.runAfter,
      table.priority,
    ),
  }),
);

export const campaignAnalytics = pgTable(
  "campaign_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .references(() => campaigns.id, { onDelete: "cascade" })
      .notNull(),
    waveId: uuid("wave_id").references(() => campaignWaves.id, {
      onDelete: "cascade",
    }),
    variantId: uuid("variant_id").references(() => campaignVariants.id, {
      onDelete: "cascade",
    }),
    dimensionType: text("dimension_type").notNull(),
    dimensionValue: text("dimension_value").notNull(),
    selectedCount: integer("selected_count").notNull().default(0),
    preparedCount: integer("prepared_count").notNull().default(0),
    sentCount: integer("sent_count").notNull().default(0),
    deliveredCount: integer("delivered_count").notNull().default(0),
    uniqueOpenedCount: integer("unique_opened_count").notNull().default(0),
    totalOpenCount: integer("total_open_count").notNull().default(0),
    uniqueClickedCount: integer("unique_clicked_count").notNull().default(0),
    totalClickCount: integer("total_click_count").notNull().default(0),
    delayedCount: integer("delayed_count").notNull().default(0),
    bouncedCount: integer("bounced_count").notNull().default(0),
    complainedCount: integer("complained_count").notNull().default(0),
    unsubscribedCount: integer("unsubscribed_count").notNull().default(0),
    suppressedCount: integer("suppressed_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniq: unique().on(
      table.campaignId,
      table.waveId,
      table.variantId,
      table.dimensionType,
      table.dimensionValue,
    ),
  }),
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  adminUserId: uuid("admin_user_id").references(() => adminUsers.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const nowSql = sql`now()`;
