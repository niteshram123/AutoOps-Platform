#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <job-name> <branch>" >&2
  exit 2
fi

job_name="$1"
branch="$2"
jenkins_url="${JENKINS_URL:-http://localhost:8080}"
jenkins_user="${JENKINS_USER:-admin}"
jenkins_token="${JENKINS_TOKEN:-autoops-admin-2024}"

crumb="$(curl -fsS -u "$jenkins_user:$jenkins_token" "$jenkins_url/crumbIssuer/api/json" | jq -r '.crumbRequestField + ":" + .crumb')"
queue_url="$(curl -fsSI -u "$jenkins_user:$jenkins_token" -H "$crumb" -X POST "$jenkins_url/job/$job_name/buildWithParameters?BRANCH=$branch" | awk -F': ' '/^Location:/ {print $2}' | tr -d '\r')"

echo "Queued build: $queue_url"
build_url=""
while [ -z "$build_url" ]; do
  sleep 3
  build_url="$(curl -fsS -u "$jenkins_user:$jenkins_token" "${queue_url}api/json" | jq -r '.executable.url // empty')"
done

echo "Build started: $build_url"
while true; do
  result="$(curl -fsS -u "$jenkins_user:$jenkins_token" "${build_url}api/json" | jq -r '.result // empty')"
  building="$(curl -fsS -u "$jenkins_user:$jenkins_token" "${build_url}api/json" | jq -r '.building')"
  [ "$building" = "false" ] && break
  sleep 10
done

echo "Final result: $result"
[ "$result" = "SUCCESS" ]
