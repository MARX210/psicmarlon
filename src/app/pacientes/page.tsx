
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Users, Search, Edit, CalendarClock, CheckCircle2, XCircle, AlertCircle, CreditCard, MessageCircle, FileText, PlusCircle, User, FileEdit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";


type Patient = {
  id: string;
  nome: string;
  cpf: string;
  celular: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
};

type Appointment = {
  id: number;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string;
  status: string;
  professional: string;
};

type Prontuario = {
  id: number;
  data_registro: string;
  conteudo: string;
  profissional_nome: string;
};


type AppointmentStatus = "Confirmado" | "Realizado" | "Cancelado" | "Faltou" | "Pago";

const statusConfig: Record<AppointmentStatus, { label: string; icon: React.ElementType; color: string }> = {
  Confirmado: { label: "Confirmado", icon: CalendarClock, color: "text-blue-500" },
  Realizado: { label: "Realizado", icon: CheckCircle2, color: "text-green-500" },
  Pago: { label: "Pago", icon: CreditCard, color: "text-emerald-500" },
  Cancelado: { label: "Cancelado", icon: XCircle, color: "text-gray-500" },
  Faltou: { label: "Faltou", icon: AlertCircle, color: "text-red-500" },
};

const messageTemplates = {
  confirmacao: (nome: string, data: string, hora: string) => `Olá, ${nome}! Tudo bem? Gostaria de confirmar sua consulta para o dia ${data} às ${hora}.`,
  reagendamento: (nome: string) => `Olá, ${nome}! Tudo bem? Notei que você precisa reagendar sua consulta. Quais dias e horários seriam melhores para você?`,
  cancelamento: (nome: string) => `Olá, ${nome}. Recebi sua solicitação de cancelamento. Sem problemas! Se precisar, pode me chamar para agendar uma nova data.`,
};


const patientUpdateSchema = z.object({
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  celular: z.string().optional().or(z.literal('')),
  cep: z.string().optional().or(z.literal('')),
  logradouro: z.string().optional().or(z.literal('')),
  numero: z.string().optional().or(z.literal('')),
  complemento: z.string().optional(),
  bairro: z.string().optional().or(z.literal('')),
  cidade: z.string().optional().or(z.literal('')),
  estado: z.string().optional().or(z.literal('')),
  pais: z.string().optional().or(z.literal('')),
});

const prontuarioSchema = z.object({
  conteudo: z.string().min(10, "A anotação deve ter pelo menos 10 caracteres."),
});

type PatientUpdateFormValues = z.infer<typeof patientUpdateSchema>;
type ProntuarioFormValues = z.infer<typeof prontuarioSchema>;

const formatCpf = (cpf: string) => {
  if (!cpf) return "";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};


