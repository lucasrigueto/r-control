# r-control — Plano de Conclusão do Produto

**Objetivo:** Completar o r-control como app de uso pessoal (eu + esposa). Sem foco em venda ou monetização por agora. Prioridade: WhatsApp inteligente (comandos + consulta conversacional sobre os dados financeiros).

**Arquitetura:** Next.js 14 + Prisma + PostgreSQL + shadcn/ui. Backend ~70% pronto. Gap quase todo é frontend + UX. Groq AI já integrado para parsing de texto/áudio/imagem. Evolution API para WhatsApp já funciona.

**Dependências:**
- Node.js 20+, npm
- PostgreSQL rodando (local ou Coolify)
- `.env` com: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GROQ_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
- `cd r-control && npm install` antes de qualquer task

**Referência vídeo:** `knowledge/external/inbox/rigueto-app/VIDEO/melhor-sistema-controle-financeiro.txt`
**Spec original:** `instrucoes R-Control.txt`

---

## STATUS ATUAL

| Feature | Status | Notas |
|---------|--------|-------|
| Dashboard | ✅ Completo | cards, cashflow 6m, recentes |
| Transações CRUD | ✅ Completo | filtros, form, tabela |
| Orçamento | ✅ Completo | por categoria, progress bar |
| Metas / Vision Board | ✅ Completo | cards com imagem, status |
| Auth (NextAuth credentials) | ✅ Completo | login, middleware |
| WhatsApp webhook + Groq AI | ✅ Backend | parsing texto/áudio/imagem funciona |
| Docker / Coolify | ✅ Completo | Dockerfile multi-stage |
| WhatsApp Settings UI | ❌ Faltando | backend pronto, falta página |
| WhatsApp Bot Commands | ❌ Faltando | /saldo, /resumo, consulta conversacional |
| Import OFX/CSV/PDF | ❌ Faltando | routes existem, sem parser |
| Cartões de Crédito | ❌ Faltando | modelo, dashboard de fatura, alertas, torneiras |
| Family / Multi-usuário | ❌ Faltando | schema suporta, sem UI |
| PWA | ❌ Faltando | manifest + service worker |
| Settings / Profile | ❌ Faltando | sem páginas |
| Categorias (UI gestão) | ❌ Faltando | API existe, sem UI |
| Notificações | ❌ Faltando | infra ready |
| Payment Gateway | ❌ Faltando | DEFERIDO |

---

## FASES (ordem de impacto — uso pessoal)

```
FASE 1:   WhatsApp Settings UI        → Conectar número, testar bot
FASE 1.5: WhatsApp Bot Intelligence   → Comandos + consulta conversacional + alertas de cartão ← PRIORIDADE ALTA
FASE 2:   Import OFX/CSV/PDF          → Migração de dados + importação de faturas c/ reconciliação
FASE 2.5: Controle de Dívidas         → Feature crítica ausente (PlannerFin insight)
FASE 3:   Adicionar Cônjuge           → Conta para a esposa + cartões por usuário no household
FASE 4:   Cartões de Crédito + Settings → Schema, dashboard de fatura, alertas, torneiras, polish
FASE 5:   PWA                         → Instalar como app no celular
FASE 6:   Monetização                 → DEFERIDO (não é prioridade agora)
```

---

## FASE 1 — WhatsApp Settings UI

**Objetivo:** Permitir que o usuário registre seu número de WhatsApp, veja o status da integração e teste o envio de mensagem. O backend já funciona — é só a UI.

**Arquivos:**
- Criar: `src/app/(app)/whatsapp/page.tsx`
- Criar: `src/components/whatsapp/WhatsAppSetup.tsx`
- Criar: `src/components/whatsapp/WhatsAppStatus.tsx`
- Criar: `src/components/whatsapp/WhatsAppInstructions.tsx`
- Modificar: `src/components/layout/Sidebar.tsx` (adicionar link WhatsApp)
- Modificar: `src/app/api/whatsapp/register/route.ts` (criar se não existe)
- Referência: `src/lib/whatsapp.ts` (usar sendMessage existente)

### Task 1.1: Página principal WhatsApp

**Step 1: Criar o arquivo da página**
```
src/app/(app)/whatsapp/page.tsx
```
Conteúdo: layout de 2 colunas (spec original)
- Coluna esquerda: formulário de cadastro de número + status
- Coluna direita: instruções de uso + exemplos de comandos

**Step 2: Estrutura da página**
```tsx
// Layout esperado:
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  <WhatsAppSetup />       {/* registro + status */}
  <WhatsAppInstructions /> {/* como usar */}
</div>
```

**Step 3: Verificar se rota está acessível**
- Navegar para `/whatsapp` no browser
- Deve renderizar sem erro 404

### Task 1.2: Componente WhatsAppSetup

**Arquivos:**
- Criar: `src/components/whatsapp/WhatsAppSetup.tsx`

**Step 1: Campos do formulário**
- Input: número de WhatsApp (formato +55 XX XXXXX-XXXX)
- Máscara de telefone BR (usar biblioteca `react-imask` ou validação manual)
- Botão: "Salvar número"
- Botão: "Enviar mensagem de teste"

**Step 2: API endpoint para salvar número**
```
PATCH /api/user/whatsapp
Body: { whatsappNumber: string }
```
Criar `src/app/api/user/whatsapp/route.ts`:
```ts
// PATCH: atualiza user.whatsappNumber no banco
await prisma.user.update({
  where: { id: session.user.id },
  data: { whatsappNumber: body.whatsappNumber }
})
```

**Step 3: Status display**
```tsx
// Estados:
// - "Não cadastrado" → botão salvar
// - "Cadastrado: +55 11 99999-9999" → badge verde + botão remover + botão testar
// - "Enviando teste..." → loading
```

**Step 4: Mensagem de teste**
Chamar `sendMessage()` de `src/lib/whatsapp.ts` com:
```
"Olá! Seu WhatsApp foi conectado ao r-control.
Envie qualquer mensagem aqui para registrar receitas e despesas.
Exemplos: 'Gastei 50 reais no mercado' ou 'Recebi 1000 do cliente'"
```

**Step 5: Verificar**
- Salvar número → aparecer no banco (prisma studio ou query)
- Enviar teste → receber mensagem no WhatsApp

### Task 1.3: Componente WhatsAppInstructions

**Arquivos:**
- Criar: `src/components/whatsapp/WhatsAppInstructions.tsx`

**Step 1: Seções de instrução**
```
📝 TEXTO: "Gastei R$ 50 no mercado" → despesa automática
🎤 ÁUDIO: Fale o gasto → Whisper transcreve + registra
📷 IMAGEM: Foto do recibo → OCR extrai valor + categoria
```

**Step 2: Exemplos de comandos**
Lista de exemplos visuais com chips/badges mostrando o que o bot responde.

**Step 3: Verificar renderização**
- UI informativa, sem lógica de estado

### Task 1.4: Atualizar Sidebar

**Arquivos:**
- Modificar: `src/components/layout/Sidebar.tsx`

**Step 1: Adicionar item de menu**
Localizar array de navigation items e adicionar:
```tsx
{ name: 'WhatsApp', href: '/whatsapp', icon: MessageCircle }
```
Importar `MessageCircle` de `lucide-react`.

**Step 2: Verificar**
- Item WhatsApp aparece no sidebar
- Link navega para `/whatsapp`
- Item ativo fica destacado quando na rota `/whatsapp`

---

## FASE 1.5 — WhatsApp Bot Intelligence ⭐ PRIORIDADE ALTA

