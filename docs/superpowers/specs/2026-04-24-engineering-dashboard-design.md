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
  id, run_id → runs, format (lcov|gcovr|coverage_xml|allure|...),
  raw_artifact_path, parsed_at, total_lines, covered_lines, pct

coverage_files
  id, report_id → coverage_reports, file_path,
  total_lines, covered_lines, pct

coverage_lines
  id, file_id → coverage_files, line_number, hit_count

test_results
  id, run_id → runs, suite (All|base|l2|l3|mgmt|qos|...),
  passed, failed, broken, skipped, total, pass_rate,
  source (allure|gtest|pytest), allure_launch_id
```

- `environment` + `topology` drive the split panels in the UI
- `suite` on `test_results` drives the suite sub-tabs (All, base, l2, l3, mgmt, qos)
- `coverage_lines` is only queried on drill-down, keeping summary views fast
- New environments, topologies, or suites appear automatically — no schema changes needed
- `allure_launch_id` links back to the source launch in Allure TestOps for deep-link drill-through

### Plugin Registry

```
plugins/
  parsers/
    lcov.py          ← lcov .info files
    gcovr.py         ← gcovr coverage.xml
    coverage_xml.py  ← pytest coverage.xml
    gtest_xml.py     ← GTest JUnit XML (Phase 2)
  connectors/
    allure.py        ← PRIMARY: pull results from Allure TestOps API (http://monitoring:8081/)
    github.py        ← artifact pull, PR status checks
    jenkins.py       ← artifact fetch from Jenkins
```

Adding a new format = add one file under `parsers/`. No core changes.

**Allure connector is priority one.** The team already runs Allure TestOps at `http://monitoring:8081/`. The connector polls the Allure API for completed launches, pulls pass/fail/broken/skipped counts per suite per topology, and writes them to Postgres. Raw artifact parsing is a fallback for environments not yet connected to Allure.

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

**Code Coverage tab:**
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
│  42  ✓  if (packet.valid()) {                       │
│  44  ✗    handle_error(packet);                     │
│  ✓ covered  ✗ missed  - not executable              │
└─────────────────────────────────────────────────────┘
```

**Test Results tab (Phase 2 — sourced from Allure TestOps):**
```
┌─────────────────────────────────────────────────────┐
│  ✏ Nightly Test Results    ● Synced from Allure     │
│  [All] [base] [l2] [l3] [mgmt] [qos]  ← suite tabs │
│  (selecting a suite updates BOTH charts below)      │
├──────────────────────┬──────────────────────────────┤
│  T0 Topology         │  T1-LAG Topology             │
│  7-day stacked bars  │  7-day stacked bars          │
│  Passed/Failed/      │  Passed/Failed/              │
│  Broken/Skipped      │  Broken/Skipped              │
│  + dotted pass rate  │  + dotted pass rate          │
└──────────────────────┴──────────────────────────────┘
```

- Exec summary bar: always visible, read-only, no login required
- Switch panel: grouped by topology (T0, T1-lag), expandable as new topologies are added
- Trend lines: last 14 builds for coverage, last 7 days for test results
- Drill-down: inline below panels, not a new page
- Suite tab selection applies to both T0 and T1-lag charts simultaneously
- Pass rate shown as dotted line on right axis (0–100%), test count on left axis

---

## Phases 2–4 (Planned, Not Yet Designed)

### Phase 2: Multi-framework Test Results
- **Primary source: Allure TestOps** running at `http://monitoring:8081/` — connector polls API for completed launches
- Display pass/failed/broken/skipped per suite (All, base, l2, l3, mgmt, qos) per topology
- **Two side-by-side charts**: T0 Topology (left) and T1-LAG Topology (right), always visible together
- Suite tab selection filters both charts simultaneously
- 7-day trend with stacked bars + dotted pass rate line (mirrors existing Allure view)
- Fallback ingestion: GTest XML, pytest XML for environments not yet in Allure
- Flakiness tracking (future): tests that alternate pass/fail across runs

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
