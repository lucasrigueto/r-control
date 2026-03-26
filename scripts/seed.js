// Script de seed — rodar via: node scripts/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const password = await bcrypt.hash("rcontrol2026", 12);

  await prisma.user.upsert({
    where: { email: "lucas@rigueto.com" },
    update: {},
    create: {
      name: "Lucas",
      email: "lucas@rigueto.com",
      password,
      whatsappNumber: "5531994779716",
    },
  });
  console.log("✅ Usuário Lucas criado");

  await prisma.user.upsert({
    where: { email: "lorena@rigueto.com" },
    update: {},
    create: {
      name: "Lorena",
      email: "lorena@rigueto.com",
      password,
      whatsappNumber: "5531992095334",
    },
  });
  console.log("✅ Usuário Lorena criado");

  const categories = [
    { name: "Salário",          icon: "💼", color: "#10B981", type: "INCOME" },
    { name: "Freelance",        icon: "💻", color: "#06B6D4", type: "INCOME" },
    { name: "Investimentos",    icon: "📈", color: "#8B5CF6", type: "INCOME" },
    { name: "Outros (receita)", icon: "💰", color: "#F59E0B", type: "INCOME" },
    { name: "Alimentação",      icon: "🍔", color: "#EF4444", type: "EXPENSE" },
    { name: "Transporte",       icon: "🚗", color: "#F97316", type: "EXPENSE" },
    { name: "Moradia",          icon: "🏠", color: "#6366F1", type: "EXPENSE" },
    { name: "Saúde",            icon: "🏥", color: "#EC4899", type: "EXPENSE" },
    { name: "Educação",         icon: "📚", color: "#14B8A6", type: "EXPENSE" },
    { name: "Lazer",            icon: "🎮", color: "#F59E0B", type: "EXPENSE" },
    { name: "Vestuário",        icon: "👕", color: "#8B5CF6", type: "EXPENSE" },
    { name: "Assinaturas",      icon: "📱", color: "#06B6D4", type: "EXPENSE" },
    { name: "Supermercado",     icon: "🛒", color: "#10B981", type: "EXPENSE" },
    { name: "Outros (despesa)", icon: "📦", color: "#6B7280", type: "EXPENSE" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("✅ 14 categorias criadas");

  const existing = await prisma.account.findFirst({ where: { name: "Conta Principal" } });
  if (!existing) {
    await prisma.account.create({
      data: { name: "Conta Principal", type: "CHECKING", balance: 0, color: "#2563EB" },
    });
    console.log("✅ Conta Principal criada");
  }

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("Acesse: https://rcontrol.rigueto.com.br/login");
  console.log("Login Lucas:  lucas@rigueto.com  /  rcontrol2026");
  console.log("Login Lorena: lorena@rigueto.com /  rcontrol2026");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