**Objetivo:** Transformar o bot de WhatsApp em assistente financeiro inteligente. Dois modos:
1. **Comandos slash** — respostas rápidas com dados estruturados (`/saldo`, `/entradas`, etc.)
2. **Consulta conversacional** — linguagem natural, Groq responde com dados reais do banco

**Por que prioridade alta:** O webhook de WhatsApp já funciona. O parsing de mensagens via Groq já existe. Só falta a camada de query de dados e o roteamento de comandos. Custo de implementação baixo, impacto alto.

**Arquivos:**
- Modificar: `src/app/api/whatsapp/webhook/route.ts` (adicionar roteamento de comandos)
- Criar: `src/lib/whatsapp-commands.ts` (handlers dos comandos slash)
- Criar: `src/lib/whatsapp-ai-query.ts` (consulta conversacional com Groq)
- Referência: `src/lib/groq.ts` (já tem `parseFinancialMessage`)
- Referência: `src/lib/whatsapp.ts` (já tem `sendMessage`)

### Task 1.5.1: Detectar Comandos vs Linguagem Natural

**Arquivos:**
- Modificar: `src/app/api/whatsapp/webhook/route.ts`

**Step 1: Adicionar roteamento no handler principal**

O webhook atual trata toda mensagem como registro de transação. Precisamos adicionar um "router" antes:

```ts
// No início do handler de mensagem de texto:
const text = message.text?.trim() ?? ''

if (text.startsWith('/')) {
  // Rota de comando slash
  const [command, ...args] = text.split(' ')
  return handleSlashCommand(command.toLowerCase(), args, userId, phoneNumber)
}

// Se não começa com /, verificar se é pergunta sobre dados
const isQuery = await isFinancialQuery(text)
if (isQuery) {
  return handleConversationalQuery(text, userId, phoneNumber)
}

// Fallback: fluxo existente de registro de transação
```

**Step 2: Verificar que fluxo de registro existente não quebra**
- Enviar "Gastei 50 no mercado" → deve continuar funcionando como antes
- Enviar "/saldo" → deve chamar novo handler
- Enviar "quanto gastei esse mês?" → deve chamar query conversacional

### Task 1.5.2: Handlers de Comandos Slash

**Arquivos:**
- Criar: `src/lib/whatsapp-commands.ts`

**Comandos a implementar:**

| Comando | Resposta |
|---------|---------|
| `/saldo` | Saldo atual (receitas - despesas do mês corrente) |
| `/entradas [mês]` | Total de receitas do mês. Ex: `/entradas março` |
| `/saidas [mês]` | Total de despesas do mês. Ex: `/saidas` |
| `/resumo [mês]` | Resumo completo: entradas, saídas, saldo, top 3 categorias |
| `/metas` | Lista metas com % de progresso |
| `/orcamento` | Orçamento do mês: planejado vs realizado por categoria |
| `/ajuda` | Lista todos os comandos disponíveis |

**Step 1: Implementar cada handler**

```ts
// src/lib/whatsapp-commands.ts

export async function handleSlashCommand(
  command: string,
  args: string[],
  userId: string,
  phoneNumber: string
): Promise<void> {
  const { sendMessage } = await import('./whatsapp')

  switch (command) {
    case '/saldo':
      return sendSaldo(userId, phoneNumber)
    case '/entradas':
      return sendEntradas(userId, args[0], phoneNumber)
    case '/saidas':
      return sendSaidas(userId, args[0], phoneNumber)
    case '/resumo':
      return sendResumo(userId, args[0], phoneNumber)
    case '/metas':
      return sendMetas(userId, phoneNumber)
    case '/orcamento':
      return sendOrcamento(userId, phoneNumber)
    case '/ajuda':
      return sendAjuda(phoneNumber)
    default:
      await sendMessage(phoneNumber, `Comando não reconhecido: ${command}\nEnvie /ajuda para ver os comandos disponíveis.`)
  }
}
```

**Step 2: Implementar `sendSaldo`**
```ts
async function sendSaldo(userId: string, phone: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [receitas, despesas] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true }
    })
  ])

  const totalReceitas = receitas._sum.amount ?? 0
  const totalDespesas = despesas._sum.amount ?? 0
  const saldo = totalReceitas - totalDespesas

  const mes = now.toLocaleString('pt-BR', { month: 'long' })
  const emoji = saldo >= 0 ? '🟢' : '🔴'

  await sendMessage(phone, [
    `${emoji} *Saldo de ${mes}*`,
    '',
    `📈 Receitas:  R$ ${totalReceitas.toFixed(2)}`,
    `📉 Despesas:  R$ ${totalDespesas.toFixed(2)}`,
    `──────────────────`,
    `💰 Saldo:     R$ ${saldo.toFixed(2)}`
  ].join('\n'))
}
```

**Step 3: Implementar `sendResumo` (mais rico)**
```ts
// Além de entradas/saídas/saldo, incluir:
// - Top 3 categorias de despesa com valor
// - Número de transações do mês
// - Comparação com mês anterior (% mais ou menos)
```

**Step 4: Implementar `sendMetas`**
```ts
// Buscar goals do usuário
// Para cada meta: nome, valor atual, valor alvo, %
// Formato: "🎯 Viagem Europa: R$ 3.200 / R$ 8.000 (40%)"
```

**Step 5: Implementar `sendOrcamento`**
```ts
// Buscar budgets do mês atual com spending real
// Formato por categoria:
// "🍔 Alimentação: R$ 450 / R$ 800 (56%)"
// "⛽ Transporte: R$ 320 / R$ 300 ⚠️ EXCEDIDO"
```

**Step 6: Verificar cada comando**
- Enviar cada comando no WhatsApp
- Verificar resposta correta e formatada

### Task 1.5.3: Consulta Conversacional com Groq

**Arquivos:**
- Criar: `src/lib/whatsapp-ai-query.ts`

**Objetivo:** Usuário envia pergunta em linguagem natural, JARVIS consulta o banco e responde.

**Exemplos de queries:**
- "quanto gastei esse mês?"
- "qual minha maior despesa de fevereiro?"
- "quanto ainda tenho de orçamento pra alimentação?"
- "estou perto de bater alguma meta?"
- "quais foram minhas últimas 5 compras?"

**Step 1: Detectar se é pergunta financeira**
```ts
export async function isFinancialQuery(text: string): Promise<boolean> {
  // Heurística simples — palavras-chave indicam consulta
  const queryKeywords = [
    'quanto', 'qual', 'quais', 'quando', 'como', 'estou',
    'gastei', 'recebi', 'gasto', 'receita', 'despesa',
    'meta', 'orçamento', 'saldo', 'fatura', 'extrato',
    'mês', 'semana', 'ano', 'hoje', 'ontem', 'última', 'último'
  ]
  const lower = text.toLowerCase()
  return queryKeywords.some(kw => lower.includes(kw))
}
```

**Step 2: Arquitetura da consulta conversacional**

```
MENSAGEM DO USUÁRIO
      ↓
GROQ: Identificar intent + parâmetros
      ↓
PRISMA: Executar query de dados
      ↓
GROQ: Formatar resposta natural
      ↓
WHATSAPP: Enviar resposta
```

