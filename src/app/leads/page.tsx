"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Loader2, 
  MessageCircle, 
  Search, 
  Bell, 
  CheckCircle2, 
  Clock, 
  UserX, 
  Calendar,
  AlertTriangle,
  Info,
  BadgeAlert,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  parseISO, 
  isMonday, 
  isToday,
  differenceInDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Patient = {
  id: string;
  nome: string;
  celular: string;
  is_active: boolean;
  ultima_mensagem_data: string | null;
};

type Appointment = {
  id: number;
  patient_id: string;
  date: string;
  time: string;
  professional: string;
};

export default function LeadsPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchLeadsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [patientsRes, appRes] = await Promise.all([
        fetch("/api/pacientes"),
        fetch("/api/agendamentos")
      ]);

      if (!patientsRes.ok || !appRes.ok) throw new Error("Erro ao carregar dados");

      const patientsData: Patient[] = await patientsRes.json();
      const appData: any[] = await appRes.json();
      
      const normalizedApps = appData.map(a => ({
          id: a.id,
          patient_id: a.patientId || a.patient_id,
          date: a.date,
          time: a.time,
          professional: a.professional
      }));

      setPatients(patientsData.filter(p => p.is_active));
      setAppointments(normalizedApps);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os leads." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsClient(true);
    fetchLeadsData();
  }, [fetchLeadsData]);

  const leadsInfo = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const patientsWithStatus = patients.map(patient => {
      const weekAppointment = appointments.find(app => {
        if (app.patient_id !== patient.id) return false;
        const appDate = parseISO(app.date);
        return isWithinInterval(appDate, { start: weekStart, end: weekEnd });
      });

      const lastContact = patient.ultima_mensagem_data ? parseISO(patient.ultima_mensagem_data) : null;
      const contactedRecently = lastContact && differenceInDays(today, lastContact) < 7;

      return {
        ...patient,
        hasAppointmentThisWeek: !!weekAppointment,
        appointmentDetails: weekAppointment,
        contactedRecently,
        lastContact
      };
    });

    return patientsWithStatus;
  }, [patients, appointments]);

  const filteredLeads = leadsInfo.filter(lead => 
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lead.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = leadsInfo.filter(l => !l.hasAppointmentThisWeek).length;
  const isSegunda = isMonday(new Date());

  const handleMarkAsContacted = async (patientId: string) => {
    try {
      const res = await fetch(`/api/pacientes/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ultima_mensagem_data: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Erro ao salvar contato");
      
      toast({ title: "Contato Registrado!", description: "Status de mensagem atualizado para hoje." });
      fetchLeadsData();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar contato." });
    }
  };

  const openWhatsApp = (lead: any) => {
    let phoneNumber = lead.celular.replace(/\D/g, "");
    if (phoneNumber.length >= 10 && !phoneNumber.startsWith('55')) phoneNumber = '55' + phoneNumber;
    
    let message = "";
    const firstName = lead.nome.split(" ")[0];

    if (lead.hasAppointmentThisWeek && lead.appointmentDetails) {
      const dateFormatted = format(parseISO(lead.appointmentDetails.date), "dd/MM", { locale: ptBR });
      const timeFormatted = lead.appointmentDetails.time;
      const professional = lead.appointmentDetails.professional;
      
      message = `Olá, ${lead.nome}! 😊 Passando para lembrá-lo(a) de que sua consulta está agendada para amanhã, ${dateFormatted} às ${timeFormatted}, com o Dr(a). ${professional}. Esperamos por você! 🏥`;
    } else {
      message = `Olá, ${firstName}! Tudo bem? Estou passando para ver como você está e se gostaria de agendar sua sessão para esta semana.`;
    }

    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isClient) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Central de Leads e Lembretes
          </h1>
          <p className="text-muted-foreground">
            Acompanhe quem precisa de atenção para agendamento esta semana.
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{pendingCount} Pacientes sem agenda esta semana</span>
        </div>
      </div>

      {isSegunda && (
        <Alert variant="default" className="bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400">
          <BadgeAlert className="h-5 w-5" />
          <AlertTitle className="font-bold">Alerta de Segunda-feira!</AlertTitle>
          <AlertDescription>
            Início de semana! Aproveite para revisar os pacientes abaixo que ainda não possuem horário marcado e garantir que sua agenda esteja cheia.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-grow">
          <Input 
            placeholder="Buscar paciente por nome..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="outline" size="icon" onClick={fetchLeadsData}>
            <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-muted rounded-lg" />
            </Card>
          ))
        ) : filteredLeads.length > 0 ? (
          filteredLeads.map(lead => (
            <Card key={lead.id} className={cn(
              "overflow-hidden transition-all hover:shadow-md border-l-4",
              lead.hasAppointmentThisWeek ? "border-l-green-500" : "border-l-orange-500"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{lead.nome}</CardTitle>
                  {lead.hasAppointmentThisWeek ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Agendado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-100 flex gap-1">
                      <AlertTriangle className="h-3 w-3" /> Sem Agenda
                    </Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">{lead.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" />
                    Último contato: {lead.lastContact ? format(lead.lastContact, "dd/MM 'às' HH:mm", { locale: ptBR }) : "Nunca"}
                  </p>
                  {lead.contactedRecently && !lead.hasAppointmentThisWeek && (
                    <p className="text-blue-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Mensagem enviada esta semana
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => openWhatsApp(lead)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Mandar WhatsApp
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => handleMarkAsContacted(lead.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Já avisei
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">Nenhum paciente encontrado para os filtros atuais.</p>
          </div>
        )}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Como funciona este painel?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
            <li>O sistema analisa todos os seus pacientes <strong>Ativos</strong>.</li>
            <li>Pacientes com a cor <span className="text-green-600 font-bold">Verde</span> já possuem pelo menos uma consulta marcada entre hoje e domingo.</li>
            <li>Pacientes com a cor <span className="text-orange-600 font-bold">Laranja</span> estão sem agendamento para os próximos dias.</li>
            <li>Use o botão <strong>"Já avisei"</strong> para limpar o alerta visual por uma semana após o contato.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}