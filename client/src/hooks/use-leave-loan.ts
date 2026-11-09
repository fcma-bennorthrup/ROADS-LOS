import { useState } from "react";
import { useLocation } from "wouter";
import { applicationStore } from "@/lib/loan-application-store";

export async function drainLoanBeforeLeave(confirm: (message: string) => boolean = window.confirm.bind(window)) {
  if (applicationStore.dirty && !confirm("Discard unsaved edits and return to Pipeline?")) return false;
  await applicationStore.flush();
  return true;
}

export function useLeaveLoan() {
  const [, navigate] = useLocation();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  async function leave() {
    if (leaving) return;
    setLeaving(true); setError("");
    try {
      if (await drainLoanBeforeLeave()) navigate("~/pipeline");
    } catch (error) {
      setError(`Could not leave: ${(error as Error).message}. Your loan is still open; resolve the save error before leaving.`);
    } finally { setLeaving(false); }
  }
  return { leave, leaving, error };
}
