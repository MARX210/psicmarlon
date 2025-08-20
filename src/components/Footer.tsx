"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-card text-muted-foreground text-center py-4 mt-8 border-t">
      <p>&copy; {currentYear} PsicMarlon CRP: 08/44838. Todos os direitos reservados. Programador: Marx Vinicius</p>
    </footer>
  );
}