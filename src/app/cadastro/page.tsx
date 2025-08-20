
import { RegistrationForm } from "./form";

export default function CadastroPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-8">
        Cadastro de Novo Paciente
      </h1>
       <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Preencha o formulário abaixo para criar o cadastro de um novo paciente. As informações serão salvas para facilitar futuros agendamentos.
      </p>
      <RegistrationForm />
    </div>
  );
}