**Step 3: Implementar `handleConversationalQuery`**
```ts
export async function handleConversationalQuery(
  text: string,
  userId: string,
  phone: string
): Promise<void> {
  // 1. Pedir ao Groq que identifique o que o usuário quer
  const intent = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'system',
      content: `Você é um assistente financeiro. Dado o texto do usuário, retorne JSON com:
      {
        "intent": "saldo_mes" | "gastos_categoria" | "receitas_mes" | "ultimas_transacoes" | "meta_status" | "orcamento_status" | "outro",
        "params": {
          "mes": "YYYY-MM" | null,  // null = mês atual
          "categoria": string | null,
          "limite": number | null
        }
      }
      Retorne APENAS o JSON, sem markdown.`
    }, {
      role: 'user',
      content: text
    }],
    max_tokens: 200
  })

  const intentData = JSON.parse(intent.choices[0].message.content)

  // 2. Executar query baseada no intent
  const data = await queryByIntent(intentData, userId)

  // 3. Formatar resposta natural via Groq
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{
      role: 'system',
      content: `Você é um assistente financeiro pessoal respondendo via WhatsApp.
      Seja conciso, use emojis com moderação, formate valores em R$.
      NUNCA invente dados — use apenas o que está no contexto.`
    }, {
      role: 'user',
      content: `Pergunta: "${text}"\n\nDados do banco:\n${JSON.stringify(data, null, 2)}\n\nResponda de forma natural e direta.`
    }],
    max_tokens: 400
  })

  await sendMessage(phone, response.choices[0].message.content)
}
```

**Step 4: Implementar `queryByIntent`**
```ts
async function queryByIntent(intent: IntentData, userId: string): Promise<object> {
  const targetMonth = intent.params.mes
    ? new Date(intent.params.mes + '-01')
    : new Date()
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59)

  switch (intent.intent) {
    case 'saldo_mes':
      // retorna receitas, despesas, saldo do mês
    case 'gastos_categoria':
      // retorna gastos agrupados por categoria
    case 'ultimas_transacoes':
      // retorna últimas N transações (N = intent.params.limite ?? 5)
    case 'meta_status':
      // retorna metas com progresso
    case 'orcamento_status':
      // retorna budgets com spending real
    default:
      return { message: 'Não consegui entender a pergunta.' }
  }
}
```

**Step 5: Testar consultas conversacionais**
- "quanto gastei esse mês?" → saldo/despesas corretas
- "quais foram minhas últimas compras?" → lista de transações
- "como tá meu orçamento de alimentação?" → budget vs real

### Task 1.5.4: Detecção de cartão no WhatsApp (3 níveis)

**Arquivos:**
- Modificar: `src/app/api/whatsapp/webhook/route.ts`
- Modificar: `src/lib/whatsapp-commands.ts`

**Objetivo:** Informar qual cartão foi usado sem adicionar fricção no fluxo de registro.

**Nível 1 — Detecção na própria mensagem (zero fricção):**
```ts
// Normalizar o texto para detectar menções a cartões
async function detectCardFromMessage(text: string, userId: string): Promise<string | null> {
  const cards = await prisma.creditCard.findMany({ where: { userId } })
  const lower = text.toLowerCase()
  for (const card of cards) {
    const terms = [
      card.name.toLowerCase(),        // "nubank black"
      card.bank.toLowerCase(),         // "nubank"
      card.lastFour ?? '',             // "4521"
    ].filter(Boolean)
    if (terms.some(t => lower.includes(t))) return card.id
  }
  return null
}
// "Gastei 80 no iFood no Nubank" → detecta Nubank → atribui automaticamente
// "Paguei 150 na Amazon pelo Inter 4521" → detecta Inter + lastFour → atribui
```

**Nível 2 — Cartão padrão (zero fricção, fallback):**
```ts
// Novo campo no User: defaultCreditCardId String?
// Se Nível 1 não detectou cartão → usa cartão padrão do usuário silenciosamente
const cardId = detectedCardId ?? user.defaultCreditCardId ?? null
```

A mensagem de confirmação mostra qual cartão foi atribuído:
```
Confirmar lançamento?

📝 iFood
💰 R$ 80,00
🔴 Despesa
💳 Nubank Black  ← mostra o cartão (detectado ou padrão)

1 para confirmar ✅
2 para cancelar ❌
3 para trocar cartão
```

**Nível 3 — Override (quando responde "3"):**
```ts
// Se usuário responde "3" ao invés de 1 ou 2:
// Bot lista os cartões disponíveis numerados
// "Qual cartão?\n1. Nubank Black\n2. Inter Gold\n3. Débito/Pix"
// Usuário responde o número → atribui e pede confirmação novamente
```

**Step 1: Adicionar campo `defaultCreditCardId` no User via Prisma**
**Step 2: Salvar `creditCardId` no WhatsappPending junto com os demais dados**
**Step 3: Ao confirmar (resposta "1"), incluir `creditCardId` na Transaction criada**
**Step 4: Tratar resposta "3" no fluxo de pending para listar cartões**
**Step 5: Verificar fluxo completo: mensagem → detecção → confirmação com cartão → salvo**

### Task 1.5.5: Alertas de threshold via WhatsApp

**Arquivos:**
- Criar: `src/lib/credit-card-alerts.ts`
- Modificar: `src/app/api/whatsapp/webhook/route.ts` (chamar após salvar transação)

**Objetivo:** Depois de salvar uma transação em cartão, verificar se atingiu threshold e disparar alerta.

**Step 1: Função de verificação de threshold**
```ts
// Thresholds configuráveis (padrão: 70%, 85%, 100% do limite)
const THRESHOLDS = [0.7, 0.85, 1.0]

export async function checkCreditCardAlert(
  cardId: string,
  userId: string,
  phone: string
): Promise<void> {
  const card = await prisma.creditCard.findUnique({ where: { id: cardId } })
  if (!card || !card.limit) return

  const cycle = getBillingCycle(card.closingDay, new Date())
  const spent = await prisma.transaction.aggregate({
    where: {
      creditCardId: cardId,
      type: 'EXPENSE',
      date: { gte: cycle.start, lte: cycle.end }
    },
    _sum: { amount: true }
  })

  const total = spent._sum.amount ?? 0
  const pct = total / card.limit

  // Verificar se cruzou algum threshold com esta transação
  // (guardar último threshold alertado para não repetir)
  for (const threshold of THRESHOLDS) {
    if (pct >= threshold) {
      await sendThresholdAlert(card, total, pct, phone)
      break
    }
  }
}
```

**Step 2: Mensagens de alerta por nível**
```ts
// 70%: aviso suave
"⚠️ Atenção: você usou 70% do limite do *Nubank Black*
Gasto no ciclo: R$ 2.100 / R$ 3.000"

// 85%: aviso forte
"🚨 Alerta: *Nubank Black* está em 85% do limite
Gasto: R$ 2.550 / R$ 3.000
Restante: R$ 450"

// 100%: crítico
"🔴 Limite atingido: *Nubank Black*
Gasto: R$ 3.000 / R$ 3.000
Novas compras neste cartão excederão o limite."
```

**Step 3: Alerta de fechamento próximo (cron ou trigger)**
```ts
// Disparar X dias antes do closingDay (configurável, padrão: 3 dias)
// "Sua fatura do *Nubank Black* fecha em 3 dias.
//  Total acumulado: R$ 2.100
//  Projeção até fechamento: R$ 2.350"
```

**Step 4: Novos comandos WhatsApp**
```
/fatura [cartão]   → fatura atual do cartão (ou todos os cartões se sem argumento)
/cartoes           → lista todos os cartões com % de utilização do ciclo atual
/torneiras         → lista assinaturas e recorrentes detectadas
```

**Exemplos de resposta `/fatura`:**
```
💳 *Nubank Black*
Ciclo: 04/mar → 03/abr (fecha em 4 dias)
Gasto: R$ 2.100 / R$ 3.000 (70%)
████████████░░░░ 70%

Top gastos:
1. iFood       R$ 420
2. Amazon      R$ 315
3. Posto Shell R$ 180
```

