const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log('👥 Usuários:');
  users.forEach(u => {
    console.log(`   ${u.name} (${u.email}) - ID: ${u.id}`);
  });
  await prisma.$disconnect();
})();
