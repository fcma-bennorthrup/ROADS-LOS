import { useApplicationStatus } from "@/contexts/loan-application-context";
import { feeCircumstancesSchema, FEE_CIRCUMSTANCES_KEY } from "@shared/fee-circumstances";
import { ChangeCircumstanceDialog } from "./ChangeCircumstanceDialog";
import { useState } from "react";

export function LoanCircumstanceViewer({ onClose }: { onClose: () => void }) {
  const store = useApplicationStatus();
  const [selectedId, setSelectedId] = useState("");
  const parsed = feeCircumstancesSchema.safeParse(store.document?.sections[FEE_CIRCUMSTANCES_KEY]);
  const records = parsed.success ? parsed.data.records : [];
  const record = records.find(entry => entry.id === selectedId) ?? records.at(-1);
  return record ? <ChangeCircumstanceDialog record={record} records={records} onSelectRecord={setSelectedId} onClose={onClose} /> : null;
}
