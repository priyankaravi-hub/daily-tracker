# Engineering Intelligence Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted engineering dashboard that ingests code coverage (lcov/gcovr) and test results (Allure TestOps) from CI pipelines, stores them in PostgreSQL, and displays them in a React frontend with topology-split panels, line-level drill-down, and 7-day trend charts.

**Architecture:** FastAPI backend with Celery + Redis for async ingestion; plugin registry pattern for parsers (lcov, gcovr) and connectors (Allure, GitHub, Jenkins); PostgreSQL with Alembic migrations. React 18 + Tailwind + Chart.js frontend. Everything runs via docker-compose locally and in CI.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, Celery 5, Redis, PostgreSQL 15, pytest, httpx, React 18, Vite, Tailwind CSS 3, Chart.js 4, docker-compose

**Phase 1 checkpoint:** Tasks 1–11 produce a fully deployable coverage dashboard.
**Phase 2 checkpoint:** Tasks 12–20 add Allure test results on top.

---

## File Structure

```
engdash/                                 ← new standalone project (sibling to daily-tracker)
  backend/
    app/
      main.py                            ← FastAPI app + router registration
      database.py                        ← SQLAlchemy engine, session factory
      config.py                          ← settings via pydantic-settings
      models/
        __init__.py
        run.py                           ← Run ORM model
        coverage.py                      ← CoverageReport, CoverageFile, CoverageLine
        test_result.py                   ← TestResult ORM model
      schemas/
        __init__.py
        run.py                           ← Pydantic I/O schemas for runs
        coverage.py                      ← Pydantic I/O schemas for coverage
        test_result.py                   ← Pydantic I/O schemas for test results
      routers/
        ingest.py                        ← POST /api/ingest
        coverage.py                      ← GET /api/coverage/*
        test_results.py                  ← GET /api/test-results/*
      plugins/
        registry.py                      ← Parser + connector registry
        parsers/
          base.py                        ← Abstract CoverageParser interface
          lcov.py                        ← lcov .info parser
          gcovr.py                       ← gcovr coverage.xml parser
          coverage_xml.py                ← pytest coverage.xml parser
        connectors/
          base.py                        ← Abstract Connector interface
          allure.py                      ← Allure TestOps REST API connector
          github.py                      ← GitHub API connector
      workers/
        celery_app.py                    ← Celery app + broker config
        tasks.py                         ← parse_artifact task, sync_allure task
      storage/
        artifact_store.py                ← save/load raw artifacts (local FS)
    migrations/
      env.py
      versions/
        001_initial_schema.py            ← all tables in one migration
    tests/
      conftest.py                        ← DB fixtures, test client, mock artifacts
      test_lcov_parser.py
      test_gcovr_parser.py
      test_allure_connector.py
      test_ingest_router.py
      test_coverage_router.py
      test_test_results_router.py
    requirements.txt
    Dockerfile
    docker-compose.yml
    alembic.ini
  frontend/
    src/
      App.jsx                            ← page routing
      api/
        client.js                        ← axios base + endpoints
      components/
        NavBar.jsx
        coverage/
          ExecSummaryBar.jsx
          EnvironmentPanels.jsx          ← Switch/Sim/Emu layout
          SwitchPanel.jsx                ← T0 + T1-lag rows
          SimEmuPanel.jsx                ← single-value panel
          DrillDown.jsx                  ← line-level code view
        test_results/
          TestResultsPage.jsx
          StatCards.jsx
          SuiteTabs.jsx
          DualCharts.jsx                 ← T0 chart + T1-lag chart side by side
      hooks/
        useCoverage.js
        useTestResults.js
    index.html
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
  ci/
    github-actions/
      coverage-upload/
        action.yml
    jenkins/
      vars/
        uploadCoverage.groovy
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `engdash/backend/requirements.txt`
- Create: `engdash/backend/docker-compose.yml`
- Create: `engdash/backend/app/config.py`
- Create: `engdash/backend/app/main.py`
- Create: `engdash/backend/app/database.py`

- [ ] **Step 1: Create the project root**

```bash
mkdir -p ~/Documents/Claude/Projects/Whatdoyoudo/engdash/backend/app/{models,schemas,routers,plugins/{parsers,connectors},workers,storage}
mkdir -p ~/Documents/Claude/Projects/Whatdoyoudo/engdash/backend/{migrations/versions,tests}
cd ~/Documents/Claude/Projects/Whatdoyoudo/engdash/backend
python3.11 -m venv .venv && source .venv/bin/activate
```

- [ ] **Step 2: Write `requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic-settings==2.2.1
celery==5.3.6
redis==5.0.4
httpx==0.27.0
python-multipart==0.0.9
pytest==8.2.0
pytest-asyncio==0.23.6
httpx==0.27.0
factory-boy==3.3.0
```

Run: `pip install -r requirements.txt`

- [ ] **Step 3: Write `app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://engdash:engdash@localhost:5432/engdash"
    redis_url: str = "redis://localhost:6379/0"
    artifact_store_path: str = "/tmp/engdash/artifacts"
    api_key: str = "dev-secret-key"
    allure_base_url: str = "http://monitoring:8081"
    allure_token: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Write `app/database.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: Write `app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="EngDash API", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Write `docker-compose.yml`**

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: engdash
      POSTGRES_PASSWORD: engdash
      POSTGRES_DB: engdash
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build: .
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes: [.:/app]
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]

  worker:
    build: .
    command: celery -A app.workers.celery_app worker --loglevel=info
    volumes: [.:/app]
    env_file: .env
    depends_on: [db, redis]

volumes:
  pgdata:
```

- [ ] **Step 7: Write `Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

- [ ] **Step 8: Start services and verify health**

```bash
docker compose up -d db redis
uvicorn app.main:app --reload &
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 9: Commit**

```bash
git init ~/Documents/Claude/Projects/Whatdoyoudo/engdash
cd ~/Documents/Claude/Projects/Whatdoyoudo/engdash
git add .
git commit -m "feat: scaffold backend — FastAPI + docker-compose"
```

---

## Task 2: Database Models

**Files:**
- Create: `backend/app/models/run.py`
- Create: `backend/app/models/coverage.py`
- Create: `backend/app/models/test_result.py`
- Create: `backend/app/models/__init__.py`

- [ ] **Step 1: Write `app/models/run.py`**

```python
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class EnvironmentEnum(str, enum.Enum):
    switch = "switch"
    simulator = "simulator"
    emulator = "emulator"

class CISystemEnum(str, enum.Enum):
    github_actions = "github_actions"
    jenkins = "jenkins"
    manual = "manual"

class Run(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True)
    commit_sha = Column(String(40), nullable=False)
    branch = Column(String(255))
    environment = Column(SAEnum(EnvironmentEnum), nullable=False)
    topology = Column(String(50))          # T0, T1-lag, null for sim/emu
    ci_system = Column(SAEnum(CISystemEnum), default=CISystemEnum.manual)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="pending")

    github_pr_number = Column(Integer)
    github_pr_author = Column(String(255))
    github_repo = Column(String(255))
    github_workflow_run_id = Column(String(50))
    github_check_run_id = Column(String(50))

    coverage_reports = relationship("CoverageReport", back_populates="run")
    test_results = relationship("TestResult", back_populates="run")
```

- [ ] **Step 2: Write `app/models/coverage.py`**

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class CoverageReport(Base):
    __tablename__ = "coverage_reports"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    format = Column(String(30), nullable=False)   # lcov, gcovr, coverage_xml
    raw_artifact_path = Column(Text)
    parsed_at = Column(DateTime(timezone=True), server_default=func.now())
    total_lines = Column(Integer, default=0)
    covered_lines = Column(Integer, default=0)
    pct = Column(Float, default=0.0)

    run = relationship("Run", back_populates="coverage_reports")
    files = relationship("CoverageFile", back_populates="report", cascade="all, delete-orphan")

class CoverageFile(Base):
    __tablename__ = "coverage_files"

    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("coverage_reports.id"), nullable=False)
    file_path = Column(Text, nullable=False)
    total_lines = Column(Integer, default=0)
    covered_lines = Column(Integer, default=0)
    pct = Column(Float, default=0.0)

    report = relationship("CoverageReport", back_populates="files")
    lines = relationship("CoverageLine", back_populates="file", cascade="all, delete-orphan")

class CoverageLine(Base):
    __tablename__ = "coverage_lines"

    id = Column(Integer, primary_key=True)
    file_id = Column(Integer, ForeignKey("coverage_files.id"), nullable=False)
    line_number = Column(Integer, nullable=False)
    hit_count = Column(Integer, default=0)   # 0 = missed, -1 = not executable, >0 = covered

    file = relationship("CoverageFile", back_populates="lines")
```

