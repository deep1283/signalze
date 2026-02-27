# Mention Tracker Worker (Railway)

This worker polls Reddit, Hacker News, and optionally Dev.to for active tracking queries, deduplicates mentions, and sends Slack webhook alerts.

## Why Python on Railway?
Python is a good fit for this workload because polling, normalization, retries, and outbound webhook delivery are straightforward and reliable with small operational overhead.

## Runtime model
- Deploy this folder as a Railway service.
- Run it as a **Cron job every 10-15 minutes**.
- Command: `python main.py`

## Required database schema
Apply [`/Users/deepmishra/vscode/signalze/supabase/schema.sql`](/Users/deepmishra/vscode/signalze/supabase/schema.sql) first.

The schema includes:
- Plan limits (`starter_9`, `growth_15`)
- Brand and keyword tracking tables
- Mention dedup (`mentions` unique by `(platform, external_id)`)
- Alert dedup (`alert_deliveries` unique by `(user_id, mention_id, keyword_id, channel)`)
- Polling state (`keyword_source_state`)
- Worker run logs (`worker_runs`)

## Plan limits implemented
- `starter_9`: max **1 active brand**, max **7 active user keywords**
- `growth_15`: max **multiple brands** (unbounded in schema), max **35 active user keywords**

Brand names are tracked automatically via system keywords, and system keywords do not consume the user keyword quota.

## Environment variables
Copy [`/Users/deepmishra/vscode/signalze/worker/.env.example`](/Users/deepmishra/vscode/signalze/worker/.env.example) and set values in Railway.

Minimum required:
- `DATABASE_URL`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET` (if Reddit source is enabled)

## Local run
```bash
cd /Users/deepmishra/vscode/signalze/worker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Notes
- Use Supabase service-level DB credentials for `DATABASE_URL`.
- `slack_webhook_url_enc` is treated as raw webhook URL by this scaffold. If you store encrypted values, decrypt before sending or add a decryption layer in worker code.
- Dev.to support is best-effort because full public query search is limited in their API.
