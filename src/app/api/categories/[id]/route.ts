import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, icon, color, type } = body;

  if (type && !["INCOME", "EXPENSE", "BOTH"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  try {
    const updated = await prisma.category.update({
      where: { id: params.id },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        ...(icon && { icon }),
        ...(color && { color }),
        ...(type && { type }),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if category has transactions
  const count = await prisma.transaction.count({ where: { categoryId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Esta categoria possui ${count} transação(ões) vinculada(s). Reatribua-as antes de excluir.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
