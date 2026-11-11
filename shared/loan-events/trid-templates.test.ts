import { expect, it } from "vitest";
import { tridDemoSections } from "./trid-templates";

it("matches the original browser-built Trigger TRID templates exactly", () => {
  for (const id of ["trid-parity-one", "trid-parity-two"]) {
    // Snapshot captured from the old browser builder after exact parity passed.
    expect(tridDemoSections(id)).toMatchSnapshot();
  }
});
