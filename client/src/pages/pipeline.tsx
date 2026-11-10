import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, ArrowDown, ArrowUp } from "lucide-react";
import { LOAN_STAGES, type LoanStage } from "@shared/loan-stages";
import { AppHeader } from "@/components/AppHeader";
import { NewLoanDialog } from "@/components/NewLoanDialog";
import { usePipelineQuery } from "@/hooks/use-pipeline-query";
import { formatCurrency } from "@/lib/loan-display";
import { pipelineRows, relativeUpdated, type PipelineSort } from "@/lib/pipeline-display";
import "@/styles/pipeline.css";

const columns: { key: PipelineSort; label: string; width: string }[] = [
  { key: "loanNumber", label: "Loan #", width: "12%" },
  { key: "primaryBorrowerName", label: "Primary borrower", width: "18%" },
  { key: "loanType", label: "Loan type", width: "10%" },
  { key: "stage", label: "Stage", width: "18%" },
  { key: "amountRequested", label: "Amount requested", width: "15%" },
  { key: "product", label: "Product", width: "15%" },
  { key: "updatedAt", label: "Last updated", width: "12%" },
];

export default function PipelinePage() {
  const query = usePipelineQuery();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [stages, setStages] = useState<LoanStage[]>([]);
  const [sort, setSort] = useState<PipelineSort>("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const loans = query.data ?? [];
  const rows = pipelineRows(loans, search, stages, sort, direction);
  const filtered = !!search.trim() || stages.length > 0;
  return <div className="pipeline-page" data-testid="pipeline-page">
    <AppHeader />
    <main className="pipeline-content">
      <div className="pipeline-heading">
        <h1 className="headline-100">Pipeline</h1>
        <button data-testid="button-new-loan" className="pipeline-button body-200-strong" disabled={creating} onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />New loan</button>
      </div>
      <div className="pipeline-filters">
        <div role="group" aria-label="Filter by stage" className="pipeline-stage-filters">
          <button className="pipeline-chip caption-100-strong" aria-pressed={!stages.length} data-testid="filter-stage-all" onClick={() => setStages([])}>All <span>{loans.length}</span></button>
          {LOAN_STAGES.map(stage => <button key={stage} className="pipeline-chip caption-100-strong" aria-pressed={stages.includes(stage)} data-testid={`filter-stage-${stage.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setStages(current => current.includes(stage) ? current.filter(value => value !== stage) : [...current, stage])}>
            {stage} <span>{loans.filter(loan => loan.stage === stage).length}</span>
          </button>)}
        </div>
        <label className="pipeline-search body-200">
          <Search className="w-4 h-4 shrink-0" aria-hidden />
          <span className="sr-only">Search loan number or primary borrower</span>
          <input data-testid="input-pipeline-search" type="search" placeholder="Search loans" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
      </div>
      {query.isError ? <section className="pipeline-state" data-testid="pipeline-error" role="alert">
        <h2 className="headline-300 pipeline-error">Could not load the pipeline</h2>
        <p className="body-200">{query.error.message}</p>
        <button className="pipeline-button body-200-strong" data-testid="button-retry-pipeline" onClick={() => query.refetch()}>Retry</button>
      </section> : <div className="pipeline-table-wrap">
        <table className="pipeline-table body-100" data-testid="pipeline-table" aria-busy={query.isLoading}>
          <caption className="sr-only">Loans in your pipeline</caption>
          <colgroup>{columns.map(column => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead><tr>{columns.map(column => <th key={column.key} scope="col" className="caption-100-strong" aria-sort={sort === column.key ? direction === "asc" ? "ascending" : "descending" : "none"}>
            <button data-testid={`sort-${column.key}`} onClick={() => {
              if (sort === column.key) setDirection(value => value === "asc" ? "desc" : "asc");
              else { setSort(column.key); setDirection(column.key === "updatedAt" ? "desc" : "asc"); }
            }}>{column.label}{sort === column.key && (direction === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}</button>
          </th>)}</tr></thead>
          <tbody>{query.isLoading ? Array.from({ length: 6 }, (_, index) => <tr key={index} data-testid={`pipeline-skeleton-${index}`} className="animate-pulse">
            {columns.map(column => <td key={column.key}><div className="pipeline-skeleton" /></td>)}
          </tr>) : rows.map(loan => <tr key={loan.id} data-loan={loan.id} data-testid={`pipeline-row-${loan.id}`} onClick={() => navigate(`~/loans/${encodeURIComponent(loan.id)}`)}>
            <td><Link className="body-200-strong" data-testid={`open-loan-${loan.id}`} href={`~/loans/${encodeURIComponent(loan.id)}`} onClick={event => event.stopPropagation()}>{loan.loanNumber}</Link></td>
            <td>{loan.primaryBorrowerName || "—"}</td><td>{loan.loanType || "—"}</td>
            <td><span className="pipeline-chip pipeline-stage caption-100-strong">{loan.stage}</span></td>
            <td>{loan.amountRequested === null ? "—" : formatCurrency(String(loan.amountRequested))}</td>
            <td>{loan.product || "—"}</td>
            <td><time className="caption-100" dateTime={loan.updatedAt} title={new Date(loan.updatedAt).toLocaleString()}>{relativeUpdated(loan.updatedAt, now)}</time></td>
          </tr>)}</tbody>
        </table>
        {!query.isLoading && !rows.length && <section className="pipeline-state" data-testid="pipeline-empty">
          <h2 className="headline-300">{filtered ? "No loans match" : "No loans yet — create the first one"}</h2>
          <p className="body-200">{filtered ? "Try another borrower, loan number, or stage." : "Start with a blank application or a Blend import."}</p>
          {filtered ? <button className="pipeline-button pipeline-secondary body-200-strong" data-testid="clear-pipeline-filters" onClick={() => { setSearch(""); setStages([]); }}>Clear filters</button>
            : <button className="pipeline-button body-200-strong" data-testid="create-first-loan" disabled={creating} onClick={() => setDialogOpen(true)}>New loan</button>}
        </section>}
      </div>}
      <NewLoanDialog open={dialogOpen} onOpenChange={setDialogOpen} onBusyChange={setCreating} />
    </main>
  </div>;
}
