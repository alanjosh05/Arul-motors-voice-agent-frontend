"use client";

import { keepPreviousData, type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLiveStatus } from "@/components/live-provider";
import { api, apiUpload, errorMessage } from "./api";
import { SERVICE_TYPES } from "./format";
import type {
  AppSettings,
  Appointment,
  CallLog,
  Customer,
  CustomerDetail,
  DashboardStats,
  DueService,
  JobCardFeedback,
  ServiceHistoryItem,
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
  settings: ["settings"] as const,
  serviceHistory: (vehicleId: number) => ["service-history", vehicleId] as const,
};

export const CALL_LOG_LIMIT = 1000; // newest calls loaded into the call log (API default)

/** Each list's key + fetch in one place: the hooks below, prefetching and the
 * cache kept across reloads all use these, so they always agree. */
export const queries = {
  stats: () => ({ queryKey: keys.stats, queryFn: () => api<DashboardStats>("/api/stats") }),
  customers: () => ({ queryKey: keys.customers(), queryFn: () => api<Customer[]>("/api/customers") }),
  vehicles: () => ({ queryKey: keys.vehicles, queryFn: () => api<Vehicle[]>("/api/vehicles") }),
  due: (days: number) => ({
    queryKey: keys.due(days),
    queryFn: () => api<DueService[]>("/api/due-services", { query: { days } }),
  }),
  appointments: () => ({ queryKey: keys.appointments, queryFn: () => api<Appointment[]>("/api/appointments") }),
  calls: () => ({ queryKey: keys.calls, queryFn: () => api<CallLog[]>("/api/calls", { query: { limit: CALL_LOG_LIMIT } }) }),
  callCount: () => ({ queryKey: [...keys.calls, "count"], queryFn: () => api<{ total: number }>("/api/calls/count") }),
  serviceTypes: () => ({ queryKey: keys.serviceTypes, queryFn: () => api<ServiceType[]>("/api/service-types"), staleTime: 300_000 }),
  settings: () => ({ queryKey: keys.settings, queryFn: () => api<AppSettings>("/api/settings"), staleTime: 300_000 }),
};

/** What each page shows, so it can load before the page is opened. */
const PAGE_QUERIES: Record<string, (() => { queryKey: readonly unknown[]; queryFn: () => Promise<unknown>; staleTime?: number })[]> = {
  "/dashboard/": [queries.stats, queries.vehicles],
  "/follow-ups/": [() => queries.due(7)],
  "/customers/": [queries.customers],
  "/bikes/": [queries.vehicles],
  "/appointments/": [queries.appointments],
  "/calls/": [queries.calls, queries.callCount],
  "/service-types/": [queries.serviceTypes],
  "/settings/": [queries.settings],
};

/** Load a page's data ahead of time (sidebar hover). Fresh data is not refetched. */
export function prefetchPage(qc: QueryClient, href: string) {
  for (const make of PAGE_QUERIES[href] ?? []) void qc.prefetchQuery({ staleTime: 30_000, ...make() });
}

/** Warm every page's data in the background after sign-in, so moving around
 * the CRM is instant. A few small requests over one HTTP/2 connection. */
export function prefetchAllPages(qc: QueryClient) {
  for (const href of Object.keys(PAGE_QUERIES)) prefetchPage(qc, href);
}

// ---------------------------------------------------------------- queries
/** Dashboard stats. While the live WebSocket is connected, changes arrive as
 * events (no polling); polling every minute is only the fallback. */
export function useStats() {
  const live = useLiveStatus() === "live";
  return useQuery({ ...queries.stats(), refetchInterval: live ? false : 60_000 });
}

export const useCustomers = (q?: string) =>
  useQuery(q ? { queryKey: keys.customers(q), queryFn: () => api<Customer[]>("/api/customers", { query: { q } }) } : queries.customers());

export const useCustomer = (id: number | null) =>
  useQuery({
    queryKey: keys.customer(id ?? 0),
    queryFn: () => api<CustomerDetail>(`/api/customers/${id}`),
    enabled: !!id,
  });

