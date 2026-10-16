import { cleanup, fireEvent, render } from "@testing-library/react";
import { expect, it } from "vitest";
import { BorrowerInformationContent as Baseline } from "./BorrowerInformationBaseline";
import { BorrowerInformationContent as Candidate } from "@/components/loan/BorrowerInformationContent";

function trace(Component: typeof Baseline) {
  const snapshots: string[] = [];
  let view = render(<Component />);
  const capture = () => snapshots.push(view.container.innerHTML);
  const click = (id: string) => fireEvent.click(view.getByTestId(id.replace(/^personal-/, "borrower-info-")));
  const change = (id: string, value: string) =>
    fireEvent.change(view.getByTestId(id), { target: { value } });
  const staticNode = view.getByTestId("section-declarations");
  capture();
  for (const borrower of ["richard", "jane"]) {
    click(`tab-borrower-${borrower}`);
    capture();
    click("personal-button-edit");
    capture();
    const input = view.getByTestId("input-first-name");
    input.focus();
    change("input-first-name", `Synthetic ${borrower}`);
    expect(view.getByTestId("input-first-name")).toBe(input);
    expect(document.activeElement).toBe(input);
    change("input-dob", "2000-02-29");
    change("input-email", "not an email");
    change("input-dependents", "");
    capture();
    expect(view.getByTestId("section-declarations")).toBe(staticNode);
    for (const control of view.container.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
      expect(control).toBeDisabled();
    }
    expect(view.getByTestId("field-eth-other-text")).toHaveTextContent("$");
  }
  for (const borrower of ["richard", "jane"]) {
    click(`tab-borrower-${borrower}`);
    capture();
    click("personal-button-save");
    capture();
    click("personal-button-edit");
    change("input-first-name", "discard this");
    change("input-dob", "");
    click("personal-button-discard");
    capture();
    expect(view.getByTestId("field-first-name")).toHaveTextContent(`Synthetic ${borrower}`);
    expect(view.getByTestId("text-borrower-name")).not.toHaveTextContent("Synthetic");
  }
  view.unmount();
  view = render(<Component />);
  capture();
  expect(view.getByTestId("field-first-name")).toHaveTextContent("Richard");
  expect(localStorage.length).toBe(0);
  cleanup();
  return snapshots;
}

it("matches the full baseline DOM through both borrowers' independent edit/save/discard and remount states", () => {
  expect(trace(Candidate)).toEqual(trace(Baseline));
});
