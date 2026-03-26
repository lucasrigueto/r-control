# R-Control MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal finance web app for 2 users (Lucas + wife) with WhatsApp integration, deployed on a VPS via Coolify.

**Architecture:** Next.js 14 App Router with API Routes as backend, Prisma ORM connecting to an existing PostgreSQL instance, Evolution API webhook for WhatsApp message ingestion, Groq API for AI parsing/transcription.

**Tech Stack:** Next.js 14, TypeScript, Prisma 5, PostgreSQL, NextAuth.js v4, Tailwind CSS, shadcn/ui, Recharts, Groq SDK, Zod, next-themes, date-fns.

---

## File Structure

```
r-control/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx            # Login page
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # App shell: sidebar + header
│   │   │   ├── page.tsx                # Dashboard
│   │   │   ├── transacoes/
│   │   │   │   └── page.tsx            # Transactions page
│   │   │   ├── orcamento/
│   │   │   │   └── page.tsx            # Budget page
│   │   │   └── metas/
│   │   │       └── page.tsx            # Goals/Vision Board page
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   │   └── route.ts            # NextAuth handler
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts            # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # PUT update, DELETE
│   │   │   ├── categories/
│   │   │   │   └── route.ts            # GET list, POST create
│   │   │   ├── accounts/
│   │   │   │   └── route.ts            # GET list, POST create
│   │   │   ├── dashboard/
│   │   │   │   └── summary/
│   │   │   │       └── route.ts        # GET summary cards data
│   │   │   ├── budgets/
│   │   │   │   ├── route.ts            # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # PUT update, DELETE
│   │   │   ├── goals/
│   │   │   │   ├── route.ts            # GET list, POST create
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # PUT update, DELETE
│   │   │   └── whatsapp/
│   │   │       └── webhook/
│   │   │           └── route.ts        # Evolution API webhook
│   │   ├── layout.tsx                  # Root layout + ThemeProvider
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx             # Desktop sidebar navigation
│   │   │   ├── header.tsx              # Top bar: user info + theme toggle
│   │   │   └── bottom-nav.tsx          # Mobile bottom navigation
│   │   ├── dashboard/
│   │   │   ├── summary-cards.tsx       # 4 metric cards (balance, income, expense, pending)
│   │   │   ├── cashflow-chart.tsx      # Recharts area chart income vs expense
│   │   │   └── recent-transactions.tsx # Last 5 transactions list
│   │   ├── transactions/
│   │   │   ├── transaction-table.tsx   # Full table with filters + pagination
│   │   │   ├── transaction-form.tsx    # Add/edit modal form
│   │   │   └── transaction-filters.tsx # Filter bar component
│   │   ├── budget/
│   │   │   └── budget-table.tsx        # Category budget rows with progress bars
│   │   ├── goals/
│   │   │   └── goal-card.tsx           # Vision board card with image + progress
│   │   └── ui/                         # shadcn/ui components (auto-generated)
│   ├── lib/
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── groq.ts                     # Groq client + parse/transcribe functions
│   │   ├── whatsapp.ts                 # Evolution API message sender
│   │   └── utils.ts                    # cn(), formatCurrency(), formatDate()
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript types
│   └── middleware.ts                   # Route protection
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                         # Seed 2 users + default categories
├── public/
├── .env.example
├── .env.local                          # Never commit
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Phase 1: Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`

- [ ] **Step 1: Bootstrap Next.js**

In the `r-control/` directory, run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```
Answer prompts: use `src/` directory ✓, App Router ✓.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client next-auth next-themes recharts groq-sdk zod date-fns lucide-react clsx tailwind-merge bcryptjs
npm install -D prisma @types/bcryptjs vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```
Choose: Default style, Slate base color, CSS variables ✓.

- [ ] **Step 4: Add shadcn components used throughout the project**

```bash
npx shadcn@latest add button card input label select badge dialog sheet table dropdown-menu avatar separator progress toast
```

- [ ] **Step 5: Configure `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 6: Create `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 project with shadcn/ui"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String        @id @default(cuid())
  name           String
  email          String        @unique
  password       String
  avatar         String?
  whatsappNumber String?       @unique
  theme          String        @default("system")
  createdAt      DateTime      @default(now())
  transactions   Transaction[]
  goals          Goal[]
  budgets        Budget[]
}

model Category {
  id           String          @id @default(cuid())
  name         String
  icon         String
  color        String
  type         CategoryType
  transactions Transaction[]
  budgets      Budget[]

  @@unique([name])
}

enum CategoryType {
  INCOME
  EXPENSE
  BOTH
}

model Account {
  id           String        @id @default(cuid())
  name         String
  type         AccountType
  balance      Float         @default(0)
  color        String        @default("#6366f1")
  transactions Transaction[]
}

enum AccountType {
  CHECKING
  SAVINGS
  CASH
  CREDIT
}

