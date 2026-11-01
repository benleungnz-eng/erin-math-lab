# Erin Math Lab production rules

- Work only in this independent Erin repository. Never access or modify Erica-NCEA-math-lab, its accounts, content, databases or records.
- Follow docs/PRODUCTION_HANDOFF.md. This is a new implementation, not the early Coze test application.
- Prioritize mathematical understanding: parameter-linked interactive guided steps, exact arithmetic, honest help/error accounting and optional transfer tasks.
- No backend, login, analytics, AI requests or uploading student data. All runtime assets must be local.
- Persist sessions/drafts/rewards/world atomically; reward idempotency and multi-tab safety are required.
- Use existing isolated checkout; no worktrees unless explicitly requested.
- Do not commit diagnostic PDFs or real student records. Missing transcription is unverified, not a license to infer ability.
- GitHub main is source authority; GitHub Actions tests/builds/deploys to GitHub Pages. Current user instructions supersede the historical Coze route. Do not claim remote push/deployment or physical iPad validation without evidence.
- Run meaningful engine and browser tests, including 5+3+2, guidance, backup, world, cache/update and supported viewports.
