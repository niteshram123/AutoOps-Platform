import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.util.Secret

def store = SystemCredentialsProvider.getInstance().getStore()

def upsertCredential = { credential ->
    def existing = store.getCredentials(Domain.global()).find { it.id == credential.id }
    if (existing) {
        store.updateCredentials(Domain.global(), existing, credential)
    } else {
        store.addCredentials(Domain.global(), credential)
    }
}

upsertCredential(new StringCredentialsImpl(
    CredentialsScope.GLOBAL,
    'sonarqube-token',
    'SonarQube API Token',
    Secret.fromString(System.getenv('SONARQUBE_TOKEN') ?: 'autoops-sonar-token')
))

upsertCredential(new UsernamePasswordCredentialsImpl(
    CredentialsScope.GLOBAL,
    'registry-credentials',
    'Local registry credentials',
    System.getenv('REGISTRY_USER') ?: 'admin',
    System.getenv('REGISTRY_PASSWORD') ?: 'autoops-registry-2024'
))

upsertCredential(new StringCredentialsImpl(
    CredentialsScope.GLOBAL,
    'gitlab-webhook-secret',
    'GitLab webhook secret',
    Secret.fromString(System.getenv('GITLAB_WEBHOOK_SECRET') ?: 'autoops-webhook-secret')
))

SystemCredentialsProvider.getInstance().save()
