import { useState } from "react";
import { Link } from "wouter";
import { FiSearch, FiPlus, FiPlusCircle, FiArrowDown, FiArrowUp, FiChevronLeft, FiChevronRight, FiEye, FiUserPlus, FiMoreVertical, FiX } from "react-icons/fi";
import { LOAN_STAGES, type LoanStage } from "@shared/loan-stages";
import { MoreOptionsMenu } from "@/components/AppHeader";
import { MainNavigation } from "@/components/MainNavigation";
import { PipelineFooter } from "@/components/PipelineFooter";
import { GitHubSyncPanel } from "@/components/GitHubSyncPanel";
import { NewLoanDialog } from "@/components/NewLoanDialog";
import { usePipelineQuery } from "@/hooks/use-pipeline-query";
import { formatCurrency } from "@/lib/loan-display";
import { pipelineRows, pipelinePage, queueLoans, PIPELINE_QUEUES, type PipelineQueue, type PipelineSort } from "@/lib/pipeline-display";
import "@/styles/pipeline.css";

const allColumns: { key: string; sort?: PipelineSort; label: string; width: number }[] = [
  { key: "loanNumber", sort: "loanNumber", label: "Loan Number", width: 125 },
  { key: "cifNumber", sort: "cifNumber", label: "CIF", width: 80 },
  { key: "region", label: "Region", width: 80 },
  { key: "primaryBorrowerName", sort: "primaryBorrowerName", label: "Borrower Name", width: 278 },
  { key: "loanType", sort: "loanType", label: "Loan Purpose", width: 230 },
  { key: "amountRequested", sort: "amountRequested", label: "Req Amount", width: 242 },
  { key: "stage", sort: "stage", label: "Stage", width: 230 },
  { key: "officer", label: "LO", width: 160 },
  { key: "applicationDate", label: "App Start Date", width: 151 },
  { key: "decision", label: "Decision", width: 112 },
  { key: "actions", label: "Actions", width: 104 },
];
const salesColumns = [
  ...allColumns.slice(0, 8).map(column => ({
    ...column, width: column.key === "loanType" ? 150 : column.key === "amountRequested" ? 130 : column.key === "stage" ? 180 : column.width,
  })),
  { key: "submitDate", label: "App Submit Date", width: 151 },
  { key: "contractExpiryDate", label: "Contract Exp Date", width: 151 },
  allColumns[9],
  { key: "appraisal", label: "Appraisal", width: 100 },
  allColumns[10],
];
function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}
function Unavailable({ field }: { field: string }) {
  const explanation = `${field} is not available in the saved pipeline data.`;
  return <span title={explanation} aria-label={explanation}>—</span>;
}

