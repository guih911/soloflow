const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSignatureIssue() {
  console.log('🔍 Investigando erro de assinatura...\n');

  const attachmentId = '411ea875-1a33-4ce7-a8a8-0d2ba46cbf85';
  const stepExecutionId = '526252c8-0326-4e03-8a48-ba0baf224d2b';
  const userId = '612dca53-f407-4dd1-89be-c2b37573f71c';

  // 1. Buscar informações do attachment
  console.log('📄 1. ATTACHMENT:');
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      stepExecution: {
        include: {
          stepVersion: true,
          processInstance: {
            include: {
              processTypeVersion: {
                include: {
                  processType: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!attachment) {
    console.log('❌ Attachment não encontrado!');
    return;
  }

  console.log('   ID:', attachment.id);
  console.log('   Nome:', attachment.originalName);
  console.log('   Assinado?:', attachment.isSigned);
  console.log('   StepExecutionId:', attachment.stepExecutionId);
  console.log('   StepVersion:', attachment.stepExecution?.stepVersion?.name);
  console.log('   StepVersionId:', attachment.stepExecution?.stepVersionId);

  // 2. Buscar informações da step execution
  console.log('\n📋 2. STEP EXECUTION:');
  const stepExecution = await prisma.stepExecution.findUnique({
    where: { id: stepExecutionId },
    include: {
      stepVersion: {
        include: {
          signatureRequirements: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      },
      processInstance: {
        include: {
          processTypeVersion: {
            include: {
              processType: true
            }
          }
        }
      }
    }
  });

  if (!stepExecution) {
    console.log('❌ Step Execution não encontrada!');
    return;
  }

  console.log('   ID:', stepExecution.id);
  console.log('   StepVersionId:', stepExecution.stepVersionId);
  console.log('   Status:', stepExecution.status);
  console.log('   Processo:', stepExecution.processInstance.code);

  // 3. Buscar requisitos de assinatura da step version
  console.log('\n✍️  3. SIGNATURE REQUIREMENTS da StepVersion:');
  const requirements = stepExecution.stepVersion?.signatureRequirements || [];

  if (requirements.length === 0) {
    console.log('   ❌ NENHUM requisito de assinatura configurado para esta etapa!');
    console.log('   ⚠️  Isso explica o erro: o sistema precisa que existam requisitos configurados.');
  } else {
    console.log(`   ✅ ${requirements.length} requisito(s) encontrado(s):`);
    requirements.forEach((req, idx) => {
      console.log(`\n   Requisito ${idx + 1}:`);
      console.log('      ID:', req.id);
      console.log('      User ID:', req.userId);
      console.log('      User Name:', req.user?.name);
      console.log('      User Email:', req.user?.email);
      console.log('      Order:', req.order);
    });

    // Verificar se o usuário atual está nos requisitos
    const userRequirement = requirements.find(r => r.userId === userId);
    if (userRequirement) {
      console.log(`\n   ✅ Usuário atual ESTÁ configurado como assinante (order: ${userRequirement.order})`);
    } else {
      console.log('\n   ❌ Usuário atual NÃO está configurado como assinante!');
      console.log('   ⚠️  Isso explica o erro de autorização.');
    }
  }

  // 4. Buscar usuário atual
  console.log('\n👤 4. USUÁRIO ATUAL:');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  if (user) {
    console.log('   ID:', user.id);
    console.log('   Nome:', user.name);
    console.log('   Email:', user.email);
  }

  // 5. Verificar assinaturas já existentes
  console.log('\n📝 5. ASSINATURAS JÁ EXISTENTES neste attachment:');
  const signatures = await prisma.signatureRecord.findMany({
    where: {
      attachmentId: attachmentId
    },
    include: {
      signer: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      requirement: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (signatures.length === 0) {
    console.log('   ❌ Nenhuma assinatura ainda.');
  } else {
    console.log(`   ✅ ${signatures.length} assinatura(s) encontrada(s):`);
    signatures.forEach((sig, idx) => {
      console.log(`\n   Assinatura ${idx + 1}:`);
      console.log('      ID:', sig.id);
      console.log('      Signer:', sig.signer?.name);
      console.log('      Email:', sig.signer?.email);
      console.log('      Status:', sig.status);
      console.log('      Order do Requisito:', sig.requirement?.order);
      console.log('      Signed At:', sig.signedAt || 'Pendente');
    });
  }

  // 6. DIAGNÓSTICO FINAL
  console.log('\n\n🔧 DIAGNÓSTICO:');
  if (requirements.length === 0) {
    console.log('❌ PROBLEMA IDENTIFICADO: Não há requisitos de assinatura configurados para esta etapa!');
    console.log('\n💡 SOLUÇÃO:');
    console.log('   1. Acesse a configuração do tipo de processo');
    console.log('   2. Edite a etapa:', stepExecution.stepVersion?.name);
    console.log('   3. Configure os usuários que devem assinar documentos nesta etapa');
    console.log('   4. Adicione o usuário:', user?.name, '(' + user?.email + ')');
  } else {
    const userRequirement = requirements.find(r => r.userId === userId);
    if (!userRequirement) {
      console.log('❌ PROBLEMA IDENTIFICADO: Usuário não está na lista de assinantes desta etapa!');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   1. Acesse a configuração do tipo de processo');
      console.log('   2. Edite a etapa:', stepExecution.stepVersion?.name);
      console.log('   3. Adicione o usuário:', user?.name, '(' + user?.email + ') como assinante');
    } else {
      // Verificar assinatura sequencial
      console.log('✅ Usuário está configurado como assinante (order:', userRequirement.order + ')');

      // Verificar se é assinatura sequencial
      const isSequential = requirements[0].type === 'SEQUENTIAL';
      console.log('   Tipo de assinatura:', isSequential ? 'SEQUENCIAL' : 'PARALELA');

      if (isSequential && userRequirement.order > 1) {
        console.log('\n⚠️  ASSINATURA SEQUENCIAL: Precisa aguardar assinaturas anteriores!');
        console.log('\n   Ordem de assinatura:');
        requirements.forEach(req => {
          const hasSigned = signatures.find(s => s.requirement.id === req.id && s.status === 'COMPLETED');
          const status = hasSigned ? '✅ Assinado' : '❌ Pendente';
          console.log(`   ${req.order}. ${req.user?.name} (${req.user?.email}) - ${status}`);
        });

        const previousRequirements = requirements.filter(r => r.order < userRequirement.order);
        const allPreviousSigned = previousRequirements.every(req =>
          signatures.find(s => s.requirement.id === req.id && s.status === 'COMPLETED')
        );

        if (!allPreviousSigned) {
          console.log('\n❌ PROBLEMA IDENTIFICADO: Assinaturas anteriores ainda não foram concluídas!');
          console.log('💡 SOLUÇÃO: Aguarde as seguintes pessoas assinarem primeiro:');
          previousRequirements.forEach(req => {
            const hasSigned = signatures.find(s => s.requirement.id === req.id && s.status === 'COMPLETED');
            if (!hasSigned) {
              console.log(`   - ${req.user?.name} (${req.user?.email})`);
            }
          });
        } else {
          console.log('\n✅ Todas assinaturas anteriores concluídas! Você pode assinar agora.');
        }
      } else {
        console.log('✅ Você pode assinar este documento agora!');
      }
    }
  }
}

debugSignatureIssue()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
