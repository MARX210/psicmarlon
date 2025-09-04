
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
import { Menu, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { getCookie } from 'cookies-next';


interface UserPayload {
  name: string;
  email: string;
}

// Função para buscar o cookie no lado do cliente
const getClientCookie = (name: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
};


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserPayload | null>(null);

  useEffect(() => {
    // Isso garante que o código só rode no cliente
    const token = getClientCookie('token');
    if (token) {
      try {
        const decoded = jwtDecode<UserPayload>(token);
        setUser(decoded);
      } catch (error) {
        console.error("Token inválido:", error);
        // Opcional: limpar o cookie se for inválido
        handleLogout(false);
      }
    } else {
        setUser(null);
    }
  }, [pathname]); // Re-avalia quando a rota muda


  const handleLogout = async (showToast = true) => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Falha ao fazer logout");
      
      setUser(null);
      
      if(showToast) {
        toast({
          title: "Logout bem-sucedido",
          description: "Você foi desconectado com segurança.",
        });
      }
      
      router.push("/login");
      router.refresh();

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
      });
    }
  };

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/cadastro", label: "Cadastro" },
    { href: "/agenda", label: "Agenda" },
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
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium">Olá, {user.name}</span>
               <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                  <LogOut className="h-5 w-5" />
               </Button>
            </div>
          )}
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
                  {user && (
                     <SheetClose asChild>
                      <Button variant="destructive" onClick={handleLogout} className="w-full mt-4">
                         <LogOut className="mr-2 h-5 w-5" /> Sair
                      </Button>
                     </SheetClose>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