export default function PipelinePage() {
  const query = usePipelineQuery();
  const [search, setSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [queue, setQueue] = useState<PipelineQueue>("All Loans");
  const salesSupport = queue === "Sales Support";
  const columns: typeof allColumns = salesSupport ? salesColumns : allColumns;
  const columnWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const [stages, setStages] = useState<LoanStage[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [sort, setSort] = useState<PipelineSort>("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const loans = query.data ?? [];
  const selectedLoans = queueLoans(loans, queue);
  const rows = pipelineRows(pipelineRows(selectedLoans, search, stages, sort, direction), tableSearch, [], sort, direction);
  const pagination = pipelinePage(rows, page, pageSize);
  const filtered = !!search.trim() || !!tableSearch.trim() || stages.length > 0;
  function clearFilters() { setSearch(""); setTableSearch(""); setStages([]); setPage(1); }
  return <div className="pipeline-page" data-testid="pipeline-page">
    <MainNavigation />
    <div className="pipeline-shell">
      <header className="pipeline-welcome">
        <div className="pipeline-welcome-copy">
          <time className="body-200" dateTime={new Date().toISOString().slice(0, 10)}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</time>
          <div className="pipeline-welcome-actions">
            <h1 className="headline-100">Welcome back.</h1>
            <button data-testid="button-new-loan" className="pipeline-button body-200-strong" disabled={creating} onClick={() => setDialogOpen(true)}><FiPlus aria-hidden />New Loan</button>
            <MoreOptionsMenu onGitHubSync={() => setSyncOpen(true)} loanActive={false} />
          </div>
          <label className="pipeline-search body-200">
            <FiSearch aria-hidden />
            <span className="sr-only">Search borrower, loan number, or CIF</span>
            <input data-testid="input-pipeline-search" type="search" placeholder="Search for a customer" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            {search && <button aria-label="Clear customer search" onClick={() => { setSearch(""); setPage(1); }}><FiX aria-hidden /></button>}
          </label>
        </div>
        <div className="pipeline-queues" role="group" aria-label="Loan queues">
          {PIPELINE_QUEUES.map(name => <button key={name} data-testid={`queue-${name.toLowerCase().replaceAll(" ", "-")}`} className="pipeline-queue" aria-pressed={queue === name}
            onClick={() => { setQueue(name); setPage(1); }}>
            <span className="headline-300">{query.isLoading || query.isError ? "—" : queueLoans(loans, name).length} Loans</span>
            <span className="body-200">{name}</span><span className="pipeline-queue-link caption-100-strong">View Loans<span className="sr-only"> in {name}</span></span>
          </button>)}
        </div>
      </header>
      <main className="pipeline-content" aria-label="Pipeline">
        <section className="pipeline-panel" aria-labelledby="pipeline-queue-title">
          <div className="pipeline-heading">
            <h2 id="pipeline-queue-title" className="headline-300">{queue}</h2>
            <div className="pipeline-tools">
              <button className="pipeline-custom body-200-strong" aria-expanded={customOpen} aria-controls="pipeline-custom-filters" onClick={() => setCustomOpen(value => !value)}><FiPlusCircle aria-hidden />Custom Filter{stages.length ? ` (${stages.length})` : ""}</button>
              <label className="pipeline-search body-200"><span className="sr-only">Filter table results</span><input type="search" placeholder="Type to filter results" value={tableSearch} onChange={event => { setTableSearch(event.target.value); setPage(1); }} /></label>
            </div>
          </div>
          {customOpen && <div id="pipeline-custom-filters" role="group" aria-label="Filter by stage" className="pipeline-stage-filters">
            <button className="pipeline-chip caption-100-strong" aria-pressed={!stages.length} data-testid="filter-stage-all" onClick={() => { setStages([]); setPage(1); }}>All <span>{selectedLoans.length}</span></button>
            {LOAN_STAGES.map(stage => <button key={stage} className="pipeline-chip caption-100-strong" aria-pressed={stages.includes(stage)} data-testid={`filter-stage-${stage.toLowerCase().replaceAll(" ", "-")}`}
              onClick={() => { setStages(current => current.includes(stage) ? current.filter(value => value !== stage) : [...current, stage]); setPage(1); }}>
              {stage} <span>{selectedLoans.filter(loan => loan.stage === stage).length}</span>
            </button>)}
          </div>}
          {query.isError ? <section className="pipeline-state" data-testid="pipeline-error" role="alert">
            <h2 className="headline-300 pipeline-error">Could not load the pipeline</h2>
            <p className="body-200">{query.error.message}</p>
            <button className="pipeline-button body-200-strong" data-testid="button-retry-pipeline" onClick={() => query.refetch()}>Retry</button>
          </section> : <>
            <div className="pipeline-table-wrap">
              <table className="pipeline-table body-200" data-testid="pipeline-table" aria-busy={query.isLoading}>
                <caption className="sr-only">{queue} — saved loan records. Unavailable fields are shown as an em dash.</caption>
                <colgroup>{columns.map(column => <col key={column.key} style={{ width: `${column.width / columnWidth * 100}%` }} />)}</colgroup>
                <thead><tr>{columns.map(column => <th key={column.key} scope="col" className="caption-100-strong" aria-sort={column.sort ? sort === column.sort ? direction === "asc" ? "ascending" : "descending" : "none" : undefined}>
                  {column.sort ? <button data-testid={`sort-${column.key}`} onClick={() => {
                    if (sort === column.sort) setDirection(value => value === "asc" ? "desc" : "asc");
                    else { setSort(column.sort!); setDirection("asc"); } setPage(1);
                  }}>{column.label}{sort === column.sort && (direction === "desc" ? <FiArrowDown aria-hidden /> : <FiArrowUp aria-hidden />)}</button> : column.label}
                </th>)}</tr></thead>
                <tbody>{query.isLoading ? Array.from({ length: 6 }, (_, index) => <tr key={index} data-testid={`pipeline-skeleton-${index}`} className="animate-pulse">
                  {columns.map(column => <td key={column.key}><div className="pipeline-skeleton" /></td>)}
                </tr>) : pagination.rows.map(loan => {
                  return <tr key={loan.id} data-loan={loan.id} data-testid={`pipeline-row-${loan.id}`}>
                    <td><Link className="body-200-strong" data-testid={`open-loan-${loan.id}`} href={`~/loans/${encodeURIComponent(loan.id)}`}>{loan.loanNumber}</Link></td>
                    <td>{loan.cifNumber || <Unavailable field="CIF" />}</td>
                    <td>{loan.region ?? <Unavailable field="Region" />}</td>
                    <td>{loan.primaryBorrowerName || <Unavailable field="Borrower name" />}{!!loan.additionalBorrowerCount && <span className="pipeline-additional caption-100" aria-label={`${loan.additionalBorrowerCount} additional borrowers`}>+{loan.additionalBorrowerCount}</span>}</td>
                    <td>{loan.loanType || <Unavailable field="Loan purpose" />}</td>
                    <td>{loan.amountRequested === null ? <Unavailable field="Requested amount" /> : formatCurrency(String(loan.amountRequested))}</td>
                    <td>{loan.stage}</td>
                    <td>{loan.loanOfficer ?? <Unavailable field="Loan officer" />}</td>
                    <td>{salesSupport ? <Unavailable field="Application submit date" /> : loan.applicationDate ? displayDate(loan.applicationDate) : <Unavailable field="Application start date" />}</td>
                    {salesSupport && <td>{loan.contractExpiryDate ? displayDate(loan.contractExpiryDate) : <Unavailable field="Contract expiry date" />}</td>}
                    <td>{loan.decision ?? <Unavailable field="Decision" />}</td>
                    {salesSupport && <td />}
                    <td><div className="pipeline-row-actions">
                      <button disabled aria-label={`Assign loan ${loan.loanNumber} — unavailable`} title="Loan assignment is not available"><FiUserPlus aria-hidden /></button>
                      <Link href={`~/loans/${encodeURIComponent(loan.id)}`} aria-label={`View loan ${loan.loanNumber}`} title="View loan"><FiEye aria-hidden /></Link>
                      <button disabled aria-label={`More actions for loan ${loan.loanNumber} — unavailable`} title="No additional loan actions available"><FiMoreVertical aria-hidden /></button>
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            {!query.isLoading && !rows.length && <section className="pipeline-state" data-testid="pipeline-empty">
              <h3 className="headline-300">{queue !== "All Loans" ? `No loans assigned to ${queue}` : filtered ? "No loans match" : "No loans yet — create the first one"}</h3>
              <p className="body-200">{filtered ? "Try another borrower, loan number, CIF, or stage." : queue === "Sales Support" ? "New SF Opportunities appear here after creation." : queue !== "All Loans" ? "Department queue assignment has not been configured. View All Loans for saved applications." : "Start with a New SF Opportunity or a Blend import."}</p>
              {queue !== "All Loans" ? <button className="pipeline-button pipeline-secondary body-200-strong" onClick={() => { setQueue("All Loans"); clearFilters(); }}>View All Loans</button>
                : filtered ? <button className="pipeline-button pipeline-secondary body-200-strong" data-testid="clear-pipeline-filters" onClick={clearFilters}>Clear filters</button>
                : <button className="pipeline-button body-200-strong" data-testid="create-first-loan" disabled={creating} onClick={() => setDialogOpen(true)}>New Loan</button>}
            </section>}
            <div className="pipeline-pagination caption-100">
              <label>Items per page: <select aria-label="Items per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size}>{size}</option>)}</select></label>
              <span role="status">{query.isLoading ? "Loading loans…" : `${rows.length} ${rows.length === 1 ? "loan" : "loans"} · Page ${pagination.page} of ${pagination.pageCount}`}</span>
              <button aria-label="Previous page" disabled={pagination.page === 1 || query.isLoading} onClick={() => setPage(pagination.page - 1)}><FiChevronLeft aria-hidden /></button>
              <button aria-label="Next page" disabled={pagination.page === pagination.pageCount || query.isLoading} onClick={() => setPage(pagination.page + 1)}><FiChevronRight aria-hidden /></button>
            </div>
          </>}
        </section>
        <NewLoanDialog open={dialogOpen} onOpenChange={setDialogOpen} onBusyChange={setCreating} />
        <GitHubSyncPanel open={syncOpen} onOpenChange={setSyncOpen} loanActive={false} />
      </main>
      <PipelineFooter />
    </div>
  </div>;
}
