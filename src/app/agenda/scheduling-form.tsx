
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useState, useEffect } from "react";
import { format, parse, isSameDay, isSunday } from "date-fns";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Edit, Trash2, Search, User, XCircle, Clock, PlusCircle, DollarSign } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Mock de dados. Em uma aplicação real, isso viria de um banco de dados.
const registeredPatients = [
  { id: "1-1", name: "Ana Silva (Fidelizado)", cpf: "111.222.333-44" },
  { id: "2-2", name: "Bruno Costa (Indicação)", cpf: "222.333.444-55" },
  { id: "3-3", name: "Carla Mendes (Página Parceira)", cpf: "333.444.555-66" },
  { id: "4-4", name: "Daniel Oliveira (Novo)", cpf: "444.555.666-77" },
  { id: "5", name: "Eduarda Lima", cpf: "555.666.777-88" },
];

const initialAppointments = [
  { id: 1, patientId: "1-1", patientName: "Ana Silva (Fidelizado)", date: "2024-08-05", time: "10:00", type: "Online", duration: 50, price: 100 },
  { id: 2, patientId: "2-2", patientName: "Bruno Costa (Indicação)", date: "2024-08-05", time: "11:00", type: "Presencial", duration: 50, price: 120 },
  { id: 3, patientId: "3-3", patientName: "Carla Mendes (Página Parceira)", date: "2024-08-06", time: "14:00", type: "Online", duration: 80, price: 130 },
];

// Mock de feriados
const holidays = [
    new Date("2024-01-01"),
    new Date("2024-04-21"),
    new Date("2024-05-01"),
    new Date("2024-09-07"),
    new Date("2024-10-12"),
    new Date("2024-11-02"),
    new Date("2024-11-15"),
    new Date("2024-12-25"),
];

const defaultTimeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

