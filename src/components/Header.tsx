
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loggedInStatus = localStorage.getItem("isLoggedIn") === "true";
    setIsLoggedIn(loggedInStatus);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/cadastro", label: "Cadastro" },
    { href: "/agenda", label: "Agenda" },
    { href: "/pacientes", label: "Pacientes" },
  ];

  return (
    <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex justify-between items-center p-4 gap-4">
        {/* Left side on desktop, hamburger on mobile */}
        <div className="flex items-center gap-2 md:w-1/4">
          <div className="md:hidden">
            {isClient && isLoggedIn && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>
                       <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                          <Image
                            src="/images/logobranca.png"
                            alt="PsicMarlon Logo"
                            width={100}
                            height={20}
                            priority
                            className="object-contain dark:hidden"
                          />
                           <Image
                            src="/images/logopreta.png"
                            alt="PsicMarlon Logo"
                            width={100}
                            height={20}
                            priority
                            className="object-contain hidden dark:block"
                          />
                        </Link>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-4 mt-8">
                    {navLinks.map((link) => (
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
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </div>
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-0">
             {isClient && isLoggedIn && navLinks.slice(0, 2).map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  "text-sm lg:text-base",
                   pathname === link.href && "font-bold text-primary underline"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
        </div>

        {/* Centered Logo */}
        <div className="flex justify-center md:w-1/2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/images/logobranca.png"
              alt="PsicMarlon Logo"
              width={100}
              height={20}
              priority
              className="object-contain dark:hidden"
            />
             <Image
              src="/images/logopreta.png"
              alt="PsicMarlon Logo"
              width={100}
              height={20}
              priority
              className="object-contain hidden dark:block"
            />
          </Link>
        </div>
        
        {/* Right side */}
        <div className="flex items-center justify-end gap-2 md:w-1/4">
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-0">
            {isClient && isLoggedIn && navLinks.slice(2).map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={cn(
                  "text-sm lg:text-base",
                   pathname === link.href && "font-bold text-primary underline"
                )}
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          
          <ThemeToggle />

          {isClient && (
            isLoggedIn ? (
              <Button onClick={handleLogout} variant="outline" size="sm" className="hidden md:inline-flex">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              pathname !== '/login' && (
                <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              )
            )
          )}
        </div>
      </div>
    </header>
  );
}