export const useVehicles = () => useQuery(queries.vehicles());

/** Bike models already saved for customers, most sold first, with how many
 * bikes of each (for the model picker). */
export function useBikeModels(): { model: string; count: number }[] {
  const { data } = useVehicles();
  return useMemo(() => {
    const counts = new Map<string, { model: string; count: number }>();
    for (const v of data ?? []) {
      const model = v.model.replace(/\s+/g, " ").trim();
      const key = model.toLowerCase();
      const entry = counts.get(key) ?? { model, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
  }, [data]);
}

// Keeps the current list on screen while another period (7/14/30 days) loads.
export const useDueServices = (days: number) =>
  useQuery({ ...queries.due(days), placeholderData: keepPreviousData });

export const useAppointments = () => useQuery(queries.appointments());

export const useCalls = () => useQuery(queries.calls());

export const useCallCount = () => useQuery(queries.callCount());

/** A bike's service history (maintenance records + older services), newest first. */
export const useServiceHistory = (vehicleId: number) =>
  useQuery({
    queryKey: keys.serviceHistory(vehicleId),
    queryFn: () => api<ServiceHistoryItem[]>(`/api/vehicles/${vehicleId}/service-history`),
  });

/** Start loading a customer's profile before it's opened (e.g. on row hover). */
export function usePrefetchCustomer() {
  const qc = useQueryClient();
  return (id: number) =>
    qc.prefetchQuery({ queryKey: keys.customer(id), queryFn: () => api<CustomerDetail>(`/api/customers/${id}`), staleTime: 30_000 });
}

export const useStaff = (enabled = true) =>
  useQuery({ queryKey: keys.staff, queryFn: () => api<StaffUser[]>("/api/staff"), enabled });

export const useSettings = () => useQuery(queries.settings());

/** Whether the voice agent is switched on (Settings → Voice agent). False
 * until known, so call buttons never flash in when it's off. */
export function useVoiceEnabled(): boolean {
  return useSettings().data?.voice_agent_enabled === true;
}

export const useVoiceStatus = () => {
  const enabled = useVoiceEnabled();
  return useQuery({
    queryKey: keys.voiceStatus,
    queryFn: () => api<{ online: boolean; enabled?: boolean }>("/api/voice/status"),
    refetchInterval: 30_000,
    retry: false,
    enabled, // no health checks while it's switched off
  });
};

export function useSetVoiceEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (voice_agent_enabled: boolean) =>
      api<AppSettings>("/api/settings", { method: "PATCH", body: { voice_agent_enabled } }),
    // The switch (and every call button) flips at once; undone on failure.
    onMutate: async (voice_agent_enabled) => {
      await qc.cancelQueries({ queryKey: keys.settings });
      const before = qc.getQueryData<AppSettings>(keys.settings);
      qc.setQueryData<AppSettings>(keys.settings, { ...before, voice_agent_enabled });
      return { before };
    },
    onSuccess: (settings) => {
      qc.setQueryData(keys.settings, settings);
      qc.invalidateQueries({ queryKey: keys.voiceStatus });
      toast.success(settings.voice_agent_enabled ? "Voice agent turned on" : "Voice agent turned off");
    },
    onError: (error, _on, context) => {
      if (context?.before) qc.setQueryData(keys.settings, context.before);
      toast.error(errorMessage(error));
    },
  });
}

export const fetchVoiceConfig = () => api<VoiceConfig>("/api/voice/config");

export const useServiceTypes = () => useQuery(queries.serviceTypes());

/** Active service type names in schedule order (built-in list until loaded). */
export function useServiceTypeNames(): string[] {
  const { data } = useServiceTypes();
  // Same array until the types change (callers may use it in deps or as data).
  return useMemo(() => {
    const names = data?.filter((t) => t.active).map((t) => t.name);
    return names?.length ? names : SERVICE_TYPES;
  }, [data]);
}

/** Days after the due date before a bike with this next service is overdue
 * (the service type's "Overdue after"; 0 when not set or unknown). */
