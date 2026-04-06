"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { format, parse, isSameDay, isSunday, addMinutes, parseISO, differenceInYears, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Edit, Trash2, User, XCircle, Clock, Loader2, PlusCircle, BadgeAlert, CheckCircle2, AlertCircle, CalendarClock, CreditCard, Stethoscope, ChevronsUpDown, Check, RefreshCw, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Feriados
const holidays: Date[] = [];

const defaultTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

const appointmentSchema = z.object({
  patientId: z.string().nonempty("Selecione um paciente."),
  date: z.date({ required_error: "A data é obrigatória."}),
  time: z.string().nonempty("O horário é obrigatório."),
  professional: z.string().nonempty("O profissional é obrigatório."),
  type: z.enum(["Online", "Presencial"]),
  duration: z.string().nonempty("A duração é obrigatória."),
  price: z.string().nonempty("O valor é obrigatório."),
  status: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;
type Patient = {
  id: string;
  nome: string;
  cpf: string;
  nascimento: string; // YYYY-MM-DD
};
type Appointment = {
  id: number;
  patientId: string;
  patientName: string;
  date: string; // YYY-MM-DD
  time: string; // HH:mm
  professional: string;
  type: string;
  duration: number;
  price: number;
  status: string;
};
type AppointmentStatus = "Confirmado" | "Realizado" | "Cancelado" | "Faltou" | "Pago" | "Reagendado";

const statusConfig: Record<AppointmentStatus, { label: string; icon: React.ElementType; color: string }> = {
  Confirmado: { label: "Confirmado", icon: CalendarClock, color: "text-blue-500" },
  Realizado: { label: "Realizado", icon: CheckCircle2, color: "text-green-500" },
  Pago: { label: "Pago", icon: CreditCard, color: "text-emerald-500" },
  Cancelado: { label: "Cancelado", icon: XCircle, color: "text-gray-500" },
  Faltou: { label: "Faltou", icon: AlertCircle, color: "text-red-500" },
  Reagendado: { label: "Reagendado", icon: RefreshCw, color: "text-orange-500" },
};

const calculateAge = (birthDate: string) => {
  if (!birthDate) return null;
  const birth = parseISO(birthDate);
  const age = differenceInYears(new Date(), birth);
  return age;
};

export function SchedulingForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  const [professionalRoles, setProfessionalRoles] = useState<string[]>([]);
  const [isPatientComboboxOpen, setIsPatientComboboxOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);

  // Estados para Reagendamento
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(new Date());
  const [rescheduleTime, setRescheduleTime] = useState("");

  const isAdmin = userRole === 'Admin';

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      time: "",
      professional: "",
      type: "Online",
      duration: "50",
      price: "0",
      status: "Confirmado",
    },
  });
  
  const fetchSearchedPatients = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchedPatients([]);
      return;
    }
    setIsSearchingPatients(true);
    try {
      const res = await fetch(`/api/pacientes?search=${searchTerm}`);
      if (!res.ok) throw new Error("Erro ao buscar pacientes");
      const data: Patient[] = await res.json();
      setSearchedPatients(data);
    } catch (error) {
      console.error(error);
      setSearchedPatients([]);
    } finally {
      setIsSearchingPatients(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSearchedPatients(patientSearchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientSearchTerm, fetchSearchedPatients]);

  const fetchProfessionalRoles = useCallback(async () => {
    try {
        const res = await fetch(`/api/profissionais?distinctRoles=true`);
        if (!res.ok) throw new Error("Erro ao buscar funções dos profissionais");
        const data: string[] = await res.json();
        setProfessionalRoles(data);
    } catch (error) {
        console.error(error);
    }
  }, []);

  const fetchAppointments = useCallback(async (role: string | null) => {
    setIsLoading(true);
    try {
        let url = '/api/agendamentos';
        if (role && !role.includes('Admin')) {
            const rolesArray = role.split(',').map(r => r.trim());
            url += `?professional=${encodeURIComponent(rolesArray.join(','))}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro ao buscar agendamentos`);
        const data: Appointment[] = await res.json();
        setAppointments(data);
    } catch (error) {
        console.error("Erro no fetchAppointments:", error);
    } finally {
        setIsLoading(false);
    }
}, []);

  useEffect(() => {
    setIsClient(true);
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    setIsLoadingRole(false);

    const today = new Date();
    setSelectedDate(today);
    form.setValue("date", today);
    
    try {
      const storedSlots = localStorage.getItem("timeSlots");
      if (storedSlots) {
        setTimeSlots(JSON.parse(storedSlots));
      } else {
        setTimeSlots(defaultTimeSlots);
      }
    } catch (error) {
      setTimeSlots(defaultTimeSlots);
    }
  }, [form]);
  
  useEffect(() => {
    if (!isLoadingRole && userRole) {
        fetchAppointments(userRole);
        if (isAdmin) {
            fetchProfessionalRoles();
        }
    }
  }, [userRole, isLoadingRole, fetchAppointments, fetchProfessionalRoles, isAdmin]);

  const handleUpdateStatus = async (appointmentId: number, status: AppointmentStatus | "REAGENDAR") => {
    if (status === "REAGENDAR") {
        const appointment = appointments.find(a => a.id === appointmentId);
        if (appointment) {
            setReschedulingAppointment(appointment);
            setRescheduleDate(new Date());
            setRescheduleTime("");
            setIsRescheduleOpen(true);
        }
        return;
    }

    try {
      const response = await fetch(`/api/agendamentos/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userRole }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao atualizar status');
      }
      
      await fetchAppointments(userRole);
      toast({ title: "Status Atualizado!", description: `O status do agendamento foi alterado para ${status}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível atualizar o status." });
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingAppointment || !rescheduleDate || !rescheduleTime) {
        toast({ variant: "destructive", title: "Campos obrigatórios", description: "Selecione a nova data e horário." });
        return;
    }

    setIsSubmitting(true);
    try {
        // 1. Cancelar o agendamento antigo
        const cancelResponse = await fetch(`/api/agendamentos/${reschedulingAppointment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelado', userRole }),
        });

        if (!cancelResponse.ok) throw new Error("Erro ao cancelar agendamento anterior");

        // 2. Criar o novo agendamento
        const newData = {
            patientId: reschedulingAppointment.patientId,
            date: format(rescheduleDate, "yyyy-MM-dd"),
            time: rescheduleTime,
            professional: reschedulingAppointment.professional,
            type: reschedulingAppointment.type,
            duration: reschedulingAppointment.duration,
            price: reschedulingAppointment.price,
            status: 'Confirmado',
        };

        const createResponse = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData),
        });

        if (!createResponse.ok) {
            const result = await createResponse.json();
            throw new Error(result.error || "Erro ao criar novo agendamento");
        }

        toast({ title: "Reagendado!", description: "Consulta reagendada com sucesso." });
        setIsRescheduleOpen(false);
        setReschedulingAppointment(null);
        await fetchAppointments(userRole);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao reagendar", description: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const appointmentsOnSelectedDate = selectedDate
    ? appointments
        .filter(app => isSameDay(parseISO(app.date), selectedDate))
        .sort((a, b) => a.time.localeCompare(b.time))
    : [];

  const getAvailableSlots = (date: Date | undefined, excludeAppointmentId: number | null = null) => {
      if (!date) return [];
      const appsOnDate = appointments.filter(app => isSameDay(parseISO(app.date), date));
      
      return timeSlots.filter(slot => {
        const slotTime = parse(slot, "HH:mm", date);
        return !appsOnDate.some(app => {
          if (app.id === excludeAppointmentId) return false;
          const appStartTime = parse(app.time, "HH:mm", date);
          const appEndTime = addMinutes(appStartTime, app.duration);
          return slotTime >= appStartTime && slotTime < appEndTime;
        });
      }).sort();
  };

  const timeSlotsForSelectedDay = getAvailableSlots(selectedDate, isEditing);
  const timeSlotsForReschedule = getAvailableSlots(rescheduleDate);
  
  const handleAddTimeSlot = () => {
    const trimmedTime = newTimeSlot.trim();
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(trimmedTime) && !timeSlots.includes(trimmedTime)) {
      const updatedSlots = [...timeSlots, trimmedTime].sort();
      setTimeSlots(updatedSlots);
      localStorage.setItem("timeSlots", JSON.stringify(updatedSlots));
      setNewTimeSlot("");
    } else {
      toast({ variant: "destructive", title: "Horário Inválido", description: "Use o formato HH:mm e evite repetições." });
    }
  };

  const handleRemoveTimeSlot = (slotToRemove: string) => {
    const updatedSlots = timeSlots.filter(slot => slot !== slotToRemove);
    setTimeSlots(updatedSlots);
    localStorage.setItem("timeSlots", JSON.stringify(updatedSlots));
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setSearchedPatients([]);
    setIsEditing(null);
    form.reset({
      patientId: "",
      time: "",
      date: selectedDate,
      professional: "",
      type: "Online",
      duration: "50",
      price: "0",
      status: "Confirmado",
    });
  };

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    handleClearPatient();
    setSelectedDate(day);
    form.setValue("date", day);
    form.setValue("time", "");
  };

  const handleEditClick = async (appointment: Appointment) => {
    let patientToEdit = searchedPatients.find(p => p.id === appointment.patientId) || 
                          (selectedPatient?.id === appointment.patientId ? selectedPatient : null);

    if (!patientToEdit) {
      try {
        // Busca o paciente usando o ID exato
        const res = await fetch(`/api/pacientes?cpf=${encodeURIComponent(appointment.patientId)}`);
        if (res.ok) {
          const data: Patient[] = await res.json();
          if (data && data.length > 0) {
            patientToEdit = data[0];
          }
        }
      } catch (error) {
        console.error("Erro ao buscar paciente para edição:", error);
      }
    }

    if (!patientToEdit) {
        toast({ variant: "destructive", title: "Erro", description: "Paciente do agendamento não encontrado no banco de dados." });
        return;
    }
    
    setIsEditing(appointment.id);
    setSelectedPatient(patientToEdit);
    const appointmentDate = parseISO(appointment.date);
    setSelectedDate(appointmentDate);

    form.reset({
        patientId: appointment.patientId,
        date: appointmentDate,
        time: appointment.time,
        professional: appointment.professional,
        type: appointment.type as "Online" | "Presencial",
        duration: String(appointment.duration),
        price: String(appointment.price),
        status: appointment.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setShowDeleteAlert(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;
    try {
      const response = await fetch(`/api/agendamentos/${appointmentToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir agendamento');
      toast({ title: "Agendamento Excluído!", description: "Consulta removida com sucesso." });
      await fetchAppointments(userRole);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao Excluir", description: "Ocorreu um erro ao excluir." });
    } finally {
      setShowDeleteAlert(false);
      setAppointmentToDelete(null);
    }
  };

  const appointmentDates = appointments.map(app => parseISO(app.date));
  const isDayInPast = selectedDate && isBefore(selectedDate, startOfDay(new Date()));
  const isFormDisabled = !selectedPatient || isSubmitting || (isDayInPast && !isEditing);
  const isDayUnavailable = selectedDate && (isSunday(selectedDate) || holidays.some(holiday => isSameDay(holiday, selectedDate)));

  async function onSubmit(data: AppointmentFormValues) {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    const submissionData = {
      patientId: selectedPatient.id,
      date: format(data.date, "yyyy-MM-dd"),
      time: data.time,
      professional: data.professional,
      type: data.type,
      duration: parseInt(data.duration, 10),
      price: parseFloat(data.price),
      status: data.status || 'Confirmado',
    };
    const url = isEditing ? `/api/agendamentos/${isEditing}` : '/api/agendamentos';
    const method = isEditing ? 'PUT' : 'POST';
    try {
        const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submissionData) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Erro ao salvar agendamento`);
        toast({ title: `Agendamento ${isEditing ? 'Atualizado' : 'Realizado'}!`, description: `Consulta marcada com sucesso.` });
        await fetchAppointments(userRole);
        handleClearPatient();
    } catch (error) {
         toast({ variant: "destructive", title: `Erro no Agendamento`, description: error instanceof Error ? error.message : "Erro desconhecido." });
    } finally {
        setIsSubmitting(false);
        setIsEditing(null);
    }
  }

  if (isLoadingRole) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-4">Carregando permissões...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
      {isAdmin && (
        <div className="xl:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Editar Consulta' : 'Nova Consulta'}</CardTitle>
              <CardDescription>{isEditing ? 'Altere os dados abaixo.' : 'Busque o paciente e preencha os dados.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="default" className="mb-6 bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">Importante</AlertTitle>
                <AlertDescription>
                  Selecione primeiro a <strong>data</strong> no calendário ao lado antes de preencher os dados da consulta, pois a escolha da data reinicia o formulário.
                </AlertDescription>
              </Alert>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                     <FormLabel>Buscar Paciente por Nome</FormLabel>
                        <Popover open={isPatientComboboxOpen} onOpenChange={setIsPatientComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={isPatientComboboxOpen} className="w-full justify-between" disabled={!!selectedPatient}>
                                    {selectedPatient ? selectedPatient.nome : "Selecione o paciente..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder="Digite o nome..." value={patientSearchTerm} onValueChange={setPatientSearchTerm} />
                                    <CommandList>
                                        {isSearchingPatients && <CommandEmpty>Buscando...</CommandEmpty>}
                                        {!isSearchingPatients && searchedPatients.length === 0 && patientSearchTerm.length > 1 && (
                                            <CommandEmpty>
                                              <div className="py-4 text-center text-sm">
                                                <p>Nenhum paciente encontrado.</p>
                                                <Button variant="link" className="h-auto p-0 text-sm" onClick={() => { setIsPatientComboboxOpen(false); router.push('/cadastro'); }}>Adicionar novo paciente</Button>
                                              </div>
                                            </CommandEmpty>
                                        )}
                                        <CommandGroup>
                                            {searchedPatients.map((patient) => (
                                                <CommandItem key={patient.id} value={patient.nome} onSelect={() => { setSelectedPatient(patient); form.setValue("patientId", patient.id); setIsPatientComboboxOpen(false); setPatientSearchTerm(""); }}>
                                                    <Check className={`mr-2 h-4 w-4 ${selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"}`} />
                                                    <div>
                                                        <p>{patient.nome}</p>
                                                        <p className="text-xs text-muted-foreground">{patient.cpf || patient.id}</p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                  </div>

                  {selectedPatient && (
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 font-bold"><User className="w-4 h-4 mt-0.5" /><span>Paciente Selecionado</span></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearPatient}><XCircle className="w-4 h-4" /></Button>
                      </div>
                      <div className="pl-6 space-y-1">
                        <p><span className="font-semibold">Nome:</span> {selectedPatient.nome}</p>
                        <p><span className="font-semibold">Idade:</span> {calculateAge(selectedPatient.nascimento) ?? 'N/A'} anos</p>
                        <p><span className="font-semibold">Nº ID:</span> {selectedPatient.id}</p>
                      </div>
                    </div>
                  )}
                  
                  {isDayInPast && !isEditing && (
                      <p className="text-xs text-destructive pt-1 flex items-center gap-2"><BadgeAlert className="h-4 w-4" /> Bloqueado para datas passadas.</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="time" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled || timeSlotsForSelectedDay.length === 0 || isDayUnavailable}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent>{timeSlotsForSelectedDay.map((slot) => (<SelectItem key={slot} value={slot}>{slot}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="professional" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissional</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isFormDisabled || isDayUnavailable}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                            <SelectContent>{professionalRoles.map((prof) => (<SelectItem key={prof} value={prof}>{prof}</SelectItem>))}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="duration" render={({ field }) => (
                        <FormItem><FormLabel>Duração (min)</FormLabel><FormControl><Input type="number" {...field} disabled={isFormDisabled || isDayUnavailable} /></FormControl><FormMessage /></FormItem>
                      )}
                    />
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" {...field} disabled={isFormDisabled || isDayUnavailable} /></FormControl><FormMessage /></FormItem>
                      )}
                    />
                  </div>

                  <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Consulta</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4" disabled={isFormDisabled || isDayUnavailable}>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Online" /></FormControl><FormLabel className="font-normal">Online</FormLabel></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Presencial" /></FormControl><FormLabel className="font-normal">Presencial</FormLabel></FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={isFormDisabled || isDayUnavailable}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Agendar Consulta'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {isClient && (
            <Card>
              <CardHeader>
                <CardTitle>Meus Horários</CardTitle>
                <CardDescription>Horários disponíveis para agendamento.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input type="time" value={newTimeSlot} onChange={(e) => setNewTimeSlot(e.target.value)} placeholder="HH:mm" />
                  <Button onClick={handleAddTimeSlot}><PlusCircle /> Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.length > 0 ? timeSlots.map(slot => (
                    <Badge key={slot} variant="secondary" className="text-base">
                      {slot}
                      <button onClick={() => handleRemoveTimeSlot(slot)} className="ml-2 p-0.5 rounded-full hover:bg-destructive/20 text-destructive"><XCircle className="h-4 w-4"/></button>
                    </Badge>
                  )) : (<p className="text-sm text-muted-foreground">Nenhum horário definido.</p>)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className={isAdmin ? "xl:col-span-3" : "xl:col-span-5 w-full"}>
        <Card>
          <CardHeader>
            <CardTitle>Calendário e Agenda</CardTitle>
            <CardDescription>Selecione um dia para visualizar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col xl:flex-row gap-8">
            <div className="flex flex-col xl:flex-row gap-8 w-full">
              {!isClient ? (<div className="flex-1 flex justify-center items-center"><Skeleton className="w-full h-[300px]" /></div>) : (
                <div className="w-full xl:max-w-sm">
                  <div className="[&>div]:w-full">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDayClick}
                      locale={ptBR}
                      disabled={(date) => isSunday(date) || holidays.some(h => isSameDay(h, date))}
                      modifiers={{ booked: appointmentDates, unavailable: (date) => isSunday(date) || holidays.some(h => isSameDay(h, date)) }}
                      modifiersClassNames={{ booked: "day-booked", unavailable: "text-muted-foreground opacity-50" }}
                      className="border rounded-lg p-3"
                    />
                  </div>
                </div>
              )}

              <div className="flex-1">
                {!isClient || isLoading ? (<div className="space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>) : (
                  <>
                    <h3 className="font-bold text-lg mb-4">Agenda de {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : '...'}</h3>
                    {isDayUnavailable ? (
                      <div className="text-sm p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2"><XCircle className="h-5 w-5" /><span>Dia indisponível.</span></div>
                    ) : appointmentsOnSelectedDate.length > 0 ? (
                      <ul className="space-y-3">
                        {appointmentsOnSelectedDate.map(app => {
                          const status = (app.status as AppointmentStatus) || "Confirmado";
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          const availableStatuses = Object.keys(statusConfig).filter(s => (isAdmin || s !== 'Pago') && s !== 'Reagendado') as AppointmentStatus[];
                          return (
                            <li key={app.id} className="text-sm p-3 bg-muted rounded-lg flex flex-col sm:flex-row justify-between gap-2">
                              <div className="flex-grow">
                                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span className="font-bold">{app.time}</span> - {app.patientName}</p>
                                <p className="text-xs text-muted-foreground pl-6 flex items-center gap-1.5"><Stethoscope className="h-3 w-3" /> {app.professional}</p>
                                <p className="text-xs text-muted-foreground pl-6">{app.type}, {app.duration} min - R$ {app.price.toFixed(2)}</p>
                              </div>
                              <div className="flex gap-2 self-end sm:self-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className={`flex items-center gap-1 h-auto px-2 py-1 text-xs rounded-full ${config.color}`}><Icon className="h-3.5 w-3.5" />{config.label}</Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {availableStatuses.map(key => {
                                      const item = statusConfig[key];
                                      return (<DropdownMenuItem key={key} onSelect={() => handleUpdateStatus(app.id, key)}><item.icon className={`mr-2 h-4 w-4 ${item.color}`} /><span>{item.label}</span></DropdownMenuItem>);
                                    })}
                                    <DropdownMenuItem onSelect={() => handleUpdateStatus(app.id, "REAGENDAR")}>
                                      <RefreshCw className="mr-2 h-4 w-4 text-orange-500" />
                                      <span>REAGENDAR</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                {isAdmin && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(app)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleDeleteClick(app)}><Trash2 className="h-4 w-4" /></Button>
                                  </>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (<p className="text-sm text-muted-foreground">Sem agendamentos.</p>)}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Reagendamento */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reagendar Consulta</DialogTitle>
            <DialogDescription>
              Selecione a nova data e horário para {reschedulingAppointment?.patientName}. 
              O agendamento atual será cancelado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nova Data</Label>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={setRescheduleDate}
                  locale={ptBR}
                  disabled={(date) => isSunday(date) || holidays.some(h => isSameDay(h, date)) || isBefore(date, startOfDay(new Date()))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Novo Horário</Label>
              <Select onValueChange={setRescheduleTime} value={rescheduleTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlotsForReschedule.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                  {timeSlotsForReschedule.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">Nenhum horário disponível para esta data.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmReschedule} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Confirmar exclusão de {appointmentToDelete?.patientName} às {appointmentToDelete?.time}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}