**Exemplos de resposta `/cartoes`:**
```
💳 Seus cartões — março/abril:

Nubank Black   R$ 2.100/3.000  70% ⚠️  fecha em 4d
Inter Gold     R$   850/2.000  43% ✅  fecha em 12d
─────────────────────────────────
Total faturas: R$ 2.950
```

**Step 5: Verificar todos os alertas e comandos**

### Task 1.5.6: Mensagem /ajuda atualizada

**Arquivos:**
- Modificar: `src/components/whatsapp/WhatsAppInstructions.tsx`

**Atualizar lista de comandos na página de WhatsApp:**
```
REGISTRAR GASTOS:
  "Gastei R$ 50 no mercado" → registra (usa cartão padrão se crédito)
  "Gastei 80 no iFood no Nubank" → detecta cartão automaticamente
  🎤 Envie áudio falando o gasto
  📷 Foto do recibo → extrai automaticamente

COMANDOS DE SALDO:
  /saldo          → saldo do mês (receitas - despesas)
  /entradas       → total de receitas
  /saidas         → total de despesas
  /resumo         → resumo completo do mês

COMANDOS DE CARTÕES:
  /fatura         → fatura atual de todos os cartões
  /fatura nubank  → fatura de um cartão específico
  /cartoes        → todos os cartões com % de utilização
  /torneiras      → assinaturas e gastos recorrentes

METAS E ORÇAMENTO:
  /metas          → progresso das metas
  /orcamento      → orçamento vs realizado por categoria

PERGUNTAS LIVRES:
  "quanto gastei com alimentação?"
  "qual minha maior despesa de março?"
  "quanto ainda posso gastar no Nubank?"
  /ajuda          → esta lista
```

---

## FASE 2 — Import de Extratos + Faturas de Cartão

**Objetivo:** Importar extrato bancário (OFX/CSV) e fatura de cartão (PDF/CSV) com três casos de uso distintos:
1. **Migração histórica** — subir faturas antigas para construir histórico e calibrar detecção de torneiras
2. **Reconciliação mensal** — subir fatura do mês encerrado para bater com lançamentos manuais
3. **Import avulso** — extrato bancário para preencher lacunas

**Arquivos:**
- Criar: `src/app/(app)/transacoes/importar/page.tsx`
- Criar: `src/components/transactions/ImportDialog.tsx`
- Criar: `src/components/transactions/ReconciliationView.tsx`
- Criar: `src/app/api/transactions/import/route.ts`
- Criar: `src/app/api/transactions/import/reconcile/route.ts`
- Criar: `src/lib/parsers/ofx.ts`
- Criar: `src/lib/parsers/csv.ts`
- Criar: `src/lib/parsers/pdf.ts`
- Criar: `src/lib/parsers/autocategorize.ts`
- Modificar: `src/app/(app)/transacoes/page.tsx` (botão importar)
- Instalar: `ofx-js` ou parser manual, `pdf-parse` ou `@aws-sdk/lib-pdf`

### Task 2.1: Parser OFX

**Arquivos:**
- Criar: `src/lib/parsers/ofx.ts`

**Step 1: Instalar dependência**
```bash
npm install ofx-js
```

**Step 2: Parser function**
```ts
// Input: string (conteúdo do arquivo .ofx)
// Output: ParsedTransaction[]
interface ParsedTransaction {
  date: Date
  description: string
  amount: number  // positivo = entrada, negativo = saída
  type: 'INCOME' | 'EXPENSE'
  externalId?: string  // FITID do OFX para dedup
}
```

**Step 3: Extrair do XML do OFX**
OFX é XML/SGML. Campos relevantes: `<DTPOSTED>`, `<TRNAMT>`, `<MEMO>`, `<FITID>`

**Step 4: Testar com arquivo de extrato real**
- Pegar um .ofx de qualquer banco
- Rodar parser
- Verificar output

### Task 2.2: Parser CSV

**Arquivos:**
- Criar: `src/lib/parsers/csv.ts`

**Step 1: Instalar dependência**
```bash
npm install papaparse
npm install -D @types/papaparse
```

**Step 2: Detectar colunas automaticamente**
CSV de bancos BR têm formatos variados. Estratégia:
- Detectar colunas de data, valor, descrição por heurística (nome da coluna)
- Fallback: mostrar UI de mapeamento de colunas ao usuário

**Step 3: Normalizar valores BR**
- "1.234,56" → 1234.56 (decimal BR)
- Datas: DD/MM/YYYY → Date object

**Step 4: Testar com CSV de Nubank, Inter, Bradesco**

### Task 2.3: Parser PDF (Fatura Cartão)

**Arquivos:**
- Criar: `src/lib/parsers/pdf.ts`

**Step 1: Instalar dependência**
```bash
npm install pdf-parse
```

**Step 2: Estratégia de extração**
```ts
// 1. Extrair texto do PDF com pdf-parse
// 2. Enviar texto para Groq (llama-3.1-8b) com prompt:
//    "Extraia as transações deste extrato de cartão de crédito.
//     Retorne JSON array com: date, description, amount"
// 3. Parsear JSON retornado
```

**Step 3: Prompt de extração**
```ts
const prompt = `
Você é um parser de fatura de cartão de crédito.
Extraia TODAS as transações do texto abaixo.
Retorne APENAS um JSON array válido, sem markdown:
[{"date": "YYYY-MM-DD", "description": "string", "amount": number}]
Onde amount é sempre positivo.

TEXTO DA FATURA:
${pdfText}
`
```

**Step 4: Testar com fatura de cartão real**

### Task 2.4: Auto-categorização

**Arquivos:**
- Criar: `src/lib/parsers/autocategorize.ts`

**Step 1: Buscar categorias do usuário**
```ts
const categories = await prisma.category.findMany()
```

**Step 2: Prompt de categorização em lote**
```ts
// Enviar lista de descrições + lista de categorias para Groq
// Retornar: { [description]: categoryId }
const prompt = `
Categorize estas transações financeiras.
Categorias disponíveis: ${JSON.stringify(categories.map(c => ({id: c.id, name: c.name, type: c.type})))}
Transações: ${JSON.stringify(transactions.map(t => t.description))}
Retorne JSON: {"DESCRIÇÃO": "categoryId", ...}
`
```

**Step 3: Aplicar categorias**
Mapear categoryId às transações parsed.

### Task 2.5: API de Import

**Arquivos:**
- Criar: `src/app/api/transactions/import/route.ts`

**Step 1: Receber arquivo via FormData**
```ts
const formData = await req.formData()
const file = formData.get('file') as File
const fileType = formData.get('type') as 'ofx' | 'csv' | 'pdf'
```

**Step 2: Chamar parser correto**
```ts
let parsed: ParsedTransaction[]
if (fileType === 'ofx') parsed = await parseOFX(text)
if (fileType === 'csv') parsed = await parseCSV(text)
if (fileType === 'pdf') parsed = await parsePDF(buffer)
```

**Step 3: Auto-categorizar**
```ts
const categorized = await autocategorize(parsed)
```

**Step 4: Retornar preview (não salvar ainda)**
```ts
return Response.json({ transactions: categorized, total: categorized.length })
```
O usuário revisa antes de confirmar.

**Step 5: Endpoint de confirmação**
```
POST /api/transactions/import/confirm
Body: { transactions: Transaction[] }
```
Salva no banco com `source: 'import'`.

### Task 2.6: UI de Import

**Arquivos:**
- Criar: `src/components/transactions/ImportDialog.tsx`
- Modificar: `src/app/(app)/transacoes/page.tsx`

**Step 1: Botão "Importar" na página de transações**
Adicionar botão ao lado do botão "Nova Transação".

