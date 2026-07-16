# Webhooks

`POST /api/webhooks/resend` verifies raw body signatures with the Resend SDK and `svix-*` headers, stores immutable raw events, deduplicates by provider event id, and queues processing.