model Transaction {
  id          String          @id @default(cuid())
  description String
  amount      Float
  type        TransactionType
  date        DateTime
  dueDate     DateTime?
  status      PaymentStatus   @default(PENDING)
  notes       String?
  receiptUrl  String?
  source      String          @default("manual")
  isRecurring Boolean         @default(false)
  categoryId  String?
  category    Category?       @relation(fields: [categoryId], references: [id])
  accountId   String?
  account     Account?        @relation(fields: [accountId], references: [id])
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum PaymentStatus {
  PENDING
  PAID
  CANCELLED
}

model Budget {
  id         String   @id @default(cuid())
  amount     Float
  month      Int
  year       Int
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  createdAt  DateTime @default(now())

  @@unique([userId, categoryId, month, year])
}

model Goal {
  id            String     @id @default(cuid())
  title         String
  description   String?
  targetAmount  Float
  currentAmount Float      @default(0)
  targetDate    DateTime
  imageUrl      String?
  status        GoalStatus @default(ACTIVE)
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

model WhatsappPending {
  id        String   @id @default(cuid())
  phone     String
  userId    String
  messageId String   @unique
  data      Json
  createdAt DateTime @default(now())
  expiresAt DateTime
}
```

- [ ] **Step 3: Create `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const password = await bcrypt.hash("rcontrol2026", 12);

  await prisma.user.upsert({
    where: { email: "lucas@rigueto.com" },
    update: {},
    create: {
      name: "Lucas",
      email: "lucas@rigueto.com",
      password,
      whatsappNumber: "5581999999999", // update with real number
    },
  });

  await prisma.user.upsert({
    where: { email: "ana@rigueto.com" },
    update: {},
    create: {
      name: "Ana",
      email: "ana@rigueto.com",
      password,
      whatsappNumber: "5581988888888", // update with real number
    },
  });

  // Seed default categories
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

  // Seed default account
  await prisma.account.create({
    data: {
      name: "Conta Principal",
      type: "CHECKING",
      balance: 0,
      color: "#2563EB",
    },
  });

  console.log("Seed completed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Add seed script to `package.json`**

Add to the `scripts` section:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```
Also install: `npm install -D ts-node`

- [ ] **Step 5: Create `.env.example`**

```bash
# Database (PostgreSQL on VPS)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/rcontrol?schema=public"

# NextAuth
NEXTAUTH_URL="https://rcontrol.rigueto.com.br"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"

# Groq AI
GROQ_API_KEY="gsk_..."

# Evolution API (WhatsApp)
EVOLUTION_API_URL="http://evolution-api:8080"
EVOLUTION_API_KEY="your-evolution-api-key"
EVOLUTION_INSTANCE="r-control"

# Webhook security
WHATSAPP_WEBHOOK_SECRET="generate-with: openssl rand -hex 32"
```

- [ ] **Step 6: Create `.env.local` from the example (never commit this)**

Copy `.env.example` to `.env.local` and fill in real values. Add `.env.local` to `.gitignore`.

- [ ] **Step 7: Create `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 8: Push schema to database and seed**

```bash
npx prisma db push
npx prisma db seed
```

Expected output: tables created, "Seed completed."

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, seed users and categories"
```

---

### Task 3: Authentication

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/middleware.ts`

- [ ] **Step 1: Create `src/lib/auth.ts`**

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
```

- [ ] **Step 2: Create `src/types/index.ts`** (extend next-auth types)

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED";
export type CategoryType = "INCOME" | "EXPENSE" | "BOTH";
export type AccountType = "CHECKING" | "SAVINGS" | "CASH" | "CREDIT";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  status: PaymentStatus;
  categoryId?: string;
  accountId?: string;
  userId: string;
  notes?: string;
  source: string;
  category?: { name: string; icon: string; color: string };
  account?: { name: string };
  user?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  category: Category;
  spent?: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  imageUrl?: string;
  status: GoalStatus;
}

export interface DashboardSummary {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pendingAmount: number;
  incomeChange: number;
  expenseChange: number;
  cashflow: { month: string; income: number; expenses: number }[];
}
```

- [ ] **Step 3: Create `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: Create `src/middleware.ts`**

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/((?!login|api/auth|api/whatsapp|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Create `src/app/(auth)/login/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha incorretos.");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">💰</div>
          <CardTitle className="text-2xl">R-Control</CardTitle>
          <CardDescription>Controle financeiro do casal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Update `src/app/layout.tsx`** to include SessionProvider and ThemeProvider

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "R-Control",
  description: "Controle financeiro do casal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create `src/components/providers.tsx`**

```typescript
"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 8: Test auth locally**

```bash
npm run dev
```
Navigate to `http://localhost:3000/login`. Login with `lucas@rigueto.com` / `rcontrol2026`. Should redirect to `/`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth credentials authentication"
```

---

### Task 4: App Shell Layout

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Create `src/components/layout/sidebar.tsx`**

```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ArrowLeftRight, Target, Wallet, LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/orcamento", label: "Orçamento", icon: Wallet },
  { href: "/metas", label: "Metas", icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground min-h-screen p-4 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-2xl">💰</span>
        <span className="text-xl font-bold">R-Control</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
              pathname === href
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Create `src/components/layout/header.tsx`**

```typescript
"use client";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-background sticky top-0 z-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:block">
            {session?.user?.name}
          </span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create `src/components/layout/bottom-nav.tsx`** (mobile only)

```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ArrowLeftRight, Target, Wallet } from "lucide-react";

const navItems = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/orcamento", label: "Orçamento", icon: Wallet },
  { href: "/metas", label: "Metas", icon: Target },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-10">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors",
              pathname === href
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/layout.tsx`**

```typescript
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64 pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder `src/app/(app)/page.tsx`**

```typescript
import { Header } from "@/components/layout/header";

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" />
      <main className="p-6">
        <p className="text-muted-foreground">Dashboard em construção...</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify layout renders correctly**

```bash
npm run dev
```
Login and verify: sidebar visible on desktop, bottom nav on mobile (resize browser), theme toggle works, name shows in header.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app shell layout with sidebar, header, and mobile bottom nav"
```

---

## Phase 2: Transactions

### Task 5: Transaction API Routes

**Files:**
- Create: `src/app/api/transactions/route.ts`, `src/app/api/transactions/[id]/route.ts`, `src/app/api/categories/route.ts`, `src/app/api/accounts/route.ts`

- [ ] **Step 1: Create `src/app/api/categories/route.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/app/api/accounts/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const account = await prisma.account.create({ data: body });
  return NextResponse.json(account, { status: 201 });
}
```

- [ ] **Step 3: Create `src/app/api/transactions/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  if (type && type !== "ALL") where.type = type;
  if (userId) where.userId = userId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { name: true, icon: true, color: true } },
      account: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: body.userId ?? session.user.id,
      source: body.source ?? "manual",
    },
    include: {
      category: { select: { name: true, icon: true, color: true } },
      account: { select: { name: true } },
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
```

- [ ] **Step 4: Create `src/app/api/transactions/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.date) body.date = new Date(body.date);

  const transaction = await prisma.transaction.update({
    where: { id: params.id },
    data: body,
    include: {
      category: { select: { name: true, icon: true, color: true } },
      account: { select: { name: true } },
    },
  });

  return NextResponse.json(transaction);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Test API routes**

```bash
# Start dev server
npm run dev

# In another terminal:
curl -s http://localhost:3000/api/categories | jq .
# Expected: array of 14 categories
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add transaction, category and account API routes"
```

---

### Task 6: Transaction Form + Table

**Files:**
- Create: `src/components/transactions/transaction-form.tsx`, `src/components/transactions/transaction-table.tsx`, `src/app/(app)/transacoes/page.tsx`

- [ ] **Step 1: Create `src/components/transactions/transaction-form.tsx`**

```typescript
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Category, Transaction } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  transaction?: Transaction | null;
}

export function TransactionForm({ open, onClose, onSaved, transaction }: Props) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "EXPENSE",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "PAID",
    categoryId: "",
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        amount: String(transaction.amount),
        type: transaction.type,
        date: format(new Date(transaction.date), "yyyy-MM-dd"),
        status: transaction.status,
        categoryId: transaction.categoryId ?? "",
      });
    } else {
      setForm({ description: "", amount: "", type: "EXPENSE", date: format(new Date(), "yyyy-MM-dd"), status: "PAID", categoryId: "" });
    }
  }, [transaction, open]);

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === "BOTH"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = transaction ? `/api/transactions/${transaction.id}` : "/api/transactions";
    const method = transaction ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        userId: session?.user?.id,
      }),
    });

    setLoading(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? "Editar" : "Nova"} Transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.type === "EXPENSE" ? "destructive" : "outline"}
              onClick={() => setForm((f) => ({ ...f, type: "EXPENSE", categoryId: "" }))}
            >
              Despesa
            </Button>
            <Button
              type="button"
              variant={form.type === "INCOME" ? "default" : "outline"}
              className={form.type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={() => setForm((f) => ({ ...f, type: "INCOME", categoryId: "" }))}
            >
              Receita
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Supermercado, Salário..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `src/components/transactions/transaction-table.tsx`**

```typescript
"use client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-3 px-4 font-medium">Descrição</th>
            <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Data</th>
            <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Categoria</th>
            <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Quem</th>
            <th className="text-right py-3 px-4 font-medium">Valor</th>
            <th className="text-center py-3 px-4 font-medium">Status</th>
            <th className="text-right py-3 px-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
              <td className="py-3 px-4">
                <div className="font-medium">{t.description}</div>
                <div className="text-xs text-muted-foreground md:hidden">
                  {format(new Date(t.date), "dd/MM/yyyy")}
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                {format(new Date(t.date), "dd MMM yyyy", { locale: ptBR })}
              </td>
              <td className="py-3 px-4 hidden md:table-cell">
                {t.category ? (
                  <span>{t.category.icon} {t.category.name}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                {t.user?.name ?? "—"}
              </td>
              <td className={`py-3 px-4 text-right font-semibold ${
                t.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}>
                {t.type === "INCOME" ? "+" : "-"} {formatCurrency(t.amount)}
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant={t.status === "PAID" ? "default" : "secondary"} className="text-xs">
                  {t.status === "PAID" ? "Pago" : "Pendente"}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(t)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(t.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-muted-foreground">
                Nenhuma transação encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/(app)/transacoes/page.tsx`**

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionForm } from "@/components/transactions/transaction-form";
import type { Transaction } from "@/types";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function TransacoesPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [type, setType] = useState("ALL");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ month, year, type });
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data);
  }, [month, year, type]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  function handleEdit(t: Transaction) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div>
      <Header title="Transações" />
      <main className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="INCOME">Receitas</SelectItem>
                <SelectItem value="EXPENSE">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" /> Nova Transação
          </Button>
        </div>

        <Card>
          <TransactionTable
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Card>
      </main>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        transaction={editing}
      />
    </div>
  );
}
```

- [ ] **Step 4: Test CRUD**

```bash
npm run dev
```
Navigate to `/transacoes`. Add a transaction. Verify it appears. Edit it. Delete it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add transaction CRUD with form and table"
```

---

## Phase 3: Dashboard

### Task 7: Dashboard Summary API + UI

**Files:**
- Create: `src/app/api/dashboard/summary/route.ts`, `src/components/dashboard/summary-cards.tsx`, `src/components/dashboard/cashflow-chart.tsx`, `src/components/dashboard/recent-transactions.tsx`, update `src/app/(app)/page.tsx`

- [ ] **Step 1: Create `src/app/api/dashboard/summary/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Current month transactions
  const [currentTransactions, lastTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
  ]);

  const sum = (txs: typeof currentTransactions, type: "INCOME" | "EXPENSE", status?: string) =>
    txs
      .filter((t) => t.type === type && (!status || t.status === status))
      .reduce((acc, t) => acc + t.amount, 0);

  const monthlyIncome = sum(currentTransactions, "INCOME", "PAID");
  const monthlyExpenses = sum(currentTransactions, "EXPENSE", "PAID");
  const pendingAmount = sum(currentTransactions, "EXPENSE", "PENDING");
  const lastIncome = sum(lastTransactions, "INCOME", "PAID");
  const lastExpenses = sum(lastTransactions, "EXPENSE", "PAID");

  const pct = (current: number, last: number) =>
    last === 0 ? 0 : Math.round(((current - last) / last) * 100);

  // Last 6 months cashflow
  const cashflow = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return prisma.transaction.findMany({ where: { date: { gte: start, lte: end } } }).then((txs) => ({
        month: d.toLocaleDateString("pt-BR", { month: "short" }),
        income: sum(txs, "INCOME"),
        expenses: sum(txs, "EXPENSE"),
      }));
    })
  );

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { date: "desc" },
    include: {
      category: { select: { name: true, icon: true, color: true } },
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({
    balance: monthlyIncome - monthlyExpenses,
    monthlyIncome,
    monthlyExpenses,
    pendingAmount,
    incomeChange: pct(monthlyIncome, lastIncome),
    expenseChange: pct(monthlyExpenses, lastExpenses),
    cashflow,
    recentTransactions,
  });
}
```

- [ ] **Step 2: Create `src/components/dashboard/summary-cards.tsx`**

```typescript
import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

export function SummaryCards({ data }: { data: DashboardSummary }) {
  const cards = [
    {
      title: "Saldo do Mês",
      value: data.balance,
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Receitas",
      value: data.monthlyIncome,
      change: data.incomeChange,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Despesas",
      value: data.monthlyExpenses,
      change: data.expenseChange,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Pendentes",
      value: data.pendingAmount,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={16} className={card.color} />
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(card.value)}</p>
            {card.change !== undefined && (
              <p className={`text-xs mt-1 ${card.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {card.change >= 0 ? "+" : ""}{card.change}% vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/dashboard/cashflow-chart.tsx`**

```typescript
"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface Props {
  data: { month: string; income: number; expenses: number }[];
}

export function CashflowChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
          }
        />
        <Legend />
        <Area type="monotone" dataKey="income" name="Receitas" stroke="#10B981" fill="url(#incomeGradient)" strokeWidth={2} />
        <Area type="monotone" dataKey="expenses" name="Despesas" stroke="#EF4444" fill="url(#expenseGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create `src/components/dashboard/recent-transactions.tsx`**

```typescript
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="text-xl w-8 text-center">{t.category?.icon ?? "💸"}</div>
            <div>
              <p className="text-sm font-medium">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(t.date), "dd MMM", { locale: ptBR })} · {t.user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${
              t.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            }`}>
              {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
            </span>
            <Badge variant={t.status === "PAID" ? "default" : "secondary"} className="text-xs hidden sm:inline-flex">
              {t.status === "PAID" ? "Pago" : "Pendente"}
            </Badge>
          </div>
        </div>
      ))}
      {transactions.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-6">Nenhuma transação este mês.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `src/app/(app)/page.tsx`**

```typescript
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import type { DashboardSummary } from "@/types";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary").then((r) => r.json()).then(setData);
  }, []);

  return (
    <div>
      <Header title="Dashboard" />
      <main className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Olá, {session?.user?.name}! 👋</h2>
          <p className="text-muted-foreground">Aqui está um resumo das suas finanças.</p>
        </div>

        {data && <SummaryCards data={data} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Fluxo de Caixa — Últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              {data && <CashflowChart data={data.cashflow} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Transações Recentes</CardTitle>
              <Link href="/transacoes" className="text-xs text-primary hover:underline">Ver todas</Link>
            </CardHeader>
            <CardContent>
              {data && <RecentTransactions transactions={data.recentTransactions as any} />}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Verify dashboard**

```bash
npm run dev
```
Add a few transactions, then visit `/`. Verify cards show values, chart renders, recent transactions list shows.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with summary cards, cashflow chart, and recent transactions"
```

---

## Phase 4: Budget & Goals

### Task 8: Budget Page

**Files:**
- Create: `src/app/api/budgets/route.ts`, `src/app/api/budgets/[id]/route.ts`, `src/components/budget/budget-table.tsx`, `src/app/(app)/orcamento/page.tsx`

- [ ] **Step 1: Create `src/app/api/budgets/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id, month, year },
    include: { category: true },
  });

  // Calculate spent per category
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      type: "EXPENSE",
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { categoryId: true, amount: true, status: true },
  });

  const spentByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.categoryId && t.status === "PAID") {
      spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] ?? 0) + t.amount;
    }
  }

  const result = budgets.map((b) => ({
    ...b,
    spent: spentByCategory[b.categoryId] ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: session.user.id,
        categoryId: body.categoryId,
        month: body.month,
        year: body.year,
      },
    },
    update: { amount: body.amount },
    create: { ...body, userId: session.user.id },
    include: { category: true },
  });

  return NextResponse.json(budget, { status: 201 });
}
```

- [ ] **Step 2: Create `src/app/api/budgets/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const budget = await prisma.budget.update({
    where: { id: params.id },
    data: { amount: body.amount },
    include: { category: true },
  });

  return NextResponse.json(budget);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.budget.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `src/components/budget/budget-table.tsx`**

