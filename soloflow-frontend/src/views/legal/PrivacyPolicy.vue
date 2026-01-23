<template>
  <div class="legal-page">
    <v-container class="py-8">
      <v-card class="legal-card" elevation="0">
        <v-card-title class="legal-title">
          <v-icon class="mr-3" color="primary">mdi-shield-lock</v-icon>
          Política de Privacidade
        </v-card-title>

        <v-card-subtitle class="legal-version">
          Versão 1.0 - Última atualização: Janeiro de 2026
        </v-card-subtitle>

        <v-card-text class="legal-content">
          <section class="legal-section">
            <h2>1. Introdução</h2>
            <p>
              A <strong>SoloFlow</strong> ("nós", "nosso" ou "empresa") está comprometida em proteger
              a privacidade e os dados pessoais de nossos usuários. Esta Política de Privacidade
              descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais
              em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section class="legal-section">
            <h2>2. Dados Coletados</h2>
            <p>Coletamos os seguintes tipos de dados pessoais:</p>

            <h3>2.1. Dados de Identificação</h3>
            <ul>
              <li><strong>Nome completo:</strong> Para identificação no sistema</li>
              <li><strong>E-mail:</strong> Para autenticação e comunicação</li>
              <li><strong>CPF:</strong> Para assinaturas digitais (quando aplicável)</li>
              <li><strong>Telefone:</strong> Para contato (opcional)</li>
            </ul>

            <h3>2.2. Dados de Uso</h3>
            <ul>
              <li>Endereço IP e informações do dispositivo</li>
              <li>Data e hora de acesso</li>
              <li>Ações realizadas no sistema (logs de auditoria)</li>
              <li>Documentos e arquivos enviados</li>
            </ul>

            <h3>2.3. Dados de Assinatura Digital</h3>
            <ul>
              <li>Hash criptográfico do documento assinado</li>
              <li>Timestamp da assinatura</li>
              <li>Informações do certificado digital (quando aplicável)</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>3. Finalidade do Tratamento</h2>
            <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            <ul>
              <li>Autenticação e controle de acesso ao sistema</li>
              <li>Execução de processos e fluxos de trabalho</li>
              <li>Assinatura digital de documentos</li>
              <li>Auditoria e rastreabilidade de ações</li>
              <li>Comunicações relacionadas ao serviço</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>4. Base Legal</h2>
            <p>O tratamento de seus dados pessoais é realizado com base em:</p>
            <ul>
              <li><strong>Consentimento:</strong> Quando você aceita esta política</li>
              <li><strong>Execução de contrato:</strong> Para prestação dos serviços contratados</li>
              <li><strong>Obrigação legal:</strong> Para cumprimento de requisitos regulatórios</li>
              <li><strong>Interesse legítimo:</strong> Para segurança e melhoria dos serviços</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>5. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser compartilhados com:</p>
            <ul>
              <li>Outros usuários da mesma empresa (conforme permissões definidas)</li>
              <li>Provedores de infraestrutura (Cloudflare R2 para armazenamento)</li>
              <li>Autoridades competentes (quando exigido por lei)</li>
            </ul>
            <p>
              <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros
              para fins de marketing.</strong>
            </p>
          </section>

          <section class="legal-section">
            <h2>6. Segurança dos Dados</h2>
            <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul>
              <li>Criptografia de dados sensíveis (CPF, senhas)</li>
              <li>Autenticação segura com JWT</li>
              <li>Controle de acesso baseado em perfis</li>
              <li>Logs de auditoria para rastreabilidade</li>
              <li>HTTPS obrigatório em produção</li>
              <li>Rate limiting para proteção contra ataques</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>7. Retenção de Dados</h2>
            <p>Mantemos seus dados pessoais pelo tempo necessário para:</p>
            <ul>
              <li>Cumprir as finalidades descritas nesta política</li>
              <li>Atender requisitos legais e regulatórios</li>
              <li>Exercício regular de direitos em processo judicial</li>
            </ul>
            <p>
              Logs de auditoria são mantidos por até 5 anos para fins de compliance.
              Dados de usuários inativos podem ser anonimizados após 2 anos.
            </p>
          </section>

          <section class="legal-section">
            <h2>8. Seus Direitos (Art. 18 da LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul>
              <li><strong>Confirmação:</strong> Saber se tratamos seus dados</li>
              <li><strong>Acesso:</strong> Obter cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
              <li><strong>Anonimização:</strong> Solicitar anonimização de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Eliminação:</strong> Solicitar exclusão dos seus dados</li>
              <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
            </ul>
            <p>
              Para exercer seus direitos, acesse as configurações de privacidade no sistema
              ou entre em contato conosco.
            </p>
          </section>

          <section class="legal-section">
            <h2>9. Transferência Internacional</h2>
            <p>
              Seus dados podem ser armazenados em servidores localizados fora do Brasil
              (Cloudflare). Garantimos que nossos provedores adotam medidas de segurança
              adequadas e cumprem com padrões internacionais de proteção de dados.
            </p>
          </section>

          <section class="legal-section">
            <h2>10. Cookies e Tecnologias Semelhantes</h2>
            <p>
              Utilizamos cookies e tecnologias semelhantes para autenticação e melhoria
              da experiência do usuário. Você pode gerenciar suas preferências de cookies
              nas configurações do seu navegador.
            </p>
          </section>

          <section class="legal-section">
            <h2>11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos
              você sobre alterações significativas por e-mail ou através do sistema.
              Recomendamos que você revise esta política regularmente.
            </p>
          </section>

          <section class="legal-section">
            <h2>12. Contato</h2>
            <p>Para dúvidas, solicitações ou exercício de direitos, entre em contato:</p>
            <ul>
              <li><strong>E-mail:</strong> privacidade@soloflow.com.br</li>
              <li><strong>Encarregado de Dados (DPO):</strong> dpo@soloflow.com.br</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>13. Autoridade Nacional de Proteção de Dados</h2>
            <p>
              Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção
              de Dados (ANPD) caso entenda que seus direitos não foram atendidos.
            </p>
            <p>
              <strong>Site:</strong> <a href="https://www.gov.br/anpd" target="_blank">www.gov.br/anpd</a>
            </p>
          </section>
        </v-card-text>

        <v-divider />

        <v-card-actions class="legal-actions">
          <v-btn
            v-if="showBackButton"
            variant="text"
            @click="$router.back()"
          >
            <v-icon left>mdi-arrow-left</v-icon>
            Voltar
          </v-btn>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">
            Documento atualizado em Janeiro de 2026
          </span>
        </v-card-actions>
      </v-card>
    </v-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const showBackButton = computed(() => {
  return route.query.from !== 'register'
})
</script>

<style scoped>
.legal-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.legal-card {
  max-width: 900px;
  margin: 0 auto;
  border-radius: 16px !important;
  background: white;
}

.legal-title {
  font-size: 1.75rem !important;
  font-weight: 700;
  color: var(--color-neutral-900);
  padding: 24px 24px 8px;
}

.legal-version {
  color: var(--color-neutral-500);
  padding: 0 24px 16px;
}

.legal-content {
  padding: 24px;
  line-height: 1.7;
  color: var(--color-neutral-700);
}

.legal-section {
  margin-bottom: 32px;
}

.legal-section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-900);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-primary-100);
}

.legal-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 16px 0 8px;
}

.legal-section p {
  margin-bottom: 12px;
}

.legal-section ul {
  margin: 12px 0;
  padding-left: 24px;
}

.legal-section li {
  margin-bottom: 8px;
}

.legal-section a {
  color: var(--color-primary-600);
  text-decoration: none;
}

.legal-section a:hover {
  text-decoration: underline;
}

.legal-actions {
  padding: 16px 24px;
}
</style>
