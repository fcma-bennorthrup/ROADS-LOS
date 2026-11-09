import { useQuery } from "@tanstack/react-query";
import { DATABASE_COMPATIBILITY_KEY, readDatabaseCompatibility } from "@/lib/database-compatibility";
import { Button } from "@/components/ui/button";

export function DatabaseCompatibilityStatus({ open }: { open: boolean }) {
  const query = useQuery({ queryKey: DATABASE_COMPATIBILITY_KEY, queryFn: readDatabaseCompatibility,
    enabled: open, staleTime: 0, retry: false });
  const report = query.data;
  return <section data-testid="database-compatibility" className="flex flex-col gap-2 rounded border p-3 text-sm">
    <div className="flex items-center justify-between gap-2">
      <strong>Database compatibility</strong>
      <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>Check again</Button>
    </div>
    <p role="status">{query.isFetching ? "Checking this project's database…" : query.isError
      ? "Check unavailable. Run npm run db:check in the project Shell."
      : report?.message}</p>
    {!query.isFetching && report?.issues.map((issue, index) => <p key={index}>{issue}</p>)}
    {report?.pending.length ? <p>Pending updates: {report.pending.join(", ")}</p> : null}
    <p className="text-muted-foreground">Read-only check. Loan data is not copied between projects.</p>
  </section>;
}