**Step 2: Dialog em 3 etapas**
```
Etapa 1: Seleção de arquivo + tipo (OFX / CSV / PDF)
Etapa 2: Preview da tabela com transações detectadas + categorias sugeridas (editáveis)
Etapa 3: Confirmação → "X transações importadas com sucesso"
```

**Step 3: Verificar**
- Upload OFX → preview correto
- Upload CSV → preview correto
- Upload PDF fatura → preview correto
- Confirmar → transações no banco com `source: 'import'`

### Task 2.7: Importação de Fatura vinculada a Cartão

**Arquivos:**
- Modificar: `src/components/transactions/ImportDialog.tsx` (adicionar seleção de cartão)
- Modificar: `src/app/api/transactions/import/route.ts`

**Objetivo:** Ao importar um PDF/CSV de fatura, perguntar "de qual cartão é essa fatura?" e vincular todas as transações ao `creditCardId` correto.

**Step 1: Adicionar step de seleção de cartão no ImportDialog**
```
Etapa 0 (nova — só para PDF/CSV de fatura):
  "Este arquivo é uma fatura de cartão de crédito?"
  [Sim — selecionar cartão] [Não — extrato bancário comum]

  Se Sim:
    Dropdown: selecionar cartão existente ou "+ Novo cartão"
    O sistema usa closingDay do cartão para identificar o ciclo automaticamente
```

**Step 2: Ao confirmar importação de fatura**
```ts
// Cada transação importada recebe:
{
  creditCardId: selectedCardId,
  paymentMethod: 'credit',
  source: 'statement_import',
  importBatch: generateBatchId()  // agrupa todas as transações da mesma importação
}
```

**Step 3: Deduplicação inteligente**
```ts
// Antes de criar, verificar se já existe transação "similar":
// mesma data (±1 dia) + mesmo valor (±5%) + descrição similar (>80% match)
// Se já existe: marcar como DUPLICATA no preview, não importar automaticamente
```

**Step 4: Verificar**
- Upload fatura Nubank → perguntar cartão → vincular ao Nubank
- Transações aparecem com `creditCardId` correto no banco

### Task 2.8: Reconciliação mensal

**Arquivos:**
- Criar: `src/components/transactions/ReconciliationView.tsx`
- Criar: `src/app/api/transactions/import/reconcile/route.ts`

**Objetivo:** Após importar fatura do mês encerrado, comparar contra lançamentos manuais do mesmo ciclo. Identificar gaps.

**Step 1: Endpoint POST /api/transactions/import/reconcile**
```ts
// Input: lista de transações importadas + creditCardId
// 1. Calcular ciclo do cartão para o período das transações importadas
// 2. Buscar transações manuais do mesmo ciclo para o mesmo cartão
// 3. Fazer matching: data ±2 dias + valor ±5% + similaridade de descrição

// Output:
{
  matched: Transaction[],         // na fatura E no sistema → OK
  onlyInStatement: Transaction[], // na fatura MAS NÃO no sistema → faltou registrar
  onlyInSystem: Transaction[],    // no sistema MAS NÃO na fatura → pode ser débito/pix
  summary: {
    statementTotal: number,
    systemTotal: number,
    difference: number,
    coveragePercent: number  // % de transações da fatura que foram capturadas
  }
}
```

**Step 2: UI de Reconciliação (ReconciliationView)**
```
╔══════════════════════════════════════════════════════════════╗
║  RECONCILIAÇÃO — Nubank Black — Ciclo 04/mar → 03/abr       ║
╠══════════════════════════════════════════════════════════════╣
║  Fatura:    R$ 3.420   |  Registrado: R$ 3.195              ║
║  Diferença: R$ 225     |  Cobertura: 93%                    ║
╚══════════════════════════════════════════════════════════════╝

✅ 38 transações com match

⚠️  5 na fatura NÃO registradas:
  [ ] 15/mar  iFood         R$ 42,90   [Importar]
  [ ] 18/mar  Posto Shell   R$ 95,00   [Importar]
  ...

🔍  3 no sistema SEM fatura (débito/pix?):
  • 12/mar  Mercado Livre  R$ 87,00
  ...
```

**Step 3: Ação "Importar selecionados"**
Usuário marca quais transações faltantes quer importar → salva no banco.

**Step 4: Verificar**
- Importar fatura → reconciliação mostra gaps corretos
- Importar selecionados → aparecem no sistema com `source: 'reconciliation_import'`

### Task 2.9: Importação histórica

**Objetivo:** Subir faturas de meses anteriores para construir histórico.

**Step 1: Fluxo igual às Tasks 2.7 + 2.8**, mas com flag `isHistorical: true`

**Step 2: Ao importar histórico, marcar transações como `source: 'historical_import'`**

**Step 3: Dashboard de histórico fica disponível automaticamente** — basta ter os dados. Os gráficos existentes de cashflow já usam dados históricos.

**Step 4: Alimenta detecção de torneiras** — com histórico de 3+ meses, o algoritmo de recorrentes tem dados suficientes para detectar padrões.

---

## FASE 3 — Adicionar Cônjuge (Conta para a Esposa)

**Objetivo:** Criar uma segunda conta de usuário para a esposa, com acesso ao mesmo conjunto de dados financeiros. Escopo mínimo: sem família/grupos complexos, apenas dois usuários que enxergam os mesmos dados.

**Escopo intencional:** App é pessoal (eu + esposa). Não precisamos de FamilyGroup, roles, convites por email, ou sistema multi-tenant complexo. A abordagem mais simples: os dois usuários compartilham um `householdId` e as queries filtram por household ao invés de por userId individual.

**Arquivos:**
- Modificar: `prisma/schema.prisma` (adicionar campo `householdId` no User)
- Criar: `src/app/(app)/configuracoes/convidar/page.tsx` (UI simples para gerar link de convite)
- Criar: `src/app/api/household/invite/route.ts`
- Criar: `src/app/api/household/join/route.ts`
- Modificar: queries nas APIs de transações/orçamento/metas para filtrar por `householdId`

### Task 3.1: Schema Household Simples

**Arquivos:**
- Modificar: `prisma/schema.prisma`

**Step 1: Adicionar campo householdId no User**
```prisma
model User {
  // ... campos existentes ...
  householdId String?   // se null, usuário é individual
}
```

**Step 2: Não criar tabela separada Household**
O householdId é apenas um UUID compartilhado entre dois users. O primeiro user que convida gera o UUID, o segundo user que aceita recebe o mesmo UUID.

**Step 3: Migrar banco**
```bash
npx prisma db push
```

### Task 3.2: Gerar Convite

**Arquivos:**
- Criar: `src/app/api/household/invite/route.ts`

**Step 1: Endpoint POST /api/household/invite**
```ts
// Gera um token de convite (JWT com userId + expiração 24h)
// Retorna link: /join?token=xxx
// Salvar token em campo temporário (ou usar JWT stateless)
```

**Step 2: Página de convite em Configurações**
```
"Convidar cônjuge"
[Gerar link de convite]
→ Exibe link para copiar/compartilhar
→ Link expira em 24 horas
```

### Task 3.3: Aceitar Convite

**Arquivos:**
- Criar: `src/app/(app)/join/page.tsx` ou `src/app/join/page.tsx`
- Criar: `src/app/api/household/join/route.ts`

**Step 1: Fluxo de join**
```
1. Esposa acessa link /join?token=xxx
2. Se não tem conta → formulário de registro
3. Se já tem conta → login + confirmação
4. API valida token, extrai userId do dono
5. Se dono não tem householdId → gera novo UUID e atribui a ambos
6. Se dono já tem householdId → atribui mesmo householdId à esposa
```

### Task 3.4: Queries compartilhadas

