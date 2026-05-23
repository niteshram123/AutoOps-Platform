pipeline {
  agent any
  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 5, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }
  environment {
    REPORT_DIR = "reports/${BUILD_NUMBER}"
    REGISTRY = 'localhost:5000'
    IMAGE_PREFIX = 'autoops'
  }
  stages {
    stage('Checkout & Setup') {
      steps {
        checkout scm
        script {
          env.COMMIT_SHORT = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.BUILD_VERSION = "${env.BUILD_NUMBER}-${env.COMMIT_SHORT}"
        }
        sh 'mkdir -p "${REPORT_DIR}"'
        echo "Feature branch fast feedback for ${env.BUILD_VERSION}"
      }
    }
    stage('Lint') {
      parallel {
        stage('api-gateway') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app/services/api-gateway node:20-alpine sh -c "npm ci && npx eslint src/ || true"'
          }
        }
        stage('user-service') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app python:3.11-slim sh -c "pip install flake8 && flake8 services/user-service/app || true"'
          }
        }
        stage('metrics-collector') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app/services/metrics-collector golang:1.21-alpine sh -c "test -z \\"$(gofmt -l .)\\""'
          }
        }
      }
    }
    stage('Tests') {
      parallel {
        stage('api-gateway') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app/services/api-gateway node:20-alpine sh -c "npm ci && npm test"'
          }
        }
        stage('user-service') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app/services/user-service python:3.11-slim sh -c "pip install -r requirements.txt && python -m pytest tests/"'
          }
        }
        stage('metrics-collector') {
          steps {
            sh 'docker run --rm -v "$PWD:/app" -w /app/services/metrics-collector golang:1.21-alpine sh -c "go test ./..."'
          }
        }
      }
    }
    stage('Build Images') {
      steps {
        sh '''
          for service in api-gateway user-service metrics-collector; do
            docker build -t "${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}" "services/${service}"
          done
        '''
      }
    }
    stage('Trivy CRITICAL Scan') {
      steps {
        sh '''
          for service in api-gateway user-service metrics-collector; do
            image="${REGISTRY}/${IMAGE_PREFIX}/${service}:${BUILD_VERSION}"
            trivy image --exit-code 0 --severity HIGH --format json --output "${REPORT_DIR}/trivy-${service}-high.json" "$image"
            trivy image --exit-code 1 --severity CRITICAL --format table "$image"
          done
        '''
      }
      post {
        always {
          archiveArtifacts artifacts: "${REPORT_DIR}/trivy-*.json", allowEmptyArchive: true
        }
      }
    }
  }
  post {
    always {
      sh 'mkdir -p reports && echo "feature ${BUILD_VERSION} ${BUILD_RESULT:-completed}" > reports/latest-build-status.txt'
      archiveArtifacts artifacts: "${REPORT_DIR}/**", allowEmptyArchive: true
      cleanWs()
    }
  }
}
