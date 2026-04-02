import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, icon, color, type } = body;

  if (!name?.trim() || !icon || !color || !type) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, ícone, cor, tipo" }, { status: 400 });
  }
  if (!["INCOME", "EXPENSE", "BOTH"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: { name: name.trim(), icon, color, type },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Categoria já existe com esse nome" }, { status: 409 });
  }
}
