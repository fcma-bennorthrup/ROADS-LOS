import { afterEach, describe, expect, it, vi } from "vitest";
import { applicationStore } from "../loan-application-store";
import { applicationView, emptyFields, type LoanApplication } from "@shared/loan-application";
import { act, renderHook } from "@testing-library/react";
import { useLoanDraft } from "@/contexts/loan-application-context";
import { blendDemoSections } from "@shared/loan-events/test-fixtures";
import { tridDemoSections } from "@shared/loan-events/trid-templates";

function fixture(mode: LoanApplication["mode"] = "existing"): LoanApplication {
  return { mode, generation: 1, revision: 0, sections: {},
    loan: { id: "test-loan", primaryBorrowerName: "Before", financedFees: "0" } as LoanApplication["loan"],
    borrowers: [{ id: "first", loanId: "test-loan", name: "Before", email: "", phone: "", isPrimary: true }],
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("loan application persistence", () => {
  it("clears data values while preserving structural identifiers", () => {
    expect(emptyFields({ id: "slot", name: "Sample", amount: 20, selected: true, rows: [{ a: 1 }] }))
      .toEqual({ id: "slot", name: "", amount: 0, selected: false, rows: [] });
  });
  it("starts empty forms without repopulating sample values", () => {
    applicationStore.install(fixture("empty"));
    expect(applicationStore.read("form", { name: "Sample", amount: "100" })).toEqual({ name: "", amount: "" });
    expect(applicationStore.read("income", [1], [])).toEqual([]);
  });
  it("keeps monthly costs blank in empty loans and Blend imports", () => {
    applicationStore.install(fixture("empty"));
    const fields = { address1: "Prototype address", monthlyPropertyTaxes: "", monthlyInsurance: "" };
    expect(applicationStore.read("subject-property", fields)).toEqual({
      address1: "", monthlyPropertyTaxes: "", monthlyInsurance: "",
    });
    for (const sections of [blendDemoSections("test-loan"), tridDemoSections("test-loan")]) {
      const state = fixture("blend");
      state.sections = sections;
      applicationStore.install(state);
      expect(applicationStore.read("subject-property", fields)).toMatchObject({
        monthlyPropertyTaxes: "", monthlyInsurance: "",
      });
    }
  });
  it("commits monthly property costs through useLoanDraft and persists explicit clearing", async () => {
    const state = fixture("empty");
    applicationStore.install(state);
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(String(options.body));
      state.sections[payload.section] = payload.value;
      state.revision++;
      return new Response(JSON.stringify(state));
    });
    vi.stubGlobal("fetch", fetchMock);
    const fields = { monthlyPropertyTaxes: "", monthlyInsurance: "" };
    const { result, unmount } = renderHook(() => useLoanDraft("subject-property", fields));
    act(() => result.current[1]({ monthlyPropertyTaxes: "125.50", monthlyInsurance: "0" }));
    expect(applicationStore.document?.sections["subject-property"]).toBeUndefined();
    act(() => result.current[2]());
    await applicationStore.flush();
    expect(applicationStore.document?.sections["subject-property"]).toEqual({
      monthlyPropertyTaxes: "125.50", monthlyInsurance: "0",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).baseline).toEqual(fields);
    act(() => result.current[1](fields));
    act(() => result.current[2]());
    await applicationStore.flush();
    expect(applicationStore.document?.sections["subject-property"]).toEqual(fields);
    unmount();
  });
  it("imports application values but not workflow outcomes", () => {
    applicationStore.install(fixture("blend"));
    expect(applicationStore.read("name", "Sample")).toBe("Sample");
    expect(applicationStore.read("evaluation", "450000", "", false)).toBe("");
  });
  it("serializes updates against the acknowledged database revision", async () => {
    const state = fixture();
    applicationStore.install(state);
    const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(String(options.body));
      expect(payload.revision).toBe(state.revision);
      state.revision++;
      state.sections[payload.section] = payload.value;
      return new Response(JSON.stringify(state));
    });
    vi.stubGlobal("fetch", fetchMock);
    applicationStore.write("first", "one");
    applicationStore.write("second", "two");
    await applicationStore.flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(applicationStore.document?.sections).toMatchObject({ first: "one", second: "two" });
    expect(applicationStore.document?.revision).toBe(2);
  });
  it("does not send duplicate unchanged values", async () => {
    const state = fixture(); state.sections["field"] = "saved";
    applicationStore.install(state);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    applicationStore.write("field", "saved");
    await applicationStore.flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reports stale-save errors and stops queued writes", async () => {
    applicationStore.install(fixture());
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "Loan changed" }), { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);
    applicationStore.write("one", 1); applicationStore.write("two", 2);
    await expect(applicationStore.flush()).rejects.toThrow("Loan changed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(applicationStore.error).toBe("Loan changed");
  });
  it("projects saved borrower and requested amount into the loan header", () => {
    const state = fixture();
    state.sections["borrower-primary"] = { firstName: "Alex", lastName: "Demo", phone: "", email: "" };
    state.sections["loan-details"] = { loanType: "purchase", requestedLoanAmount: "$222,000.00" };
    expect(applicationView(state)).toMatchObject({ primaryBorrowerName: "Alex Demo", amountRequested: "222000", loanType: "Purchase" });
  });
});
