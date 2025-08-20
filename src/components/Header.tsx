
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function Header() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [logoSrc, setLogoSrc] = useState("/images/logobranca.png"); // Padrão para SSR

  useEffect(() => {
    // Define a logo com base no tema do lado do cliente para evitar erro de hidratação
    setLogoSrc(theme === "dark" ? "/images/logopreta.png" : "/images/logobranca.png");
  }, [theme]);


  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/cadastro", label: "Cadastro" },
    { href: "/agenda", label: "Agenda" },
    { href: "/relatorios", label: "Relatórios" },
  ];

  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center p-4 gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <>
            <Image
              src="/images/logobranca.png"
              alt="PsicMarlon Logo"
              width={60}
              height={50}
              priority
              className="object-contain dark:hidden"
            />
             <Image
              src="/images/logopreta.png"
              alt="PsicMarlon Logo"
              width={60}
              height={50}
              priority
              className="object-contain hidden dark:block"
            />
          </>
        </Link>

        <div className="flex-grow flex justify-center items-center">
           <span className="hidden md:block text-xl font-bold font-headline text-foreground whitespace-nowrap">
            PSICMARLON
          </span>
        </div>
        
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  "text-sm lg:text-base",
                  (pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))) &&
                    "font-bold text-primary underline"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <ThemeToggle />
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>
                     <span className="text-xl font-bold font-headline text-foreground">
                        PSICMARLON
                     </span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-8">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "text-lg text-center p-2 rounded-lg",
                          (pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)))
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
