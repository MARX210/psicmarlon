
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Menu, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

interface UserPayload {
  id: number;
  email: string;
  nome: string;
  role: 'medico' | 'recepcionista' | 'admin';
}

async function handleLogout(router: any) {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
        router.push('/login');
        router.refresh();
    }
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Pega o token do cookie
    const token = Cookies.get('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<UserPayload>(token);
        setUser(decodedToken);
      } catch (error) {
        console.error("Failed to decode token", error);
        setUser(null);
      }
    } else {
        setUser(null);
    }
  }, [pathname]); // Re-executa quando a rota muda

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/cadastro", label: "Cadastro" },
    { href: "/agenda", label: "Agenda" },
  ];
  
  if (isClient && user?.role === 'admin') {
    // navLinks.push({ href: "/register", label: "Registrar Usuário" });
  }

  // Não renderiza o header na página de login
  if (pathname === '/login') {
    return null;
  }

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
             {isClient && user && (
              <Button variant="ghost" size="icon" onClick={() => handleLogout(router)}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sair</span>
              </Button>
            )}
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
                   {isClient && user && (
                    <div className="text-sm text-muted-foreground pt-2 flex items-center justify-center gap-2">
                        <User className="w-4 h-4"/> 
                        <span>{user.nome}</span>
                    </div>
                  )}
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
                 {isClient && user && (
                    <div className="mt-8 pt-4 border-t">
                        <Button variant="outline" className="w-full" onClick={() => handleLogout(router)}>
                            <LogOut className="mr-2 h-5 w-5" />
                            Sair
                        </Button>
                    </div>
                 )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
