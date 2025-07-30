import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar empresa padrão
  const company = await prisma.company.upsert({
    where: { cnpj: '00.000.000/0000-00' },
    update: {},
    create: {
      name: 'SoloFlow',
      cnpj: '00.000.000/0000-00',
      email: 'contato@SoloFlow.com',
      phone: '(62) 99999-9999',
    },
  });

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@soloflow.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@soloflow.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      companyId: company.id,
    },
  });

  console.log('Seed executado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });