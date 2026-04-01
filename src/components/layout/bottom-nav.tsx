"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ArrowLeftRight, Target, Wallet, CreditCard, MessageCircle } from "lucide-react";

const navItems = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-20">
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
