"use client";

// Form dialogs, code-split: each loads the first time it's opened. Callers
// also mount them only while open (`{open && <XDialog open … />}`), so long
// tables don't keep a hidden dialog per row.
import dynamic from "next/dynamic";

export const CustomerDialog = dynamic(() => import("./customer-dialog").then((m) => m.CustomerDialog), { ssr: false });
export const VehicleDialog = dynamic(() => import("./vehicle-dialog").then((m) => m.VehicleDialog), { ssr: false });
export const AppointmentDialog = dynamic(() => import("./appointment-dialog").then((m) => m.AppointmentDialog), { ssr: false });
export const CloseServiceDialog = dynamic(() => import("./close-service-dialog").then((m) => m.CloseServiceDialog), { ssr: false });
export const LogCallDialog = dynamic(() => import("./log-call-dialog").then((m) => m.LogCallDialog), { ssr: false });
export const StaffCategoriesDialog = dynamic(() => import("./staff-categories-dialog").then((m) => m.StaffCategoriesDialog), { ssr: false });
export const ShowroomStaffDialog = dynamic(() => import("./showroom-staff-dialog").then((m) => m.ShowroomStaffDialog), { ssr: false });
export const ServiceTypeDialog = dynamic(() => import("./service-type-dialog").then((m) => m.ServiceTypeDialog), { ssr: false });
