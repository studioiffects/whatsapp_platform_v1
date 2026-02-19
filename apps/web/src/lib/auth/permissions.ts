import { AppRole } from "../types/auth";

export function canManageTechnical(role: AppRole): boolean {
  return role === "ADMIN_TECH";
}

export function canRunReports(role: AppRole): boolean {
  return role === "ADMIN_TECH" || role === "SUPERVISOR";
}

export function canRunBackups(role: AppRole): boolean {
  return role === "ADMIN_TECH" || role === "SUPERVISOR";
}

export function canSeeMcp(role: AppRole): boolean {
  return role === "ADMIN_TECH" || role === "SUPERVISOR";
}
