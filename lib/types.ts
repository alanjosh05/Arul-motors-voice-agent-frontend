// Shapes returned by the Arul Motors CRM API (Arul-Motors/api.py).

export type Role = "admin" | "staff";

export interface StaffUser {
  id: number;
  username: string;
  full_name: string | null;
  role: Role;
  created_at?: string;
}

export type AppointmentStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type AppointmentState = "upcoming" | "completed" | "cancelled" | "missed";

export type CallOutcome =
  | "date_confirmed"
  | "callback_requested"
  | "not_interested"
  | "already_serviced"
  | "bike_sold"
  | "wrong_number"
  | "no_answer";

export interface Vehicle {
  id: number;
  customer_id: number;
  registration_number: string;
  model: string;
  purchase_date: string | null;
  last_service_date: string | null;
  odometer_km: number | null;
  next_service_date: string;
  next_service_type: string;
  customer_name?: string;
  mobile_number?: string;
}

export interface Appointment {
  id: string;
  vehicle_id: number;
  customer_id: number;
  appointment_date: string;
  service_type: string;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  state?: AppointmentState;
  customer_name?: string;
  mobile_number?: string;
  registration_number?: string;
  model?: string;
}

export interface CallLog {
  id: number;
  customer_id: number;
  vehicle_id: number | null;
  outcome: CallOutcome;
  callback_date: string | null;
  notes: string | null;
  created_at: string;
  customer_name?: string;
  mobile_number?: string;
  registration_number?: string | null;
  model?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  mobile_number: string;
  created_at: string;
  vehicles: Vehicle[];
  next_appointment?: Appointment | null;
  last_call?: CallLog | null;
}

export interface CustomerDetail extends Customer {
  appointments: Appointment[];
  calls: CallLog[];
}

export interface DueService {
  customer_id: number;
  name: string;
  mobile_number: string;
  vehicle_id: number;
  registration_number: string;
  model: string;
  next_service_date: string;
  next_service_type: string;
}

export interface DashboardStats {
  today: string;
  totals: {
    customers: number;
    vehicles: number;
    due_this_week: number;
    overdue: number;
    upcoming_appointments: number;
    appointments_today: number;
    completed_this_month: number;
    calls_this_week: number;
    confirmation_rate: number;
  };
  call_outcomes_30d: { outcome: CallOutcome; count: number }[];
  appointments_next_14_days: { date: string; count: number }[];
  calls_last_14_days: { date: string; total: number; confirmed: number }[];
  todays_appointments: Appointment[];
  due_services: DueService[];
  recent_calls: CallLog[];
}

export interface ServiceType {
  id: number;
  name: string;
  description: string | null;
  is_free: boolean;
  interval_days: number | null; // when the next one falls due (null = on demand)
  interval_km: number | null;
  price: number | null; // ₹, shown in the CRM only
  sort_order: number;
  active: boolean;
  bikes_due: number;
  bookings: number;
}

export interface VoiceConfig {
  offer_path: string;
  ice_servers: RTCIceServer[];
}

// ------------------------------------------------------------- live feed
export type LiveEntity = "customers" | "vehicles" | "appointments" | "calls" | "due" | "stats" | "service_types";

export interface NotificationData {
  kind: string;
  level: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  customer_id: number | null;
}

export interface LiveNotification {
  id: number;
  type: "notification";
  data: NotificationData;
  at: string;
}

export interface ActiveCall {
  id?: number; // voice_calls row (snapshot)
  call_id?: number; // event payload
  customer_id: number;
  customer_name: string;
  started_by: string | null;
  started_at: string;
}

export interface CallEndedData extends ActiveCall {
  ended_at: string;
  duration: number;
  outcome: CallOutcome | null;
  service_date?: string | null; // visit date agreed on the call
  service_type?: string | null;
}

export type LiveMessage =
  | { type: "hello"; data: { user: StaffUser; active_calls: ActiveCall[]; notifications: LiveNotification[] } }
  | { type: "pong" }
  | { id: number; type: "data.changed"; data: { entities: LiveEntity[]; customer_id: number | null }; at: string }
  | { id: number; type: "call.started"; data: ActiveCall; at: string }
  | { id: number; type: "call.ended"; data: CallEndedData; at: string }
  | LiveNotification;