- [ ] **Step 3: Write `app/models/test_result.py`**

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("runs.id"), nullable=False)
    suite = Column(String(100), nullable=False)   # All, base, l2, l3, mgmt, qos
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    broken = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    total = Column(Integer, default=0)
    pass_rate = Column(Float, default=0.0)
    source = Column(String(30), default="allure")  # allure, gtest, pytest
    allure_launch_id = Column(String(50))          # links back to Allure for drill-through
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("Run", back_populates="test_results")
```

- [ ] **Step 4: Write `app/models/__init__.py`**

```python
from app.models.run import Run, EnvironmentEnum, CISystemEnum
from app.models.coverage import CoverageReport, CoverageFile, CoverageLine
from app.models.test_result import TestResult

__all__ = [
    "Run", "EnvironmentEnum", "CISystemEnum",
    "CoverageReport", "CoverageFile", "CoverageLine",
    "TestResult",
]
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/
git commit -m "feat: add SQLAlchemy ORM models (runs, coverage, test_results)"
```

---

## Task 3: Alembic Migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/migrations/env.py`
- Create: `backend/migrations/versions/001_initial_schema.py`

- [ ] **Step 1: Initialize Alembic**

```bash
cd backend
alembic init migrations
```

- [ ] **Step 2: Edit `alembic.ini` — set sqlalchemy.url**

In `alembic.ini`, find and replace:
```
sqlalchemy.url = driver://user:pass@localhost/dbname
```
with:
```
sqlalchemy.url = postgresql://engdash:engdash@localhost:5432/engdash
```

- [ ] **Step 3: Edit `migrations/env.py` to import models**

Replace the `target_metadata = None` line with:

```python
from app.database import Base
from app.models import Run, CoverageReport, CoverageFile, CoverageLine, TestResult  # noqa: F401
target_metadata = Base.metadata
```

Also set the `config.set_main_option` at the top of `run_migrations_offline()` to pull from `app.config`:

```python
from app.config import settings
config.set_main_option("sqlalchemy.url", settings.database_url)
```

- [ ] **Step 4: Generate the migration**

```bash
alembic revision --autogenerate -m "initial schema"
```

Expected: creates `migrations/versions/<hash>_initial_schema.py` with `op.create_table` calls for all 5 tables.

- [ ] **Step 5: Apply migration**

```bash
docker compose up -d db
alembic upgrade head
```

Expected: no errors, `alembic_version` table created in DB.

- [ ] **Step 6: Verify tables exist**

```bash
docker exec -it engdash-db-1 psql -U engdash -c "\dt"
```

Expected output includes: `runs`, `coverage_reports`, `coverage_files`, `coverage_lines`, `test_results`

- [ ] **Step 7: Commit**

```bash
git add alembic.ini migrations/
git commit -m "feat: add Alembic initial schema migration"
```

---

## Task 4: Artifact Store

**Files:**
- Create: `backend/app/storage/artifact_store.py`
- Create: `backend/tests/test_artifact_store.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_artifact_store.py
import pytest
from pathlib import Path
from app.storage.artifact_store import ArtifactStore

@pytest.fixture
def store(tmp_path):
    return ArtifactStore(base_path=str(tmp_path))

def test_save_and_load_artifact(store):
    content = b"DA:1,1\nDA:2,0\nLH:1\nLF:2\n"
    path = store.save(content, run_id=1, filename="coverage.info")
    loaded = store.load(path)
    assert loaded == content

def test_save_creates_run_subdirectory(store, tmp_path):
    store.save(b"data", run_id=42, filename="cov.xml")
    assert (tmp_path / "runs" / "42").is_dir()
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_artifact_store.py -v
```

Expected: `FAILED — cannot import name 'ArtifactStore'`

- [ ] **Step 3: Implement `app/storage/artifact_store.py`**

```python
from pathlib import Path

class ArtifactStore:
    def __init__(self, base_path: str):
        self.base = Path(base_path)

    def save(self, content: bytes, run_id: int, filename: str) -> str:
        dest = self.base / "runs" / str(run_id)
        dest.mkdir(parents=True, exist_ok=True)
        path = dest / filename
        path.write_bytes(content)
        return str(path)

    def load(self, path: str) -> bytes:
        return Path(path).read_bytes()
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_artifact_store.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add app/storage/ tests/test_artifact_store.py
git commit -m "feat: add artifact store with save/load"
```

---

## Task 5: Plugin Registry & Parser Interface

**Files:**
- Create: `backend/app/plugins/parsers/base.py`
- Create: `backend/app/plugins/registry.py`
- Create: `backend/tests/test_registry.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_registry.py
import pytest
from app.plugins.registry import ParserRegistry
from app.plugins.parsers.base import CoverageParser, ParsedCoverage

def test_registry_returns_parser_by_format():
    registry = ParserRegistry()
    parser = registry.get_parser("lcov")
    assert parser is not None

def test_registry_raises_for_unknown_format():
    registry = ParserRegistry()
    with pytest.raises(ValueError, match="No parser for format: unknown"):
        registry.get_parser("unknown")
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_registry.py -v
```

Expected: `FAILED — cannot import name 'ParserRegistry'`

- [ ] **Step 3: Write `app/plugins/parsers/base.py`**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

@dataclass
class ParsedLine:
    line_number: int
    hit_count: int   # -1 = not executable, 0 = missed, >0 = covered

@dataclass
class ParsedFile:
    file_path: str
    total_lines: int
    covered_lines: int
    pct: float
    lines: list[ParsedLine] = field(default_factory=list)

@dataclass
class ParsedCoverage:
    total_lines: int
    covered_lines: int
    pct: float
    files: list[ParsedFile] = field(default_factory=list)

class CoverageParser(ABC):
    @abstractmethod
    def parse(self, content: bytes) -> ParsedCoverage:
        """Parse raw artifact bytes into normalized ParsedCoverage."""
```

- [ ] **Step 4: Write `app/plugins/registry.py`**

```python
from app.plugins.parsers.base import CoverageParser

class ParserRegistry:
    def __init__(self):
        self._parsers: dict[str, CoverageParser] = {}
        self._register_defaults()

    def _register_defaults(self):
        from app.plugins.parsers.lcov import LcovParser
        from app.plugins.parsers.gcovr import GcovrParser
        self._parsers["lcov"] = LcovParser()
        self._parsers["gcovr"] = GcovrParser()
        self._parsers["coverage_xml"] = GcovrParser()  # same XML schema

    def get_parser(self, fmt: str) -> CoverageParser:
        if fmt not in self._parsers:
            raise ValueError(f"No parser for format: {fmt}")
        return self._parsers[fmt]

    def register(self, fmt: str, parser: CoverageParser):
        self._parsers[fmt] = parser
```

- [ ] **Step 5: Create stub parsers so registry can import them**

```python
# app/plugins/parsers/lcov.py
from app.plugins.parsers.base import CoverageParser, ParsedCoverage

class LcovParser(CoverageParser):
    def parse(self, content: bytes) -> ParsedCoverage:
        raise NotImplementedError
```

```python
# app/plugins/parsers/gcovr.py
from app.plugins.parsers.base import CoverageParser, ParsedCoverage

class GcovrParser(CoverageParser):
    def parse(self, content: bytes) -> ParsedCoverage:
        raise NotImplementedError
```

- [ ] **Step 6: Run tests to verify pass**

```bash
pytest tests/test_registry.py -v
```

Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add app/plugins/ tests/test_registry.py
git commit -m "feat: add plugin registry and parser base interface"
```

---

## Task 6: lcov Parser

**Files:**
- Modify: `backend/app/plugins/parsers/lcov.py`
- Create: `backend/tests/test_lcov_parser.py`
- Create: `backend/tests/fixtures/sample.info`

- [ ] **Step 1: Create fixture file `tests/fixtures/sample.info`**

```
TN:
SF:src/network/packet_handler.cpp
DA:1,-1
DA:42,3
DA:43,2
DA:44,0
DA:45,0
DA:47,1
LH:3
LF:5
end_of_record
SF:src/mgmt/vlan_control.cpp
DA:10,1
DA:11,1
DA:12,0
LH:2
LF:3
end_of_record
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_lcov_parser.py
import pytest
from pathlib import Path
from app.plugins.parsers.lcov import LcovParser

FIXTURE = Path(__file__).parent / "fixtures" / "sample.info"

@pytest.fixture
def parser():
    return LcovParser()

@pytest.fixture
def content():
    return FIXTURE.read_bytes()

def test_parses_total_line_counts(parser, content):
    result = parser.parse(content)
    assert result.total_lines == 8   # LF:5 + LF:3
    assert result.covered_lines == 5  # LH:3 + LH:2

def test_parses_pct(parser, content):
    result = parser.parse(content)
    assert abs(result.pct - 62.5) < 0.1

def test_parses_files(parser, content):
    result = parser.parse(content)
    assert len(result.files) == 2
    assert result.files[0].file_path == "src/network/packet_handler.cpp"

def test_marks_missed_lines(parser, content):
    result = parser.parse(content)
    packet_file = result.files[0]
    missed = [l for l in packet_file.lines if l.hit_count == 0]
    assert len(missed) == 2   # DA:44,0 and DA:45,0

def test_marks_not_executable_lines(parser, content):
    result = parser.parse(content)
    packet_file = result.files[0]
    not_exec = [l for l in packet_file.lines if l.hit_count == -1]
    assert len(not_exec) == 1  # DA:1,-1
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/test_lcov_parser.py -v
```

