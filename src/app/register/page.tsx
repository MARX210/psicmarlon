import { RegistrationForm } from "./form";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-8">
        Registro de Novo Usuário
      </h1>
       <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Preencha o formulário para criar uma nova conta de acesso para um médico, recepcionista ou administrador.
      </p>
      <RegistrationForm />
    </div>
  );
}
