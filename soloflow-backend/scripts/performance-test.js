/**
 * Script de Teste de Performance do SoloFlow
 *
 * Executa testes de carga em endpoints principais do sistema
 * Requisitos: Backend rodando em http://localhost:3000
 *
 * Uso: node scripts/performance-test.js [--quick|--full]
 */

const autocannon = require('autocannon');

// Configuração base
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_DURATION = process.argv.includes('--quick') ? 5 : 10; // segundos
const CONNECTIONS = 10; // conexões simultâneas
const PIPELINE = 1; // requisições em pipeline

// Token de autenticação (pode ser passado via variável de ambiente)
let AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || null;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('═'.repeat(60));
}

function formatNumber(num) {
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Executa um teste de performance em um endpoint
 */
async function runTest(config) {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: config.url,
      method: config.method || 'GET',
      headers: config.headers || {},
      body: config.body || undefined,
      connections: config.connections || CONNECTIONS,
      pipelining: config.pipelining || PIPELINE,
      duration: config.duration || TEST_DURATION,
      timeout: 10, // segundos
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });

    // Progresso durante o teste
    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: false,
    });
  });
}

/**
 * Exibe os resultados de um teste
 */
function displayResults(name, result) {
  log(`\n📊 Resultados: ${name}`, colors.bright);
  console.log('─'.repeat(50));

  // Métricas principais
  log(`  Requisições/seg: ${formatNumber(result.requests.average)}`, colors.green);
  log(`  Latência média:  ${formatNumber(result.latency.average)} ms`, colors.yellow);
  log(`  Latência p99:    ${formatNumber(result.latency.p99)} ms`, colors.yellow);
  log(`  Throughput:      ${formatBytes(result.throughput.average)}/seg`, colors.cyan);

  // Erros
  const totalRequests = result.requests.total;
  const errors = result.errors + result.timeouts;
  const errorRate = ((errors / totalRequests) * 100).toFixed(2);

  if (errors > 0) {
    log(`  Erros:           ${errors} (${errorRate}%)`, colors.red);
  } else {
    log(`  Erros:           0 ✓`, colors.green);
  }

  // Códigos de status
  if (result.statusCodeStats) {
    const statusCodes = Object.entries(result.statusCodeStats)
      .map(([code, count]) => `${code}: ${count}`)
      .join(', ');
    log(`  Status codes:    ${statusCodes}`, colors.magenta);
  }

  return {
    name,
    requestsPerSec: result.requests.average,
    latencyAvg: result.latency.average,
    latencyP99: result.latency.p99,
    throughput: result.throughput.average,
    errors,
    total: totalRequests,
  };
}

/**
 * Testa autenticação (login)
 */
async function testLogin() {
  logSection('Teste: Login (Rate Limited - 15/15min)');

  // Usar credenciais de teste (não deve fazer login real em produção)
  const result = await runTest({
    url: `${BASE_URL}/auth/login`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@test.com',
      password: 'testpassword123',
    }),
    connections: 5, // Menos conexões para não atingir rate limit muito rápido
    duration: 3, // Curto para não bloquear
  });

  return displayResults('Login', result);
}

/**
 * Testa endpoint público (health check)
 */
async function testHealthCheck() {
  logSection('Teste: Health Check (Público)');

  const result = await runTest({
    url: `${BASE_URL}/`,
    method: 'GET',
  });

  return displayResults('Health Check', result);
}

/**
 * Testa listagem de processos (autenticado)
 */