```typescript
"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Budget } from "@/types";

interface Props {
  budgets: (Budget & { spent: number })[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, amount: number) => void;
}

export function BudgetTable({ budgets, onDelete, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const totalPlanned = budgets.reduce((a, b) => a + b.amount, 0);
  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);

  function getStatus(pct: number) {
    if (pct >= 100) return { label: "Estourado", variant: "destructive" as const };
    if (pct >= 80) return { label: "Próximo do Limite", variant: "secondary" as const };
    return { label: "Dentro do Orçamento", variant: "default" as const };
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg text-sm">
        <div>
          <p className="text-muted-foreground">Planejado</p>
          <p className="font-bold text-lg">{formatCurrency(totalPlanned)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Realizado</p>
          <p className="font-bold text-lg">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Economia</p>
          <p className={`font-bold text-lg ${totalPlanned - totalSpent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {formatCurrency(totalPlanned - totalSpent)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Categoria</th>
              <th className="text-right py-3 px-4 font-medium">Planejado</th>
              <th className="text-right py-3 px-4 font-medium">Realizado</th>
              <th className="text-right py-3 px-4 font-medium hidden md:table-cell">Diferença</th>
              <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Progresso</th>
              <th className="text-center py-3 px-4 font-medium hidden md:table-cell">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
              const diff = b.amount - b.spent;
              const status = getStatus(pct);

              return (
                <tr key={b.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <span>{b.category.icon} {b.category.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingId === b.id ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-7 text-right"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onUpdate(b.id, parseFloat(editValue));
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      formatCurrency(b.amount)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">{formatCurrency(b.spent)}</td>
                  <td className={`py-3 px-4 text-right hidden md:table-cell ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(pct, 100)} className="h-2 w-24" />
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center hidden md:table-cell">
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setEditingId(b.id); setEditValue(String(b.amount)); }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => onDelete(b.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/orcamento/page.tsx`**

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { BudgetTable } from "@/components/budget/budget-table";
import type { Budget, Category } from "@/types";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function OrcamentoPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year] = useState(String(now.getFullYear()));
  const [budgets, setBudgets] = useState<(Budget & { spent: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setBudgets(b);
    setCategories(c.filter((c: Category) => c.type === "EXPENSE" || c.type === "BOTH"));
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newCategoryId || !newAmount) return;
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: newCategoryId, amount: parseFloat(newAmount), month: Number(month), year: Number(year) }),
    });
    setAddOpen(false);
    setNewCategoryId("");
    setNewAmount("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover orçamento desta categoria?")) return;
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    load();
  }

  async function handleUpdate(id: string, amount: number) {
    await fetch(`/api/budgets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    load();
  }

  return (
    <div>
      <Header title="Orçamento" />
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m} {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" /> Adicionar Categoria
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Orçamento por Categoria</CardTitle></CardHeader>
          <CardContent>
            <BudgetTable budgets={budgets} onDelete={handleDelete} onUpdate={handleUpdate} />
          </CardContent>
        </Card>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Categoria ao Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Planejado (R$)</Label>
              <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleAdd} className="flex-1">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add budget page with category tracking and progress bars"
```

---

### Task 9: Goals (Vision Board)

**Files:**
- Create: `src/app/api/goals/route.ts`, `src/app/api/goals/[id]/route.ts`, `src/components/goals/goal-card.tsx`, `src/app/(app)/metas/page.tsx`

- [ ] **Step 1: Create `src/app/api/goals/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const goal = await prisma.goal.create({
    data: {
      ...body,
      targetDate: new Date(body.targetDate),
      userId: session.user.id,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
```

- [ ] **Step 2: Create `src/app/api/goals/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.targetDate) body.targetDate = new Date(body.targetDate);

  const goal = await prisma.goal.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(goal);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `src/components/goals/goal-card.tsx`**

```typescript
"use client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { Goal } from "@/types";

interface Props {
  goal: Goal;
  onUpdate: (id: string, data: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, onUpdate, onDelete }: Props) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [contribution, setContribution] = useState("");

  const pct = goal.targetAmount > 0
    ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
    : 0;

  const remaining = goal.targetAmount - goal.currentAmount;

  function handleContribution() {
    const value = parseFloat(contribution);
    if (isNaN(value) || value <= 0) return;
    const newAmount = Math.min(goal.currentAmount + value, goal.targetAmount);
    onUpdate(goal.id, {
      currentAmount: newAmount,
      status: newAmount >= goal.targetAmount ? "COMPLETED" : "ACTIVE",
    });
    setContribution("");
    setUpdateOpen(false);
  }

  return (
    <>
      <Card className="overflow-hidden group">
        <div
          className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative"
          style={goal.imageUrl ? {
            backgroundImage: `url(${goal.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}}
        >
          {!goal.imageUrl && <span className="text-5xl">🎯</span>}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setUpdateOpen(true)}>
              <Plus size={13} />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal.id)}>
              <Trash2 size={13} />
            </Button>
          </div>
          <Badge
            className="absolute top-2 left-2"
            variant={goal.status === "COMPLETED" ? "default" : "secondary"}
          >
            {goal.status === "COMPLETED" ? "✓ Concluída" : "Ativa"}
          </Badge>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold">{goal.title}</h3>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(goal.currentAmount)}</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-xs text-muted-foreground">{formatCurrency(goal.targetAmount)} · Meta</p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Faltam: <span className="font-medium text-foreground">{formatCurrency(remaining)}</span>
            </span>
            <span className="text-muted-foreground">
              {format(new Date(goal.targetDate), "dd/MM/yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar valor à meta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{goal.title}</p>
          <div className="space-y-2">
            <Label>Quanto você guardou? (R$)</Label>
            <Input
              type="number" step="0.01" value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUpdateOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleContribution} className="flex-1">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/metas/page.tsx`**

```typescript
"use client";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { GoalCard } from "@/components/goals/goal-card";
import type { Goal } from "@/types";

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", targetAmount: "", targetDate: "", imageUrl: "" });

  async function load() {
    const data = await fetch("/api/goals").then((r) => r.json());
    setGoals(data);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.title || !form.targetAmount || !form.targetDate) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, targetAmount: parseFloat(form.targetAmount) }),
    });
    setAddOpen(false);
    setForm({ title: "", description: "", targetAmount: "", targetDate: "", imageUrl: "" });
    load();
  }

  async function handleUpdate(id: string, data: Partial<Goal>) {
    await fetch(`/api/goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Header title="Metas" />
      <main className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Vision Board</h2>
            <p className="text-sm text-muted-foreground">Visualize e acompanhe suas metas financeiras</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" /> Nova Meta
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
          {goals.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              Nenhuma meta cadastrada ainda. Crie sua primeira meta!
            </p>
          )}
        </div>
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome da meta</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Casa própria, Viagem..." />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor alvo (R$)</Label>
                <Input type="number" value={form.targetAmount} onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data limite</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL da imagem (opcional)</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleAdd} className="flex-1">Criar Meta</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add goals vision board with progress tracking"
```

---

## Phase 5: WhatsApp Integration

### Task 10: Groq Client

**Files:**
- Create: `src/lib/groq.ts`

- [ ] **Step 1: Create `src/lib/groq.ts`**

```typescript
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ParsedTransaction {
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  date: string;
  confidence: number;
}

export async function parseFinancialMessage(text: string): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().split("T")[0];

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `Você é um assistente financeiro. Extraia informações de transações financeiras de mensagens em português.
Retorne APENAS um JSON válido com os campos:
- description: string (nome do estabelecimento ou descrição)
- amount: number (valor em reais, positivo)
- type: "INCOME" ou "EXPENSE"
- category: string (uma dessas: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Vestuário, Assinaturas, Supermercado, Salário, Freelance, Investimentos, Outros)
- date: string (formato YYYY-MM-DD, use ${today} se não especificado)
- confidence: number (0-1, sua confiança na extração)

Se a mensagem não for uma transação financeira, retorne: {"error": "not_a_transaction"}`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    max_tokens: 256,
  });

  try {
    const content = completion.choices[0].message.content ?? "";
    const json = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    if (json.error) return null;
    return json as ParsedTransaction;
  } catch {
    return null;
  }
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const file = new File([audioBuffer], "audio.ogg", { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "pt",
    });

    return transcription.text;
  } catch {
    return null;
  }
}

