export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseFinancialMessage,
  transcribeAudio,
  analyzeReceiptImage,
} from "@/lib/groq";
import { sendWhatsAppMessage, downloadMedia } from "@/lib/whatsapp";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = body.event;
  console.log("[wh] event:", event);
  if (event !== "messages.upsert") return NextResponse.json({ ok: true });

  const message = body.data;
  const fromMe = message?.key?.fromMe;
  console.log("[wh] fromMe:", fromMe, "message:", !!message);
  if (!message || fromMe) return NextResponse.json({ ok: true });

  const phone =
    message.key?.remoteJid?.replace("@s.whatsapp.net", "") ?? "";
  const messageId = message.key?.id ?? "";
  console.log("[wh] phone:", phone, "msgId:", messageId);

  // Tenta os dois formatos: com e sem o 9 extra do celular brasileiro
  // Ex: 553194779716 (12 díg) ↔ 5531994779716 (13 díg)
  const altPhone =
    phone.length === 12 && phone.startsWith("55")
      ? phone.slice(0, 4) + "9" + phone.slice(4)
      : phone.length === 13 && phone.startsWith("55")
      ? phone.slice(0, 4) + phone.slice(5)
      : phone;

  const user = await prisma.user.findFirst({
    where: { whatsappNumber: { in: [phone, altPhone] } },
  });
  console.log("[wh] user:", user?.name ?? "NOT FOUND", "alt:", altPhone);
  if (!user) return NextResponse.json({ ok: true });

  const msgType = message.message;
  const textContent =
    msgType?.conversation || msgType?.extendedTextMessage?.text || "";
  console.log("[wh] msgType keys:", Object.keys(msgType ?? {}), "text:", textContent.slice(0, 50));

  try {
    // Check for pending confirmation
    const pending = await prisma.whatsappPending.findFirst({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    });

    if (pending && textContent) {
      const reply = textContent.toLowerCase().trim();

      const isConfirm = ["sim", "s", "1", "✅", "confirmar", "ok"].includes(reply);
      const isCancel = ["não", "nao", "n", "2", "❌", "cancelar"].includes(reply);

      if (isConfirm) {
        const data = pending.data as Record<string, unknown>;
        await prisma.transaction.create({
          data: {
            description: data.description as string,
            amount: data.amount as number,
            type: data.type as "INCOME" | "EXPENSE",
            date: new Date(data.date as string),
            status: "PAID",
            source: "whatsapp",
            userId: user.id,
            categoryId: (data.categoryId as string) || null,
          },
        });
        await prisma.whatsappPending.delete({ where: { id: pending.id } });
        await sendWhatsAppMessage(phone, "✅ Transação salva com sucesso!");
        return NextResponse.json({ ok: true });
      }

      if (isCancel) {
        await prisma.whatsappPending.delete({ where: { id: pending.id } });
        await sendWhatsAppMessage(phone, "❌ Transação cancelada.");
        return NextResponse.json({ ok: true });
      }
    }

    // Parse new message
    let parsed = null;

    if (msgType?.conversation || msgType?.extendedTextMessage) {
      if (textContent) {
        parsed = await parseFinancialMessage(textContent);
      }
    } else if (msgType?.audioMessage) {
      const media = await downloadMedia(messageId);
      if (media) {
        const transcript = await transcribeAudio(media.buffer, media.mimeType);
        if (transcript) {
          parsed = await parseFinancialMessage(transcript);
        }
      }
    } else if (msgType?.imageMessage) {
      const media = await downloadMedia(messageId);
      if (media) {
        parsed = await analyzeReceiptImage(media.buffer.toString("base64"));
      }
    }

    if (!parsed) {
      await sendWhatsAppMessage(
        phone,
        `Olá ${user.name}! 👋 Não entendi essa mensagem.\n\nTente:\n• _"Gastei R$ 50 no mercado"_\n• _"Recebi R$ 2.000 de salário"_\n• Ou envie uma foto do comprovante`
      );
      return NextResponse.json({ ok: true });
    }

    // Find matching category
    const category = await prisma.category.findFirst({
      where: { name: { contains: parsed.category, mode: "insensitive" } },
    });

    // Clear old pending and create new one
    await prisma.whatsappPending.deleteMany({ where: { userId: user.id } });
    await prisma.whatsappPending.create({
      data: {
        phone,
        userId: user.id,
        messageId,
        data: { ...parsed, categoryId: category?.id ?? null },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    const typeLabel = parsed.type === "INCOME" ? "💚 Receita" : "🔴 Despesa";

    await sendWhatsAppMessage(
      phone,
      `Confirmar lançamento?\n\n📝 *${parsed.description}*\n💰 ${formatBRL(parsed.amount)}\n${typeLabel}\n📅 ${parsed.date}\n🏷️ ${category?.name ?? parsed.category}\n\nResponda:\n✅ *SIM* para confirmar\n❌ *NÃO* para cancelar`
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
