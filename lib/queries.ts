"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLiveStatus } from "@/components/live-provider";
import { api, errorMessage } from "./api";
import { SERVICE_TYPES } from "./format";
import type {
  Appointment,
  CallLog,
  Customer,
  CustomerDetail,
  DashboardStats,
  DueService,
  ServiceType,
  StaffUser,
  Vehicle,
  VoiceConfig,
} from "./types";

export const keys = {
  stats: ["stats"] as const,
  customers: (q?: string) => ["customers", q ?? ""] as const,
  customer: (id: number) => ["customer", id] as const,
  vehicles: ["vehicles"] as const,
  due: (days: number) => ["due", days] as const,
  appointments: ["appointments"] as const,
  calls: ["calls"] as const,
  staff: ["staff"] as const,
  serviceTypes: ["service-types"] as const,
  voiceStatus: ["voice-status"] as const,
};

// ---------------------------------------------------------------- queries
/** Dashboard stats. While the live WebSocket is connected, changes arrive as
 * events (no polling); polling every minute is only the fallback. */
export function useStats() {
  const live = useLiveStatus() === "live";
  return useQuery({
    queryKey: keys.stats,
    queryFn: () => api<DashboardStats>("/api/stats"),
    refetchInterval: live ? false : 60_000,
  });
}

export const useCustomers = (q?: string) =>
  useQuery({ queryKey: keys.customers(q), queryFn: () => api<Customer[]>("/api/customers", { query: { q } }) });

export const useCustomer = (id: number | null) =>
  useQuery({
    queryKey: keys.customer(id ?? 0),
    queryFn: () => api<CustomerDetail>(`/api/customers/${id}`),
    enabled: !!id,
  });

export const useVehicles = () => useQuery({ queryKey: keys.vehicles, queryFn: () => api<Vehicle[]>("/api/vehicles") });

export const useDueServices = (days: number) =>
  useQuery({ queryKey: keys.due(days), queryFn: () => api<DueService[]>("/api/due-services", { query: { days } }) });

export const useAppointments = () =>
  useQuery({ queryKey: keys.appointments, queryFn: () => api<Appointment[]>("/api/appointments") });

export const CALL_LOG_LIMIT = 1000; // newest calls loaded into the call log (API default)

export const useCalls = () =>
  useQuery({ queryKey: keys.calls, queryFn: () => api<CallLog[]>("/api/calls", { query: { limit: CALL_LOG_LIMIT } }) });

export const useCallCount = () =>
  useQuery({ queryKey: [...keys.calls, "count"], queryFn: () => api<{ total: number }>("/api/calls/count") });

/** Start loading a customer's profile before it's opened (e.g. on row hover). */
export function usePrefetchCustomer() {
  const qc = useQueryClient();
  return (id: number) =>
    qc.prefetchQuery({ queryKey: keys.customer(id), queryFn: () => api<CustomerDetail>(`/api/customers/${id}`), staleTime: 30_000 });
}

export const useStaff = (enabled = true) =>
  useQuery({ queryKey: keys.staff, queryFn: () => api<StaffUser[]>("/api/staff"), enabled });

export const useVoiceStatus = () =>
  useQuery({
    queryKey: keys.voiceStatus,
    queryFn: () => api<{ online: boolean }>("/api/voice/status"),
    refetchInterval: 30_000,
    retry: false,
  });

export const fetchVoiceConfig = () => api<VoiceConfig>("/api/voice/config");

export const useServiceTypes = () =>
  useQuery({ queryKey: keys.serviceTypes, queryFn: () => api<ServiceType[]>("/api/service-types"), staleTime: 300_000 });

/** Active service type names in schedule order (built-in list until loaded). */
export function useServiceTypeNames(): string[] {
  const { data } = useServiceTypes();
  const names = data?.filter((t) => t.active).map((t) => t.name);
  return names?.length ? names : SERVICE_TYPES;
}

/** The scheduled service that follows `current` (types with an interval, in
 * order); the last one repeats. */
export function nextScheduledType(types: ServiceType[] | undefined, current: string): ServiceType | undefined {
  const scheduled = (types ?? []).filter((t) => t.active && t.interval_days);
  const i = scheduled.findIndex((t) => t.name === current);
  if (i === -1) return scheduled.find((t) => !t.is_free) ?? scheduled[scheduled.length - 1];
  return scheduled[Math.min(i + 1, scheduled.length - 1)];
}