**Step 1: Helper `getHouseholdFilter(userId)`**
```ts
async function getHouseholdFilter(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.householdId) {
    return { userId }  // filtro individual
  }
  // Buscar todos userIds do mesmo household
  const members = await prisma.user.findMany({
    where: { householdId: user.householdId },
    select: { id: true }
  })
  return { userId: { in: members.map(m => m.id) } }
}
```

**Step 2: Aplicar em transações, orçamento, metas**
```ts
// Antes:
const transactions = await prisma.transaction.findMany({ where: { userId } })

// Depois:
const filter = await getHouseholdFilter(userId)
const transactions = await prisma.transaction.findMany({ where: filter })
```

**Step 3: Verificar**
- Usuário 1 registra transação → aparece para Usuário 2
- Ambos veem o mesmo dashboard
- Cada um tem seu próprio perfil/nome/WhatsApp

### Task 3.5: Cartões no contexto household

**Objetivo:** No dashboard de cartões, exibir os cartões de ambos os usuários com identificação de dono.

**Step 1: Query de cartões do household**
```ts
// Ao buscar cartões para o dashboard:
const filter = await getHouseholdFilter(userId)
const memberIds = 'userId' in filter
  ? [filter.userId]
  : filter.userId.in

const cards = await prisma.creditCard.findMany({
  where: { userId: { in: memberIds } },
  include: { user: { select: { name: true } } }
})
```

**Step 2: Identificação visual por usuário**
```tsx
// FaturaCard mostra nome do dono:
// "💳 Nubank Black ····4521   👤 Ana"
// "💳 Inter Gold   ····7823   👤 Lucas"
```

**Step 3: WhatsApp — cada usuário vê só seus cartões**
```ts
// No webhook, ao listar cartões para detecção/override:
// Filtrar por userId (não por household) — cada um gerencia seus próprios cartões
const myCards = await prisma.creditCard.findMany({ where: { userId: user.id } })
```

**Step 4: Cartão padrão por usuário**
Cada usuário define seu próprio `defaultCreditCardId` — a esposa tem o dela, Lucas tem o dele. Sem interferência cruzada no registro via WhatsApp.

---

## FASE 4 — Cartões de Crédito + Settings + Quick-wins

**Objetivo:** Implementar o módulo completo de cartões de crédito (schema, CRUD, dashboard de fatura, alertas, torneiras) junto com o polish de configurações e quick-wins do PlannerFin.

---

### MÓDULO 4A — Cartões de Crédito

**Arquivos:**
- Modificar: `prisma/schema.prisma` (CreditCard + campos em Transaction + User)
- Criar: `src/app/(app)/cartoes/page.tsx`
- Criar: `src/components/credit-cards/CreditCardList.tsx`
- Criar: `src/components/credit-cards/CreditCardForm.tsx`
- Criar: `src/components/credit-cards/FaturaCard.tsx`
- Criar: `src/components/credit-cards/TorneirasPanel.tsx`
- Criar: `src/app/api/credit-cards/route.ts`
- Criar: `src/app/api/credit-cards/[id]/route.ts`
- Criar: `src/lib/billing-cycle.ts`
- Criar: `src/lib/recurring-detector.ts`
- Modificar: `src/components/layout/Sidebar.tsx` (link Cartões)

### Task 4A.1: Schema Prisma — CreditCard

**Arquivos:**
- Modificar: `prisma/schema.prisma`

**Step 1: Adicionar modelo CreditCard**
```prisma
model CreditCard {
  id           String        @id @default(cuid())
  name         String        // "Nubank Black"
  bank         String        // "Nubank"
  lastFour     String?       // "4521" — identificação visual
  limit        Float         // limite de crédito em R$
  closingDay   Int           // dia do mês que fecha a fatura (1-31)
  dueDay       Int           // dia do mês que vence o pagamento (1-31)
  color        String?       // "#8B5CF6" — cor para identificação visual
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

**Step 2: Adicionar campos em Transaction**
```prisma
model Transaction {
  // ... campos existentes mantidos ...
  paymentMethod  String?      // 'credit' | 'debit' | 'pix' | 'cash' | 'transfer'
  creditCardId   String?      // FK → CreditCard (só quando paymentMethod = 'credit')
  creditCard     CreditCard?  @relation(fields: [creditCardId], references: [id])
  isRecurring    Boolean      @default(false)   // auto-detectado ou marcado manualmente
  recurringTag   String?      // nome normalizado: "Netflix", "Spotify", "Academia"
  importSource   String?      // 'manual' | 'whatsapp' | 'statement_import' | 'historical_import' | 'reconciliation_import'
  importBatch    String?      // UUID que agrupa transações da mesma importação
}
```

**Step 3: Adicionar campo defaultCreditCardId em User**
```prisma
model User {
  // ... campos existentes ...
  defaultCreditCardId String?    // cartão padrão para registro no WhatsApp
  creditCards         CreditCard[]
}
```

**Step 4: Migrar banco**
```bash
npx prisma db push
# verificar com npx prisma studio
```

### Task 4A.2: API CRUD de Cartões

**Arquivos:**
- Criar: `src/app/api/credit-cards/route.ts`
- Criar: `src/app/api/credit-cards/[id]/route.ts`

**GET /api/credit-cards** — lista cartões do usuário (e do household se aplicável)
**POST /api/credit-cards** — criar cartão
**PATCH /api/credit-cards/[id]** — editar cartão
**DELETE /api/credit-cards/[id]** — excluir cartão

**Para o household:** a query deve retornar cartões de todos os membros, com campo `ownerName` para identificar de quem é cada cartão.

### Task 4A.3: Billing Cycle — Lógica de Ciclo de Fatura

**Arquivos:**
- Criar: `src/lib/billing-cycle.ts`

**Step 1: Função getBillingCycle**
```ts
// Para um cartão com closingDay = 3:
// Hoje = 20/mar → ciclo atual = 04/fev → 03/mar (já fechou)
// Hoje = 20/mar → ciclo aberto = 04/mar → 03/abr
// Retorna o ciclo que está aberto AGORA

export function getBillingCycle(closingDay: number, referenceDate: Date) {
  const d = referenceDate
  const cutoff = new Date(d.getFullYear(), d.getMonth(), closingDay)

  if (d > cutoff) {
    // Já passou o fechamento deste mês: ciclo corrente é closingDay+1 → próximo closingDay
    return {
      start: new Date(d.getFullYear(), d.getMonth(), closingDay + 1),
      end:   new Date(d.getFullYear(), d.getMonth() + 1, closingDay)
    }
  } else {
    // Antes do fechamento: ciclo corrente é closingDay+1 do mês anterior → closingDay atual
    return {
      start: new Date(d.getFullYear(), d.getMonth() - 1, closingDay + 1),
      end:   new Date(d.getFullYear(), d.getMonth(), closingDay)
    }
  }
}
```

**Step 2: Função de projeção**
```ts
export function projectCycleTotal(
  currentSpent: number,
  cycleStart: Date,
  cycleEnd: Date,
  referenceDate: Date
): number {
  const totalDays = (cycleEnd.getTime() - cycleStart.getTime()) / 86400000
  const daysElapsed = (referenceDate.getTime() - cycleStart.getTime()) / 86400000
  if (daysElapsed <= 0) return 0
  return (currentSpent / daysElapsed) * totalDays
}
```

**Step 3: Testar com diferentes closingDays e datas**

### Task 4A.4: Dashboard de Faturas

**Arquivos:**
- Criar: `src/app/(app)/cartoes/page.tsx`
- Criar: `src/components/credit-cards/FaturaCard.tsx`

**Step 1: FaturaCard — componente por cartão**
```
╔══════════════════════════════════════════════════╗
║  💳 Nubank Black  ····4521              Lucas   ║
╠══════════════════════════════════════════════════╣
║  Gasto no ciclo:  R$ 2.100 / R$ 3.000           ║
║  ████████████░░░░░░░░  70%                       ║
║  Fecha em: 4 dias (03/abr)                       ║
║  Vence em: 10/abr                                ║
║  Projeção: R$ 2.350                              ║
╚══════════════════════════════════════════════════╝
```

Cores do progress bar:
- Verde: < 60%
- Amarelo: 60-85%
- Vermelho: > 85%

**Step 2: Página principal de Cartões**
```
VISÃO GERAL DA FAMÍLIA
─────────────────────────────────────────────────────
[FaturaCard Lucas - Nubank]  [FaturaCard Lucas - Inter]
[FaturaCard Ana - Nubank PF] [FaturaCard Ana - C6]

