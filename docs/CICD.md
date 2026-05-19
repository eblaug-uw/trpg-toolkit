# CI/CD Pipeline — How to Run It

This repo ships a six-stage pipeline that takes the latest commit on `main` all
the way to https://eblaug-uw.github.io/trpg-toolkit/.

The same six stages exist in two places:

- **Canonical pipeline:** `.github/workflows/cd.yml` — fires on push to `main`.
- **Local mirror:** `cicd.sh` (repo root) — hand-built bash runner. Same six
  stages, same order, runnable from a laptop for debugging or live demo.

## The six stages

| # | Stage           | What it does                                                                | Where                |
|---|-----------------|-----------------------------------------------------------------------------|----------------------|
| 1 | Pull            | `actions/checkout@v4` of `main` (locally: `git pull --ff-only`)             | `cd.yml` / `cicd.sh` |
| 2 | Static analysis | Prettier `--check`, ESLint, `tsc --noEmit`, `audit-ci --high`               | `cd.yml` / `cicd.sh` |
| 3 | Tests           | `npm run test:unit` and `npm run test:integration` (Vitest)                 | `cd.yml` / `cicd.sh` |
| 4 | Package         | Vite build for Pages **and** multi-stage Docker image pushed to `ghcr.io`   | `cd.yml` / `cicd.sh` |
| 5 | Deploy          | Upload `frontend/dist/` to GitHub Pages via `actions/deploy-pages@v4`       | `cd.yml`             |
| 6 | Verify (smoke)  | `scripts/smoke.mjs` hits the live URL, asserts 200 + React root + assets   | `cd.yml` / `cicd.sh` |

## One-time GitHub setup

1. **Settings → Pages →** "Build and deployment" → source: **GitHub Actions**.
2. **Settings → Actions → General →** workflow permissions: **Read and write**.
3. That's it. `GITHUB_TOKEN` is auto-provisioned and handles both Pages and GHCR.

## Running in the cloud

Push to `main` (directly or via merged PR). The `CD` workflow starts on its
own. Each stage is a separate Actions job, so a failure has a one-word label
(e.g. "Stage 3 — Unit + Integration tests"). The deployed URL appears under
the `deploy` job's environment link on the run summary.

## Running locally

```bash
# from the repo root
./cicd.sh                       # full pipeline; deploy is triggered via `gh` on the remote
./cicd.sh --skip-deploy         # build + Docker image only
./cicd.sh --stage test          # run one stage in isolation
PUSH_IMAGE=1 GHCR_PAT=xxx ./cicd.sh   # also push Docker image to ghcr.io
```

Prereqs: Node 20, Docker with `buildx`, GitHub CLI `gh` (`gh auth login`).
Without `gh`, use `--skip-deploy`.

## The Docker image

```bash
docker pull ghcr.io/eblaug-uw/trpg-toolkit:latest
docker run --rm -p 8080:80 ghcr.io/eblaug-uw/trpg-toolkit:latest
# site:   http://localhost:8080
# health: curl http://localhost:8080/healthz   # → "ok"
```

`nginx:1.27-alpine` serving `dist/` with SPA history fallback
(`try_files $uri $uri/ /index.html`).

## The smoke test

`frontend/scripts/smoke.mjs` runs three checks against `DEPLOY_URL`:

1. `GET /` returns HTTP 200 (with retries for Pages propagation).
2. HTML contains `id="root"` — the React shell shipped.
3. The first `<script src="...js">` is reachable — asset paths are correct.

Any failure fails the `verify` job and the whole pipeline.

## Rubric mapping

| Rubric item                            | Pts | Lives in                                                   |
|----------------------------------------|-----|------------------------------------------------------------|
| Pull latest from `main`                | 2   | `cd.yml` checkout / `cicd.sh stage_pull`                   |
| Static + dynamic analysis              | 4   | `cd.yml` job `static-analysis` / `cicd.sh stage_analyze`   |
| Unit + Integration + Smoke tests       | 4   | `cd.yml` jobs `test` + `verify` / `cicd.sh stage_test` + `stage_verify` |
| Package into a deployable image        | 2   | `frontend/Dockerfile`, pushed in `cd.yml` job `package`    |
| Deploy to production                   | 4   | `cd.yml` job `deploy` (GitHub Pages)                       |
| Verify the deployment is reachable     | 2   | `frontend/scripts/smoke.mjs`, run by `verify` job          |

## Troubleshooting

- **"Pages site not enabled":** Settings → Pages → source: GitHub Actions, re-run.
- **Smoke test fails right after enabling Pages:** DNS propagation; re-run once.
- **Image push 403:** Settings → Actions → General → workflow permissions = Read and write.
- **Assets 404 on Pages:** confirm `--base="/trpg-toolkit/"` is being passed in the `package` job.