export function useOverdueDays(serviceType: string | undefined): number {
  const { data } = useServiceTypes();
  return data?.find((t) => t.name === serviceType)?.overdue_days ?? 0;
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
  // Stable, so callbacks and context values built on it don't change every render.
  return useCallback(
    () =>
      Promise.all(
        ["stats", "customers", "customer", "vehicles", "due", "appointments", "calls", "service-types", "service-history"].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      ),
    [qc],
  );
}

/** An optimistic change: update cached lists straight away (so the screen
 * changes on click) and give back how to undo it if the server refuses. */
type Optimistic<TVars> = (qc: QueryClient, vars: TVars) => () => void;

/** Apply `change` to every cached copy of a list (e.g. all ["customers", q]),
 * returning an undo that puts the previous copies back. */
export function patchLists<T>(qc: QueryClient, key: readonly unknown[], change: (rows: T[]) => T[]): () => void {
  const before = qc.getQueriesData<T[]>({ queryKey: key });
  for (const [queryKey, rows] of before) if (Array.isArray(rows)) qc.setQueryData(queryKey, change(rows));
  return () => before.forEach(([queryKey, rows]) => qc.setQueryData(queryKey, rows));
}

function useCrmMutation<TVars>(
  fn: (vars: TVars) => Promise<{ message?: string; id?: number | string }>,
  options: { success?: string | ((vars: TVars) => string); optimistic?: Optimistic<TVars> } = {},
) {
  const qc = useQueryClient();
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars) => {
      if (!options.optimistic) return undefined;
      await qc.cancelQueries(); // a refetch in flight mustn't overwrite the change
      return { undo: options.optimistic(qc, vars) };
    },
    onSuccess: async (data, vars) => {
      await refresh();
      const success = typeof options.success === "function" ? options.success(vars) : options.success;
      toast.success(success ?? data?.message ?? "Saved");
    },
    onError: (error, _vars, context) => {
      context?.undo(); // put the screen back as it was
      toast.error(errorMessage(error));
    },
  });
}

export interface CustomerInput {
  name: string;
  mobile_number: string;
  alternate_mobile?: string | null; // "" removes it
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
  useCrmMutation((id: number) => api(`/api/customers/${id}`, { method: "DELETE" }), {
    optimistic: (qc, id) => patchLists<Customer>(qc, ["customers"], (rows) => rows.filter((c) => c.id !== id)),
  });

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
  alternate_mobile?: string | null; // only used when the sale creates the customer
}

export const useAddVehicle = () =>
  useCrmMutation((body: VehicleSaleInput) => api("/api/vehicles", { method: "POST", body }));

export const useUpdateVehicle = () =>
  useCrmMutation(({ id, ...body }: Partial<Omit<Vehicle, "id">> & { id: number }) =>
    api(`/api/vehicles/${id}`, { method: "PATCH", body }),
  );

export const useDeleteVehicle = () =>
  useCrmMutation((id: number) => api(`/api/vehicles/${id}`, { method: "DELETE" }), {
    optimistic: (qc, id) => patchLists<Vehicle>(qc, keys.vehicles, (rows) => rows.filter((v) => v.id !== id)),
  });

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
  useCrmMutation((id: string) => api(`/api/appointments/${id}/cancel`, { method: "POST" }), {
    optimistic: (qc, id) => patchLists<Appointment>(qc, keys.appointments, (rows) => rows.filter((a) => a.id !== id)),
  });

/** Fields read from a scanned job card (by Gemini, on the server). */
export interface ExtractedJobCard {
  job_card_no: string | null;
  job_type: string | null;
  registration_number: string | null;
  odometer_km: number | null;
  received_date: string | null;
  delivered_date: string | null;
  frame_number: string | null;
  engine_number: string | null;
  customer_requests: string | null;
  jobs_done: string[];
  other_work: string | null;
  parts: { part_no: string | null; name: string; qty: number; amount: number | null; warranty: boolean }[];
  labour: { description: string; amount: number | null }[];
  delivery_checks: string[];
  feedback: JobCardFeedback;
  technician: string | null;
  mechanic: string | null;
  supervisor: string | null;
  remarks: string | null;
  total_amount: number | null;
}

