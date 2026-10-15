import type { ChangeLogEntry } from "./history-data";

export function parseTimestamp(ts: string): number {
  const [datePart, timePart, ampm] = ts.split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  let [hours, minutes] = timePart.split(":").map(Number);
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return new Date(year, month - 1, day, hours, minutes).getTime();
}

export function filterAndSortHistory(
  entries: ChangeLogEntry[],
  searchQuery: string,
  sortDirection: "desc" | "asc",
) {
  let data = entries;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    data = data.filter(
      (entry) =>
        entry.field.toLowerCase().includes(q) ||
        entry.previousValue.toLowerCase().includes(q) ||
        entry.newValue.toLowerCase().includes(q) ||
        entry.changedBy.toLowerCase().includes(q) ||
        entry.position.toLowerCase().includes(q) ||
        entry.timestamp.toLowerCase().includes(q) ||
        entry.section.toLowerCase().includes(q)
    );
  }
  const sorted = [...data].sort((a, b) => {
    const diff = parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp);
    return sortDirection === "desc" ? -diff : diff;
  });
  return sorted;
}
