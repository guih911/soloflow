/**
 * 🔍 SCRIPT DE AUDITORIA - USUÁRIOS DUPLICADOS
 *
 * Sistema de Workflow Profissional
 *
 * Este script identifica usuários com nomes duplicados na mesma empresa
 * e fornece relatório detalhado para correção manual ou automática.
 *
 * Uso:
 *   node scripts/audit-duplicate-users.js
 *   node scripts/audit-duplicate-users.js --fix  (para correção automática - CUIDADO!)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  console.log('\n' + '='.repeat(80))
  log(message, 'bright')
  console.log('='.repeat(80) + '\n')
}

async function auditDuplicateUsers() {
  logHeader('🔍 AUDITORIA DE USUÁRIOS DUPLICADOS')

  try {
    // 1. Buscar todas as empresas
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    log(`📊 Analisando ${companies.length} empresa(s) ativa(s)...`, 'cyan')

    let totalDuplicates = 0
    const duplicatesByCompany = []

    // 2. Para cada empresa, verificar duplicatas
    for (const company of companies) {
      log(`\n🏢 Empresa: ${company.name}`, 'blue')

      // Buscar todos os usuários da empresa
      const users = await prisma.user.findMany({
        where: {
          userCompanies: {
            some: {
              companyId: company.id
            }
          }
        },
        include: {
          userCompanies: {
            where: { companyId: company.id },
            include: {
              sector: true
            }
          }
        }
      })

      // Agrupar por nome
      const nameGroups = {}
      users.forEach(user => {
        const name = user.name
        if (!nameGroups[name]) {
          nameGroups[name] = []
        }
        nameGroups[name].push(user)
      })

      // Identificar duplicatas (mais de 1 usuário com mesmo nome)
      const duplicates = Object.entries(nameGroups)
        .filter(([name, users]) => users.length > 1)
        .map(([name, users]) => ({ name, users }))

      if (duplicates.length > 0) {
        log(`   ⚠️  Encontradas ${duplicates.length} duplicata(s) de nome:`, 'yellow')

        duplicates.forEach(({ name, users }) => {
          log(`\n   📝 Nome duplicado: "${name}" (${users.length} usuários)`, 'red')

          users.forEach((user, index) => {
            const userCompany = user.userCompanies[0]
            const sector = userCompany?.sector?.name || 'Sem setor'
            const role = userCompany?.role || 'N/A'

            console.log(`      ${index + 1}. ${user.email}`)
            console.log(`         ID: ${user.id}`)
            console.log(`         Setor: ${sector}`)
            console.log(`         Role: ${role}`)
            console.log(`         Criado em: ${user.createdAt.toLocaleDateString('pt-BR')}`)
          })

          // Sugestões de correção
          log(`\n   💡 Sugestões de nomes únicos:`, 'cyan')
          users.forEach((user, index) => {
            const userCompany = user.userCompanies[0]
            const sector = userCompany?.sector?.name

            let suggestion = name
            if (sector) {
              suggestion = `${name} - ${sector}`
            } else {
              suggestion = `${name} (${user.email.split('@')[0]})`
            }

            console.log(`      ${index + 1}. "${suggestion}"`)
          })
        })

        totalDuplicates += duplicates.length
        duplicatesByCompany.push({
          companyId: company.id,
          companyName: company.name,
          duplicates
        })
      } else {
        log(`   ✅ Nenhuma duplicata encontrada`, 'green')
      }
    }

    // 3. Resumo final
    logHeader('📋 RESUMO DA AUDITORIA')

    if (totalDuplicates === 0) {
      log('✅ Parabéns! Nenhum usuário duplicado encontrado.', 'green')
      log('   Seu sistema está seguindo as melhores práticas de workflow.', 'green')
    } else {
      log(`⚠️  Total de nomes duplicados: ${totalDuplicates}`, 'red')
      log(`   Empresas afetadas: ${duplicatesByCompany.length}`, 'yellow')

      log('\n🔧 AÇÕES RECOMENDADAS:', 'bright')
      log('   1. Renomeie os usuários manualmente usando nomes mais específicos')
      log('   2. Adicione sobrenomes completos ou departamentos aos nomes')
      log('   3. A partir de agora, o sistema impedirá novos cadastros duplicados')
      log('\n   💡 Dica: Use o formato "Nome Completo" ou "Nome - Departamento"')
    }

    // 4. Exportar relatório JSON (opcional)
    if (duplicatesByCompany.length > 0) {
      const fs = require('fs')
      const reportPath = './scripts/duplicate-users-report.json'

      const report = {
        generatedAt: new Date().toISOString(),
        totalDuplicates,
        companies: duplicatesByCompany.map(({ companyId, companyName, duplicates }) => ({
          companyId,
          companyName,
          duplicateCount: duplicates.length,
          duplicates: duplicates.map(({ name, users }) => ({
            name,
            userCount: users.length,
            users: users.map(u => ({
              id: u.id,
              email: u.email,
              createdAt: u.createdAt
            }))
          }))
        }))
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      log(`\n📄 Relatório detalhado salvo em: ${reportPath}`, 'cyan')
    }

    log('\n✅ Auditoria concluída!', 'green')

  } catch (error) {
    log(`\n❌ Erro durante auditoria: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
auditDuplicateUsers()