// -------------------------------------------------------------- mutations
/** Everything that shows CRM data; refreshed after any change. */
export function useRefreshAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["stats", "customers", "customer", "vehicles", "due", "appointments", "calls", "service-types"].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

function useCrmMutation<TVars>(
  fn: (vars: TVars) => Promise<{ message?: string; id?: number | string }>,
  options: { success?: string | ((vars: TVars) => string) } = {},
) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data, vars) => {
      await refresh();
      const success = typeof options.success === "function" ? options.success(vars) : options.success;
      toast.success(success ?? data?.message ?? "Saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export interface CustomerInput {
  name: string;
  mobile_number: string;
}

export const useCreateCustomer = () =>
  useCrmMutation((body: CustomerInput) =>
    api<{ message: string; id: number }>("/api/customers", { method: "POST", body }),
  );

export const useUpdateCustomer = () =>
  useCrmMutation(({ id, ...body }: Partial<CustomerInput> & { id: number }) =>
    api(`/api/customers/${id}`, { method: "PATCH", body }),
  );

export const useDeleteCustomer = () =>
  useCrmMutation((id: number) => api(`/api/customers/${id}`, { method: "DELETE" }));

export interface VehicleSaleInput {
  name: string;
  mobile_number: string;
  registration_number: string;
  model: string;
  next_service_date: string;
  next_service_type: string;
  purchase_date?: string | null;
  odometer_km?: number | null;
  last_service_date?: string | null;
}

export const useAddVehicle = () =>
  useCrmMutation((body: VehicleSaleInput) => api("/api/vehicles", { method: "POST", body }));

export const useUpdateVehicle = () =>
  useCrmMutation(({ id, ...body }: Partial<Omit<Vehicle, "id">> & { id: number }) =>
    api(`/api/vehicles/${id}`, { method: "PATCH", body }),
  );

export const useDeleteVehicle = () =>
  useCrmMutation((id: number) => api(`/api/vehicles/${id}`, { method: "DELETE" }));

export interface AppointmentInput {
  customer_id: number;
  appointment_date: string;
  registration_number?: string | null;
  service_type?: string | null;
  notes?: string | null;
}

export const useCreateAppointment = () =>
  useCrmMutation((body: AppointmentInput) =>
    api<{ message: string; id: string }>("/api/appointments", { method: "POST", body }),
  );

export const useUpdateAppointment = () =>
  useCrmMutation(({ id, ...body }: { id: string; appointment_date?: string; notes?: string | null }) =>
    api(`/api/appointments/${id}`, { method: "PATCH", body }),
  );

export const useCancelAppointment = () =>
  useCrmMutation((id: string) => api(`/api/appointments/${id}/cancel`, { method: "POST" }));

export const useCompleteAppointment = () =>
  useCrmMutation(
    ({ id, ...body }: { id: string; next_service_date?: string | null; next_service_type?: string | null }) =>
      api(`/api/appointments/${id}/complete`, { method: "POST", body }),
  );

export interface CallLogInput {
  customer_id: number;
  outcome: string;
  vehicle_id?: number | null;
  callback_date?: string | null;
  notes?: string | null;
}

export const useLogCall = () =>
  useCrmMutation((body: CallLogInput) => api("/api/calls/log", { method: "POST", body }), {
    success: "Call outcome saved",
  });

export interface ServiceTypeInput {
  name: string;
  description?: string | null;
  is_free: boolean;
  interval_days?: number | null;
  interval_km?: number | null;
  price?: number | null;
  active: boolean;
}

export const useCreateServiceType = () =>
  useCrmMutation((body: ServiceTypeInput) => api<{ message: string; id: number }>("/api/service-types", { method: "POST", body }));

export const useUpdateServiceType = () =>
  useCrmMutation(({ id, ...body }: Partial<ServiceTypeInput> & { id: number }) =>
    api(`/api/service-types/${id}`, { method: "PATCH", body }),
  );

export const useDeleteServiceType = () =>
  useCrmMutation((id: number) => api(`/api/service-types/${id}`, { method: "DELETE" }));

export function useMoveServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) =>
      api(`/api/service-types/${id}/move`, { method: "POST", query: { direction } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.serviceTypes }),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string; full_name?: string; role: string }) =>
      api("/api/staff", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.staff });
      toast.success("Team member added");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.staff });
      toast.success("Team member removed");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api("/api/auth/password", { method: "POST", body }),
    onSuccess: () => toast.success("Password changed"),
    onError: (error) => toast.error(errorMessage(error)),
  });