/** Read a job card PDF to pre-fill "Close service" (nothing is saved). */
export const useExtractJobCard = () =>
  useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("report", file, file.name);
      return apiUpload<ExtractedJobCard>("/api/job-card/extract", form);
    },
  });

/** Close a booking: the service details plus the service report PDF. */
export const useCloseService = () =>
  useCrmMutation(({ id, form }: { id: string; form: FormData }) =>
    apiUpload<{ message: string; id: number }>(`/api/appointments/${id}/close`, form),
    { success: "Service closed and recorded" },
  );

/** Admins: delete one call log entry (gone from the list at once). */
export const useDeleteCall = () =>
  useCrmMutation((id: number) => api(`/api/calls/${id}`, { method: "DELETE" }), {
    success: "Call deleted",
    optimistic: (qc, id) => patchLists<CallLog>(qc, keys.calls, (rows) => rows.filter((c) => c.id !== id)),
  });

/** Admins: delete every call, or only those with one outcome. */
export const useDeleteCalls = () =>
  useCrmMutation(
    (outcome: string | null) =>
      api<{ message: string; deleted: number }>("/api/calls", { method: "DELETE", query: { outcome: outcome ?? undefined } }),
    {
      optimistic: (qc, outcome) =>
        patchLists<CallLog>(qc, keys.calls, (rows) => (outcome ? rows.filter((c) => c.outcome !== outcome) : [])),
    },
  );

/** Edit a closed service's job card fields (a new PDF is optional). */
export const useUpdateServiceRecord = () =>
  useCrmMutation(({ id, form }: { id: number; form: FormData }) =>
    apiUpload<{ message: string }>(`/api/service-records/${id}`, form, "PATCH"),
    { success: "Service record updated" },
  );

/** Admins: delete a closed service; its booking opens again. */
export const useDeleteServiceRecord = () =>
  useCrmMutation((id: number) => api(`/api/service-records/${id}`, { method: "DELETE" }), {
    success: "Service deleted. Its booking is upcoming again.",
  });

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
  overdue_days?: number | null;
  active: boolean;
}

export const useCreateServiceType = () =>
  useCrmMutation((body: ServiceTypeInput) => api<{ message: string; id: number }>("/api/service-types", { method: "POST", body }));

export const useUpdateServiceType = () =>
  useCrmMutation(
    ({ id, ...body }: Partial<ServiceTypeInput> & { id: number }) => api(`/api/service-types/${id}`, { method: "PATCH", body }),
    {
      optimistic: (qc, { id, ...body }) =>
        patchLists<ServiceType>(qc, keys.serviceTypes, (rows) => rows.map((t) => (t.id === id ? { ...t, ...body } : t))),
    },
  );

export const useDeleteServiceType = () =>
  useCrmMutation((id: number) => api(`/api/service-types/${id}`, { method: "DELETE" }), {
    optimistic: (qc, id) => patchLists<ServiceType>(qc, keys.serviceTypes, (rows) => rows.filter((t) => t.id !== id)),
  });

export function useMoveServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "up" | "down" }) =>
      api(`/api/service-types/${id}/move`, { method: "POST", query: { direction } }),
    // Swap the rows on screen at once; the server's order replaces it after.
    onMutate: async ({ id, direction }) => {
      await qc.cancelQueries({ queryKey: keys.serviceTypes });
      return {
        undo: patchLists<ServiceType>(qc, keys.serviceTypes, (rows) => {
          const i = rows.findIndex((t) => t.id === id);
          const j = direction === "up" ? i - 1 : i + 1;
          if (i < 0 || j < 0 || j >= rows.length) return rows;
          const next = [...rows];
          [next[i], next[j]] = [next[j], next[i]];
          return next;
        }),
      };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.serviceTypes }),
    onError: (error, _vars, context) => {
      context?.undo();
      toast.error(errorMessage(error));
    },
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
