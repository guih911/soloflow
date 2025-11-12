/**
 * 🔧 SCRIPT DE CORREÇÃO - USUÁRIOS DUPLICADOS
 *
 * Sistema de Workflow Profissional
 *
 * Este script renomeia automaticamente usuários duplicados
 * adicionando o setor ou email ao nome para diferenciação.
 *
 * ⚠️ CUIDADO: Este script modifica o banco de dados!
 *
 * Uso:
 *   node scripts/fix-duplicate-users.js --preview  (visualizar sem aplicar)
 *   node scripts/fix-duplicate-users.js --apply    (aplicar mudanças)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  console.log('\n' + '='.repeat(80))
  log(message, 'bright')
  console.log('='.repeat(80) + '\n')
}

async function fixDuplicateUsers(applyChanges = false) {
  const mode = applyChanges ? 'APLICAR MUDANÇAS' : 'MODO PREVIEW'
  logHeader(`🔧 CORREÇÃO DE USUÁRIOS DUPLICADOS - ${mode}`)

  if (!applyChanges) {
    log('ℹ️  Modo PREVIEW ativado - nenhuma mudança será aplicada', 'cyan')
    log('   Para aplicar as mudanças, execute: node scripts/fix-duplicate-users.js --apply\n', 'cyan')
  } else {
    log('⚠️  MODO APLICAR - As mudanças serão salvas no banco de dados!', 'red')
    log('   Aguarde 3 segundos para cancelar se necessário...\n', 'yellow')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })

    let totalFixed = 0
    const changes = []

    for (const company of companies) {
      log(`\n🏢 Processando empresa: ${company.name}`, 'blue')

      const users = await prisma.user.findMany({
        where: {
          userCompanies: {
            some: { companyId: company.id }
          }
        },
        include: {
          userCompanies: {
            where: { companyId: company.id },
            include: { sector: true }
          }
        }
      })

      // Agrupar por nome
      const nameGroups = {}
      users.forEach(user => {
        if (!nameGroups[user.name]) {
          nameGroups[user.name] = []
        }
        nameGroups[user.name].push(user)
      })

      // Processar duplicatas
      for (const [name, duplicateUsers] of Object.entries(nameGroups)) {
        if (duplicateUsers.length <= 1) continue

        log(`\n   📝 Corrigindo duplicata: "${name}" (${duplicateUsers.length} usuários)`, 'yellow')

        for (let i = 0; i < duplicateUsers.length; i++) {
          const user = duplicateUsers[i]
          const userCompany = user.userCompanies[0]
          const sector = userCompany?.sector?.name

          // Gerar novo nome único
          let newName
          if (sector) {
            newName = `${name} - ${sector}`
          } else {
            // Usar parte do email se não tiver setor
            const emailPart = user.email.split('@')[0]
            newName = `${name} (${emailPart})`
          }

          // Verificar se o novo nome já existe
          const existing = await prisma.user.findFirst({
            where: {
              name: newName,
              userCompanies: {
                some: { companyId: company.id }
              }
            }
          })

          if (existing) {
            // Se já existe, adicionar um número
            newName = `${newName} #${i + 1}`
          }

          const change = {
            userId: user.id,
            email: user.email,
            oldName: user.name,
            newName: newName,
            sector: sector || 'Sem setor',
            companyId: company.id,
            companyName: company.name
          }

          changes.push(change)

          console.log(`      ${i + 1}. ${user.email}`)
          console.log(`         Nome atual: "${user.name}"`)
          log(`         Novo nome:  "${newName}"`, 'green')

          if (applyChanges) {
            await prisma.user.update({
              where: { id: user.id },
              data: { name: newName }
            })
            log(`         ✅ Atualizado!`, 'green')
            totalFixed++
          }
        }
      }
    }

    // Resumo
    logHeader('📋 RESUMO')

    if (changes.length === 0) {
      log('✅ Nenhuma duplicata encontrada para corrigir!', 'green')
    } else {
      log(`📊 Total de usuários que serão renomeados: ${changes.length}`, 'cyan')

      if (applyChanges) {
        log(`✅ ${totalFixed} usuário(s) renomeado(s) com sucesso!`, 'green')

        // Salvar log das mudanças
        const fs = require('fs')
        const logPath = './scripts/fix-duplicate-users-log.json'
        const logData = {
          appliedAt: new Date().toISOString(),
          totalChanges: changes.length,
          changes
        }
        fs.writeFileSync(logPath, JSON.stringify(logData, null, 2))
        log(`📄 Log das mudanças salvo em: ${logPath}`, 'cyan')
      } else {
        log('\nℹ️  Para aplicar estas mudanças, execute:', 'cyan')
        log('   node scripts/fix-duplicate-users.js --apply\n', 'bright')
      }
    }

  } catch (error) {
    log(`\n❌ Erro: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Verificar argumentos
const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')

if (args.length === 0 || args.includes('--preview')) {
  fixDuplicateUsers(false)
} else if (applyChanges) {
  fixDuplicateUsers(true)
} else {
  console.log('Uso:')
  console.log('  node scripts/fix-duplicate-users.js --preview  (visualizar sem aplicar)')
  console.log('  node scripts/fix-duplicate-users.js --apply    (aplicar mudanças)')
  process.exit(0)
}