async function testProcessesList() {
  if (!AUTH_TOKEN) {
    log('⚠️  Pulando teste de processos (sem token de autenticação)', colors.yellow);
    return null;
  }

  logSection('Teste: Listagem de Processos (Autenticado)');

  const result = await runTest({
    url: `${BASE_URL}/processes`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  return displayResults('Listagem de Processos', result);
}

/**
 * Testa listagem de tipos de processo (autenticado)
 */
async function testProcessTypesList() {
  if (!AUTH_TOKEN) {
    log('⚠️  Pulando teste de tipos de processo (sem token)', colors.yellow);
    return null;
  }

  logSection('Teste: Listagem de Tipos de Processo (Autenticado)');

  const result = await runTest({
    url: `${BASE_URL}/process-types`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  return displayResults('Tipos de Processo', result);
}

/**
 * Testa notificações (autenticado)
 */
async function testNotifications() {
  if (!AUTH_TOKEN) {
    log('⚠️  Pulando teste de notificações (sem token)', colors.yellow);
    return null;
  }

  logSection('Teste: Notificações (Autenticado)');

  const result = await runTest({
    url: `${BASE_URL}/notifications`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  return displayResults('Notificações', result);
}

/**
 * Testa busca de usuários (autenticado)
 */
async function testUsersList() {
  if (!AUTH_TOKEN) {
    log('⚠️  Pulando teste de usuários (sem token)', colors.yellow);
    return null;
  }

  logSection('Teste: Listagem de Usuários (Autenticado)');

  const result = await runTest({
    url: `${BASE_URL}/users`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  return displayResults('Listagem de Usuários', result);
}

/**
 * Teste de stress do rate limiting
 */
async function testRateLimiting() {
  logSection('Teste: Rate Limiting (Stress Test)');

  log('Enviando muitas requisições para testar rate limiting...', colors.yellow);

  const result = await runTest({
    url: `${BASE_URL}/`,
    method: 'GET',
    connections: 50, // Muitas conexões simultâneas
    duration: 5,
  });

  const stats = displayResults('Rate Limiting', result);

  // Verificar se houve respostas 429
  if (result.statusCodeStats && result.statusCodeStats['429']) {
    log(`\n✅ Rate limiting está funcionando! (${result.statusCodeStats['429']} requisições bloqueadas)`, colors.green);
  } else {
    log('\n⚠️  Rate limiting pode não estar ativo ou o limite não foi atingido', colors.yellow);
  }

  return stats;
}

/**
 * Gera relatório final
 */
function generateReport(results) {
  logSection('📈 RELATÓRIO FINAL DE PERFORMANCE');

  const validResults = results.filter(r => r !== null);

  if (validResults.length === 0) {
    log('Nenhum resultado válido para exibir', colors.yellow);
    return;
  }

  // Tabela resumo
  console.log('\n┌' + '─'.repeat(58) + '┐');
  console.log('│' + ' '.repeat(18) + 'RESUMO DOS TESTES' + ' '.repeat(23) + '│');
  console.log('├' + '─'.repeat(20) + '┬' + '─'.repeat(12) + '┬' + '─'.repeat(12) + '┬' + '─'.repeat(12) + '┤');
  console.log('│ Endpoint           │  Req/seg   │ Lat. Avg   │ Lat. p99   │');
  console.log('├' + '─'.repeat(20) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(12) + '┤');

  for (const r of validResults) {
    const name = r.name.substring(0, 18).padEnd(18);
    const rps = formatNumber(r.requestsPerSec).padStart(10);
    const latAvg = `${formatNumber(r.latencyAvg)}ms`.padStart(10);
    const latP99 = `${formatNumber(r.latencyP99)}ms`.padStart(10);
    console.log(`│ ${name} │ ${rps} │ ${latAvg} │ ${latP99} │`);
  }

  console.log('└' + '─'.repeat(20) + '┴' + '─'.repeat(12) + '┴' + '─'.repeat(12) + '┴' + '─'.repeat(12) + '┘');

  // Estatísticas gerais
  const avgRps = validResults.reduce((sum, r) => sum + r.requestsPerSec, 0) / validResults.length;
  const avgLatency = validResults.reduce((sum, r) => sum + r.latencyAvg, 0) / validResults.length;
  const totalErrors = validResults.reduce((sum, r) => sum + r.errors, 0);
  const totalRequests = validResults.reduce((sum, r) => sum + r.total, 0);

  console.log('\n📊 Estatísticas Gerais:');
  log(`   • Média de req/seg: ${formatNumber(avgRps)}`, colors.green);
  log(`   • Latência média: ${formatNumber(avgLatency)} ms`, colors.yellow);
  log(`   • Total de requisições: ${formatNumber(totalRequests)}`, colors.cyan);
  log(`   • Total de erros: ${totalErrors}`, totalErrors > 0 ? colors.red : colors.green);

  // Recomendações
  console.log('\n💡 Recomendações:');
  if (avgLatency > 100) {
    log('   ⚠️  Latência média alta (>100ms). Considere otimizar queries do banco.', colors.yellow);
  }
  if (avgRps < 100) {
    log('   ⚠️  Throughput baixo (<100 req/seg). Verifique gargalos de I/O.', colors.yellow);
  }
  if (avgLatency <= 50 && avgRps >= 500) {
    log('   ✅ Performance excelente!', colors.green);
  } else if (avgLatency <= 100 && avgRps >= 200) {
    log('   ✅ Performance boa para aplicação de workflow.', colors.green);
  }
}

/**
 * Execução principal
 */
async function main() {
  console.clear();
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          SOLOFLOW - TESTE DE PERFORMANCE                   ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  log(`\n🎯 Alvo: ${BASE_URL}`, colors.bright);
  log(`⏱️  Duração por teste: ${TEST_DURATION} segundos`, colors.bright);
  log(`🔗 Conexões simultâneas: ${CONNECTIONS}`, colors.bright);

  if (AUTH_TOKEN) {
    log('🔑 Token de autenticação: Configurado', colors.green);
  } else {
    log('🔑 Token de autenticação: Não configurado (testes autenticados serão pulados)', colors.yellow);
    log('   Para testar endpoints autenticados, defina: TEST_AUTH_TOKEN=<seu_token>', colors.yellow);
  }

  const results = [];

  try {
    // Testes públicos
    results.push(await testHealthCheck());

    // Testes autenticados
    results.push(await testProcessesList());
    results.push(await testProcessTypesList());
    results.push(await testNotifications());
    results.push(await testUsersList());

    // Teste de rate limiting
    results.push(await testRateLimiting());

    // Teste de login (por último pois pode bloquear)
    results.push(await testLogin());

  } catch (error) {
    log(`\n❌ Erro durante os testes: ${error.message}`, colors.red);
    if (error.code === 'ECONNREFUSED') {
      log('   Verifique se o backend está rodando em ' + BASE_URL, colors.yellow);
    }
    process.exit(1);
  }

  // Relatório final
  generateReport(results);

  console.log('\n' + '═'.repeat(60));
  log('  Teste de performance concluído!', colors.green);
  console.log('═'.repeat(60) + '\n');
}

// Executar
main().catch(console.error);
