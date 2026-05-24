{{- define "user-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "user-service.fullname" -}}
{{- default (include "user-service.name" .) .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "user-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "user-service.labels" -}}
helm.sh/chart: {{ include "user-service.chart" . }}
app.kubernetes.io/name: {{ include "user-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app: user-service
project: {{ .Values.global.project | default "autoops" }}
environment: {{ .Values.global.environment | default "staging" }}
{{- end -}}

{{- define "user-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "user-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: user-service
{{- end -}}

{{- define "user-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "user-service.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}
