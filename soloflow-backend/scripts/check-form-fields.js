const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Verificando Campos de Formulário dos Tipos de Processo ===\n');

  const types = await prisma.processType.findMany({
    include: {
      versions: {
        include: {
          formFields: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });

  for (const type of types) {
    console.log(`📋 Tipo: ${type.name} (${type.isActive ? 'Ativo' : 'Inativo'})`);
    console.log(`   ID: ${type.id}`);

    const latestVersion = type.versions[0];
    if (!latestVersion) {
      console.log('   ❌ Sem versões\n');
      continue;
    }

    console.log(`   Versão: ${latestVersion.version}`);
    console.log(`   Campos de formulário: ${latestVersion.formFields?.length || 0}`);

    if (latestVersion.formFields && latestVersion.formFields.length > 0) {
      latestVersion.formFields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.label}`);
        console.log(`      - Tipo: ${field.type}`);
        console.log(`      - Nome: ${field.name}`);
        console.log(`      - Obrigatório: ${field.required ? 'Sim' : 'Não'}`);
        console.log(`      - Ordem: ${field.order}`);
        if (field.placeholder) console.log(`      - Placeholder: ${field.placeholder}`);
        if (field.helpText) console.log(`      - Ajuda: ${field.helpText}`);
        if (field.defaultValue) console.log(`      - Valor padrão: ${field.defaultValue}`);
        if (field.options) console.log(`      - Opções: ${field.options}`);
        if (field.validations) console.log(`      - Validações: ${JSON.stringify(field.validations)}`);
      });
    } else {
      console.log('   ⚠️  Nenhum campo cadastrado');
    }

    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
