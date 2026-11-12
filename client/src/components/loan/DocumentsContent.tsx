import { useClosingDisclosures } from "@/hooks/use-closing-disclosures";
import { useClosingPackage } from "@/hooks/use-closing-package";
import { useState } from "react";
import { ClosingDocumentIcon } from "./ClosingDocumentIcon";
import { assumedDeliveryCalendarDate, formatCalendarDate, localCalendarDate, type DisclosureBorrower } from "@/lib/closing-disclosure-borrowers";
import { formatDisclosureDate, openClosingDisclosurePreview } from "@/lib/closing-disclosure-preview";
import { latestDeliveredDisclosure, type ClosingDisclosureRecord } from "@/lib/closing-disclosure-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentSection, DocumentsContent } from "./DisclosureDocumentsContent";
import "./ClosingDocumentsContent.css";

type ClosingDocumentsContentProps = {
  loanId?: string;
  borrowers?: DisclosureBorrower[];
};

function ClosingDocumentsLoan({ loanId, borrowers }: { loanId: string; borrowers: DisclosureBorrower[] }) {
  const [activeTab, setActiveTab] = useState("closing-disclosure");
  const [previewError, setPreviewError] = useState("");
  const closingPackage = useClosingPackage(loanId);
  const { records, generating, resetting, error, generate, deliver } = useClosingDisclosures(loanId);
  const newestRecord = records[0];
  const latestDelivered = latestDeliveredDisclosure(records);
  const canDeliverNewest = Boolean(newestRecord && !newestRecord.deliveredAt && !error && !resetting);

  const preview = (record: ClosingDisclosureRecord) => {
    setPreviewError("");
    try {
      openClosingDisclosurePreview(loanId, record);
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : "Closing Disclosure preview could not be opened. Please try again.");
    }
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
            {previewError && (
              <p className="body-200 closing-disclosure-error" role="alert" data-testid="alert-closing-disclosure-preview-error">
                {previewError}
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
                    <th scope="col">Date Generated</th>
                    <th scope="col">Delivery Date</th>
                    <th scope="col">Delivery Method</th>
                    <th scope="col">Assumed Delivery Date</th>
                    <th scope="col">CD Viewed</th>
                    <th scope="col" aria-label="Delivery tracking" />
                    <th scope="col" aria-label="Document preview" />
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
                        <td>{formatDisclosureDate(record.generatedAt)}</td>
                        <td data-testid={`text-delivery-date-${record.id}`}>
                          {record.deliveredAt ? formatDisclosureDate(record.deliveredAt) : ""}
                        </td>
                        <td data-testid={`text-delivery-method-${record.id}`}>
                          {record.deliveredAt ? "Blend" : ""}
                        </td>
                        <td data-testid={`text-assumed-delivery-date-${record.id}`}>
                          {record.deliveredAt ? formatCalendarDate(assumedDeliveryCalendarDate(localCalendarDate(new Date(record.deliveredAt)))) : ""}
                        </td>
                        <td data-testid={`status-cd-viewed-${record.id}`}>
                          {record.deliveredAt && (record.viewedAt || record.id === latestDelivered?.id) && (
                            <span className={`closing-disclosure-status${record.viewedAt ? " is-complete" : ""}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {record.viewedAt ? <path d="m5 12 4 4L19 6" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" /></>}
                              </svg>
                              {record.viewedAt ? "Complete" : "Needed"}
                            </span>
                          )}
                        </td>
                        <td className="closing-disclosure-icon-cell">
                          {record.deliveredAt && (record.viewedAt || record.id === latestDelivered?.id) && (
                            <span className="closing-disclosure-inert-icon" aria-label="Delivery tracking">
                              <ClosingDocumentIcon kind="clock" />
                            </span>
                          )}
                        </td>
                        <td className="closing-disclosure-icon-cell">
                          <button
                            type="button"
                            className="closing-disclosure-icon-button"
                            aria-label={`View Closing Disclosure CD ${record.id}`}
                            onClick={() => preview(record)}
                            data-testid={`button-view-closing-disclosure-${record.id}`}
                          >
                            <ClosingDocumentIcon kind="file" />
                          </button>
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
                onClick: () => { /* PDF previews retired; retain the prototype control. */ },
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

const DOCUMENTS_NAV_ITEMS = ["Disclosures", "Closing Documents", "Customer Documents"];

export { DOCUMENTS_NAV_ITEMS, ClosingDocumentsContent, DocumentsContent };