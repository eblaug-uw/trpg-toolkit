#!/usr/bin/env bash
#
# cicd.sh — hand-built CI/CD pipeline for trpg-toolkit
# Mirrors .github/workflows/cd.yml stage-for-stage, runnable from your laptop.
#
# Usage:
#   ./cicd.sh                          # full pipeline (deploy via remote workflow)
#   ./cicd.sh --skip-deploy            # stop after package + verify locally
#   ./cicd.sh --stage test             # run a single stage
#   PUSH_IMAGE=1 GHCR_PAT=xxx ./cicd.sh  # also push Docker image to ghcr.io

set -euo pipefail
IFS=$'\n\t'

REPO_OWNER="eblaug-uw"
REPO_NAME="trpg-toolkit"
DEFAULT_BRANCH="main"
REGISTRY="ghcr.io"
IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}"
PAGES_URL="https://${REPO_OWNER}.github.io/${REPO_NAME}/"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
say()  { printf "${CYAN}==>${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}OK${NC}  %s\n" "$*"; }
warn() { printf "${YELLOW}!!${NC}  %s\n" "$*"; }
die()  { printf "${RED}xx${NC}  %s\n" "$*" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

SKIP_DEPLOY=0
ONLY_STAGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-deploy) SKIP_DEPLOY=1; shift ;;
    --stage)       ONLY_STAGE="${2:-}"; shift 2 ;;
    -h|--help)     sed -n '2,15p' "$0"; exit 0 ;;
    *)             die "unknown arg: $1" ;;
  esac
done

run_stage() {
  local name="$1"; shift
  if [[ -n "$ONLY_STAGE" && "$ONLY_STAGE" != "$name" ]]; then
    return 0
  fi
  say "Stage: $name"
  "$@"
  ok "Stage: $name"
}

stage_pull() {
  git remote get-url origin >/dev/null || die "not in a git repo"
  git fetch origin "$DEFAULT_BRANCH"
  git checkout "$DEFAULT_BRANCH"
  git pull --ff-only origin "$DEFAULT_BRANCH"
}

stage_analyze() {
  pushd frontend >/dev/null
  npm ci
  npm run format:check
  npm run lint
  npx tsc --noEmit
  npm run audit:ci
  popd >/dev/null
}

stage_test() {
  pushd frontend >/dev/null
  npm run test:unit
  npm run test:integration
  popd >/dev/null
}

stage_package() {
  pushd frontend >/dev/null
  # Vite build using Pages base path (matches the workflow exactly)
  npm run build -- --base="/${REPO_NAME}/"
  # Docker image (container serves at /)
  command -v docker >/dev/null || die "docker not installed"
  local sha; sha="$(git rev-parse HEAD)"
  docker buildx build \
    --tag "${IMAGE}:latest" \
    --tag "${IMAGE}:${sha}" \
    --load \
    .
  if [[ "${PUSH_IMAGE:-0}" == "1" ]]; then
    [[ -n "${GHCR_PAT:-}" ]] || die "PUSH_IMAGE=1 set but GHCR_PAT is empty"
    echo "${GHCR_PAT}" | docker login "${REGISTRY}" -u "${REPO_OWNER}" --password-stdin
    docker push "${IMAGE}:latest"
    docker push "${IMAGE}:${sha}"
  else
    warn "Skipping image push (set PUSH_IMAGE=1 GHCR_PAT=... to push)"
  fi
  popd >/dev/null
}

stage_deploy() {
  if [[ "$SKIP_DEPLOY" == "1" ]]; then
    warn "--skip-deploy set, not triggering remote deploy"
    return 0
  fi
  command -v gh >/dev/null || die "GitHub CLI 'gh' is required (or use --skip-deploy)"
  say "Triggering remote cd.yml on $DEFAULT_BRANCH..."
  gh workflow run cd.yml --ref "$DEFAULT_BRANCH"
  sleep 3
  local run_id
  run_id=$(gh run list --workflow=cd.yml --branch="$DEFAULT_BRANCH" --limit=1 --json databaseId -q '.[0].databaseId')
  gh run watch "$run_id" --exit-status
}

stage_verify() {
  pushd frontend >/dev/null
  DEPLOY_URL="$PAGES_URL" node scripts/smoke.mjs
  popd >/dev/null
}

run_stage pull     stage_pull
run_stage analyze  stage_analyze
run_stage test     stage_test
run_stage package  stage_package
run_stage deploy   stage_deploy
run_stage verify   stage_verify

ok "Pipeline complete. Live at: $PAGES_URL"