import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("rcontrol2026", 12);

  await prisma.user.upsert({
    where: { email: "lucas@rigueto.com" },
    update: {},
    create: {
      name: "Lucas",
      email: "lucas@rigueto.com",
      password,
      whatsappNumber: "5581999999999", // substituir pelo número real
    },
  });

  await prisma.user.upsert({
    where: { email: "ana@rigueto.com" },
    update: {},
    create: {
      name: "Ana",
      email: "ana@rigueto.com",
      password,
      whatsappNumber: "5581988888888", // substituir pelo número real
    },
  });

  const categories = [
    { name: "Salário", icon: "💼", color: "#10B981", type: "INCOME" as const },
    { name: "Freelance", icon: "💻", color: "#06B6D4", type: "INCOME" as const },
    { name: "Investimentos", icon: "📈", color: "#8B5CF6", type: "INCOME" as const },
    { name: "Outros (receita)", icon: "💰", color: "#F59E0B", type: "INCOME" as const },
    { name: "Alimentação", icon: "🍔", color: "#EF4444", type: "EXPENSE" as const },
    { name: "Transporte", icon: "🚗", color: "#F97316", type: "EXPENSE" as const },
    { name: "Moradia", icon: "🏠", color: "#6366F1", type: "EXPENSE" as const },
    { name: "Saúde", icon: "🏥", color: "#EC4899", type: "EXPENSE" as const },
    { name: "Educação", icon: "📚", color: "#14B8A6", type: "EXPENSE" as const },
    { name: "Lazer", icon: "🎮", color: "#F59E0B", type: "EXPENSE" as const },
    { name: "Vestuário", icon: "👕", color: "#8B5CF6", type: "EXPENSE" as const },
    { name: "Assinaturas", icon: "📱", color: "#06B6D4", type: "EXPENSE" as const },
    { name: "Supermercado", icon: "🛒", color: "#10B981", type: "EXPENSE" as const },
    { name: "Outros (despesa)", icon: "📦", color: "#6B7280", type: "EXPENSE" as const },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const existingAccount = await prisma.account.findFirst({
    where: { name: "Conta Principal" },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: { name: "Conta Principal", type: "CHECKING", balance: 0, color: "#2563EB" },
    });
  }

  console.log("✅ Seed concluído — 2 usuários, 14 categorias, 1 conta criados.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
