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
  frame_number?: string | null;
  engine_number?: string | null;
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
  alternate_mobile?: string | null; // second number; the agent calls mobile_number
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
  overdue_from?: string; // due date + the type's overdue days
  is_overdue?: boolean;
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
  overdue_days: number | null; // days after the due date before it's overdue (null = 0)
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
export type LiveEntity =
  | "customers"
  | "vehicles"
  | "appointments"
  | "calls"
  | "due"
  | "stats"
  | "service_types"
  | "settings"
  | "service_records";

/** One entry in a bike's service history: a maintenance record written when a
 * service was closed ("record"), or an older completed booking without one,
 * e.g. from the client's import ("booking"). */
export interface JobCardPart {
  part_no?: string | null;
  name: string;
  qty: number;
  amount: number; // ₹ per unit
  warranty?: boolean; // under warranty: not charged
}

export interface JobCardLabour {
  description: string;
  amount: number;
}

/** Customer feedback from the job card: a rating, and each check true
 * (Yes / OK) or false (No / Not OK); missing = not asked. */
export interface JobCardFeedback {
  rating?: string;
  delivery_on_time?: boolean;
  washing_quality?: boolean;
  staff_behaviour?: boolean;
  fairness_of_charges?: boolean;
  repairing_quality?: boolean;
}

export interface ServiceHistoryItem {
  kind: "record" | "booking";
  id?: number; // record id (for the job card PDF)
  vehicle_id?: number;
  appointment_id: string | null;
  service_date: string; // delivered on
  service_type: string;
  job_card_no?: string | null;
  job_type?: string | null;
  received_date?: string | null;
  odometer_km?: number | null;
  frame_number?: string | null;
  engine_number?: string | null;
  customer_requests?: string | null;
  jobs_done?: string[];
  work_done?: string | null;
  parts?: JobCardPart[];
  labour?: JobCardLabour[];
  parts_total?: number | null;
  labour_total?: number | null;
  amount?: number | null; // grand total ₹
  delivery_checks?: string[];
  feedback?: JobCardFeedback;
  technician?: string | null;
  mechanic?: string | null;
  supervisor?: string | null;
  remarks?: string | null;
  next_service_date?: string | null;
  next_service_type?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
  document_name?: string | null;
  document_size?: number | null;
}

/** Showroom-wide settings (admins change them in Settings). */
export interface AppSettings {
  voice_agent_enabled: boolean;
}

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
