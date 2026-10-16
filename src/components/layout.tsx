import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { HabwaLogo } from "@/components/habwa-logo";

interface LayoutProps { children: ReactNode; }

export function Layout({ children }: LayoutProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-background" style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <header className="h-14 border-b border-border/70 bg-background/95 backdrop-blur-sm flex items-center px-4 sm:px-6 sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5" aria-label="حبوة - الرئيسية">
          <HabwaLogo className="w-9 h-9" />
          <div className="leading-none">
            <div className="font-black text-lg text-foreground">حبوة</div>
            <div className="text-[9px] font-bold tracking-[0.28em] text-primary">HABWA</div>
          </div>
        </Link>
      </header>
      {children}
    </div>
  );
}