const appointmentSchema = z.object({
  patientId: z.string(),
  date: z.date({ required_error: "A data é obrigatória." }),
  time: z.string().nonempty({ message: "O horário é obrigatório." }),
  type: z.enum(["Online", "Presencial"], { required_error: "O tipo é obrigatório."}),
  duration: z.coerce.number().positive({ message: "A duração deve ser um número positivo." }),
  price: z.coerce.number().nonnegative({ message: "O valor não pode ser negativo."}),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;
type Patient = (typeof registeredPatients)[0];


export function SchedulingForm() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState(initialAppointments);
  const [cpfInput, setCpfInput] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientNotFound, setPatientNotFound] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState(defaultTimeSlots);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [isClient, setIsClient] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      time: "",
      type: "Online",
      duration: 50,
      price: 0,
    },
  });

  useEffect(() => {
    setIsClient(true);
    const today = new Date();
    setSelectedDate(today);
    form.setValue("date", today);
  }, [form]);


  const appointmentsOnSelectedDate = selectedDate
    ? appointments
      .filter(app => isSameDay(parse(app.date, 'yyyy-MM-dd', new Date()), selectedDate))
      .sort((a,b) => a.time.localeCompare(b.time))
    : [];

  const bookedTimeSlots = appointmentsOnSelectedDate.map(app => app.time);
  const timeSlotsForSelectedDay = availableTimeSlots.filter(
    (slot) => !bookedTimeSlots.includes(slot)
  ).sort();

  const handleSearchPatient = () => {
    setPatientNotFound(false);
    setSelectedPatient(null);
    form.reset({
      ...form.getValues(),
      patientId: "",
      price: 0
    });

    const patient = registeredPatients.find(p => p.cpf === cpfInput);
    if (patient) {
      setSelectedPatient(patient);
      form.setValue("patientId", patient.id);
      
      toast({
          title: "Paciente Encontrado",
          description: `${patient.name} selecionado.`,
      })
    } else {
      setPatientNotFound(true);
      toast({
        variant: "destructive",
        title: "Paciente não encontrado",
        description: "Verifique o CPF digitado ou cadastre um novo paciente.",
      });
    }
  };

  const handleClearPatient = () => {
      setSelectedPatient(null);
      setCpfInput("");
      setPatientNotFound(false);
      form.reset({
        patientId: "",
        time: "",
        date: selectedDate, // Manter a data selecionada
        type: 'Online',
        duration: 50,
        price: 0,
      });
  }

  const handleCancelAppointment = (appointmentId: number) => {
    setAppointments(appointments.filter(app => app.id !== appointmentId));
    toast({
      variant: "destructive",
      title: "Agendamento Cancelado",
      description: "A consulta foi removida da sua agenda.",
    });
  };

  function onSubmit(data: AppointmentFormValues) {
    if (!selectedPatient) {
       toast({
        variant: "destructive",
        title: "Nenhum paciente selecionado",
        description: "Por favor, busque e selecione um paciente antes de agendar.",
      });
      return;
    }

    const dateString = format(data.date, 'yyyy-MM-dd');

    const newAppointment = {
      id: appointments.length + 1,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      date: dateString,
      time: data.time,
      type: data.type,
      duration: data.duration,
      price: data.price,
    };

    setAppointments([...appointments, newAppointment]);

    toast({
      title: "Agendamento Realizado!",
      description: `Consulta para ${selectedPatient.name} marcada com sucesso.`,
    });

    handleClearPatient();
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    form.setValue('date', day);
    form.setValue('time', '');
  };

  const appointmentDates = appointments.map(app =>
      parse(app.date, 'yyyy-MM-dd', new Date())
  );

  const isFormDisabled = !selectedPatient;
  const isDayUnavailable = selectedDate && (isSunday(selectedDate) || holidays.some(holiday => isSameDay(holiday, selectedDate)));


  const handleAddTimeSlot = () => {
    const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    if (newTimeSlot && timeRegex.test(newTimeSlot) && !availableTimeSlots.includes(newTimeSlot)) {
      setAvailableTimeSlots([...availableTimeSlots, newTimeSlot].sort());
      setNewTimeSlot("");
    } else {
        toast({
            variant: "destructive",
            title: "Horário Inválido",
            description: "Por favor, insira um horário válido no formato HH:MM ou um que ainda não exista na lista."
        })
    }
  };

  const handleRemoveTimeSlot = (slotToRemove: string) => {
    setAvailableTimeSlots(availableTimeSlots.filter(slot => slot !== slotToRemove));
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2">
         <Card>
            <CardHeader>
                <CardTitle>Nova Consulta</CardTitle>
                 <CardDescription>
                  Busque o paciente por CPF e preencha os dados.
                </CardDescription>
            </CardHeader>
            <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <div className="space-y-2">
                    <FormLabel htmlFor="cpf">Buscar Paciente por CPF</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpfInput}
                        onChange={(e) => setCpfInput(e.target.value)}
                        disabled={!!selectedPatient}
                      />
                      <Button type="button" onClick={handleSearchPatient} disabled={!!selectedPatient}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedPatient && (
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Paciente Selecionado:
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearPatient}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                      <p>{selectedPatient.name}</p>
                    </div>
                  )}

                  {patientNotFound && (
                     <div className="text-sm text-center my-4 text-muted-foreground">
                        <span>Paciente não encontrado. </span>
                        <Button variant="link" asChild className="p-0 h-auto">
                          <Link href="/cadastro">
                            Cadastre um novo aqui.
                          </Link>
                        </Button>
                      </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
                     <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isFormDisabled || timeSlotsForSelectedDay.length === 0 || isDayUnavailable}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeSlotsForSelectedDay.map((slot) => (
                                <SelectItem key={slot} value={slot}>
                                  {slot}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {timeSlotsForSelectedDay.length === 0 && selectedPatient && !isDayUnavailable && (
                            <p className="text-xs text-muted-foreground pt-1">Não há horários.</p>
                          )}
                          {isDayUnavailable && (
                            <p className="text-xs text-destructive pt-1">Dia indisponível.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duração (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ex: 50"
                                {...field}
                                disabled={isFormDisabled || isDayUnavailable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ex: 150"
                                {...field}
                                disabled={isFormDisabled || isDayUnavailable}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>


                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Consulta</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex space-x-4"
                            disabled={isFormDisabled || isDayUnavailable}
                          >
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Online" /></FormControl>
                              <FormLabel className="font-normal">Online</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                              <FormControl><RadioGroupItem value="Presencial" /></FormControl>
                              <FormLabel className="font-normal">Presencial</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={isFormDisabled || isDayUnavailable}>
                      Agendar Consulta
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
            <CardHeader>
                <CardTitle>Calendário e Agenda</CardTitle>
                <CardDescription>
                    Selecione um dia para ver os agendamentos ou gerencie seus horários de trabalho.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col xl:flex-row gap-8">
                 <div className="flex-1 flex flex-col md:flex-row gap-8">
                    {!isClient ? (
                        <div className="flex-1 flex justify-center items-center">
                            <Skeleton className="w-full h-[300px]"/>
                        </div>
                    ) : (
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) {
                                    handleDayClick(date);
                                }
                            }}
                            onDayClick={handleDayClick}
                            locale={ptBR}
                            disabled={
                                (date) => isSunday(date) || holidays.some(h => isSameDay(h, date))
                            }
                            initialFocus
                            modifiers={{
                            booked: appointmentDates,
                            unavailable: (date) => isSunday(date) || holidays.some(h => isSameDay(h, date)),
                            }}
                            modifiersClassNames={{
                            booked: "bg-primary/20 text-primary-foreground",
                            unavailable: "bg-destructive/80 text-destructive-foreground line-through",
                            }}
                            className="mx-auto border rounded-lg"
                        />
                    )}
                    <div className="flex-1">
                        {!isClient ? (
                            <div className="space-y-4">
                                <Skeleton className="h-6 w-1/2" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <>
                                <h3 className="font-bold text-lg mb-4">
                                    Agenda de {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : '...'}
                                </h3>
                                {isDayUnavailable ? (
                                    <div className="text-sm p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                                    <XCircle className="h-5 w-5" />
                                    <span>Este dia não está disponível para agendamento.</span>
                                    </div>
                                ) : appointmentsOnSelectedDate.length > 0 ? (
                                        <ul className="space-y-3">
                                            {appointmentsOnSelectedDate.map(app => (
                                                <li key={app.id} className="text-sm p-3 bg-muted rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                    <div>
                                                        <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span className="font-bold">{app.time}</span> - {app.patientName}</p>
                                                        <p className="text-xs text-muted-foreground pl-6">{app.type}, {app.duration} min - R$ {app.price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex gap-2 self-end sm:self-center">
                                                        <Button variant="ghost" size="icon" onClick={() => {}}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleCancelAppointment(app.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Nenhuma consulta agendada para este dia.</p>
                                    )
                                }
                            </>
                        )}
                    </div>
                 </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                 <div className="w-full">
                    <h4 className="font-bold text-md mb-2">Gerenciar Horários de Trabalho</h4>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="time"
                                value={newTimeSlot}
                                onChange={(e) => setNewTimeSlot(e.target.value)}
                                className="max-w-[150px]"
                            />
                            <Button type="button" size="icon" onClick={handleAddTimeSlot}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableTimeSlots.map(slot => (
                                <div key={slot} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                                    <span>{slot}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={() => handleRemoveTimeSlot(slot)}>
                                        <Trash2 className="h-3 w-3"/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-4 border-t w-full">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary/20"></div>Dia com Agendamento</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive/80"></div>Domingo/Feriado</div>
                </div>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
