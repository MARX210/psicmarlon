
import  {SchedulingForm}  from "./scheduling-form";

export default function AgendaPage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-8">
        Minha Agenda
      </h1>
       <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        Visualize seus compromissos e agende novas consultas.
      </p>
      <SchedulingForm />
    </div>
  );
}
