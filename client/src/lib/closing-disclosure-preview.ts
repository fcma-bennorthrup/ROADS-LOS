import { loadClosingDisclosureHistory, type ClosingDisclosureRecord } from "./closing-disclosure-history";
import { assumedDeliveryCalendarDate, formatCalendarDate, localCalendarDate } from "./closing-disclosure-borrowers";

export function formatDisclosureDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

/** A read-only simulation snapshot, never a borrower-view event or real lending document. */
export function openClosingDisclosurePreview(loanId: string, selected: ClosingDisclosureRecord): void {
  const record = loadClosingDisclosureHistory(loanId).records.find(
    (item) => item.id === selected.id && item.generatedAt === selected.generatedAt,
  );
  if (!record) throw new Error("This disclosure was reset or removed. Refresh the page to see current disclosures.");
  // Keep a handle to detect blocked popups and populate a self-contained document.
  // Immediately sever opener access; no external content or scripts are loaded.
  const preview = window.open("", "_blank");
  if (!preview) throw new Error("The disclosure preview was blocked. Allow pop-ups for this site and try again.");
  try {
    preview.opener = null;
    const doc = preview.document;
    doc.title = `Simulated Closing Disclosure — CD ${record.id}`;
    doc.documentElement.lang = "en";
    const viewport = doc.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1";
    const style = doc.createElement("style");
    style.textContent = `
      *{box-sizing:border-box}body{margin:0;background:#f4f6f6;color:#273333;font:16px/1.5 Arial,sans-serif}
      main{max-width:800px;margin:40px auto;padding:40px;background:white;border:1px solid #dce1e1;border-radius:8px}
      .brand{color:#006a94;font-weight:700;letter-spacing:2px}h1{font-size:28px;margin:20px 0 8px}
      .notice{background:#fff4cc;padding:16px;border-radius:4px}
      dl{display:grid;grid-template-columns:minmax(130px,1fr) 2fr;gap:16px;margin-top:32px}
      dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}footer{margin-top:32px;color:#566565;font-size:14px}
      @media(max-width:600px){main{margin:16px;padding:20px}dl{grid-template-columns:1fr;gap:8px}dd{margin-bottom:12px}}
      @media print{body{background:white}main{border:0;margin:0}}`;
    doc.head.append(viewport, style);
    const main = doc.createElement("main");
    const add = (tag: string, text: string, className?: string) => {
      const element = doc.createElement(tag);
      element.textContent = text;
      if (className) element.className = className;
      main.append(element);
      return element;
    };
    add("div", "ROADS", "brand");
    add("h1", "Closing Disclosure");
    add("p", "SIMULATION ONLY — Not an actual lending document.", "notice");
    add("p", "This preview represents the selected disclosure in the prototype. It does not contain actual loan terms or fees.");
    const list = add("dl", "");
    const fields = [
      ["Document", `CD ${record.id}`],
      ["Loan reference", loanId],
      ["Date Generated", formatDisclosureDate(record.generatedAt)],
      ["Delivery Date", record.deliveredAt ? formatDisclosureDate(record.deliveredAt) : "Not delivered"],
      ["Delivery Method", record.deliveredAt ? "Blend" : "Not delivered"],
      ["Assumed Delivery Date", record.deliveredAt
        ? formatCalendarDate(assumedDeliveryCalendarDate(localCalendarDate(new Date(record.deliveredAt))))
        : "Not delivered"],
    ];
    for (const [label, value] of fields) {
      const term = doc.createElement("dt");
      const detail = doc.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      list.append(term, detail);
    }
    add("footer", "Opening this staff preview does not record borrower viewing or send any documents. This is a snapshot taken when the preview was opened.");
    doc.body.replaceChildren(main);
  } catch {
    preview.close();
    throw new Error("The disclosure preview could not be opened. Please try again.");
  }
}
