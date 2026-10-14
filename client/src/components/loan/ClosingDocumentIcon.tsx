/** Small document/history/edit glyphs; inactive glyphs are decorative only. */
export function ClosingDocumentIcon({ kind }: { kind: "file" | "clock" | "edit" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === "file" && <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>}
      {kind === "clock" && <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>}
      {kind === "edit" && <>
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="m16 3 5 5-10 10-5 1 1-5Z" />
      </>}
    </svg>
  );
}