export async function analyzeReceiptImage(imageBase64: string): Promise<ParsedTransaction | null> {
  const today = new Date().toISOString().split("T")[0];

  const completion = await groq.chat.completions.create({
    model: "llama-3.2-11b-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          {
            type: "text",
            text: `Analise este comprovante/cupom fiscal e extraia a transação financeira.
Retorne APENAS JSON com: description, amount (número positivo), type ("INCOME" ou "EXPENSE"), category, date (YYYY-MM-DD, use ${today} se não visível), confidence (0-1).
Se não for um comprovante financeiro, retorne: {"error": "not_a_receipt"}`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 256,
  });

  try {
    const content = completion.choices[0].message.content ?? "";
    const json = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    if (json.error) return null;
    return json as ParsedTransaction;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Groq client for text parsing, audio transcription, and image analysis"
```

---

### Task 11: WhatsApp Sender + Webhook

**Files:**
- Create: `src/lib/whatsapp.ts`, `src/app/api/whatsapp/webhook/route.ts`

- [ ] **Step 1: Create `src/lib/whatsapp.ts`**

```typescript
const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE!;

export async function sendWhatsAppMessage(phone: string, text: string): Promise<void> {
  await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
    },
    body: JSON.stringify({
      number: phone,
      text,
    }),
  });
}

