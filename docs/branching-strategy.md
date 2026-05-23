# Branching Strategy

```mermaid
gitGraph
   commit id: "initial"
   branch develop
   checkout develop
   commit id: "feat: base services"
   branch feature/add-auth
   checkout feature/add-auth
   commit id: "add auth logic"
   commit id: "add auth tests"
   checkout develop
   merge feature/add-auth id: "PR merge" tag: "Jenkinsfile.feature runs"
   branch staging
   checkout staging
   merge develop id: "staging deploy" tag: "Full pipeline runs"
   checkout main
   merge staging id: "production release" tag: "Full pipeline + push"
```

## Branch Names

Use `feature/<ticket-id>-<description>` for feature work, `staging` for release validation, and `main` for production-ready releases.

## Commits

Use `<type>(<scope>): <description>`.

Allowed types: `feat`, `fix`, `ci`, `docs`, `refactor`, `test`.

## Pull Requests

Every pull request requires at least 1 reviewer, all CI checks passing, and no direct commits to `main`.

## Pipeline Behavior

| Branch type | Jenkinsfile | Lint | Tests | SonarQube | Trivy | Registry push |
| --- | --- | --- | --- | --- | --- | --- |
| `feature/*` | `Jenkinsfile.feature` | Yes | Yes | No | CRITICAL fail only | No |
| `develop` | `Jenkinsfile.feature` | Yes | Yes | No | CRITICAL fail only | No |
| `staging` | `Jenkinsfile` | Yes | Yes | Yes, quality gate enforced | CRITICAL fails/unstable | Yes |
| `main` | `Jenkinsfile` | Yes | Yes | Yes, quality gate enforced | CRITICAL fails/unstable | Yes |
