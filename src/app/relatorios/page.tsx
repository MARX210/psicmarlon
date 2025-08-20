
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock de dados. Em uma aplicação real, isso viria de um banco de dados.
const registeredPatients = [
  { id: "1-1", name: "Ana Silva", cpf: "111.222.333-44", email: "ana.silva@example.com", cartaoId: "1-16Z..." },
  { id: "2-2", name: "Bruno Costa", cpf: "222.333.444-55", email: "bruno.costa@example.com", cartaoId: "2-16Z..." },
  { id: "3-3", name: "Carla Mendes", cpf: "333.444.555-66", email: "carla.mendes@example.com", cartaoId: "3-16Z..." },
  { id: "4-4", name: "Daniel Oliveira", cpf: "444.555.666-77", email: "daniel.oliveira@example.com", cartaoId: "4-16Z..." },
  { id: "5", name: "Eduarda Lima", cpf: "555.666.777-88", email: "eduarda.lima@example.com", cartaoId: "4-16Z..." },
];

const appointments = [
  { id: 1, patientName: "Ana Silva", date: "2024-08-05", time: "10:00", type: "Online", duration: 50, price: 100 },
  { id: 2, patientName: "Bruno Costa", date: "2024-08-05", time: "11:00", type: "Presencial", duration: 50, price: 120 },
  { id: 3, patientName: "Carla Mendes", date: "2024-08-06", time: "14:00", type: "Online", duration: 80, price: 130 },
];

export default function RelatoriosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-4">
          Relatórios
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Visualize os dados consolidados de pacientes e agendamentos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pacientes Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os pacientes registrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nº Cartão/ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registeredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.cpf}</TableCell>
                  <TableCell>{patient.email}</TableCell>
                  <TableCell>{patient.cartaoId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos</CardTitle>
          <CardDescription>
            Histórico de todas as consultas agendadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Duração (min)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{appointment.patientName}</TableCell>
                  <TableCell>{appointment.date}</TableCell>
                  <TableCell>{appointment.time}</TableCell>
                  <TableCell>{appointment.duration}</TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell className="text-right">{appointment.price.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
