
"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-card text-muted-foreground text-center py-4 mt-8 border-t">
      <div className="container mx-auto px-4">
        <p className="text-sm">&copy; {currentYear} PsicMarlon CRP: 08/44838. Todos os direitos reservados. Programador: Marx Vinicius</p>
      </div>
    </footer>
  );
}
