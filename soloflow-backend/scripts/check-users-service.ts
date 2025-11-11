import { PrismaService } from "../src/prisma/prisma.service";
import { UsersService } from "../src/modules/users/users.service";
import { UserRole } from "@prisma/client";

async function main() {
  const prisma = new PrismaService();
  const service = new UsersService(prisma);

  const dto = {
    name: "CPF Test Service",
    email: `cpf.test.service+${Date.now()}@example.com`,
    password: "password123",
    cpf: "12345678909",
    companyId: "708e2a13-c044-48df-8067-749c0b5a20f6",
    role: UserRole.USER,
    isDefault: true,
  } as any;

  const user = await service.create(dto);
  console.log("Saved user CPF:", user.cpf);

  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