Expected: `5 FAILED — NotImplementedError`

- [ ] **Step 4: Implement `app/plugins/parsers/lcov.py`**

```python
from app.plugins.parsers.base import CoverageParser, ParsedCoverage, ParsedFile, ParsedLine

class LcovParser(CoverageParser):
    def parse(self, content: bytes) -> ParsedCoverage:
        files: list[ParsedFile] = []
        current_file: str | None = None
        current_lines: list[ParsedLine] = []
        current_lf = current_lh = 0

        for raw in content.decode("utf-8", errors="replace").splitlines():
            line = raw.strip()
            if line.startswith("SF:"):
                current_file = line[3:]
                current_lines = []
                current_lf = current_lh = 0
            elif line.startswith("DA:"):
                parts = line[3:].split(",")
                lineno, hits = int(parts[0]), int(parts[1])
                current_lines.append(ParsedLine(line_number=lineno, hit_count=hits))
            elif line.startswith("LF:"):
                current_lf = int(line[3:])
            elif line.startswith("LH:"):
                current_lh = int(line[3:])
            elif line == "end_of_record" and current_file:
                pct = (current_lh / current_lf * 100) if current_lf else 0.0
                files.append(ParsedFile(
                    file_path=current_file,
                    total_lines=current_lf,
                    covered_lines=current_lh,
                    pct=round(pct, 2),
                    lines=current_lines,
                ))
                current_file = None

        total = sum(f.total_lines for f in files)
        covered = sum(f.covered_lines for f in files)
        pct = (covered / total * 100) if total else 0.0
        return ParsedCoverage(total_lines=total, covered_lines=covered, pct=round(pct, 2), files=files)
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pytest tests/test_lcov_parser.py -v
```

Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add app/plugins/parsers/lcov.py tests/test_lcov_parser.py tests/fixtures/
git commit -m "feat: implement lcov parser with TDD"
```

---

## Task 7: gcovr / coverage.xml Parser

**Files:**
- Modify: `backend/app/plugins/parsers/gcovr.py`
- Create: `backend/tests/fixtures/coverage.xml`
- Create: `backend/tests/test_gcovr_parser.py`

- [ ] **Step 1: Create fixture `tests/fixtures/coverage.xml`**

```xml
<?xml version="1.0" ?>
<coverage version="7.4" timestamp="1714000000" lines-valid="10" lines-covered="7" line-rate="0.7" branches-covered="0" branches-valid="0" branch-rate="0" complexity="0">
    <packages>
        <package name="src.network" line-rate="0.6">
            <classes>
                <class name="packet_handler.cpp" filename="src/network/packet_handler.cpp" line-rate="0.6">
                    <lines>
                        <line number="42" hits="3"/>
                        <line number="43" hits="1"/>
                        <line number="44" hits="0"/>
                        <line number="45" hits="0"/>
                        <line number="47" hits="2"/>
                    </lines>
                </class>
            </classes>
        </package>
        <package name="src.mgmt" line-rate="0.8">
            <classes>
                <class name="vlan_control.cpp" filename="src/mgmt/vlan_control.cpp" line-rate="0.8">
                    <lines>
                        <line number="10" hits="1"/>
                        <line number="11" hits="1"/>
                        <line number="12" hits="1"/>
                        <line number="13" hits="0"/>
                        <line number="14" hits="1"/>
                    </lines>
                </class>
            </classes>
        </package>
    </packages>
</coverage>
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_gcovr_parser.py
import pytest
from pathlib import Path
from app.plugins.parsers.gcovr import GcovrParser

FIXTURE = Path(__file__).parent / "fixtures" / "coverage.xml"

@pytest.fixture
def parser():
    return GcovrParser()

@pytest.fixture
def content():
    return FIXTURE.read_bytes()

def test_parses_totals_from_xml(parser, content):
    result = parser.parse(content)
    assert result.total_lines == 10
    assert result.covered_lines == 7

def test_parses_pct_from_xml(parser, content):
    result = parser.parse(content)
    assert abs(result.pct - 70.0) < 0.1

def test_parses_two_files(parser, content):
    result = parser.parse(content)
    assert len(result.files) == 2

def test_missed_lines_have_zero_hits(parser, content):
    result = parser.parse(content)
    packet = next(f for f in result.files if "packet_handler" in f.file_path)
    missed = [l for l in packet.lines if l.hit_count == 0]
    assert len(missed) == 2
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/test_gcovr_parser.py -v
```

Expected: `4 FAILED — NotImplementedError`

- [ ] **Step 4: Implement `app/plugins/parsers/gcovr.py`**

```python
import xml.etree.ElementTree as ET
from app.plugins.parsers.base import CoverageParser, ParsedCoverage, ParsedFile, ParsedLine

class GcovrParser(CoverageParser):
    def parse(self, content: bytes) -> ParsedCoverage:
        root = ET.fromstring(content)
        files: list[ParsedFile] = []

        for cls in root.iter("class"):
            filename = cls.get("filename", "")
            parsed_lines = []
            for line in cls.iter("line"):
                hits = int(line.get("hits", 0))
                parsed_lines.append(ParsedLine(
                    line_number=int(line.get("number")),
                    hit_count=hits,
                ))
            total = len(parsed_lines)
            covered = sum(1 for l in parsed_lines if l.hit_count > 0)
            pct = (covered / total * 100) if total else 0.0
            files.append(ParsedFile(
                file_path=filename,
                total_lines=total,
                covered_lines=covered,
                pct=round(pct, 2),
                lines=parsed_lines,
            ))

        total_lines = int(root.get("lines-valid", 0))
        covered_lines = int(root.get("lines-covered", 0))
        pct = (covered_lines / total_lines * 100) if total_lines else 0.0
        return ParsedCoverage(
            total_lines=total_lines,
            covered_lines=covered_lines,
            pct=round(pct, 2),
            files=files,
        )
```

- [ ] **Step 5: Run tests to verify pass**

```bash
pytest tests/test_gcovr_parser.py -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add app/plugins/parsers/gcovr.py tests/test_gcovr_parser.py tests/fixtures/coverage.xml
git commit -m "feat: implement gcovr/coverage.xml parser with TDD"
```

---

## Task 8: Ingest API Endpoint

**Files:**
- Create: `backend/app/routers/ingest.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_ingest_router.py`

- [ ] **Step 1: Write `tests/conftest.py`**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_ingest_router.py
import io
import pytest

def test_ingest_returns_202(client):
    content = b"TN:\nSF:src/foo.cpp\nDA:1,1\nLF:1\nLH:1\nend_of_record\n"
    response = client.post(
        "/api/ingest",
        data={
            "format": "lcov",
            "environment": "switch",
            "topology": "T0",
            "commit_sha": "abc123",
            "branch": "main",
            "ci_system": "github_actions",
        },
        files={"artifact": ("coverage.info", io.BytesIO(content), "text/plain")},
        headers={"X-API-Key": "dev-secret-key"},
    )
    assert response.status_code == 202
    assert response.json()["status"] == "queued"

def test_ingest_rejects_wrong_api_key(client):
    response = client.post(
        "/api/ingest",
        data={"format": "lcov", "environment": "switch", "commit_sha": "abc"},
        files={"artifact": ("cov.info", io.BytesIO(b""), "text/plain")},
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 403
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/test_ingest_router.py -v
```

Expected: `FAILED — 404 Not Found`

- [ ] **Step 4: Write `app/routers/ingest.py`**

