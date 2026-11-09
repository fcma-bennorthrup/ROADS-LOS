import { afterEach, expect, it, vi } from "vitest";
import type { LoanApplication } from "@shared/loan-application";
import { applicationStore } from "../loan-application-store";
import { drainLoanBeforeLeave } from "@/hooks/use-leave-loan";

afterEach(() => vi.unstubAllGlobals());
const state = (): LoanApplication => ({
  loan: { id: "queue-test", stage: "Loan Setup" } as LoanApplication["loan"],
  borrowers: [], sections: {}, mode: "empty", generation: 0, revision: 0,
});
it("serializes stage with saves on either side and preserves drafts/optimistic sections", async () => {
  const server = state(); applicationStore.install(structuredClone(server));
  let release!: () => void;
  let started!: () => void;
  const stageStarted = new Promise<void>(resolve => { started = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    requests.push(url);
    const payload = JSON.parse(String(options.body));
    expect(payload.revision).toBe(server.revision);
    if (url.endsWith("/stage")) { started(); await held; server.loan.stage = payload.stage; }
    else server.sections[payload.section] = payload.value;
    server.revision++;
    return new Response(JSON.stringify(server));
  }));
  applicationStore.markDraft("open-form", true);
  applicationStore.write("first", "saved");
  const stage = applicationStore.changeStage("Decisioning");
  await stageStarted;
  applicationStore.write("second", "optimistic");
  release();
  await stage; await applicationStore.flush();
  expect(requests.map(url => url.endsWith("/stage") ? "stage" : "save")).toEqual(["save", "stage", "save"]);
  expect(applicationStore.document).toMatchObject({ loan: { stage: "Decisioning" }, sections: { first: "saved", second: "optimistic" }, revision: 3 });
  expect(applicationStore.dirty).toBe(true);
});
it("confirms drafts, drains writes queued during leave, and surfaces failures", async () => {
  applicationStore.install(state());
  applicationStore.markDraft("draft", true);
  expect(await drainLoanBeforeLeave(() => false)).toBe(false);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const server = state();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    await held;
    const payload = JSON.parse(String(options.body));
    server.sections[payload.section] = payload.value; server.revision++;
    return new Response(JSON.stringify(server));
  }));
  applicationStore.write("one", 1);
  const leaving = drainLoanBeforeLeave(() => true);
  applicationStore.write("two", 2);
  release();
  expect(await leaving).toBe(true);
  expect(applicationStore.pending).toBe(0);
  expect(applicationStore.document?.sections.two).toBe(2);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Save unavailable" }), { status: 503 })));
  applicationStore.write("three", 3);
  await expect(drainLoanBeforeLeave(() => true)).rejects.toThrow("Save unavailable");
});
it("ignores an old in-flight response after installing another loan", async () => {
  applicationStore.install(state());
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  vi.stubGlobal("fetch", vi.fn(async () => { await held; return new Response(JSON.stringify({ ...state(), revision: 1 })); }));
  applicationStore.write("old", true);
  await Promise.resolve();
  const next = state(); next.loan.id = "next-loan"; applicationStore.install(next);
  release(); await applicationStore.flush();
  expect(applicationStore.document?.loan.id).toBe("next-loan");
  expect(applicationStore.error).toBe("");
});