Total de faturas abertas: R$ 4.482
Próximo vencimento: Nubank Black — 10/abr (R$ 2.100)
─────────────────────────────────────────────────────
[+ Adicionar cartão]
```

**Step 3: Drill-down do cartão (modal ou página)**
- Todas as transações do ciclo atual
- Filtro por categoria
- Gráfico de gastos por dia do ciclo

### Task 4A.5: Torneiras Abertas (Recorrentes)

**Arquivos:**
- Criar: `src/lib/recurring-detector.ts`
- Criar: `src/components/credit-cards/TorneirasPanel.tsx`

**Step 1: Algoritmo de detecção**
```ts
export async function detectRecurring(userId: string): Promise<RecurringExpense[]> {
  // 1. Buscar transações dos últimos 3 meses
  // 2. Agrupar por "chave normalizada" (descrição normalizada + valor ±15%)
  // 3. Se grupo tem ocorrências em >= 2 meses distintos → É RECORRENTE
  // 4. Retornar: nome, valor médio, cartão, meses detectados, próxima cobrança estimada

  // Normalização de descrição:
  // "NETFLIX.COM*BR" → "netflix"
  // "SPOTIFY AB" → "spotify"
  // Remover: *, números, sufixos de país, datas na string
}
```

**Step 2: TorneirasPanel**
```
🚿 TORNEIRAS ABERTAS — R$ 287/mês

  Netflix       R$  55,90  · Nubank  · todo mês ~dia 15
  Spotify       R$  21,90  · Inter   · todo mês ~dia 8
  Academia      R$ 120,00  · Nubank  · todo mês ~dia 1
  AWS           R$  89,50  · C6      · todo mês ~dia 20  ⚠️ variável
  ──────────────────────────────────────────────────────
  Total/mês:    R$ 287,30

  [Marcar como recorrente manualmente]
```

**Step 3: Marcar manualmente**
Na lista de transações, usuário pode clicar em "marcar como recorrente" em qualquer transação → seta `isRecurring = true` e `recurringTag`.

**Step 4: Verificar**
- Com 3+ meses de histórico importado: torneiras detectadas automaticamente
- Sem histórico: painel mostra apenas os marcados manualmente

---

### MÓDULO 4B — Settings + Profile + Quick-wins

**Objetivo:** Completar páginas de configuração que qualquer app precisa ter.

**Arquivos:**
- Criar: `src/app/(app)/configuracoes/page.tsx`
- Criar: `src/app/(app)/perfil/page.tsx`
- Criar: `src/components/settings/ProfileForm.tsx`
- Criar: `src/components/settings/CategoryManager.tsx`
- Criar: `src/components/settings/ThemeSelector.tsx`
- Criar: `src/app/api/user/profile/route.ts`
- Modificar: `src/components/layout/Sidebar.tsx`

### Task 4.1: Página de Perfil

**Step 1: Campos**
- Nome (text input)
- Email (readonly — identity)
- Avatar (upload de imagem ou URL)
- WhatsApp (redirecionar para /whatsapp)

**Step 2: API PATCH /api/user/profile**
```ts
await prisma.user.update({
  where: { id: session.user.id },
  data: { name: body.name, avatar: body.avatar }
})
```

**Step 3: Verificar**
- Editar nome → salva
- Upload avatar → aparece no header

### Task 4.2: Página de Configurações

**Step 1: Seções**
```
Aparência:     Tema claro / escuro (já tem campo theme no User)
Categorias:    Listar, criar, editar, excluir categorias personalizadas
Conta:         Gerenciar contas bancárias (checking, savings, cash, credit)
Segurança:     Alterar senha
Dados:         Exportar dados (CSV), excluir conta
```

**Step 2: CategoryManager**
- Tabela com categorias existentes
- Botão "+ Nova Categoria"
- Dialog: nome, ícone (picker), cor (color picker), tipo (INCOME/EXPENSE/BOTH)
- Editar inline
- Excluir com confirmação

**Step 3: Verificar**
- Criar categoria → aparece nos formulários de transação
- Editar → atualiza
- Excluir → some (com aviso se há transações vinculadas)

---

## FASE 5 — PWA (Progressive Web App)

**Objetivo:** Permitir que o usuário instale o app no celular/desktop sem ir à loja de apps.

**Arquivos:**
- Criar: `public/manifest.json`
- Criar: `public/sw.js` (service worker básico)
- Criar: `public/icons/` (ícones 192x192, 512x512)
- Modificar: `src/app/layout.tsx` (meta tags PWA)
- Criar: `src/components/ui/InstallPrompt.tsx`

### Task 5.1: Web App Manifest

**Arquivos:**
- Criar: `public/manifest.json`

```json
{
  "name": "r-control",
  "short_name": "r-control",
  "description": "Controle financeiro pessoal e familiar",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 1: Gerar ícones**
- Usar imagem base do app
- Gerar 192x192 e 512x512 PNG
- Salvar em `public/icons/`

**Step 2: Link manifest no layout**
```tsx
// src/app/layout.tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

### Task 5.2: Service Worker básico

**Arquivos:**
- Criar: `public/sw.js`

**Step 1: SW mínimo (cache-first para assets)**
```js
self.addEventListener('install', e => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))
self.addEventListener('fetch', e => {
  // Passthrough para não quebrar funcionalidade
  e.respondWith(fetch(e.request))
})
```

**Step 2: Registrar SW no layout**
```tsx
// src/app/layout.tsx — script inline:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

**Step 3: Verificar**
- Chrome DevTools → Application → Manifest: sem erros
- Chrome DevTools → Application → Service Workers: ativo
- Botão "Instalar app" aparece na barra do Chrome

### Task 5.3: InstallPrompt component

**Arquivos:**
- Criar: `src/components/ui/InstallPrompt.tsx`

**Step 1: Capturar evento beforeinstallprompt**
```tsx
useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    setDeferredPrompt(e)
    setShowBanner(true)
  })
}, [])
```

**Step 2: Banner de instalação**
```
"Instale o r-control como app"  [Instalar] [Fechar]
```

**Step 3: Verificar**
- Banner aparece em mobile
- Clicar instalar → abre prompt do browser
- App instala e abre standalone

---

## FASE 6 — Monetização (DEFERIDO)

**Status:** ⏸️ DEFERIDO — App é uso pessoal por ora. Retomar se decidir abrir para outros usuários.

**Spec original para referência futura:**
- Grátis: até 50 transações/mês, sem família, sem WhatsApp
- Premium: R$19,90/mês — ilimitado + WhatsApp
- Família: R$29,90/mês — Premium + até 5 membros
- Integração: Stripe ou Pagar.me
- Middleware de plano em cada API route

