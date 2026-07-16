# Security

Authentication is local admin-only. Passwords use Argon2id. Session cookies are HttpOnly, SameSite Strict, secure in production, and only token hashes are stored. Provider secrets are never exposed to the browser.