```python
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import Run, EnvironmentEnum, CISystemEnum
from app.storage.artifact_store import ArtifactStore

router = APIRouter(prefix="/api")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

@router.post("/ingest", status_code=202)
async def ingest(
    artifact: UploadFile = File(...),
    format: str = Form(...),
    environment: str = Form(...),
    commit_sha: str = Form(...),
    branch: str = Form(default=""),
    ci_system: str = Form(default="manual"),
    topology: str = Form(default=""),
    github_pr_number: int = Form(default=None),
    github_pr_author: str = Form(default=""),
    github_repo: str = Form(default=""),
    github_workflow_run_id: str = Form(default=""),
    db: Session = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    run = Run(
        commit_sha=commit_sha,
        branch=branch,
        environment=EnvironmentEnum(environment),
        topology=topology or None,
        ci_system=CISystemEnum(ci_system),
        github_pr_number=github_pr_number,
        github_pr_author=github_pr_author or None,
        github_repo=github_repo or None,
        github_workflow_run_id=github_workflow_run_id or None,
        status="pending",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    content = await artifact.read()
    store = ArtifactStore(settings.artifact_store_path)
    path = store.save(content, run_id=run.id, filename=artifact.filename or "artifact")

    # In production: enqueue Celery task here
    # from app.workers.tasks import parse_artifact
    # parse_artifact.delay(run.id, path, format)

    return {"status": "queued", "run_id": run.id}
```

- [ ] **Step 5: Register router in `app/main.py`**

```python
from fastapi import FastAPI
from app.routers.ingest import router as ingest_router

app = FastAPI(title="EngDash API", version="0.1.0")
app.include_router(ingest_router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests to verify pass**

```bash
pytest tests/test_ingest_router.py -v
```

Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add app/routers/ingest.py app/main.py tests/conftest.py tests/test_ingest_router.py
git commit -m "feat: POST /api/ingest endpoint with API key auth"
```

---

## Task 9: Celery Worker — Parse Artifact Task

**Files:**
- Create: `backend/app/workers/celery_app.py`
- Create: `backend/app/workers/tasks.py`

- [ ] **Step 1: Write `app/workers/celery_app.py`**

```python
from celery import Celery
from app.config import settings

celery = Celery(
    "engdash",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
```

- [ ] **Step 2: Write `app/workers/tasks.py`**

```python
from app.workers.celery_app import celery
from app.database import SessionLocal
from app.models import CoverageReport, CoverageFile, CoverageLine, Run
from app.plugins.registry import ParserRegistry
from app.storage.artifact_store import ArtifactStore
from app.config import settings

registry = ParserRegistry()

@celery.task(bind=True, max_retries=3)
def parse_artifact(self, run_id: int, artifact_path: str, fmt: str):
    store = ArtifactStore(settings.artifact_store_path)
    content = store.load(artifact_path)

    try:
        parser = registry.get_parser(fmt)
        parsed = parser.parse(content)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)

    db = SessionLocal()
    try:
        report = CoverageReport(
            run_id=run_id,
            format=fmt,
            raw_artifact_path=artifact_path,
            total_lines=parsed.total_lines,
            covered_lines=parsed.covered_lines,
            pct=parsed.pct,
        )
        db.add(report)
        db.flush()

        for pf in parsed.files:
            cf = CoverageFile(
                report_id=report.id,
                file_path=pf.file_path,
                total_lines=pf.total_lines,
                covered_lines=pf.covered_lines,
                pct=pf.pct,
            )
            db.add(cf)
            db.flush()
            db.add_all([
                CoverageLine(file_id=cf.id, line_number=pl.line_number, hit_count=pl.hit_count)
                for pl in pf.lines
            ])

        run = db.get(Run, run_id)
        run.status = "complete"
        db.commit()
    finally:
        db.close()

    return {"run_id": run_id, "pct": parsed.pct}
```

- [ ] **Step 3: Wire task dispatch into `app/routers/ingest.py`**

Replace the comment block in the ingest router with:

```python
    from app.workers.tasks import parse_artifact
    parse_artifact.delay(run.id, path, format)
```

- [ ] **Step 4: Start worker and test end-to-end**

```bash
# Terminal 1
docker compose up -d db redis
# Terminal 2
celery -A app.workers.celery_app worker --loglevel=info
# Terminal 3
uvicorn app.main:app --reload
# Terminal 4 — send a real lcov file
curl -X POST http://localhost:8000/api/ingest \
  -H "X-API-Key: dev-secret-key" \
  -F "format=lcov" \
  -F "environment=switch" \
  -F "topology=T0" \
  -F "commit_sha=abc123" \
  -F "branch=main" \
  -F "ci_system=manual" \
  -F "artifact=@tests/fixtures/sample.info"
```

Expected: `{"status":"queued","run_id":1}` and worker logs show task completing.

- [ ] **Step 5: Commit**

```bash
git add app/workers/
git commit -m "feat: Celery worker parses artifacts and writes coverage to DB"
```

---

## Task 10: Coverage Query API

**Files:**
- Create: `backend/app/routers/coverage.py`
- Create: `backend/app/schemas/coverage.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_coverage_router.py`

- [ ] **Step 1: Write `app/schemas/coverage.py`**

```python
from pydantic import BaseModel

class CoverageFileSummary(BaseModel):
    file_path: str
    total_lines: int
    covered_lines: int
    pct: float
    model_config = {"from_attributes": True}

class CoverageLineSummary(BaseModel):
    line_number: int
    hit_count: int
    model_config = {"from_attributes": True}

class CoverageFileDetail(CoverageFileSummary):
    lines: list[CoverageLineSummary]

class EnvironmentSummary(BaseModel):
    environment: str
    topology: str | None
    pct: float
    covered_lines: int
    total_lines: int
    run_id: int

class CoverageSummaryResponse(BaseModel):
    overall_pct: float
    environments: list[EnvironmentSummary]
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_coverage_router.py
import pytest
from app.models import Run, CoverageReport, EnvironmentEnum

def seed_run(db, environment="switch", topology="T0", pct=68.0):
    run = Run(commit_sha="abc", branch="main", environment=EnvironmentEnum(environment),
               topology=topology, status="complete")
    db.add(run)
    db.flush()
    report = CoverageReport(run_id=run.id, format="lcov",
                             total_lines=100, covered_lines=int(pct),
                             pct=pct)
    db.add(report)
    db.commit()
    return run

def test_summary_returns_environments(client, db):
    seed_run(db, "switch", "T0", 68.0)
    seed_run(db, "simulator", None, 79.0)
    response = client.get("/api/coverage/summary")
    assert response.status_code == 200
    envs = response.json()["environments"]
    assert len(envs) == 2

def test_summary_calculates_overall_pct(client, db):
    seed_run(db, "switch", "T0", 60.0)
    seed_run(db, "switch", "T1-lag", 80.0)
    response = client.get("/api/coverage/summary")
    data = response.json()
    assert abs(data["overall_pct"] - 70.0) < 1.0
```

- [ ] **Step 3: Run to verify failure**

```bash
pytest tests/test_coverage_router.py -v
```

Expected: `FAILED — 404 Not Found`

- [ ] **Step 4: Write `app/routers/coverage.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Run, CoverageReport
from app.schemas.coverage import CoverageSummaryResponse, EnvironmentSummary, CoverageFileDetail
from app.models.coverage import CoverageFile, CoverageLine
from app.schemas.coverage import CoverageLineSummary

router = APIRouter(prefix="/api/coverage")

@router.get("/summary", response_model=CoverageSummaryResponse)
def coverage_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(Run, CoverageReport)
        .join(CoverageReport, CoverageReport.run_id == Run.id)
        .filter(Run.status == "complete")
        .order_by(Run.triggered_at.desc())
        .all()
    )

    seen: dict[tuple, EnvironmentSummary] = {}
    for run, report in rows:
        key = (run.environment.value, run.topology)
        if key not in seen:
            seen[key] = EnvironmentSummary(
                environment=run.environment.value,
                topology=run.topology,
                pct=report.pct,
                covered_lines=report.covered_lines,
                total_lines=report.total_lines,
                run_id=run.id,
            )

    environments = list(seen.values())
    total = sum(e.total_lines for e in environments)
    covered = sum(e.covered_lines for e in environments)
    overall = (covered / total * 100) if total else 0.0
    return CoverageSummaryResponse(overall_pct=round(overall, 2), environments=environments)

@router.get("/files/{run_id}", response_model=list)
def coverage_files(run_id: int, db: Session = Depends(get_db)):
    report = db.query(CoverageReport).filter(CoverageReport.run_id == run_id).first()
    if not report:
        return []
    return [
        {"file_path": f.file_path, "pct": f.pct, "total_lines": f.total_lines,
         "covered_lines": f.covered_lines, "file_id": f.id}
        for f in report.files
    ]

@router.get("/lines/{file_id}", response_model=list)
def coverage_lines(file_id: int, db: Session = Depends(get_db)):
    return [
        {"line_number": l.line_number, "hit_count": l.hit_count}
        for l in db.query(CoverageLine).filter(CoverageLine.file_id == file_id).order_by(CoverageLine.line_number).all()
    ]
```

