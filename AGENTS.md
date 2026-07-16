# Agent Working Rules

## Grill Me Mode

Before writing code, ask clarifying questions when a request affects:

- database schema or migrations;
- security, authentication, secrets, provider keys, or webhooks;
- campaign sending safety, idempotency, retries, or suppressions;
- user-facing workflows or navigation;
- analytics definitions or reporting dimensions;
- import/export formats or source-system assumptions;
- production deployment behavior.

Prefer 3-7 direct questions for ambiguous product work. Start implementation only after the decision space is clear, unless the user explicitly asks for an immediate small fix.

For obvious bugs, reproduce or inspect first, explain the cause, then patch.

Keep questions practical:

- What behavior should the user see?
- What data needs to be stored?
- What should happen on retries or duplicates?
- Is this optional, default-on, or admin-configured?
- Does this need migration/backfill?
- How will we verify it?
