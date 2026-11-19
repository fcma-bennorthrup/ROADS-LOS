import { useState } from "react";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { useLoanEditing, useLoanState } from "@/contexts/loan-application-context";
import { applicationStore } from "@/lib/loan-application-store";
import { CONTACT_ROLES, contactFields, contactName, type LoanContact } from "@shared/loan-contacts";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./LoanContactsContent.css";

export function LoanContactsContent() {
  const [contacts, setContacts] = useLoanState<LoanContact[]>("loan-contacts", [], []);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [draft, setDraft] = useState<LoanContact | null>(null);
  const [original, setOriginal] = useState("");
  const [deleting, setDeleting] = useState<LoanContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [message, setMessage] = useState("");
  useLoanEditing("loan-contact-editor", !!draft && JSON.stringify(draft) !== original);
  const filtered = contacts.filter(c => (!role || c.role === role) && Object.values(c).join(" ").toLowerCase().includes(query.toLowerCase().trim()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  function edit(contact: LoanContact) {
    setDraft({ ...contact }); setOriginal(JSON.stringify(contact)); setError(""); setMessage("");
  }
  function close() {
    if (busy) return;
    if (draft && JSON.stringify(draft) !== original && !window.confirm("Discard unsaved contact changes?")) return;
    setDraft(null); setError("");
  }
  async function persist(next: LoanContact[], message: string) {
    setBusy(true); setError("");
    try {
      setContacts(next);
      await applicationStore.flush();
      setDraft(null); setDeleting(null); setMessage(message);
    } catch (e) {
      setError((e as Error).message || "Could not save contacts. Your changes have not been confirmed.");
    } finally { setBusy(false); }
  }
  const seller = draft?.role === "Seller";
  const fields = contactFields.filter(([key]) => seller
    ? ["name", "street", "city", "state", "zip"].includes(key)
    : key !== "name");
  return <div className="loan-contacts">
    <section className="contacts-table">
      <header>
        <h2 className="headline-200">Loan Contacts</h2>
        <div className="contacts-tools">
          <label className="contacts-search"><Search size={16} /><input aria-label="Filter contacts" placeholder="Type to filter results" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></label>
          <select aria-label="Filter by contact type" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value="">All contact types</option>{CONTACT_ROLES.map(r => <option key={r}>{r}</option>)}</select>
          <button className="contacts-primary" onClick={() => edit({ id: crypto.randomUUID(), role: "Seller" })}><Plus size={16} />Add Contact</button>
        </div>
      </header>
      {message && <p role="status" className="contacts-feedback">{message}</p>}
      <div className="contacts-scroll"><table>
        <thead><tr>{["Name", "Contact Type", "Company", "Email / Phone", "Actions"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(c => <tr key={c.id}>
          <td><strong>{contactName(c)}</strong><small>{[c.city, c.state].filter(Boolean).join(", ")}</small></td>
          <td>{c.role}</td><td>{c.role === "Seller" ? "—" : c.company || "—"}</td>
          <td>{c.role !== "Seller" && <>{c.email}<small>{c.phone}</small></>}</td>
          <td><div className="contacts-actions"><button aria-label={`Edit ${contactName(c)}`} onClick={() => edit(c)}><Pencil size={16} /></button><button aria-label={`Delete ${contactName(c)}`} onClick={() => { setError(""); setDeleting(c); }}><Trash2 size={16} /></button></div></td>
        </tr>)}</tbody>
      </table>{!visible.length && <p className="contacts-empty">{contacts.length ? "No contacts match your filters." : "No loan contacts yet. Add a contact to get started."}</p>}</div>
      <footer><span>{filtered.length} contacts</span><label>Items per page <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select></label><button disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">‹</button><span>{safePage} of {pages}</span><button disabled={safePage === pages} onClick={() => setPage(safePage + 1)} aria-label="Next page">›</button></footer>
    </section>
    <Sheet open={!!draft} onOpenChange={open => { if (!open) close(); }}>
      <SheetContent className="contacts-editor w-full sm:max-w-[640px]">
        <SheetTitle>{contacts.some(c => c.id === draft?.id) ? "Edit Contact" : "Add Contact"}</SheetTitle>
        <SheetDescription>Contact information for this loan.</SheetDescription>
        {draft && <form onSubmit={e => {
          e.preventDefault();
          const next = contacts.some(c => c.id === draft.id) ? contacts.map(c => c.id === draft.id ? draft : c) : [...contacts, draft];
          void persist(next, "Contact saved successfully.");
        }}>
          <fieldset disabled={busy}>
            <label>Contact Type<select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as LoanContact["role"] })}>{CONTACT_ROLES.map(r => <option key={r}>{r}</option>)}</select></label>
            <div className="contacts-fields">{fields.map(([key, label]) => <label key={key}>{label}<input
              type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
              value={draft[key] ?? ""}
              pattern={key === "zip" ? "[0-9]{5}(-[0-9]{4})?" : undefined}
              title={key === "zip" ? "Enter 12345 or 12345-6789" : undefined}
              placeholder={key === "zip" ? "12345-6789" : undefined}
              onChange={e => setDraft({ ...draft, [key]: e.target.value })}
            /></label>)}</div>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <div className="contacts-editor-footer"><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="contacts-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save Contact"}</button></div>
        </form>}
      </SheetContent>
    </Sheet>
    <Dialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <DialogContent className="loan-contacts"><DialogTitle>Delete Contact</DialogTitle><DialogDescription>Are you sure you want to delete {deleting && contactName(deleting)} from this loan?</DialogDescription>
        {error && <p role="alert">{error}</p>}
        <div className="contacts-editor-footer"><button disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="contacts-danger" disabled={busy} onClick={() => void persist(contacts.filter(c => c.id !== deleting?.id), "Contact deleted successfully.")}>{busy ? "Deleting…" : "Delete Contact"}</button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