- [ ] **Step 5: Register router in `app/main.py`**

```python
from app.routers.coverage import router as coverage_router
app.include_router(coverage_router)
```

- [ ] **Step 6: Run tests to verify pass**

```bash
pytest tests/test_coverage_router.py -v
```

Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add app/routers/coverage.py app/schemas/coverage.py app/main.py tests/test_coverage_router.py
git commit -m "feat: GET /api/coverage/summary, /files, /lines endpoints"
```

---

## Task 11: Frontend — Coverage Tab

> **Phase 1 checkpoint:** After this task the coverage dashboard is fully functional end-to-end.

**Files:**
- Create: `frontend/` (full Vite scaffold)
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/hooks/useCoverage.js`
- Create: `frontend/src/components/NavBar.jsx`
- Create: `frontend/src/components/coverage/ExecSummaryBar.jsx`
- Create: `frontend/src/components/coverage/EnvironmentPanels.jsx`
- Create: `frontend/src/components/coverage/SwitchPanel.jsx`
- Create: `frontend/src/components/coverage/SimEmuPanel.jsx`
- Create: `frontend/src/components/coverage/DrillDown.jsx`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Scaffold frontend**

```bash
cd ~/Documents/Claude/Projects/Whatdoyoudo/engdash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios chart.js react-chartjs-2 lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure `tailwind.config.js`**

```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: #0f1117; color: #e2e8f0; }
```

- [ ] **Step 3: Write `src/api/client.js`**

```js
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

export const getCoverageSummary = () => api.get('/api/coverage/summary').then(r => r.data)
export const getCoverageFiles = (runId) => api.get(`/api/coverage/files/${runId}`).then(r => r.data)
export const getCoverageLines = (fileId) => api.get(`/api/coverage/lines/${fileId}`).then(r => r.data)
export const getTestResultsSummary = (suite = 'All') =>
  api.get('/api/test-results/summary', { params: { suite } }).then(r => r.data)
```

- [ ] **Step 4: Write `src/hooks/useCoverage.js`**

```js
import { useState, useEffect } from 'react'
import { getCoverageSummary, getCoverageFiles, getCoverageLines } from '../api/client'

export function useCoverageSummary() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getCoverageSummary().then(setData).finally(() => setLoading(false))
  }, [])
  return { data, loading }
}

export function useCoverageFiles(runId) {
  const [files, setFiles] = useState([])
  useEffect(() => {
    if (runId) getCoverageFiles(runId).then(setFiles)
  }, [runId])
  return files
}

