import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  PrismaClient,
  Role,
  UserStatus,
} from "../src/generated/prisma/client";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

let prisma: PrismaClient | undefined;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const fullName = process.env.ADMIN_FULL_NAME || "Administrador";
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL nao foi definido. Configure DATABASE_URL no arquivo .env antes de executar o seed.",
    );
  }

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD nao foi definido. Configure ADMIN_PASSWORD no arquivo .env antes de executar o seed.",
    );
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
  });

  const passwordHash = await hash(password, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { username },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        fullName,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.APPROVED,
        requestedRole: null,
        approvedAt: existingAdmin.approvedAt ?? new Date(),
        rejectedAt: null,
        managerId: null,
        regionalManagerId: null,
      },
    });

    console.log("Usuario ADMIN inicial atualizado com sucesso.");
    return;
  }

  await prisma.user.create({
    data: {
      fullName,
      username,
      passwordHash,
      requestedRole: null,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
    },
  });

  console.log("Usuario ADMIN inicial criado com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed do ADMIN:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
