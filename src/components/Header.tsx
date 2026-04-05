
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
import { Menu, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    setUserRole(localStorage.getItem("userRole"));
    setIsLoadingRole(false);
  }, []);

  const isLoggedIn = isMounted && localStorage.getItem("isLoggedIn") === "true";

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const navLinks = [
    { href: "/", label: "Início", adminOnly: false },
    { href: "/cadastro", label: "Cadastro", adminOnly: true },
    { href: "/agenda", label: "Agenda", adminOnly: false },
    { href: "/leads", label: "Leads", adminOnly: false },
    { href: "/pacientes", label: "Pacientes", adminOnly: false },
    { href: "/profissionais", label: "Profissionais", adminOnly: true },
    { href: "/financeiro", label: "Financeiro", adminOnly: true },
  ];
  
  const visibleLinks = navLinks.filter(link => !link.adminOnly || (isLoggedIn && userRole === 'Admin'));

  const firstHalfLinks = visibleLinks.slice(0, Math.ceil(visibleLinks.length / 2));
  const secondHalfLinks = visibleLinks.slice(Math.ceil(visibleLinks.length / 2));

  if (isLoadingRole) {
      return (
        <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto flex justify-between items-center p-4 gap-4">
            <div className="flex-1"></div>
            <div className="flex justify-center shrink-0">
                <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                <Image
                    src="/images/logopreta.png"
                    alt="PsicMarlon Logo"
                    width={100}
                    height={20}
                    priority
                    className="object-contain dark:hidden"
                />
                <Image
                    src="/images/logobranca.png"
                    alt="PsicMarlon Logo"
                    width={100}
                    height={20}
                    priority
                    className="object-contain hidden dark:block"
                />
                </Link>
            </div>
            <div className="flex items-center justify-end gap-2 flex-1">
                <ThemeToggle />
            </div>
          </div>
        </header>
      )
  }

  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center p-4 gap-4">
        {/* Left side: Mobile Menu + First Half of Nav */}
        <div className="flex items-center flex-1 min-w-0 lg:justify-end">
          <div className="lg:hidden mr-auto">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" disabled={!isMounted || !isLoggedIn}>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                      <Image
                        src="/images/logopreta.png"
                        alt="PsicMarlon Logo"
                        width={100}
                        height={20}
                        priority
                        className="object-contain"
                      />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-8">
                  {isMounted && isLoggedIn ? (
                    <>
                      {visibleLinks.map((link) => (
                        <SheetClose asChild key={link.href}>
                          <Link
                            href={link.href}
                            className={cn(
                              "text-lg text-center p-2 rounded-lg",
                              pathname === link.href
                                ? "bg-primary text-primary-foreground font-bold"
                                : "text-foreground hover:bg-accent"
                            )}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      ))}
                      <SheetClose asChild>
                        <Button onClick={handleLogout} variant="outline" className="text-lg">
                          <LogOut className="mr-2 h-5 w-5" />
                          Logout
                        </Button>
                      </SheetClose>
                    </>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <nav className="hidden lg:flex items-center space-x-1 lg:space-x-2 overflow-x-auto no-scrollbar">
             {firstHalfLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm lg:text-base px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href 
                    ? "font-bold text-primary underline" 
                    : "text-foreground",
                  isMounted && !isLoggedIn && "hidden"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Logo centered */}
        <div className="flex justify-center shrink-0 z-10 px-2">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/images/logopreta.png"
              alt="PsicMarlon Logo"
              width={100}
              height={20}
              priority
              className="object-contain dark:hidden"
            />
            <Image
              src="/images/logobranca.png"
              alt="PsicMarlon Logo"
              width={100}
              height={20}
              priority
              className="object-contain hidden dark:block"
            />
          </Link>
        </div>

        {/* Right side: Second Half of Nav + Actions */}
        <div className="flex items-center flex-1 min-w-0">
          <nav className="hidden lg:flex items-center space-x-1 lg:space-x-2 overflow-x-auto no-scrollbar">
             {secondHalfLinks.map((link) => (
               <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm lg:text-base px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href 
                    ? "font-bold text-primary underline" 
                    : "text-foreground",
                  isMounted && !isLoggedIn && "hidden"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />

            <div className={cn("hidden lg:inline-flex", { "hidden": !isMounted })}>
              {isLoggedIn ? (
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              ) : (pathname !== '/login' && pathname !== '/setup' &&
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
