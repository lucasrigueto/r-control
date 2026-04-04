export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseFinancialMessage,
  transcribeAudio,
  analyzeReceiptImage,
  handleFinancialQuery,
} from "@/lib/groq";
import { sendWhatsAppMessage, downloadMedia } from "@/lib/whatsapp";
import { getBillingCycle } from "@/lib/billing";

const FMT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function brl(v: number) { return FMT.format(v); }

function bar(pct: number, len = 10): string {
  const n = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
  return "█".repeat(n) + "░".repeat(len - n);
}

// Detect if message mentions one of the user's credit cards
async function detectCard(text: string, userId: string): Promise<string | null> {
  const cards = await prisma.creditCard.findMany({ where: { userId } });
  const lower = text.toLowerCase();
  for (const c of cards) {
    if (lower.includes(c.name.toLowerCase())) return c.id;
    if (c.lastDigits && lower.includes(c.lastDigits)) return c.id;
  }
  return null;
}

// Send limit alert if threshold crossed (70 / 85 / 100 %)
async function alertThreshold(cardId: string, userId: string, phone: string) {
  const card = await prisma.creditCard.findFirst({ where: { id: cardId, userId } });
  if (!card || !card.limit) return;
  const { start, end } = getBillingCycle(card.closingDay);
  const agg = await prisma.transaction.aggregate({
    where: { creditCardId: card.id, type: "EXPENSE", date: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const spent = agg._sum?.amount ?? 0;
  const pct = (spent / card.limit) * 100;
  let msg: string | null = null;
  if (pct >= 100)
    msg = `🚨 *Limite estourado!*\n${card.name}: ${brl(spent)} / ${brl(card.limit)}\nUltrapassou em ${brl(spent - card.limit)}`;
  else if (pct >= 85)
    msg = `⚠️ *${Math.round(pct)}% do limite usado*\n${card.name}: ${brl(spent)} / ${brl(card.limit)}\nRestam ${brl(card.limit - spent)}`;
  else if (pct >= 70)
    msg = `📊 *70% do limite utilizado*\n${card.name}: ${brl(spent)} / ${brl(card.limit)}\nRestam ${brl(card.limit - spent)}`;
  if (msg) await sendWhatsAppMessage(phone, msg);
}

export async function POST(req: Request) {
  const body = await req.json();
  const event = body.event;
  if (event !== "messages.upsert") return NextResponse.json({ ok: true });

  const message = body.data;
  if (!message || message?.key?.fromMe) return NextResponse.json({ ok: true });

  const phone = message.key?.remoteJid?.replace("@s.whatsapp.net", "") ?? "";
  const messageId = message.key?.id ?? "";

  const altPhone =
    phone.length === 12 && phone.startsWith("55")
      ? phone.slice(0, 4) + "9" + phone.slice(4)
      : phone.length === 13 && phone.startsWith("55")
      ? phone.slice(0, 4) + phone.slice(5)
      : phone;

  const user = await prisma.user.findFirst({
    where: { whatsappNumber: { in: [phone, altPhone] } },
  });
  if (!user) return NextResponse.json({ ok: true });

  const msgType = message.message;
  const textContent =
    msgType?.conversation || msgType?.extendedTextMessage?.text || "";

  try {
    // ── Date helpers ──────────────────────────────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthLabel = now.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

    // ── Pending confirmation ──────────────────────────────────────────────────
    const pending = await prisma.whatsappPending.findFirst({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    });

    if (pending && textContent) {
      const reply = textContent.toLowerCase().trim();
      const isConfirm = ["sim", "s", "1", "✅", "confirmar", "ok"].includes(reply);
      const isCancel = ["não", "nao", "n", "2", "❌", "cancelar"].includes(reply);

      if (isConfirm) {
        const data = pending.data as Record<string, unknown>;
        const tx = await prisma.transaction.create({
          data: {
            description: data.description as string,
            amount: data.amount as number,
            type: data.type as "INCOME" | "EXPENSE",
            date: new Date(data.date as string),
            status: "PAID",
            source: "whatsapp",
            userId: user.id,
            categoryId: (data.categoryId as string) || null,
            creditCardId: (data.creditCardId as string) || null,
          },
        });
        await prisma.whatsappPending.delete({ where: { id: pending.id } });

        let ok = "✅ Transação salva com sucesso!";
        if (tx.creditCardId) {
          const card = await prisma.creditCard.findFirst({ where: { id: tx.creditCardId } });
          if (card) ok += `\n💳 Cartão: ${card.name}`;
        }
        await sendWhatsAppMessage(phone, ok);

        if (tx.creditCardId && tx.type === "EXPENSE") {
          await alertThreshold(tx.creditCardId, user.id, phone);
        }
        return NextResponse.json({ ok: true });
      }

      if (isCancel) {
        await prisma.whatsappPending.delete({ where: { id: pending.id } });
        await sendWhatsAppMessage(phone, "❌ Transação cancelada.");
        return NextResponse.json({ ok: true });
      }
    }

    // ── Slash commands ────────────────────────────────────────────────────────
    if (textContent.startsWith("/")) {
      const cmd = textContent.trim().toLowerCase();

      // /ajuda ──────────────────────────────────────────────────────────────
      if (cmd === "/ajuda") {
        await sendWhatsAppMessage(
          phone,
          `📱 *R-Control — Comandos*\n\n` +
          `*Consultas:*\n` +
          `• */saldo* ou */resumo* — Resumo do mês\n` +
          `• */entradas* — Receitas do mês\n` +
          `• */saidas* — Despesas do mês\n` +
          `• */gastos* — Top categorias\n` +
          `• */orcamento* — Orçamento vs real\n` +
          `• */metas* — Progresso das metas\n` +
          `• */cartoes* — Seus cartões\n` +
          `• */fatura [nome]* — Fatura de um cartão\n\n` +
          `*Registrar transações:*\n` +
          `• Texto, áudio ou foto de comprovante\n` +
          `• Ex: _"Gastei R$ 50 no mercado"_\n\n` +
          `*Confirmar:*\n` +
          `• *1* Confirmar ✅  •  *2* Cancelar ❌`
        );
        return NextResponse.json({ ok: true });
      }

      // /saldo / /resumo ─────────────────────────────────────────────────────
      if (cmd === "/saldo" || cmd === "/resumo") {
        const [incAgg, expAgg, recent] = await Promise.all([
          prisma.transaction.aggregate({
            where: { userId: user.id, type: "INCOME", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          }),
          prisma.transaction.findMany({
            where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: "desc" },
            take: 3,
          }),
        ]);
        const income = incAgg._sum.amount ?? 0;
        const expense = expAgg._sum.amount ?? 0;
        const balance = income - expense;
        const recentLines = recent.length
          ? "\n\n*Últimas transações:*\n" +
            recent.map((t) => `${t.type === "INCOME" ? "💚" : "🔴"} ${t.description}: ${brl(t.amount)}`).join("\n")
          : "";
        await sendWhatsAppMessage(
          phone,
          `📊 *Resumo — ${monthLabel}*\n\n` +
          `💚 Receitas: ${brl(income)}\n` +
          `🔴 Despesas: ${brl(expense)}\n` +
          `─────────────────\n` +
          `${balance >= 0 ? "✅" : "⚠️"} Saldo: *${brl(balance)}*` +
          recentLines
        );
        return NextResponse.json({ ok: true });
      }

      // /entradas ────────────────────────────────────────────────────────────
      if (cmd === "/entradas") {
        const txs = await prisma.transaction.findMany({
          where: { userId: user.id, type: "INCOME", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
          orderBy: { amount: "desc" },
          take: 8,
        });
        if (!txs.length) {
          await sendWhatsAppMessage(phone, `Nenhuma receita em ${monthLabel}.`);
          return NextResponse.json({ ok: true });
        }
        const total = txs.reduce((s, t) => s + t.amount, 0);
        const lines = txs.map((t) => `💚 ${t.description}: ${brl(t.amount)}`).join("\n");
        await sendWhatsAppMessage(phone, `💚 *Receitas — ${monthLabel}*\n\n${lines}\n\n*Total: ${brl(total)}*`);
        return NextResponse.json({ ok: true });
      }

      // /saidas ──────────────────────────────────────────────────────────────
      if (cmd === "/saidas") {
        const txs = await prisma.transaction.findMany({
          where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
          include: { category: true },
          orderBy: { amount: "desc" },
          take: 8,
        });
        if (!txs.length) {
          await sendWhatsAppMessage(phone, `Nenhuma despesa em ${monthLabel}.`);
          return NextResponse.json({ ok: true });
        }
        const total = txs.reduce((s, t) => s + t.amount, 0);
        const lines = txs
          .map((t) => `🔴 ${t.description}${t.category ? ` (${t.category.name})` : ""}: ${brl(t.amount)}`)
          .join("\n");
        await sendWhatsAppMessage(phone, `🔴 *Despesas — ${monthLabel}*\n\n${lines}\n\n*Total: ${brl(total)}*`);
        return NextResponse.json({ ok: true });
      }

      // /gastos ──────────────────────────────────────────────────────────────
      if (cmd === "/gastos") {
        const txs = await prisma.transaction.findMany({
          where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
          include: { category: true },
        });
        const byCat: Record<string, { name: string; icon: string; total: number }> = {};
        for (const t of txs) {
          const k = t.categoryId ?? "__none__";
          if (!byCat[k]) byCat[k] = { name: t.category?.name ?? "Sem categoria", icon: t.category?.icon ?? "📦", total: 0 };
          byCat[k].total += t.amount;
        }
        const sorted = Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 5);
        const total = txs.reduce((s, t) => s + t.amount, 0);
        if (!sorted.length) {
          await sendWhatsAppMessage(phone, `Nenhuma despesa em ${monthLabel}.`);
          return NextResponse.json({ ok: true });
        }
        const lines = sorted
          .map((c, i) => {
            const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
            return `${i + 1}. ${c.icon} ${c.name}: ${brl(c.total)} (${pct}%)`;
          })
          .join("\n");
        await sendWhatsAppMessage(phone, `🏷️ *Top gastos — ${monthLabel}*\n\n${lines}\n\nTotal: ${brl(total)}`);
        return NextResponse.json({ ok: true });
      }

      // /orcamento ───────────────────────────────────────────────────────────
      if (cmd === "/orcamento") {
        const budgets = await prisma.budget.findMany({
          where: { userId: user.id, month: now.getMonth() + 1, year: now.getFullYear() },
          include: { category: true },
        });
        if (!budgets.length) {
          await sendWhatsAppMessage(phone, `Nenhum orçamento definido para ${monthLabel}.\n\nConfigure no app em *Orçamento*.`);
          return NextResponse.json({ ok: true });
        }
        const expenses = await prisma.transaction.findMany({
          where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
        });
        const spentBy: Record<string, number> = {};
        for (const t of expenses) {
          if (t.categoryId) spentBy[t.categoryId] = (spentBy[t.categoryId] ?? 0) + t.amount;
        }
        const lines = budgets
          .map((b) => {
            const spent = spentBy[b.categoryId] ?? 0;
            const pct = Math.round((spent / b.amount) * 100);
            const status = pct >= 100 ? "🚨" : pct >= 80 ? "⚠️" : "✅";
            return `${status} ${b.category.icon} ${b.category.name}\n   ${bar(Math.min(pct, 100))} ${pct}%\n   ${brl(spent)} / ${brl(b.amount)}`;
          })
          .join("\n\n");
        await sendWhatsAppMessage(phone, `📊 *Orçamento — ${monthLabel}*\n\n${lines}`);
        return NextResponse.json({ ok: true });
      }

      // /metas ───────────────────────────────────────────────────────────────
      if (cmd === "/metas") {
        const goals = await prisma.goal.findMany({
          where: { userId: user.id, status: "ACTIVE" },
          orderBy: { targetDate: "asc" },
          take: 5,
        });
        if (!goals.length) {
          await sendWhatsAppMessage(phone, `Nenhuma meta ativa.\n\nCrie metas no app em *Metas*.`);
          return NextResponse.json({ ok: true });
        }
        const lines = goals
          .map((g) => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const days = Math.ceil((g.targetDate.getTime() - Date.now()) / 86400000);
            return `🎯 *${g.title}*\n   ${bar(Math.min(pct, 100))} ${pct}%\n   ${brl(g.currentAmount)} / ${brl(g.targetAmount)}\n   Faltam ${brl(remaining)} · ${days}d restantes`;
          })
          .join("\n\n");
        await sendWhatsAppMessage(phone, `🎯 *Suas metas*\n\n${lines}`);
        return NextResponse.json({ ok: true });
      }

      // /cartoes ─────────────────────────────────────────────────────────────
      if (cmd === "/cartoes") {
        const cards = await prisma.creditCard.findMany({
          where: { userId: user.id },
          orderBy: { name: "asc" },
        });
        if (!cards.length) {
          await sendWhatsAppMessage(phone, `Nenhum cartão cadastrado.\n\nAdicione no app em *Cartões*.`);
          return NextResponse.json({ ok: true });
        }
        const cardLines = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cards.map(async (card: any) => {
            const { start, end } = getBillingCycle(card.closingDay);
            const agg = await prisma.transaction.aggregate({
              where: { creditCardId: card.id, type: "EXPENSE", date: { gte: start, lte: end } },
              _sum: { amount: true },
            });
            const spent = agg._sum?.amount ?? 0;
            const pct = card.limit > 0 ? Math.round((spent / card.limit) * 100) : 0;
            const status = pct >= 100 ? "🚨" : pct >= 85 ? "⚠️" : pct >= 70 ? "📊" : "✅";
            return `${status} *${card.name}*${card.lastDigits ? ` ····${card.lastDigits}` : ""}\n   ${bar(Math.min(pct, 100))} ${pct}%\n   ${brl(spent)} / ${brl(card.limit)}\n   Fecha dia ${card.closingDay} · Vence dia ${card.dueDay}`;
          })
        );
        await sendWhatsAppMessage(phone, `💳 *Seus cartões*\n\n${cardLines.join("\n\n")}`);
        return NextResponse.json({ ok: true });
      }

      // /fatura [nome] ───────────────────────────────────────────────────────
      if (cmd.startsWith("/fatura")) {
        const search = textContent.slice(7).trim();
        const cards = await prisma.creditCard.findMany({ where: { userId: user.id } });
        let card = null;
        if (search) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          card = cards.find((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
          if (!card) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const list = cards.map((c: any) => `• ${c.name}`).join("\n");
            await sendWhatsAppMessage(phone, `Cartão "${search}" não encontrado.\n\nSeus cartões:\n${list}\n\nUse: */fatura nome*`);
            return NextResponse.json({ ok: true });
          }
        } else if (cards.length === 1) {
          card = cards[0];
        } else if (!cards.length) {
          await sendWhatsAppMessage(phone, `Nenhum cartão cadastrado.`);
          return NextResponse.json({ ok: true });
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const list = cards.map((c: any) => `• */fatura ${c.name.toLowerCase()}*`).join("\n");
          await sendWhatsAppMessage(phone, `Qual cartão?\n\n${list}`);
          return NextResponse.json({ ok: true });
        }

        const { start, end } = getBillingCycle(card.closingDay);
        const txs = await prisma.transaction.findMany({
          where: { creditCardId: card.id, type: "EXPENSE", date: { gte: start, lte: end } },
          orderBy: { date: "desc" },
          take: 10,
        });
        const total = txs.reduce((s, t) => s + t.amount, 0);
        const pct = card.limit > 0 ? Math.round((total / card.limit) * 100) : 0;
        const status = pct >= 100 ? "🚨" : pct >= 85 ? "⚠️" : pct >= 70 ? "📊" : "✅";
        const txLines = txs.length
          ? "\n\n" +
            txs.slice(0, 5).map((t) => `• ${t.description}: ${brl(t.amount)}`).join("\n") +
            (txs.length > 5 ? `\n... e mais ${txs.length - 5}` : "")
          : "\n\nNenhuma transação neste ciclo.";
        await sendWhatsAppMessage(
          phone,
          `💳 *${card.name}*${card.lastDigits ? ` ····${card.lastDigits}` : ""}\n\n` +
          `${status} ${bar(Math.min(pct, 100))} ${pct}%\n` +
          `Gasto: ${brl(total)} / ${brl(card.limit)}\n` +
          `Fecha: ${fmtDate(end)} · Vence dia ${card.dueDay}\n` +
          `Ciclo: ${fmtDate(start)} – ${fmtDate(end)}` +
          txLines
        );
        return NextResponse.json({ ok: true });
      }

      // Comando desconhecido
      await sendWhatsAppMessage(phone, `Comando não reconhecido. Envie */ajuda* para ver os comandos disponíveis.`);
      return NextResponse.json({ ok: true });
    }

    // ── Parse new transaction message ─────────────────────────────────────────
    let parsed = null;

    if (msgType?.conversation || msgType?.extendedTextMessage) {
      if (textContent) parsed = await parseFinancialMessage(textContent);
    } else if (msgType?.audioMessage) {
      const media = await downloadMedia(messageId);
      if (media) {
        const transcript = await transcribeAudio(media.buffer, media.mimeType);
        if (transcript) parsed = await parseFinancialMessage(transcript);
      }
    } else if (msgType?.imageMessage) {
      const media = await downloadMedia(messageId);
      if (media) parsed = await analyzeReceiptImage(media.buffer.toString("base64"), media.mimeType);
    }

    if (!parsed) {
      // Try AI conversational query before showing error
      if (textContent && (msgType?.conversation || msgType?.extendedTextMessage)) {
        const [incAgg, expAgg, recent, allExp] = await Promise.all([
          prisma.transaction.aggregate({
            where: { userId: user.id, type: "INCOME", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
            _sum: { amount: true },
          }),
          prisma.transaction.findMany({
            where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
            orderBy: { date: "desc" },
            take: 5,
          }),
          prisma.transaction.findMany({
            where: { userId: user.id, type: "EXPENSE", status: "PAID", date: { gte: monthStart, lte: monthEnd } },
            include: { category: true },
          }),
        ]);
        const byCat: Record<string, { name: string; icon: string; total: number }> = {};
        for (const t of allExp) {
          const k = t.categoryId ?? "__none__";
          if (!byCat[k]) byCat[k] = { name: t.category?.name ?? "Sem categoria", icon: t.category?.icon ?? "📦", total: 0 };
          byCat[k].total += t.amount;
        }
        const topCats = Object.values(byCat).sort((a, b) => b.total - a.total).slice(0, 5);
        const aiResponse = await handleFinancialQuery(textContent, {
          monthIncome: incAgg._sum.amount ?? 0,
          monthExpense: expAgg._sum.amount ?? 0,
          month: monthLabel,
          topCategories: topCats,
          recentTx: recent.map((t) => ({
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date.toLocaleDateString("pt-BR"),
          })),
        });
        if (aiResponse) {
          await sendWhatsAppMessage(phone, aiResponse);
          return NextResponse.json({ ok: true });
        }
      }

      await sendWhatsAppMessage(
        phone,
        `Olá ${user.name}! 👋 Não entendi essa mensagem.\n\nTente:\n• _"Gastei R$ 50 no mercado"_\n• _"Recebi R$ 2.000 de salário"_\n• Ou envie uma foto do comprovante\n• Ou */ajuda* para ver os comandos`
      );
      return NextResponse.json({ ok: true });
    }

    // Detect credit card mention
    const detectedCardId = textContent ? await detectCard(textContent, user.id) : null;

    // Match category
    const category = await prisma.category.findFirst({
      where: { name: { contains: parsed.category, mode: "insensitive" } },
    });

    // Store pending confirmation
    await prisma.whatsappPending.deleteMany({ where: { userId: user.id } });
    await prisma.whatsappPending.create({
      data: {
        phone,
        userId: user.id,
        messageId,
        data: { ...parsed, categoryId: category?.id ?? null, creditCardId: detectedCardId },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const typeLabel = parsed.type === "INCOME" ? "💚 Receita" : "🔴 Despesa";
    let cardInfo = "";
    if (detectedCardId) {
      const card = await prisma.creditCard.findFirst({ where: { id: detectedCardId } });
      if (card) cardInfo = `\n💳 Cartão: ${card.name}`;
    }

    await sendWhatsAppMessage(
      phone,
      `Confirmar lançamento?\n\n📝 *${parsed.description}*\n💰 ${brl(parsed.amount)}\n${typeLabel}\n📅 ${parsed.date}\n🏷️ ${category?.name ?? parsed.category}${cardInfo}\n\nResponda:\n*1* para confirmar ✅\n*2* para cancelar ❌`
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
