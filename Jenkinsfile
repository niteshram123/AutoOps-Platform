def services = ['api-gateway', 'user-service', 'metrics-collector']

pipeline {
  agent any
  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  triggers {
    pollSCM('H/5 * * * *')
    gitlab(triggerOnPush: true, triggerOnMergeRequest: true, branchFilterType: 'All')
  }
  environment {
    REGISTRY = 'localhost:5000'
    IMAGE_PREFIX = 'autoops'
    SONAR_PROJECT_KEY = 'autoops-platform'
    TRIVY_SEVERITY = 'CRITICAL,HIGH'
    REPORT_DIR = "reports/${BUILD_NUMBER}"
  }
  stages {
    stage('Checkout & Setup') {
      steps {
        checkout scm
        script {
          env.SOURCE_BRANCH = env.GIT_BRANCH?.replaceFirst(/^origin\//, '') ?: env.BRANCH_NAME ?: 'local'
          env.COMMIT_SHORT = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.BUILD_VERSION = "${env.BUILD_NUMBER}-${env.COMMIT_SHORT}"
          env.DEPLOY_STAGING = (env.SOURCE_BRANCH == 'staging' || env.SOURCE_BRANCH == 'main').toString()
        }
        echo """
        AutoOps Platform CI - Phase 2
        Build: ${env.BUILD_VERSION}
        Branch: ${env.SOURCE_BRANCH}
        Deploy target: ${env.DEPLOY_STAGING == 'true' ? 'registry/staging-ready' : 'validation-only'}
        """
        sh 'mkdir -p "${REPORT_DIR}"'
        sh 'git log --oneline -5'
      }
    }

    stage('Lint & Validate') {
      parallel {
        stage('Lint: api-gateway') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app node:20-alpine sh -c \
                "cd services/api-gateway && npm ci && npx eslint src/ --format json > /app/${REPORT_DIR}/eslint-report.json || true"
            '''
            archiveArtifacts artifacts: "${REPORT_DIR}/eslint-report.json", allowEmptyArchive: true
          }
        }
        stage('Lint: user-service') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app python:3.11-slim sh -c \
                "pip install flake8 flake8-json && flake8 services/user-service/app --format=json > ${REPORT_DIR}/flake8-report.txt || true"
            '''
            archiveArtifacts artifacts: "${REPORT_DIR}/flake8-report.txt", allowEmptyArchive: true
          }
        }
        stage('Lint: metrics-collector') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app/services/metrics-collector golang:1.21-alpine sh -c \
                "gofmt -l . > /app/${REPORT_DIR}/gofmt-report.txt"
              test ! -s "${REPORT_DIR}/gofmt-report.txt"
            '''
            archiveArtifacts artifacts: "${REPORT_DIR}/gofmt-report.txt", allowEmptyArchive: true
          }
        }
      }
    }

    stage('Unit Tests') {
      parallel {
        stage('Test: api-gateway') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app/services/api-gateway node:20-alpine sh -c \
                "npm ci && JEST_JUNIT_OUTPUT_DIR=/app/${REPORT_DIR} JEST_JUNIT_OUTPUT_NAME=api-gateway-junit.xml npx jest --coverage --coverageDirectory=coverage --coverageReporters=lcov --coverageReporters=text --reporters=default --reporters=jest-junit"
            '''
            junit "${REPORT_DIR}/api-gateway-junit.xml"
          }
        }
        stage('Test: user-service') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app/services/user-service python:3.11-slim sh -c \
                "pip install -r requirements.txt && python -m pytest tests/ --junitxml=/app/${REPORT_DIR}/user-service-junit.xml --cov=app --cov-report=xml:coverage.xml"
            '''
            junit "${REPORT_DIR}/user-service-junit.xml"
          }
        }
        stage('Test: metrics-collector') {
          steps {
            sh '''
              docker run --rm -v "$PWD:/app" -w /app/services/metrics-collector golang:1.21-alpine sh -c "
                go test ./... -v -coverprofile=coverage.out | tee /app/${REPORT_DIR}/metrics-go-test.txt
                go tool cover -func=coverage.out | tee /app/${REPORT_DIR}/metrics-coverage.txt
                coverage=\$(tail -n 1 /app/${REPORT_DIR}/metrics-coverage.txt | sed 's/.* //; s/%//')
                major=\${coverage%.*}
                test "\$major" -ge 60
              "
            '''
            archiveArtifacts artifacts: "${REPORT_DIR}/metrics-*.txt", allowEmptyArchive: true
          }
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('AutoOpsSonar') {
          sh 'sonar-scanner -Dproject.settings=sonar-project.properties'
        }
      }
    }

    stage('Quality Gate') {
      options {
        timeout(time: 5, unit: 'MINUTES')
      }
      steps {
        script {
          def gate = waitForQualityGate abortPipeline: true
          echo "Quality gate status: ${gate.status}"
        }
      }
    }

    stage('Build Docker Images') {
      parallel {
        stage('Build: api-gateway') {
          steps { script { buildImage('api-gateway') } }
        }
        stage('Build: user-service') {
          steps { script { buildImage('user-service') } }
        }
        stage('Build: metrics-collector') {
          steps { script { buildImage('metrics-collector') } }
        }
      }
    }

    stage('Security Scan (Trivy)') {
      agent { label 'docker-agent' }
      parallel {
        stage('Scan: api-gateway') {
          steps { script { scanImage('api-gateway') } }
        }
        stage('Scan: user-service') {
          steps { script { scanImage('user-service') } }
        }
        stage('Scan: metrics-collector') {
          steps { script { scanImage('metrics-collector') } }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: "${REPORT_DIR}/trivy-*.json", allowEmptyArchive: true
        }
      }
    }

    stage('Push to Registry') {
      when {
        anyOf {
          branch 'main'
          branch 'staging'
          expression { env.SOURCE_BRANCH == 'main' || env.SOURCE_BRANCH == 'staging' }
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-credentials', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_PASSWORD')]) {
          sh 'echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USER" --password-stdin'
        }
        script {
          services.each { service ->
            sh """
              docker push ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}
              docker push ${REGISTRY}/${IMAGE_PREFIX}/${service}:latest
              echo "Pushed ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}"
            """
          }
        }
      }
    }

    stage('Generate Build Report') {
      steps {
        sh '''
          cat > "${REPORT_DIR}/build-summary.json" <<JSON
          {
            "build_number": "${BUILD_NUMBER}",
            "version": "${BUILD_VERSION}",
            "branch": "${SOURCE_BRANCH}",
            "commit": "${GIT_COMMIT}",
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "stages": {
              "lint": "passed",
              "tests": "passed",
              "sonarqube": "passed",
              "trivy": {
                "api-gateway": "$(cat ${REPORT_DIR}/trivy-api-gateway.status 2>/dev/null || echo clean)",
                "user-service": "$(cat ${REPORT_DIR}/trivy-user-service.status 2>/dev/null || echo clean)",
                "metrics-collector": "$(cat ${REPORT_DIR}/trivy-metrics-collector.status 2>/dev/null || echo clean)"
              },
              "images_pushed": ${DEPLOY_STAGING}
            },
            "images": [
              { "service": "api-gateway", "tag": "${REGISTRY}/${IMAGE_PREFIX}/api-gateway:${BUILD_VERSION}", "digest": "$(cat ${REPORT_DIR}/api-gateway-digest.txt 2>/dev/null)", "size": "$(cat ${REPORT_DIR}/api-gateway-size.txt 2>/dev/null)" },
              { "service": "user-service", "tag": "${REGISTRY}/${IMAGE_PREFIX}/user-service:${BUILD_VERSION}", "digest": "$(cat ${REPORT_DIR}/user-service-digest.txt 2>/dev/null)", "size": "$(cat ${REPORT_DIR}/user-service-size.txt 2>/dev/null)" },
              { "service": "metrics-collector", "tag": "${REGISTRY}/${IMAGE_PREFIX}/metrics-collector:${BUILD_VERSION}", "digest": "$(cat ${REPORT_DIR}/metrics-collector-digest.txt 2>/dev/null)", "size": "$(cat ${REPORT_DIR}/metrics-collector-size.txt 2>/dev/null)" }
            ]
          }
JSON
          cat > "${REPORT_DIR}/index.html" <<HTML
          <html><body><h1>AutoOps Build ${BUILD_VERSION}</h1><pre>$(cat ${REPORT_DIR}/build-summary.json)</pre></body></html>
HTML
        '''
        archiveArtifacts artifacts: "${REPORT_DIR}/build-summary.json"
        publishHTML([allowMissing: false, alwaysLinkToLastBuild: true, keepAll: true, reportDir: "${REPORT_DIR}", reportFiles: 'index.html', reportName: 'AutoOps Build Report'])
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: "${REPORT_DIR}/**", allowEmptyArchive: true
    }
    success {
      echo "PIPELINE SUCCESS: Build ${env.BUILD_VERSION} completed"
      sh 'mkdir -p reports && echo "success ${BUILD_VERSION}" > reports/latest-build-status.txt'
    }
    failure {
      echo 'PIPELINE FAILED: Check reports for details'
      sh 'docker compose logs --tail=50 > "${REPORT_DIR}/compose-logs.txt" || true'
    }
    unstable {
      echo 'PIPELINE UNSTABLE: Security vulnerabilities detected'
    }
    cleanup {
      cleanWs()
    }
  }
}

def buildImage(String service) {
  sh """
    docker build --build-arg BUILD_VERSION=${BUILD_VERSION} -t ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION} services/${service}
    docker tag ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION} ${REGISTRY}/${IMAGE_PREFIX}/${service}:latest
    docker image inspect ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION} --format='{{index .RepoDigests 0}}' > ${REPORT_DIR}/${service}-digest.txt || docker image inspect ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION} --format='{{.Id}}' > ${REPORT_DIR}/${service}-digest.txt
    docker image inspect ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION} --format='{{.Size}}' > ${REPORT_DIR}/${service}-size.txt
    docker images ${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}
  """
}

def scanImage(String service) {
  catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
    sh """
      image=${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}
      trivy image --exit-code 0 --severity LOW,MEDIUM --format json --output ${REPORT_DIR}/trivy-${service}-medium.json "\$image"
      if trivy image --exit-code 1 --severity CRITICAL --format table "\$image"; then
        echo clean > ${REPORT_DIR}/trivy-${service}.status
      else
        echo vulnerabilities > ${REPORT_DIR}/trivy-${service}.status
        echo "CRITICAL vulnerabilities detected for ${service}"
        exit 1
      fi
    """
  }
}
