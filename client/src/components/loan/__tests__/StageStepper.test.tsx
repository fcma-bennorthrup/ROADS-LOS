import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StageStepper } from "../LoanHeader";

vi.mock("@/components/GitHubSyncPanel", () => ({ GitHubSyncPanel: () => null }));
afterEach(cleanup);

it("moves one stage at a time with the endpoint chevrons and stops at both ends", () => {
  const { container } = render(<StageStepper initialStep={2} />);
  const active = () => container.querySelector('[aria-current="step"]')?.textContent;
  const back = screen.getByRole("button", { name: "Move loan stage backward" });
  const forward = screen.getByRole("button", { name: "Move loan stage forward" });
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(active()).toBe("Loan Setup");
  fireEvent.click(forward);
  expect(active()).toBe("Decisioning");
  fireEvent.click(back);
  expect(active()).toBe("Loan Setup");
  for (let i = 0; i < 10; i++) fireEvent.click(back);
  expect(active()).toBe("Customer Application");
  expect(back).toHaveAttribute("aria-disabled", "true");
  for (let i = 0; i < 10; i++) fireEvent.click(forward);
  expect(active()).toBe("Loan Certification");
  expect(forward).toHaveAttribute("aria-disabled", "true");
});

it("does not retain demo stage changes after remounting", () => {
  const first = render(<StageStepper initialStep={0} />);
  fireEvent.click(screen.getByRole("button", { name: "Move loan stage forward" }));
  first.unmount();
  const second = render(<StageStepper initialStep={0} />);
  expect(second.container.querySelector('[aria-current="step"]')).toHaveTextContent("Customer Application");
});