**Pré-requisito para retomar:** Decisão de abrir o produto para outros usuários.

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
Dia 1:      FASE 1    WhatsApp Settings UI      — conectar número, testar bot
Dias 2-4:   FASE 1.5  WhatsApp Bot Intelligence — /saldo, /fatura, alertas, detecção de cartão ⭐
Dias 5-8:   FASE 2    Import + Faturas          — OFX/CSV/PDF + importação de fatura c/ cartão + reconciliação + histórico
Dias 9-10:  FASE 2.5  Controle de Dívidas       — módulo de dívidas + parcelas
Dia 11:     FASE 3    Adicionar Cônjuge         — household + cartões por usuário
Dias 12-15: FASE 4A   Cartões de Crédito        — schema, dashboard de fatura, threshold alerts, torneiras
Dias 16-17: FASE 4B   Settings + Quick-wins     — categorias, contas, dark mode, duplicar mês orçamento
Dia 18:     FASE 5    PWA                       — instalar como app no celular
```

**⭐ Dependência importante:** FASE 1.5 usa `CreditCard` para detecção no WhatsApp, mas o schema só é criado na FASE 4A. Solução: na FASE 1.5, implementar a lógica de detecção de cartão de forma que funcione com 0 cartões cadastrados (degrada graciosamente) — quando FASE 4A for implementada, a feature entra automaticamente.

---

## CHECKLIST DE QUALIDADE POR FASE

Antes de marcar cada fase como concluída:
```
[ ] Feature funciona no desktop (Chrome)
[ ] Feature funciona no mobile (Chrome mobile)
[ ] Nenhum erro no console
[ ] Loading states implementados (skeleton/spinner)
[ ] Estados de erro implementados (toast de erro)
[ ] Dados persistem após refresh
[ ] Autenticação: usuário deslogado é redirecionado para /login
[ ] TypeScript: zero erros (`npm run build` passa)
```

---

## COMANDOS ÚTEIS

```bash
# Desenvolvimento
cd r-control && npm run dev

# Build local
npm run build && npm start

# Banco de dados
npx prisma studio          # GUI visual
npx prisma db push          # Aplicar schema sem migration
npx prisma migrate dev      # Criar migration nomeada

# Seed
node scripts/seed.js

# Docker local
docker build -t r-control .
docker run -p 3000:3000 --env-file .env r-control
```

---

---

## ATUALIZAÇÃO — Insights das Screenshots PlannerFin (2026-03-30)

> Fonte: 6 screenshots analisados via Groq Vision
> `knowledge/external/inbox/plannerfin/BLUEPRINTS/`

### FASE 2.5 — Controle de Dívidas (NOVA — entre Fase 2 e Fase 3)

**Objetivo:** Permitir rastreamento de dívidas com parcelas e progresso de pagamento.

**Tela do PlannerFin:** `pw_Dividas.webp`

**Arquivos:**
- Criar: `src/app/(app)/dividas/page.tsx`
- Criar: `src/components/debts/DebtCard.tsx`
- Criar: `src/components/debts/NewDebtDialog.tsx`
- Criar: `src/app/api/debts/route.ts`
- Criar: `src/app/api/debts/[id]/route.ts`
- Criar: `src/app/api/debts/[id]/pay/route.ts`
- Modificar: `prisma/schema.prisma`
- Modificar: `src/components/layout/Sidebar.tsx`

**Schema Prisma:**
```prisma
model Debt {
  id                 String   @id @default(cuid())
  title              String
  description        String?
  totalAmount        Float
  paidAmount         Float    @default(0)
  dueDate            DateTime
  installments       Int      @default(1)
  currentInstallment Int      @default(1)
  status             String   @default("PENDING") // PENDING | PAID | OVERDUE
  userId             String
  user               User     @relation(fields: [userId], references: [id])
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**4 cards no topo:**
- Total em Dívidas (soma totalAmount de dívidas ativas)
- Restante a Pagar (soma totalAmount - paidAmount)
- Dívidas Vencidas (count onde dueDate < hoje e status != PAID)
- Pagamentos Mensais (estimativa: totalAmount / installments)

**DebtCard:** título, badge status (Paga/Pendente/Vencida), Total/Restante, progress bar %, vencimento, "Parcela X de Y", botão Pagar + editar + excluir

**Adicionar ao Sidebar:** `{ name: 'Dividas', href: '/dividas', icon: TrendingDown }`

---

### Quick-wins identificados nas screenshots

#### QW-1: "Duplicar Mês Anterior" no Orçamento
**Arquivo:** `src/app/(app)/orcamento/page.tsx`
- Adicionar botão "Duplicar Mês Anterior" ao lado de "Adicionar Categoria"
- API: `POST /api/budgets/duplicate` — copia budgets do mês anterior para o atual
- Verificar se já existem budgets no mês atual antes de duplicar (evitar duplicata)

#### QW-2: Botão "Exportar" em Transações
**Arquivo:** `src/app/(app)/transacoes/page.tsx`
- Adicionar botão "Exportar" ao lado do botão "Importar"
- Gera CSV com: DATA, DESCRIÇÃO, CATEGORIA, CONTA, CARTÃO, VALOR, STATUS
- Download via `<a href="data:text/csv...">` no browser

#### QW-3: Coluna "Cartão" na tabela de Transações
**Arquivo:** `src/components/transactions/TransactionTable.tsx`
- Adicionar coluna CARTÃO entre CONTA e VALOR
- Mostrar nome do cartão se a transação veio de um cartão; "-" se não

#### QW-4: Card "Pendentes" no topo de Transações
**Arquivo:** `src/app/(app)/transacoes/page.tsx`
- Adicionar 4 summary cards no topo: Saldo, Receitas, Despesas, Pendentes
- Pendentes = soma de transações com status PENDING

#### QW-5: Gerenciar Cartões de Crédito
**Novo modal via ícone ⚙️ no header:**
- `src/components/settings/ManageCreditCards.tsx`
- Campos: Nome do Cartão, Banco (opcional), Limite de Crédito, Dia do Fechamento, Dia do Vencimento
- Schema: `CreditCard { id, name, bank, limit, closingDay, dueDay, userId }`
- Menu ⚙️: Cadastro de Categorias | Cadastro de Contas | Cadastro de Cartões

#### QW-6: Modo Escuro (Dark Mode)
**Arquivos:** `src/app/layout.tsx`, `tailwind.config.ts`
- Habilitar `darkMode: 'class'` no Tailwind
- Botão toggle no header
- Sidebar já usa cor escura no PlannerFin (azul escuro #1a2744)
- Salvar preferência em `user.theme` (campo já existe no schema)

---

### Ordem de execução atualizada (com insights PlannerFin)

```
FASE 1:   WhatsApp Settings UI       (1 dia)
FASE 1.5: WhatsApp Bot Intelligence  (2 dias)    <- ⭐ PRIORIDADE ALTA
FASE 2:   Import OFX/CSV/PDF         (2-3 dias)
FASE 2.5: Controle de Dividas        (1-2 dias)  <- NOVA (PlannerFin insight)
FASE 3:   Adicionar Cônjuge          (1 dia)     <- simplificado (uso pessoal)
FASE 4:   Settings + Quick-wins      (2 dias)    <- inclui QW-1..6
FASE 5:   PWA                        (1 dia)
FASE 6:   Monetizacao                DEFERIDO    <- não prioridade agora
```

---

**Plano criado em:** 2026-03-30
**Baseado em:** Exploração do codebase + transcrição do vídeo "melhor sistema de controle financeiro" (Planner Fim) + análise visual de 6 screenshots do PlannerFin via Groq Vision
**Próxima revisão:** Após conclusão da Fase 2
