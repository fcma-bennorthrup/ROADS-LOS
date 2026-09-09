import sampleClosingDisclosurePdf from "@assets/SampleCD_1776881551872.pdf";
import sampleClosingPackagePdf from "@assets/Redacted-ClosingPackage_Redacted_1776881993129.pdf";
import { DocumentSection, DocumentsContent } from "./DisclosureDocumentsContent";

function ClosingDocumentsContent() {
  return (
    <div
      className="flex flex-col"
      style={{
        padding: "var(--roads-spacing-component-xl)",
        gap: "var(--roads-spacing-component-xl)",
      }}
      data-testid="closing-documents-content"
    >
      <DocumentSection
        title="Closing Disclosure"
        idleText="No Closing Disclosures have been generated"
        generatingText="Generating Closing Disclosure"
        generateLabel="Generate Closing Disclosure"
        secondaryActions={[
          {
            label: "View Closing Disclosure",
            onClick: () =>
              window.open(sampleClosingDisclosurePdf, "_blank", "noopener,noreferrer"),
          },
          {
            label: "Deliver Closing Disclosure",
            onClick: () => {},
            marksDelivered: true,
          },
        ]}
        testIdPrefix="closing-disclosure"
      />

      <DocumentSection
        title="Closing Package"
        idleText="No Closing Packages have been generated"
        generatingText="Generating Closing Package"
        generateLabel="Generate Closing Package"
        secondaryActions={[
          {
            label: "View Closing Package",
            onClick: () =>
              window.open(sampleClosingPackagePdf, "_blank", "noopener,noreferrer"),
          },
          {
            label: "Deliver Closing Package",
            onClick: () => {},
            marksDelivered: true,
          },
        ]}
        testIdPrefix="closing-package"
      />
    </div>
  );
}

const DOCUMENTS_NAV_ITEMS = [
  "Disclosures",
  "Closing Documents",
];

export { DOCUMENTS_NAV_ITEMS, ClosingDocumentsContent, DocumentsContent };
