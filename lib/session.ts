// The signed-in staff member's token, kept in this browser.
import { clearAllDrafts } from "./drafts";
import type { StaffUser } from "./types";

const TOKEN_KEY = "am-crm.token";
const USER_KEY = "am-crm.user";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): StaffUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: StaffUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable: the session lasts for this page only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  clearAllDrafts(); // unsaved forms can hold customer details
}
