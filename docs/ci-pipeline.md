# CI Pipeline

Phase 2 adds a Dockerized Jenkins CI stack with SonarQube, Trivy, and a local Docker registry.

## Services

| Component | URL | Purpose |
| --- | --- | --- |
| Jenkins | http://localhost:8080 | Pipeline orchestration |
| SonarQube | http://localhost:9000 | Static analysis and quality gates |
| Registry | http://localhost:5000 | Local image registry |
| Registry UI | http://localhost:5001 | Registry browser |

## Bootstrap

```bash
./scripts/ci/setup-jenkins.sh
```

The script checks prerequisites, creates `autoops-network`, starts the registry, starts Jenkins and SonarQube, creates the SonarQube project, and prints a generated token.

## Pipeline Flow

`Checkout -> Lint -> Unit Tests -> SonarQube -> Quality Gate -> Build Images -> Trivy -> Push -> Build Report`

`main` and `staging` run the full pipeline and push images. `feature/*` branches use `Jenkinsfile.feature` for fast lint, tests, image build, and CRITICAL-only Trivy checks.

## Reports

Build artifacts are written under `reports/<BUILD_NUMBER>/` and archived by Jenkins:

- JUnit reports
- lint reports
- Trivy JSON reports
- image digests and sizes
- `build-summary.json`
- HTML build report

Status notifications are simulated with Jenkins log output and `reports/latest-build-status.txt`.
