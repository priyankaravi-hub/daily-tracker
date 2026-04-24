# Engineering Intelligence Dashboard — Design Spec
**Date:** 2026-04-24  
**Phase 1:** Code Coverage  
**Phase 2:** Multi-framework Test Results  
**Phase 3:** Bug Tracking (Jira)  
**Phase 4:** Progress Tracking (replacing Google Sheet)

---

## Problem

The team currently maintains three separate tools: a Jira dashboard for bugs, Allure for test results, and a Google Sheet for progress tracking. No single surface gives engineers or executives a complete picture. Jira's JQL is inaccessible to non-technical stakeholders. Coverage and test results from hardware switches, simulators, and emulators are siloed.

---

## Solution

A self-hosted web dashboard that ingests test and coverage results from CI pipelines (GitHub Actions and Jenkins), normalizes them into a single database, and presents them in a layered UI — an at-a-glance executive summary at the top, and full engineer-level drill-down below.

---

## Phase 1: Code Coverage

### Architecture

```
CI Run Completes (GitHub Actions or Jenkins)
  │
  ├── gcovr → coverage.xml  OR  lcov → coverage.info
  │
  └── POST /api/ingest
        { artifact, format, environment, topology, commit_sha, branch, ci_system }

FastAPI Ingest Endpoint
  ├── Validate payload
  ├── Store raw artifact (local filesystem or S3-compatible)
  ├── Enqueue parse job (Celery + Redis)
  └── Return 202 Accepted immediately

Celery Worker
  ├── Pull job from queue
  ├── Detect format → load parser plugin
  │     ├── lcov parser
  │     ├── gcovr / coverage.xml parser
  │     └── (extensible: add new parsers without touching core)
  ├── Normalize → write to PostgreSQL
  └── GitHub connector: post coverage % as PR status check
```

**Why async (Celery + Redis):** CI runs fire-and-forget. Parsing never blocks a pipeline. If a parse fails, the raw artifact is already stored and can be re-processed without re-running the test.

**Why store raw artifacts:** Parser logic will evolve. Keeping originals means we can re-parse historical data when schemas or parsers are updated.

### Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python / FastAPI |
| Job queue | Celery + Redis |
| Database | PostgreSQL |
| Frontend | React + Tailwind |
| Artifact store | Local filesystem (S3-compatible interface for future cloud migration) |
| CI integration | GitHub Actions reusable workflow + Jenkins shared library |

### Data Model

```sql
runs
  id, commit_sha, branch, environment (switch|simulator|emulator),
  topology (T0|T1-lag|null), ci_system (github_actions|jenkins),
  triggered_at, status,
  github_pr_number, github_pr_author, github_repo,
  github_workflow_run_id, github_check_run_id

coverage_reports
  id, run_id → runs, format (lcov|gcovr|coverage_xml|...),
  raw_artifact_path, parsed_at, total_lines, covered_lines, pct

coverage_files
  id, report_id → coverage_reports, file_path,
  total_lines, covered_lines, pct

coverage_lines
  id, file_id → coverage_files, line_number, hit_count
```

- `environment` + `topology` drive the split panels in the UI
- `coverage_lines` is only queried on drill-down, keeping summary views fast
- New environments or topologies appear automatically — no schema changes needed

### Plugin Registry

```
plugins/
  parsers/
    lcov.py          ← lcov .info files
    gcovr.py         ← gcovr coverage.xml
    coverage_xml.py  ← pytest coverage.xml
    gtest_xml.py     ← GTest JUnit XML (Phase 2)
    allure.py        ← Allure results (Phase 2)
  connectors/
    github.py        ← artifact pull, PR status checks
    jenkins.py       ← artifact fetch from Jenkins
```

Adding a new format = add one file under `parsers/`. No core changes.

### CI Integration

**GitHub Actions — 4 lines added to any pipeline:**
```yaml
- name: Upload coverage to dashboard
  uses: ./.github/actions/coverage-upload
  with:
    artifact: coverage.xml
    environment: switch
    topology: T0
    token: ${{ secrets.DASHBOARD_API_KEY }}
```

**Jenkins — shared library function:**
```groovy
uploadCoverage(
  artifact: 'coverage.xml',
  environment: 'switch',
  topology: 'T1-lag'
)
```

Authentication: API key per CI system, rotatable without code changes.

### Frontend Layout

```
┌─────────────────────────────────────────────────────┐
│  EXEC SUMMARY BAR (always visible)                  │
│  Overall: 74% ↑2%  │  Switch: 68%  Sim: 79%  Emu: 76% │
└─────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────┬───────────┐
│  SWITCHES            │  SIMULATOR       │  EMULATOR │
│  T0: 68% ↑1%         │  79% ↓0.5%       │  76% ↑3%  │
│  T1-lag: 71% ↓0.5%   │  [trend]         │  [trend]  │
│  [trend per topology]│                  │           │
└──────────────────────┴──────────────────┴───────────┘

┌─────────────────────────────────────────────────────┐
│  DRILL-DOWN (click any file to open)                │
│  src/network/packet_handler.cpp   68% covered       │
│                                                     │
│  42  ✓  if (packet.valid()) {                       │
│  43  ✓    process(packet);                          │
│  44  ✗    handle_error(packet);                     │
│  45  -  }                                           │
│  ✓ covered  ✗ missed  - not executable              │
└─────────────────────────────────────────────────────┘
```

- Exec summary bar: always visible, read-only, no login required
- Switch panel: grouped by topology (T0, T1-lag), expandable as new topologies are added
- Trend lines: last 14 builds, so regressions are immediately visible
- Drill-down: inline below panels, not a new page

---

## Phases 2–4 (Planned, Not Yet Designed)

### Phase 2: Multi-framework Test Results
- Ingest GTest XML, pytest XML/JSON, Allure results
- Display pass/fail/skip counts per run per environment
- Test history and flakiness tracking
- Same split environment panels as coverage

### Phase 3: Bug Tracking (Jira Integration)
- Click-to-filter interface for execs (no JQL required)
- Filters: assignee, date range, severity, component, topology
- Jira data pulled via REST API, cached in Postgres

### Phase 4: Progress Tracking
- Replaces the Google Sheet
- Milestone and sprint tracking
- Coverage + test pass rate trends over time as proxy for quality progress

---

## Open Questions (to resolve with pipeline owner)
- Where do GCov `.info` / `.gcov` files currently land after a switch run?
- Is there an existing artifact storage location in Jenkins we should pull from?
- Who owns the GitHub Actions workflows for switch/simulator/emulator runs?