export default function PacientesPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isProntuarioOpen, setIsProntuarioOpen] = useState(false);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [isLoadingProntuario, setIsLoadingProntuario] = useState(false);


  const { toast } = useToast();
  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(patientUpdateSchema),
  });

  const prontuarioForm = useForm<ProntuarioFormValues>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: { conteudo: "" },
  });
  
  const ITEMS_PER_PAGE = 10;
  const isAdmin = userRole === 'Admin';


  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [patientsRes, appointmentsRes] = await Promise.all([
        fetch('/api/pacientes'),
        fetch('/api/agendamentos')
      ]);

      if (!patientsRes.ok) throw new Error('Erro ao buscar pacientes');
      if (!appointmentsRes.ok) throw new Error('Erro ao buscar agendamentos');
      
      const patientsData: Patient[] = await patientsRes.json();
      const appointmentsData: Appointment[] = await appointmentsRes.json();

      setAllPatients(patientsData);
      setAppointments(appointmentsData);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const fetchProntuarios = useCallback(async (pacienteId: string) => {
    if (!pacienteId) return;
    setIsLoadingProntuario(true);
    try {
        const profissionalIdQuery = userRole !== 'Admin' && userId ? `&profissionalId=${userId}` : '';
        const res = await fetch(`/api/prontuarios?pacienteId=${pacienteId}${profissionalIdQuery}`);
        if (!res.ok) throw new Error('Erro ao buscar prontuário');
        const data: Prontuario[] = await res.json();
        setProntuarios(data);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível carregar os registros do prontuário.",
        });
        setProntuarios([]);
    } finally {
        setIsLoadingProntuario(false);
    }
  }, [toast, userId, userRole]);


  useEffect(() => {
    setIsClient(true);
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("userRole");
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName");
    
    setIsLoggedIn(loggedIn);
    setUserRole(role);
    setUserId(id);
    setUserName(name);
    setIsLoadingRole(false);

    if (!loggedIn) {
      window.location.href = "/login";
    } else {
      fetchAllData();
    }
  }, [fetchAllData]);
  
  useEffect(() => {
    if (selectedPatient && isAdmin) {
      form.reset({
        email: selectedPatient.email || "",
        celular: selectedPatient.celular || "",
        cep: selectedPatient.cep || "",
        logradouro: selectedPatient.logradouro || "",
        numero: selectedPatient.numero || "",
        complemento: selectedPatient.complemento || "",
        bairro: selectedPatient.bairro || "",
        cidade: selectedPatient.cidade || "",
        estado: selectedPatient.estado || "",
        pais: selectedPatient.pais || "Brasil",
      });
    }
  }, [selectedPatient, form, isAdmin]);

  useEffect(() => {
    if(isProntuarioOpen && selectedPatient) {
        fetchProntuarios(selectedPatient.id);
    }
  }, [isProntuarioOpen, selectedPatient, fetchProntuarios]);


  const professionalPatients = useMemo(() => {
    if (isAdmin) return allPatients;
    
    const professionalRoles = userRole ? userRole.split(',').map(r => r.trim()) : [];
    
    const patientIds = new Set<string>();
    appointments.forEach(app => {
        if (professionalRoles.includes(app.professional)) {
            patientIds.add(app.patientId);
        }
    });

    return allPatients.filter(patient => patientIds.has(patient.id));
  }, [allPatients, appointments, userRole, isAdmin]);


  const filteredPatients = useMemo(() => {
    const sourceList = isAdmin ? allPatients : professionalPatients;
    
    if (!isAdmin) return sourceList;

    const term = searchTerm.toLowerCase();
    if (!term) return allPatients;
    
    const cleanTerm = term.replace(/\D/g, "");

    return sourceList.filter(p => 
      p.nome.toLowerCase().includes(term) ||
      p.cpf.replace(/\D/g, "").includes(cleanTerm) ||
      p.id.toLowerCase().includes(term)
    );
  }, [allPatients, professionalPatients, searchTerm, isAdmin]);


  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPatients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);

  const patientAppointments = useMemo(() => {
    if (!selectedPatient) return [];
    return appointments
      .filter(app => app.patientId === selectedPatient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedPatient]);

  const appointmentStats = useMemo(() => {
    if (!patientAppointments) return { total: 0, realizados: 0, faltas: 0 };
    const realizados = patientAppointments.filter(app => app.status === 'Realizado' || app.status === 'Pago').length;
    const faltas = patientAppointments.filter(app => app.status === 'Faltou').length;
    return {
      total: patientAppointments.length,
      realizados,
      faltas,
    };
  }, [patientAppointments]);
  
  const handleTemplateChange = (templateKey: keyof typeof messageTemplates | "custom") => {
    if (!selectedPatient?.nome) return;
    
    if (templateKey === "custom") {
        setWhatsappMessage("");
        return;
    }

    const nextAppointment = patientAppointments.find(app => new Date(app.date) >= new Date());
    const date = nextAppointment ? format(parseISO(nextAppointment.date), 'dd/MM/yyyy', { locale: ptBR }) : '[Data da consulta]';
    const time = nextAppointment ? nextAppointment.time : '[Hora da consulta]';

    const message = messageTemplates[templateKey](selectedPatient.nome.split(" ")[0], date, time);
    setWhatsappMessage(message);
  };

  const handleSendWhatsApp = () => {
    if (!selectedPatient || !selectedPatient.celular) {
      toast({ variant: "destructive", title: "Erro", description: "Paciente sem número de celular cadastrado." });
      return;
    }
    
    if (!whatsappMessage) {
        toast({ variant: "destructive", title: "Mensagem vazia", description: "Escreva uma mensagem ou selecione um modelo." });
        return;
    }

    navigator.clipboard.writeText(whatsappMessage).then(() => {
      toast({
        title: "Mensagem Copiada!",
        description: "A mensagem foi copiada. Agora, cole no WhatsApp.",
      });

      let phoneNumber = selectedPatient.celular!.replace(/\D/g, "");
      if (phoneNumber.length >= 10 && !phoneNumber.startsWith('55')) {
        phoneNumber = '55' + phoneNumber;
      }
      
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
      setIsWhatsAppDialogOpen(false);

    }).catch(err => {
      console.error("Erro ao copiar mensagem: ", err);
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem para a área de transferência.",
      });
    });
  };

  const handleUpdatePatient = async (data: PatientUpdateFormValues) => {
    if (!selectedPatient) return;
    setIsUpdating(true);
    try {
        const response = await fetch(`/api/pacientes/${selectedPatient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar paciente.');
        }
        toast({
            title: "Sucesso!",
            description: "Os dados do paciente foram atualizados.",
        });
        setSelectedPatient(null);
        fetchAllData();
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro na Atualização",
            description: error instanceof Error ? error.message : "Ocorreu um erro.",
        });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleSaveProntuario = async (data: ProntuarioFormValues) => {
    if (!selectedPatient || !userId) return;

    prontuarioForm.formState.isSubmitting;
    try {
      const response = await fetch('/api/prontuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: selectedPatient.id,
          profissional_id: userId,
          conteudo: data.conteudo,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar anotação.');
      }
      
      toast({ title: 'Anotação salva com sucesso!' });
      prontuarioForm.reset();
      fetchProntuarios(selectedPatient.id);

    } catch (error) {
       toast({
          variant: "destructive",
          title: "Erro ao Salvar",
          description: error instanceof Error ? error.message : "Ocorreu um erro.",
        });
    }
  };

  const handleRowClick = (patient: Patient) => {
    setSelectedPatient(patient);
    if (!isAdmin) {
      setIsProntuarioOpen(true);
    }
  }


  if (!isClient || isLoadingRole || isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-center mb-4">
          {isAdmin ? "Gerenciar Pacientes" : "Meus Pacientes"}
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          {isAdmin ? "Gerencie as informações dos seus pacientes em um só lugar." : "Acesse o prontuário dos pacientes que você atende."}
        </p>
      </div>
      
      {isAdmin && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <Input 
              placeholder="Buscar por Nome, CPF ou Nº ID..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Nº ID</TableHead>
              <TableHead>{isAdmin ? "CPF" : ""}</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPatients.length > 0 ? paginatedPatients.map(patient => (
              <TableRow key={patient.id} className="cursor-pointer" onClick={() => handleRowClick(patient)}>
                <TableCell className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground"/> {patient.nome}
                </TableCell>
                <TableCell className="hidden md:table-cell">{patient.id}</TableCell>
                <TableCell>
                    {isAdmin ? formatCpf(patient.cpf) : ""}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    {isAdmin ? <Edit className="h-4 w-4" /> : <FileEdit className="h-4 w-4" />}
                    <span className="sr-only">{isAdmin ? "Ver Detalhes" : "Ver Prontuário"}</span>
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  {isAdmin ? "Nenhum paciente encontrado." : "Nenhum paciente vinculado ao seu perfil de atendimento."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && isAdmin && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próximo
          </Button>
        </div>
      )}

      {/* Dialog de Detalhes e Edição para ADMIN */}
      {isAdmin && (
        <Dialog open={!!selectedPatient && isAdmin} onOpenChange={(isOpen) => !isOpen && setSelectedPatient(null)}>
            <DialogContent className="sm:max-w-[800px] md:max-w-[900px] max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Detalhes de {selectedPatient?.nome}</DialogTitle>
                <DialogDescription>
                Visualize, atualize os dados ou entre em contato com o paciente.
                </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-start gap-2 border-b pb-4">
                <Button onClick={() => {
                    if (!selectedPatient) return;
                    setIsWhatsAppDialogOpen(true);
                }} disabled={!selectedPatient?.celular}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar WhatsApp
                </Button>
                <Button variant="outline" onClick={() => setIsProntuarioOpen(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Ver Prontuário
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-grow overflow-y-auto pr-4">
                {/* Coluna de Histórico */}
                <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><CalendarClock className="w-5 h-5"/> Histórico de Agendamentos</h3>
                {patientAppointments.length > 0 ? (
                    <ul className="space-y-2">
                    {patientAppointments.map(app => {
                        const status = (app.status as AppointmentStatus) || "Confirmado";
                        const CurrentStatusIcon = statusConfig[status]?.icon || CalendarClock;
                        const currentStatusColor = statusConfig[status]?.color || "text-blue-500";
                        const currentStatusLabel = statusConfig[status]?.label || "Confirmado";

                        return(
                        <li key={app.id} className="text-sm p-2 bg-muted rounded-md flex justify-between items-center">
                            <div>
                            <p><span className="font-bold">{format(parseISO(app.date), 'dd/MM/yyyy', { locale: ptBR })}</span> às {app.time}</p>
                            <p className="text-xs text-muted-foreground">{app.type}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-1 ${currentStatusColor}`}>
                                <CurrentStatusIcon className="h-3.5 w-3.5" />
                                {currentStatusLabel}
                            </div>
                        </li>
                        )
                    })}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center pt-4">Nenhum agendamento encontrado para este paciente.</p>
                )}
                </div>
                
                {/* Coluna de Edição */}
                <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dados Cadastrais</h3>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleUpdatePatient)} className="space-y-4">
                    <FormField control={form.control} name="celular" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                            <Input placeholder="(99) 99999-9999" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="cep" render={({ field }) => (
                        <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                            <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="logradouro" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                            <Input placeholder="Rua, Avenida..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="numero" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                                <Input placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="complemento" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                                <Input placeholder="Apto, Bloco..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="bairro" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                            <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="cidade" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                                <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="estado" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                                <Input placeholder="UF" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <DialogFooter className="pt-4 sticky bottom-0 bg-background/95 pb-2">
                        <Button type="button" variant="outline" onClick={() => setSelectedPatient(null)}>Fechar</Button>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                    </form>
                </Form>
                </div>

            </div>
            </DialogContent>
        </Dialog>
      )}
      
      {/* Dialog do WhatsApp (comum para todos) */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Enviar Mensagem via WhatsApp</DialogTitle>
                <DialogDescription>
                    Selecione um modelo ou escreva uma mensagem personalizada para {selectedPatient?.nome}.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <Select onValueChange={(value: keyof typeof messageTemplates | "custom") => handleTemplateChange(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo de mensagem" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="confirmacao">Confirmar consulta</SelectItem>
                        <SelectItem value="reagendamento">Sugerir reagendamento</SelectItem>
                        <SelectItem value="cancelamento">Confirmar cancelamento</SelectItem>
                        <SelectItem value="custom">Mensagem personalizada</SelectItem>
                    </SelectContent>
                </Select>
                <Textarea 
                    placeholder="Sua mensagem aqui..."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    rows={5}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsWhatsAppDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSendWhatsApp}>Copiar e Abrir WhatsApp</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog do Prontuário (comum para todos) */}
      <Dialog open={isProntuarioOpen} onOpenChange={(isOpen) => {
          setIsProntuarioOpen(isOpen);
          if (!isOpen) setSelectedPatient(null);
      }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Prontuário de {selectedPatient?.nome}</DialogTitle>
                  <DialogDescription>
                      {isAdmin ? "Visualize e adicione anotações de todos os profissionais." : "Visualize e adicione suas anotações ao prontuário."}
                  </DialogDescription>
              </DialogHeader>
              
               <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Consultas</p>
                      <p className="text-lg font-bold">{appointmentStats.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Realizadas</p>
                      <p className="text-lg font-bold text-green-600">{appointmentStats.realizados}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Faltas</p>
                      <p className="text-lg font-bold text-red-600">{appointmentStats.faltas}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>


              <div className="flex-grow space-y-4 overflow-y-hidden flex flex-col">
                  <h3 className="font-semibold text-md">Anotações Anteriores</h3>
                  <ScrollArea className="flex-grow border rounded-lg p-2">
                        {isLoadingProntuario ? (
                            <div className="flex justify-center items-center h-32">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : prontuarios.length > 0 ? (
                            <div className="space-y-4 p-2">
                                {prontuarios.map(p => (
                                    <div key={p.id} className="text-sm p-3 bg-muted rounded-lg">
                                        <p className="whitespace-pre-wrap">{p.conteudo}</p>
                                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t text-right">
                                            Por <span className="font-bold">{p.profissional_nome}</span> em {format(parseISO(p.data_registro), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma anotação encontrada.</p>
                        )}
                  </ScrollArea>

                  <Form {...prontuarioForm}>
                      <form onSubmit={prontuarioForm.handleSubmit(handleSaveProntuario)} className="space-y-4 pt-4">
                          <FormField
                              control={prontuarioForm.control}
                              name="conteudo"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="font-semibold">Nova Anotação</FormLabel>
                                      <FormControl>
                                          <Textarea 
                                              placeholder={`Anote aqui a evolução do paciente... (Registrando como ${userName})`} 
                                              rows={4} 
                                              {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setIsProntuarioOpen(false)}>Cancelar</Button>
                              <Button type="submit" disabled={prontuarioForm.formState.isSubmitting}>
                                  {prontuarioForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                  Salvar Anotação
                              </Button>
                          </DialogFooter>
                      </form>
                  </Form>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
    
