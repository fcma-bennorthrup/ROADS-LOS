import { useClosingDisclosures } from "@/hooks/use-closing-disclosures";
import { useClosingPackage } from "@/hooks/use-closing-package";
import { useState } from "react";
import sampleClosingDisclosurePdf from "@assets/SampleCD_1776881551872.pdf";
import sampleClosingPackagePdf from "@assets/Redacted-ClosingPackage_Redacted_1776881993129.pdf";
import { ClosingDocumentIcon } from "./ClosingDocumentIcon";
import { ClosingDisclosureBorrowerEditor } from "./ClosingDisclosureBorrowerEditor";
import { ClosingDisclosureBorrowerCells } from "./ClosingDisclosureBorrowerCells";
import type { DisclosureBorrower } from "@/lib/closing-disclosure-borrowers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentSection, DocumentsContent } from "./DisclosureDocumentsContent";
import "./ClosingDocumentsContent.css";

type ClosingDocumentsContentProps = {
  loanId?: string;
  borrowers?: DisclosureBorrower[];
};

function formatDisclosureDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ClosingDocumentsLoan({ loanId, borrowers }: { loanId: string; borrowers: DisclosureBorrower[] }) {
  const [activeTab, setActiveTab] = useState("closing-disclosure");
  const closingPackage = useClosingPackage(loanId);
  const { records, generating, resetting, error, generate, deliver, reset } = useClosingDisclosures(loanId);
  const newestRecord = records[0];
  const canDeliverNewest = Boolean(newestRecord && !newestRecord.deliveredAt && !error && !resetting);

  const confirmReset = () => {
    if (window.confirm(
      "Reset Closing Disclosure? This will clear all generated Closing Disclosure rows and their delivery timestamps for this loan and cancel any generation in progress. Closing Package and other demo progress will not be changed.",
    )) reset();
  };

  return (
    <div className="closing-documents-content" data-testid="closing-documents-content">
      <h1 className="headline-200 closing-documents-heading" data-testid="text-closing-documents-title">
        Closing Documents
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="closing-documents-tabs">
        <TabsList
          aria-label="Closing document types"
          className="closing-documents-tab-list"
        >
          <TabsTrigger className="label-strong closing-documents-tab" value="closing-disclosure">
            Closing Disclosure
          </TabsTrigger>
          <TabsTrigger className="label-strong closing-documents-tab" value="closing-package">
            Closing Package
          </TabsTrigger>
        </TabsList>

        <TabsContent value="closing-disclosure" forceMount hidden={activeTab !== "closing-disclosure"} className="closing-documents-panel">
          <div className="closing-disclosure-toolbar">
            <button
              type="button"
              onClick={generate}
              disabled={generating || resetting || Boolean(error)}
              className="label-strong closing-documents-button closing-documents-button-primary"
              data-testid="button-generate-closing-disclosure"
            >
              Generate Closing Disclosure
            </button>
            <button
              type="button"
              onClick={() => newestRecord && deliver(newestRecord.id, borrowers)}
              disabled={!canDeliverNewest}
              className="label-strong closing-documents-button"
              data-testid="button-deliver-closing-disclosure"
            >
              Deliver Closing Disclosure
            </button>
            <button
              type="button"
              onClick={confirmReset}
              disabled={resetting}
              className="label-strong closing-documents-button"
              data-testid="button-reset-closing-disclosure"
            >
              Reset Closing Disclosure
            </button>
          </div>

          <div className="closing-disclosure-feedback" aria-live="polite">
            {resetting && <p className="body-200">Resetting Closing Disclosure.</p>}
            {generating && (
              <p className="body-200" data-testid="status-closing-disclosure-generating">
                Generating Closing Disclosure. This may take a few seconds.
              </p>
            )}
            {error && (
              <p className="body-200 closing-disclosure-error" role="alert" data-testid="alert-closing-disclosure-error">
                {error}
              </p>
            )}
          </div>

          <section className="closing-disclosure-history" aria-labelledby="closing-disclosure-history-title">
            <h2
              id="closing-disclosure-history-title"
              className="headline-200 closing-disclosure-history-title"
            >
              Closing Disclosure
            </h2>
            <div className="closing-disclosure-table-scroll" tabIndex={0}
              role="region" aria-label="Closing Disclosure history, scroll horizontally for all columns">
              <table className="closing-disclosure-table">
                <thead>
                  <tr>
                    <th scope="col">Document ID</th>
                    <th scope="col">Date Generated</th>
                    <th scope="col">Delivery Date</th>
                    <th scope="col">Assumed Delivery Date</th>
                    <th scope="col">Delivery Method</th>
                    <th scope="col">CD Viewed</th>
                    <th scope="col" aria-label="Document actions" />
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td className="closing-disclosure-empty" colSpan={7} data-testid="text-closing-disclosure-empty">
                        {generating
                          ? "Your new disclosure will appear here when generation is complete."
                          : "No Closing Disclosures have been generated"}
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} data-testid={`row-closing-disclosure-${record.id}`}>
                        <td>CD {record.id}</td>
                        <td>{formatDisclosureDate(record.generatedAt)}</td>
                        <ClosingDisclosureBorrowerCells
                          loanId={loanId}
                          record={record}
                          borrowers={borrowers}
                          deliveryFallback={record.deliveredAt ? formatDisclosureDate(record.deliveredAt) : ""}
                        />
                        <td>
                          <div className="closing-disclosure-row-actions">
                            <button
                              type="button"
                              className="closing-disclosure-icon-button"
                              aria-label={`View Closing Disclosure CD ${record.id}`}
                              onClick={() =>
                                window.open(sampleClosingDisclosurePdf, "_blank", "noopener,noreferrer")
                              }
                              data-testid={`button-view-closing-disclosure-${record.id}`}
                            >
                              <ClosingDocumentIcon kind="file" />
                            </button>
                            <span className="closing-disclosure-inert-icon" aria-hidden="true" title="History">
                              <ClosingDocumentIcon kind="clock" />
                            </span>
                            <ClosingDisclosureBorrowerEditor loanId={loanId} record={record} borrowers={borrowers} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="caption-100 closing-disclosure-prototype-note">
              Delivery is marked for prototype tracking only; no documents are sent.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="closing-package" forceMount hidden={activeTab !== "closing-package"} className="closing-documents-panel">
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
            retainedProgress={closingPackage}
          />
          <p className="caption-100 closing-disclosure-prototype-note">
            Delivery is marked for prototype tracking only; no documents are sent.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClosingDocumentsContent({ loanId = "prototype", borrowers = [] }: ClosingDocumentsContentProps) {
  return <ClosingDocumentsLoan key={loanId} loanId={loanId} borrowers={borrowers} />;
}

const DOCUMENTS_NAV_ITEMS = ["Disclosures", "Closing Documents"];

export { DOCUMENTS_NAV_ITEMS, ClosingDocumentsContent, DocumentsContent };