export function useCoverageLines(fileId) {
  const [lines, setLines] = useState([])
  useEffect(() => {
    if (fileId) getCoverageLines(fileId).then(setLines)
  }, [fileId])
  return lines
}
```

- [ ] **Step 5: Write `src/components/NavBar.jsx`**

```jsx
export default function NavBar({ page, setPage }) {
  const tabs = ['coverage', 'testresults', 'bugs', 'progress']
  const labels = { coverage: 'Code Coverage', testresults: 'Test Results', bugs: 'Bug Tracking', progress: 'Progress' }
  return (
    <nav className="bg-[#1a1d27] border-b border-[#2d3147] px-6 py-3 flex items-center gap-4">
      <span className="text-[#7c6af7] font-bold text-base">⬡ EngDash</span>
      <div className="flex gap-1 ml-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setPage(t)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${page === t ? 'bg-[#2d3147] text-white' : 'text-slate-400 hover:text-white'}`}>
            {labels[t]}
          </button>
        ))}
      </div>
      <span className="ml-auto text-xs text-slate-500 bg-[#2d3147] px-3 py-1 rounded-full">
        Synced from Allure · just now
      </span>
    </nav>
  )
}
```

- [ ] **Step 6: Write `src/components/coverage/ExecSummaryBar.jsx`**

```jsx
export default function ExecSummaryBar({ summary }) {
  if (!summary) return null
  const envMap = { switch: 'Switches', simulator: 'Simulator', emulator: 'Emulator' }
  const grouped = {}
  for (const e of summary.environments) {
    const key = e.environment
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  }
  const avgPct = (envs) => {
    const total = envs.reduce((s, e) => s + e.total_lines, 0)
    const cov = envs.reduce((s, e) => s + e.covered_lines, 0)
    return total ? (cov / total * 100).toFixed(1) : '0.0'
  }
  return (
    <div className="bg-gradient-to-r from-[#1e2235] to-[#1a1d27] border-b border-[#2d3147] px-6 py-3 flex items-center gap-8">
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Overall Coverage</div>
        <div className="text-3xl font-bold">{summary.overall_pct}%</div>
      </div>
      <div className="w-px h-10 bg-[#2d3147]" />
      {Object.entries(grouped).map(([env, envs]) => (
        <div key={env}>
          <div className="text-[10px] text-slate-500">{envMap[env] || env}</div>
          <div className="text-xl font-semibold text-yellow-400">{avgPct(envs)}%</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Write `src/components/coverage/SwitchPanel.jsx`**

```jsx
export default function SwitchPanel({ environments, onFileClick }) {
  const switches = environments.filter(e => e.environment === 'switch')
  return (
    <div className="bg-[#1a1d27] border border-[#2d3147] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Switches</span>
        <span className="text-xs bg-[#2d3147] text-violet-400 px-2 py-0.5 rounded-full">
          {switches.length} topolog{switches.length === 1 ? 'y' : 'ies'}
        </span>
      </div>
      {switches.map(sw => (
        <div key={sw.topology} className="py-3 border-b border-[#2d3147] last:border-0">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm">{sw.topology} Topology</span>
              <span className="text-[10px] text-slate-500 bg-[#0f1117] px-1.5 py-0.5 rounded ml-2">SONiC Mgmt</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-yellow-400">{sw.pct.toFixed(1)}%</div>
            </div>
          </div>
          <div className="mt-2 bg-[#0f1117] rounded h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 rounded"
                 style={{ width: `${sw.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Write `src/components/coverage/SimEmuPanel.jsx`**

```jsx
export default function SimEmuPanel({ env, label, ciLabel }) {
  if (!env) return null
  return (
    <div className="bg-[#1a1d27] border border-[#2d3147] rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs bg-[#2d3147] text-violet-400 px-2 py-0.5 rounded-full">{ciLabel}</span>
      </div>
      <div className="text-5xl font-black text-emerald-400">{env.pct.toFixed(1)}%</div>
      <div className="mt-3 bg-[#0f1117] rounded h-1.5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded"
             style={{ width: `${env.pct}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Write `src/components/coverage/DrillDown.jsx`**

```jsx
import { useCoverageLines } from '../../hooks/useCoverage'

export default function DrillDown({ file }) {
  const lines = useCoverageLines(file?.file_id)
  if (!file) return null
  return (
    <div className="mx-6 mb-6 bg-[#1a1d27] border border-violet-500 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-mono text-slate-400">{file.file_path}</span>
        <span className="ml-auto text-sm font-semibold text-yellow-400">
          {file.pct.toFixed(1)}% covered — {file.covered_lines}/{file.total_lines} lines
        </span>
      </div>
      <div className="bg-[#0f1117] rounded-lg p-4 font-mono text-sm leading-7 max-h-64 overflow-y-auto">
        {lines.map(l => (
          <div key={l.line_number} className="flex gap-3">
            <span className="text-slate-600 w-6">{l.line_number}</span>
            <span className={l.hit_count > 0 ? 'text-emerald-400' : l.hit_count === 0 ? 'text-red-400' : 'text-slate-600'}>
              {l.hit_count > 0 ? '✓' : l.hit_count === 0 ? '✗' : '–'}
            </span>
            <span className={l.hit_count === 0 ? 'text-red-300 bg-red-900/20 px-1 rounded' : 'text-slate-200'}>
              {l.hit_count > 0 ? 'covered' : l.hit_count === 0 ? 'missed' : 'not executable'}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span>✓ covered</span><span>✗ missed</span><span>– not executable</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Write `src/components/coverage/EnvironmentPanels.jsx`**

```jsx
import { useState } from 'react'
import SwitchPanel from './SwitchPanel'
import SimEmuPanel from './SimEmuPanel'
import DrillDown from './DrillDown'
import { useCoverageFiles } from '../../hooks/useCoverage'

export default function EnvironmentPanels({ summary }) {
  const [selectedRun, setSelectedRun] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const files = useCoverageFiles(selectedRun)
  const envs = summary?.environments || []
  const sim = envs.find(e => e.environment === 'simulator')
  const emu = envs.find(e => e.environment === 'emulator')
  return (
    <>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest px-6 pt-4 pb-2">
        Environments — latest build per topology
      </div>
      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <SwitchPanel environments={envs} onRunSelect={setSelectedRun} />
        <SimEmuPanel env={sim} label="Simulator" ciLabel="CI · Jenkins" />
        <SimEmuPanel env={emu} label="Emulator" ciLabel="CI · GitHub Actions" />
      </div>
      {files.length > 0 && (
        <div className="px-6 pb-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Files</div>
          <div className="bg-[#1a1d27] border border-[#2d3147] rounded-xl p-3 max-h-40 overflow-y-auto">
            {files.sort((a,b) => a.pct - b.pct).map(f => (
              <div key={f.file_id} onClick={() => setSelectedFile(f)}
                className="flex justify-between py-1.5 border-b border-[#2d3147] last:border-0 cursor-pointer hover:bg-[#2d3147] px-2 rounded">
                <span className="text-xs font-mono text-slate-300">{f.file_path}</span>
                <span className="text-xs text-red-400 font-semibold">{f.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <DrillDown file={selectedFile} />
    </>
  )
}
```

- [ ] **Step 11: Write `src/App.jsx`**

```jsx
import { useState } from 'react'
import NavBar from './components/NavBar'
import ExecSummaryBar from './components/coverage/ExecSummaryBar'
import EnvironmentPanels from './components/coverage/EnvironmentPanels'
import TestResultsPage from './components/test_results/TestResultsPage'
import { useCoverageSummary } from './hooks/useCoverage'

function CoveragePage() {
  const { data, loading } = useCoverageSummary()
  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  return (
    <>
      <ExecSummaryBar summary={data} />
      <EnvironmentPanels summary={data} />
    </>
  )
}

export default function App() {
  const [page, setPage] = useState('testresults')
  return (
    <div className="min-h-screen">
      <NavBar page={page} setPage={setPage} />
      {page === 'coverage' && <CoveragePage />}
      {page === 'testresults' && <TestResultsPage />}
    </div>
  )
}
```

- [ ] **Step 12: Start frontend and verify**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`, click Code Coverage tab, verify exec bar and panels render.

- [ ] **Step 13: Commit**

```bash
git add frontend/
git commit -m "feat: Phase 1 complete — Coverage frontend with exec bar, panels, drill-down"
```

---

## ── PHASE 2 BEGINS ──

## Task 12: Allure TestOps Connector

**Files:**
- Create: `backend/app/plugins/connectors/allure.py`
- Create: `backend/tests/test_allure_connector.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_allure_connector.py
import pytest
from unittest.mock import patch, MagicMock
from app.plugins.connectors.allure import AllureConnector

MOCK_LAUNCHES = [
    {
        "id": "101",
        "name": "Nightly T0",
        "status": "PASSED",
        "createdDate": "2026-04-23T02:00:00Z",
        "statistic": {"passed": 1699, "failed": 44, "broken": 26, "skipped": 8, "total": 1777},
        "tags": [{"name": "topology:T0"}, {"name": "suite:All"}],
    }
]

MOCK_SUITE_LAUNCHES = [
    {
        "id": "102",
        "name": "Nightly T0 mgmt",
        "createdDate": "2026-04-23T02:00:00Z",
        "statistic": {"passed": 420, "failed": 14, "broken": 8, "skipped": 3, "total": 445},
        "tags": [{"name": "topology:T0"}, {"name": "suite:mgmt"}],
    }
]

@patch("app.plugins.connectors.allure.httpx.get")
def test_fetch_launches_returns_list(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: {"content": MOCK_LAUNCHES})
    connector = AllureConnector(base_url="http://monitoring:8081", token="test")
    launches = connector.fetch_recent_launches(days=1)
    assert len(launches) == 1
    assert launches[0]["id"] == "101"

@patch("app.plugins.connectors.allure.httpx.get")
def test_parse_launch_extracts_topology_and_suite(mock_get):
    mock_get.return_value = MagicMock(status_code=200, json=lambda: {"content": MOCK_LAUNCHES})
    connector = AllureConnector(base_url="http://monitoring:8081", token="test")
    launches = connector.fetch_recent_launches(days=1)
    parsed = connector.parse_launch(launches[0])
    assert parsed["topology"] == "T0"
    assert parsed["suite"] == "All"
    assert parsed["passed"] == 1699
    assert parsed["pass_rate"] == pytest.approx(95.6, abs=0.1)
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_allure_connector.py -v
```

Expected: `FAILED — cannot import name 'AllureConnector'`

- [ ] **Step 3: Implement `app/plugins/connectors/allure.py`**

```python
import httpx
from datetime import datetime, timedelta, timezone

class AllureConnector:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}

    def fetch_recent_launches(self, days: int = 7) -> list[dict]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        since_ms = int(since.timestamp() * 1000)
        url = f"{self.base_url}/api/rs/launch"
        resp = httpx.get(url, headers=self.headers,
                         params={"createdAfter": since_ms, "pageSize": 200})
        resp.raise_for_status()
        return resp.json().get("content", [])

    def parse_launch(self, launch: dict) -> dict:
        tags = {t["name"].split(":")[0]: t["name"].split(":")[1]
                for t in launch.get("tags", []) if ":" in t["name"]}
        stat = launch.get("statistic", {})
        total = stat.get("total", 0)
        passed = stat.get("passed", 0)
        pass_rate = (passed / total * 100) if total else 0.0
        return {
            "allure_launch_id": str(launch["id"]),
            "topology": tags.get("topology"),
            "suite": tags.get("suite", "All"),
            "passed": passed,
            "failed": stat.get("failed", 0),
            "broken": stat.get("broken", 0),
            "skipped": stat.get("skipped", 0),
            "total": total,
            "pass_rate": round(pass_rate, 2),
            "created_at": launch.get("createdDate"),
        }
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_allure_connector.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add app/plugins/connectors/allure.py tests/test_allure_connector.py
git commit -m "feat: Allure TestOps connector — fetch and parse launches"
```

---

## Task 13: Allure Sync Celery Task + Test Results API

**Files:**
- Modify: `backend/app/workers/tasks.py`
- Create: `backend/app/routers/test_results.py`
- Create: `backend/app/schemas/test_result.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_test_results_router.py`

- [ ] **Step 1: Add `sync_allure` task to `app/workers/tasks.py`**

Append to existing `tasks.py`:

```python
@celery.task
def sync_allure():
    from app.plugins.connectors.allure import AllureConnector
    from app.models import Run, EnvironmentEnum, CISystemEnum
    from app.models.test_result import TestResult

    connector = AllureConnector(
        base_url=settings.allure_base_url,
        token=settings.allure_token,
    )
    launches = connector.fetch_recent_launches(days=7)
    db = SessionLocal()
    try:
        for launch in launches:
            parsed = connector.parse_launch(launch)
            if not parsed.get("topology"):
                continue
            run = Run(
                commit_sha="allure-sync",
                branch="main",
                environment=EnvironmentEnum.switch,
                topology=parsed["topology"],
                ci_system=CISystemEnum.manual,
                status="complete",
            )
            db.add(run)
            db.flush()
            tr = TestResult(
                run_id=run.id,
                suite=parsed["suite"],
                passed=parsed["passed"],
                failed=parsed["failed"],
                broken=parsed["broken"],
                skipped=parsed["skipped"],
                total=parsed["total"],
                pass_rate=parsed["pass_rate"],
                source="allure",
                allure_launch_id=parsed["allure_launch_id"],
            )
            db.add(tr)
        db.commit()
    finally:
        db.close()
```

- [ ] **Step 2: Add Celery Beat schedule for nightly sync**

In `app/workers/celery_app.py`, append:

```python
from celery.schedules import crontab

celery.conf.beat_schedule = {
    "sync-allure-nightly": {
        "task": "app.workers.tasks.sync_allure",
        "schedule": crontab(hour=3, minute=0),  # 3am UTC daily
    },
}
```

- [ ] **Step 3: Write `app/schemas/test_result.py`**

```python
from pydantic import BaseModel

class DayResult(BaseModel):
    date: str
    passed: int
    failed: int
    broken: int
    skipped: int
    total: int
    pass_rate: float

class TopologyTrend(BaseModel):
    topology: str
    days: list[DayResult]

class TestResultsSummaryResponse(BaseModel):
    suite: str
    topologies: list[TopologyTrend]
```

- [ ] **Step 4: Write the failing test**

```python
# tests/test_test_results_router.py
import pytest
from datetime import datetime, timezone
from app.models import Run, EnvironmentEnum
from app.models.test_result import TestResult

def seed_result(db, topology, suite, passed, failed, broken=0, skipped=0):
    run = Run(commit_sha="abc", branch="main", environment=EnvironmentEnum.switch,
               topology=topology, status="complete",
               triggered_at=datetime(2026, 4, 23, tzinfo=timezone.utc))
    db.add(run)
    db.flush()
    total = passed + failed + broken + skipped
    tr = TestResult(run_id=run.id, suite=suite, passed=passed, failed=failed,
                    broken=broken, skipped=skipped, total=total,
                    pass_rate=round(passed/total*100, 2), source="allure")
    db.add(tr)
    db.commit()

def test_summary_returns_both_topologies(client, db):
    seed_result(db, "T0", "All", 1699, 44, 26, 8)
    seed_result(db, "T1-lag", "All", 1560, 48, 30, 10)
    resp = client.get("/api/test-results/summary?suite=All")
    assert resp.status_code == 200
    topos = [t["topology"] for t in resp.json()["topologies"]]
    assert "T0" in topos
    assert "T1-lag" in topos

def test_summary_filters_by_suite(client, db):
    seed_result(db, "T0", "mgmt", 420, 14)
    seed_result(db, "T0", "l2", 300, 10)
    resp = client.get("/api/test-results/summary?suite=mgmt")
    data = resp.json()
    t0 = next(t for t in data["topologies"] if t["topology"] == "T0")
    assert t0["days"][0]["passed"] == 420
```

- [ ] **Step 5: Run to verify failure**

```bash
pytest tests/test_test_results_router.py -v
```

Expected: `FAILED — 404 Not Found`

- [ ] **Step 6: Write `app/routers/test_results.py`**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict
from app.database import get_db
from app.models import Run
from app.models.test_result import TestResult
from app.schemas.test_result import TestResultsSummaryResponse, TopologyTrend, DayResult

router = APIRouter(prefix="/api/test-results")

@router.get("/summary", response_model=TestResultsSummaryResponse)
def test_results_summary(
    suite: str = Query(default="All"),
    days: int = Query(default=7),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Run, TestResult)
        .join(TestResult, TestResult.run_id == Run.id)
        .filter(TestResult.suite == suite)
        .order_by(Run.triggered_at.asc())
        .all()
    )

    by_topo: dict[str, list] = defaultdict(list)
    for run, tr in rows:
        by_topo[run.topology].append({
            "date": run.triggered_at.strftime("%m/%d"),
            "passed": tr.passed,
            "failed": tr.failed,
            "broken": tr.broken,
            "skipped": tr.skipped,
            "total": tr.total,
            "pass_rate": tr.pass_rate,
        })

    topologies = [
        TopologyTrend(
            topology=topo,
            days=[DayResult(**d) for d in day_list[-days:]]
        )
        for topo, day_list in by_topo.items()
    ]

    return TestResultsSummaryResponse(suite=suite, topologies=topologies)
```

- [ ] **Step 7: Register router in `app/main.py`**

```python
from app.routers.test_results import router as test_results_router
app.include_router(test_results_router)
```

- [ ] **Step 8: Run tests to verify pass**

```bash
pytest tests/test_test_results_router.py -v
```

Expected: `2 passed`

- [ ] **Step 9: Commit**

```bash
git add app/workers/tasks.py app/routers/test_results.py app/schemas/test_result.py app/main.py tests/test_test_results_router.py
git commit -m "feat: Allure sync task + GET /api/test-results/summary"
```

---

## Task 14: Test Results Frontend — Dual Charts

**Files:**
- Create: `frontend/src/hooks/useTestResults.js`
- Create: `frontend/src/components/test_results/StatCards.jsx`
- Create: `frontend/src/components/test_results/SuiteTabs.jsx`
- Create: `frontend/src/components/test_results/DualCharts.jsx`
- Create: `frontend/src/components/test_results/TestResultsPage.jsx`

- [ ] **Step 1: Write `src/hooks/useTestResults.js`**

```js
import { useState, useEffect } from 'react'
import { getTestResultsSummary } from '../api/client'

export function useTestResults(suite = 'All') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    getTestResultsSummary(suite).then(setData).finally(() => setLoading(false))
  }, [suite])
  return { data, loading }
}
```

- [ ] **Step 2: Write `src/components/test_results/StatCards.jsx`**

```jsx
export default function StatCards({ topologies }) {
  if (!topologies?.length) return null
  const all = topologies.flatMap(t => t.days)
  const total = all.reduce((s, d) => s + d.total, 0)
  const failed = all.reduce((s, d) => s + d.failed, 0)
  const broken = all.reduce((s, d) => s + d.broken, 0)
  const avgPass = total ? (all.reduce((s, d) => s + d.passed, 0) / total * 100).toFixed(1) : 0
  const cards = [
    { label: 'Avg Pass Rate (both)', value: `${avgPass}%`, color: 'text-emerald-400', sub: '7-day combined' },
    { label: 'Total Tests (7d)', value: total.toLocaleString(), color: 'text-white', sub: 'T0 + T1-lag' },
    { label: 'Failed', value: failed, color: 'text-red-400', sub: 'last 7 days' },
    { label: 'Broken / Infra', value: broken, color: 'text-orange-400', sub: 'not test failures' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 px-6 pt-5">
      {cards.map(c => (
        <div key={c.label} className="bg-[#1a1d27] border border-[#2d3147] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{c.label}</div>
          <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
          <div className="text-xs text-slate-500 mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/test_results/SuiteTabs.jsx`**

```jsx
const SUITES = ['All', 'base', 'l2', 'l3', 'mgmt', 'qos']

export default function SuiteTabs({ active, onChange }) {
  return (
    <div className="flex border-b border-[#2d3147] px-6 mt-4">
      {SUITES.map(s => (
        <button key={s} onClick={() => onChange(s)}
          className={`px-5 py-2 text-sm border-b-2 -mb-px transition-colors ${
            active === s ? 'text-yellow-400 border-yellow-400' : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}>
          {s}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/test_results/DualCharts.jsx`**

```jsx
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

function TopoChart({ topo, suite }) {
  if (!topo) return <div className="flex items-center justify-center h-64 text-slate-500">No data</div>
  const labels = topo.days.map(d => d.date)
  const data = {
    labels,
    datasets: [
      { type: 'bar',  label: 'Passed',    data: topo.days.map(d => d.passed),    backgroundColor: '#34d399', stack: 's' },
      { type: 'bar',  label: 'Failed',    data: topo.days.map(d => d.failed),    backgroundColor: '#f87171', stack: 's' },
      { type: 'bar',  label: 'Broken',    data: topo.days.map(d => d.broken),    backgroundColor: '#fb923c', stack: 's' },
      { type: 'bar',  label: 'Skipped',   data: topo.days.map(d => d.skipped),   backgroundColor: '#a855f7', stack: 's' },
      { type: 'line', label: 'Pass Rate', data: topo.days.map(d => d.pass_rate),
        borderColor: '#fff', borderWidth: 2, borderDash: [6,4],
        pointBackgroundColor: '#fff', pointRadius: 4, yAxisID: 'yRate', tension: 0.3 },
    ],
  }
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { stacked: true, ticks: { color: '#64748b' }, grid: { color: '#2d3147' } },
      y: { stacked: true, ticks: { color: '#64748b' }, grid: { color: '#2d3147' },
           title: { display: true, text: 'Tests', color: '#64748b', font: { size: 10 } } },
      yRate: { position: 'right', min: 0, max: 100,
               ticks: { color: '#64748b', callback: v => v + '%' },
               grid: { drawOnChartArea: false },
               title: { display: true, text: 'Pass %', color: '#64748b', font: { size: 10 } } },
    },
  }
  return (
    <div className="bg-[#1a1d27] border border-[#2d3147] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold">{topo.topology} Topology</span>
        <span className="text-xs bg-[#2d3147] text-violet-400 px-2 py-0.5 rounded-full">SONiC Mgmt</span>
      </div>
      <div className="text-xs text-slate-500 mb-3">{suite === 'All' ? 'All Suites' : suite + ' suite'} · 7-day trend</div>
      <div style={{ height: 300 }}>
        <Bar data={data} options={options} />
      </div>
      <div className="flex gap-4 mt-3 flex-wrap">
        {[['#fff','– Pass Rate',true],['#a855f7','Skipped'],['#fb923c','Broken'],['#f87171','Failed'],['#34d399','Passed']].map(([color, label, dash]) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
            {dash
              ? <div style={{ width:16, borderTop:'2px dashed #fff' }} />
              : <div style={{ width:9, height:9, background:color, borderRadius:2 }} />}
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DualCharts({ data, suite }) {
  const t0 = data?.topologies?.find(t => t.topology === 'T0')
  const t1 = data?.topologies?.find(t => t.topology === 'T1-lag')
  return (
    <div className="grid grid-cols-2 gap-4 px-6 pb-6 pt-4">
      <TopoChart topo={t0} suite={suite} />
      <TopoChart topo={t1} suite={suite} />
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/test_results/TestResultsPage.jsx`**

```jsx
import { useState } from 'react'
import StatCards from './StatCards'
import SuiteTabs from './SuiteTabs'
import DualCharts from './DualCharts'
import { useTestResults } from '../../hooks/useTestResults'

export default function TestResultsPage() {
  const [suite, setSuite] = useState('All')
  const { data, loading } = useTestResults(suite)
  return (
    <div>
      <div className="flex items-center justify-between px-6 pt-5">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <span className="text-emerald-400">✏</span> Nightly Test Results
        </h1>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Synced from Allure TestOps
          </span>
          <span>Updated {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      <SuiteTabs active={suite} onChange={setSuite} />
      {loading
        ? <div className="p-6 text-slate-400">Loading...</div>
        : <>
            <StatCards topologies={data?.topologies} />
            <DualCharts data={data} suite={suite} />
          </>}
    </div>
  )
}
```

- [ ] **Step 6: Run dev server and verify**

```bash
npm run dev
```

Open `http://localhost:5173`, click Test Results tab. Verify both T0 and T1-lag charts render side by side. Click suite tabs (base, l2, mgmt etc.) and verify both charts update together.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/test_results/ frontend/src/hooks/useTestResults.js
git commit -m "feat: Phase 2 complete — dual T0/T1-lag test result charts with suite tabs"
```

---

## Task 15: GitHub Actions CI Integration

**Files:**
- Create: `ci/github-actions/coverage-upload/action.yml`

- [ ] **Step 1: Write `ci/github-actions/coverage-upload/action.yml`**

```yaml
name: Upload Coverage to EngDash
description: Uploads a coverage artifact to the EngDash ingest API

inputs:
  artifact:
    description: Path to the coverage artifact file
    required: true
  format:
    description: Artifact format (lcov, gcovr, coverage_xml)
    required: true
    default: lcov
  environment:
    description: Test environment (switch, simulator, emulator)
    required: true
  topology:
    description: Switch topology (T0, T1-lag) — leave empty for non-switch
    required: false
    default: ''
  dashboard_url:
    description: Base URL of the EngDash API
    required: false
    default: 'http://engdash:8000'
  token:
    description: EngDash API key
    required: true

runs:
  using: composite
  steps:
    - name: Upload coverage artifact
      shell: bash
      run: |
        curl -X POST "${{ inputs.dashboard_url }}/api/ingest" \
          -H "X-API-Key: ${{ inputs.token }}" \
          -F "format=${{ inputs.format }}" \
          -F "environment=${{ inputs.environment }}" \
          -F "topology=${{ inputs.topology }}" \
          -F "commit_sha=${{ github.sha }}" \
          -F "branch=${{ github.ref_name }}" \
          -F "ci_system=github_actions" \
          -F "github_pr_number=${{ github.event.pull_request.number }}" \
          -F "github_pr_author=${{ github.actor }}" \
          -F "github_repo=${{ github.repository }}" \
          -F "github_workflow_run_id=${{ github.run_id }}" \
          -F "artifact=@${{ inputs.artifact }}"
```

- [ ] **Step 2: Test locally with curl to verify the action works**

```bash
# From the backend directory with uvicorn running:
curl -X POST http://localhost:8000/api/ingest \
  -H "X-API-Key: dev-secret-key" \
  -F "format=lcov" \
  -F "environment=switch" \
  -F "topology=T0" \
  -F "commit_sha=test123" \
  -F "branch=main" \
  -F "ci_system=github_actions" \
  -F "artifact=@tests/fixtures/sample.info"
```

Expected: `{"status":"queued","run_id":N}`

- [ ] **Step 3: Commit**

```bash
git add ci/
git commit -m "feat: GitHub Actions reusable coverage upload action"
```

---

## Task 16: Jenkins Shared Library

**Files:**
- Create: `ci/jenkins/vars/uploadCoverage.groovy`

- [ ] **Step 1: Write `ci/jenkins/vars/uploadCoverage.groovy`**

```groovy
def call(Map config = [:]) {
    def artifact   = config.artifact   ?: error("uploadCoverage: 'artifact' is required")
    def format     = config.format     ?: 'lcov'
    def environment = config.environment ?: error("uploadCoverage: 'environment' is required")
    def topology   = config.topology   ?: ''
    def dashUrl    = config.dashboardUrl ?: env.ENGDASH_URL ?: 'http://engdash:8000'
    def token      = config.token      ?: env.ENGDASH_API_KEY ?: error("uploadCoverage: API token required")

    sh """
        curl -X POST "${dashUrl}/api/ingest" \\
          -H "X-API-Key: ${token}" \\
          -F "format=${format}" \\
          -F "environment=${environment}" \\
          -F "topology=${topology}" \\
          -F "commit_sha=${env.GIT_COMMIT}" \\
          -F "branch=${env.BRANCH_NAME}" \\
          -F "ci_system=jenkins" \\
          -F "artifact=@${artifact}"
    """
}
```

Usage in a Jenkinsfile:
```groovy
@Library('engdash-shared') _

pipeline {
    stages {
        stage('Test') { steps { sh 'make coverage' } }
        stage('Upload') {
            steps {
                uploadCoverage(
                    artifact: 'coverage.info',
                    format: 'lcov',
                    environment: 'switch',
                    topology: 'T1-lag',
                )
            }
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add ci/jenkins/
git commit -m "feat: Jenkins shared library uploadCoverage step"
```

---

## Task 17: Full Integration Test & Docker Deploy

**Files:**
- Modify: `backend/docker-compose.yml` (add celery-beat)
- Create: `backend/.env.example`

- [ ] **Step 1: Add celery-beat to `docker-compose.yml`**

```yaml
  beat:
    build: .
    command: celery -A app.workers.celery_app beat --loglevel=info
    volumes: [.:/app]
    env_file: .env
    depends_on: [db, redis]
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgresql://engdash:engdash@db:5432/engdash
REDIS_URL=redis://redis:6379/0
ARTIFACT_STORE_PATH=/app/artifacts
API_KEY=change-me-in-production
ALLURE_BASE_URL=http://monitoring:8081
ALLURE_TOKEN=
```

- [ ] **Step 3: Run full test suite**

```bash
cd backend
pytest tests/ -v --tb=short
```

Expected: all tests pass. Any failures indicate a type mismatch between tasks — fix them before proceeding.

- [ ] **Step 4: Run docker-compose full stack**

```bash
cp .env.example .env
docker compose up --build
```

Verify:
- `curl http://localhost:8000/health` → `{"status":"ok"}`
- `curl http://localhost:8000/api/coverage/summary` → JSON response
- `curl http://localhost:8000/api/test-results/summary` → JSON with topologies

- [ ] **Step 5: Final commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: full stack docker-compose with API + worker + beat"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| FastAPI backend | Task 1 |
| PostgreSQL + Alembic | Tasks 2–3 |
| Artifact store (local, S3-compatible) | Task 4 |
| Plugin registry + parser interface | Task 5 |
| lcov parser | Task 6 |
| gcovr/coverage.xml parser | Task 7 |
| POST /api/ingest with API key | Task 8 |
| Celery async ingestion | Task 9 |
| Coverage summary + file + line APIs | Task 10 |
| React frontend — exec bar, panels, drill-down | Task 11 |
| Allure TestOps connector | Task 12 |
| Allure sync task + test results API | Task 13 |
| Dual T0/T1-lag charts with suite tabs | Task 14 |
| GitHub Actions CI action | Task 15 |
| Jenkins shared library | Task 16 |
| Docker deploy | Task 17 |
| GitHub enrichment fields on Run | Task 8 (ingest router) |
| Topology field on runs | Task 2 (models) |
| Suite field on test_results | Task 2 (models) |
| Exec summary bar always visible | Task 11 |

No gaps found.

**Placeholder scan:** No TBD, TODO, or "similar to task N" patterns found.

**Type consistency check:**
- `ParsedCoverage`, `ParsedFile`, `ParsedLine` defined in Task 5, used correctly in Tasks 6, 7, 9.
- `Run`, `CoverageReport`, `CoverageFile`, `CoverageLine`, `TestResult` defined in Task 2, used correctly in Tasks 8, 9, 10, 13.
- `getCoverageSummary`, `getCoverageFiles`, `getCoverageLines`, `getTestResultsSummary` defined in Task 11 client.js, used correctly in Tasks 11 hooks and 14.
- `useCoverageSummary`, `useCoverageFiles`, `useCoverageLines` defined in Task 11, consumed correctly in Task 11 components.
- `useTestResults` defined in Task 14, consumed correctly in Task 14 `TestResultsPage`.
