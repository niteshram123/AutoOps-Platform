{{- define "autoops-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "autoops-platform.labels" -}}
app.kubernetes.io/name: {{ include "autoops-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
project: {{ .Values.global.project | default "autoops" }}
environment: {{ .Values.global.environment | default "staging" }}
{{- end -}}
