#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <project-key> <sonar-url> <token>" >&2
  exit 2
fi

project_key="$1"
sonar_url="${2%/}"
token="$3"
deadline=$((SECONDS + 180))

while [ "$SECONDS" -lt "$deadline" ]; do
  response="$(curl -fsS -u "$token:" "$sonar_url/api/qualitygates/project_status?projectKey=$project_key")"
  status="$(echo "$response" | jq -r '.projectStatus.status')"

  echo "Quality gate status: $status"
  echo "$response" | jq -r '.projectStatus.conditions[]? | "\(.metricKey): \(.status) actual=\(.actualValue // "n/a") threshold=\(.errorThreshold // "n/a")"'

  case "$status" in
    OK|PASSED) exit 0 ;;
    ERROR|FAILED) exit 1 ;;
  esac

  sleep 10
done

echo "Timed out waiting for SonarQube quality gate" >&2
exit 1