export async function downloadMedia(messageId: string): Promise<Buffer | null> {
  try {
    const res = await fetch(
      `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({ message: { key: { id: messageId } } }),
      }
    );
    const data = await res.json();
    if (data.base64) return Buffer.from(data.base64, "base64");
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create `src/app/api/whatsapp/webhook/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFinancialMessage, transcribeAudio, analyzeReceiptImage } from "@/lib/groq";
import { sendWhatsAppMessage, downloadMedia } from "@/lib/whatsapp";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Evolution API webhook structure
  const event = body.event;
  if (event !== "messages.upsert") return NextResponse.json({ ok: true });

  const message = body.data?.messages?.[0];
  if (!message || message.key?.fromMe) return NextResponse.json({ ok: true });

  const phone = message.key?.remoteJid?.replace("@s.whatsapp.net", "") ?? "";
  const messageId = message.key?.id ?? "";

  // Find user by WhatsApp number
  const user = await prisma.user.findFirst({ where: { whatsappNumber: phone } });
  if (!user) return NextResponse.json({ ok: true });

  const msgType = message.message;
  let parsed = null;

  try {
    // Check if user is responding to a pending confirmation
    const textContent =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "";

    const pending = await prisma.whatsappPending.findFirst({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    });

    if (pending) {
      const reply = textContent.toLowerCase().trim();

      if (reply === "sim" || reply === "s" || reply === "1" || reply === "✅") {
        // Confirm: save transaction
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
            categoryId: data.categoryId as string | undefined,
          },
        });
        await prisma.whatsappPending.delete({ where: { id: pending.id } });
        await sendWhatsAppMessage(phone, "✅ Transação salva com sucesso!");
        return NextResponse.json({ ok: true });
      }

      if (reply === "não" || reply === "nao" || reply === "n" || reply === "2" || reply === "❌") {
        await prisma.whatsappPending.delete({ where: { id: pending.id } });
        await sendWhatsAppMessage(phone, "❌ Transação cancelada.");
        return NextResponse.json({ ok: true });
      }
    }

    // Parse new message
    if (msgType?.conversation || msgType?.extendedTextMessage) {
      parsed = await parseFinancialMessage(textContent);
    } else if (msgType?.audioMessage) {
      const audioBuffer = await downloadMedia(messageId);
      if (audioBuffer) {
        const transcript = await transcribeAudio(audioBuffer, "audio/ogg");
        if (transcript) {
          parsed = await parseFinancialMessage(transcript);
        }
      }
    } else if (msgType?.imageMessage) {
      const imgBuffer = await downloadMedia(messageId);
      if (imgBuffer) {
        parsed = await analyzeReceiptImage(imgBuffer.toString("base64"));
      }
    }

    if (!parsed) {
      await sendWhatsAppMessage(
        phone,
        "Não entendi. Tente:\n• \"Gastei R$ 50 no mercado\"\n• \"Recebi R$ 2000 de salário\"\nOu envie uma foto do comprovante."
      );
      return NextResponse.json({ ok: true });
    }

    // Find matching category
    const category = await prisma.category.findFirst({
      where: { name: { contains: parsed.category, mode: "insensitive" } },
    });

    // Save as pending
    await prisma.whatsappPending.deleteMany({ where: { userId: user.id } });
    await prisma.whatsappPending.create({
      data: {
        phone,
        userId: user.id,
        messageId,
        data: { ...parsed, categoryId: category?.id },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    const typeLabel = parsed.type === "INCOME" ? "Receita" : "Despesa";
    const amountStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed.amount);

    await sendWhatsAppMessage(
      phone,
      `Confirmar lançamento?\n\n📝 ${parsed.description}\n💰 ${amountStr}\n📊 ${typeLabel}\n📅 ${parsed.date}\n🏷️ ${category?.name ?? parsed.category}\n\nResponda:\n✅ SIM para confirmar\n❌ NÃO para cancelar`
    );
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add WhatsApp webhook with text/audio/image parsing and confirmation flow"
```

---

## Phase 6: Docker + Deploy

### Task 12: Dockerfile + Coolify Deploy

**Files:**
- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

- [ ] **Step 2: Update `next.config.ts`** for standalone output

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `.dockerignore`**

```
node_modules
.next
.git
.env.local
*.md
```

- [ ] **Step 4: Push to GitHub**

```bash
git add -A
git commit -m "feat: add Dockerfile for Coolify deployment"
git push origin main
```

- [ ] **Step 5: Configure Coolify**

In the Coolify dashboard (`rigueto.com.br/coolify` or your Coolify URL):

1. Click **+ New Resource** → **Application**
2. Select: **GitHub** → `lucasrigueto/r-control`
3. Branch: `main`
4. Build Pack: **Dockerfile**
5. Port: `3000`
6. Domain: `rcontrol.rigueto.com.br`
7. Add environment variables (from `.env.example`):
   ```
   DATABASE_URL=postgresql://USER:PASS@postgres:5432/rcontrol
   NEXTAUTH_URL=https://rcontrol.rigueto.com.br
   NEXTAUTH_SECRET=<generated>
   GROQ_API_KEY=<your key>
   EVOLUTION_API_URL=http://evolution-api:8080
   EVOLUTION_API_KEY=<your evolution key>
   EVOLUTION_INSTANCE=r-control
   WHATSAPP_WEBHOOK_SECRET=<generated>
   ```

- [ ] **Step 6: Create PostgreSQL database for R-Control**

In Coolify → Databases → your PostgreSQL instance → Databases tab:
- Create database: `rcontrol`
- Note the connection string

- [ ] **Step 7: Run Prisma migrations after first deploy**

In Coolify → your app → Terminal (or via SSH to VPS):
```bash
npx prisma db push
npx prisma db seed
```

- [ ] **Step 8: Configure Evolution API webhook**

In the Evolution API dashboard (or via API):
```bash
curl -X POST http://your-evolution-url/webhook/set/r-control \
  -H "apikey: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://rcontrol.rigueto.com.br/api/whatsapp/webhook",
    "webhook_by_events": false,
    "webhook_base64": false,
    "events": ["MESSAGES_UPSERT"]
  }'
```
Also set the `x-webhook-secret` header in Evolution API webhook config to match `WHATSAPP_WEBHOOK_SECRET`.

- [ ] **Step 9: Update seed with real phone numbers**

Edit `prisma/seed.ts` — replace `whatsappNumber` values with your real WhatsApp numbers in international format (e.g., `5581999999999`).

Run seed again:
```bash
npx prisma db seed
```

- [ ] **Final verification**

1. Visit `https://rcontrol.rigueto.com.br/login`
2. Login with `lucas@rigueto.com` / `rcontrol2026`
3. Add a test transaction manually
4. Send a WhatsApp message: `"Gastei 30 reais no almoço"`
5. Confirm with `SIM`
6. Verify the transaction appears in the app

---

## Spec Coverage Checklist

- [x] Authentication — Task 3
- [x] Dashboard with summary cards — Task 7
- [x] Cash flow chart (6 months) — Task 7
- [x] Recent transactions on dashboard — Task 7
- [x] Transaction CRUD with filters — Tasks 5-6
- [x] Category management (seeded) — Task 2, 5
- [x] Budget by category with progress bars — Task 8
- [x] Goals / Vision Board — Task 9
- [x] WhatsApp text parsing — Task 11
- [x] WhatsApp audio transcription (Groq Whisper) — Task 11
- [x] WhatsApp image OCR (Groq Vision) — Task 11
- [x] Confirmation flow — Task 11
- [x] Dark/light theme toggle — Task 3-4
- [x] Mobile bottom navigation — Task 4
- [x] Responsive layout — Tasks 4, 6, 8, 9
- [x] Dockerfile + Coolify deploy — Task 12

**Out of scope for MVP (add later):**
- OFX/CSV import
- PDF export
- Recurring transactions automation
- Email notifications
- Account balance tracking
