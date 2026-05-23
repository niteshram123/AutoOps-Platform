#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <image-name> <severity> <report-dir>" >&2
  exit 2
fi

image="$1"
severity="$2"
report_dir="$3"
safe_name="$(echo "$image" | tr '/:' '__')"
json_report="$report_dir/trivy-${safe_name}.json"
html_summary="$report_dir/trivy-${safe_name}.html"

mkdir -p "$report_dir"

if command -v trivy >/dev/null 2>&1; then
  trivy_cmd=(trivy image)
else
  trivy_cmd=(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD/.trivy-cache:/root/.cache/" aquasec/trivy:0.47.0 image)
fi

"${trivy_cmd[@]}" --exit-code 0 --severity "$severity" --format json --output "$json_report" "$image"

critical="$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "$json_report")"
high="$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' "$json_report")"
medium="$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM")] | length' "$json_report")"
low="$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="LOW")] | length' "$json_report")"

printf "\n%-10s %s\n" "Severity" "Count"
printf "%-10s %s\n" "CRITICAL" "$critical"
printf "%-10s %s\n" "HIGH" "$high"
printf "%-10s %s\n" "MEDIUM" "$medium"
printf "%-10s %s\n" "LOW" "$low"

cat > "$html_summary" <<HTML
<table>
  <tr><th>Severity</th><th>Count</th></tr>
  <tr><td>CRITICAL</td><td>$critical</td></tr>
  <tr><td>HIGH</td><td>$high</td></tr>
  <tr><td>MEDIUM</td><td>$medium</td></tr>
  <tr><td>LOW</td><td>$low</td></tr>
</table>
HTML

if [ "$critical" -gt 0 ]; then
  exit 1
fi
