import type { emailEvents } from "@/db/schema";

export function mapResendEventType(
  type: string,
): typeof emailEvents.$inferInsert.eventType {
  const normalized = type.replace("email.", "");
  if (normalized === "delivery_delayed") return "delivery_delayed";
  if (normalized === "opened") return "opened";
  if (normalized === "clicked") return "clicked";
  if (normalized === "bounced") return "bounced";
  if (normalized === "complained") return "complained";
  if (normalized === "delivered") return "delivered";
  if (normalized === "sent") return "sent";
  if (normalized === "failed") return "failed";
  if (normalized === "unsubscribed") return "unsubscribed";
  return "unknown";
}
