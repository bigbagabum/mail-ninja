# Architecture

Mail Ninja is a deployment-neutral web and worker application backed by PostgreSQL. It avoids Redis by using a durable jobs table with leases, retry backoff, stale lock recovery, and `FOR UPDATE SKIP LOCKED`.
