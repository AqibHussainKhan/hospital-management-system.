import { useState } from "react";
import { useHospitalRpc } from "../../features/access/rpc";
import {
  Page,
  Card,
  Table,
  cellClass,
  rowClass,
  ErrorMessage,
  Badge,
} from "../../components/administration/shared";
import {
  SearchField,
  RefreshButton,
  EmptyState,
} from "../../components/common/WorkspaceControls";
import { fullTime } from "../../data/activityModel";
interface AuditRow {
  id: string;
  category: string;
  actor: string | null;
  occurred_at: string;
  action: string;
  subject: string;
  details: Record<string, unknown>;
}
export default function AuditLog({ onLogout }: { onLogout: () => void }) {
  const state = useHospitalRpc<AuditRow[]>("hms_audit_log"),
    [query, setQuery] = useState("");
  const rows = (state.data || []).filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Page
      path="/audit"
      title="Audit Trail"
      subtitle="Latest 500 record changes, account actions and approval decisions"
      onLogout={onLogout}
    >
      <Card>
        <div className="flex flex-wrap justify-between gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search user, action or module…"
          />
          <RefreshButton refresh={state.refresh} loading={state.loading} />
        </div>
      </Card>
      <ErrorMessage message={state.error} />
      <Table
        headers={["Time", "User", "Action", "Subject", "Details"]}
        empty={!rows.length && !state.loading}
      >
        {rows.map((row) => (
          <tr key={`${row.category}-${row.id}`} className={rowClass}>
            <td className={cellClass}>{fullTime(row.occurred_at)}</td>
            <td className={cellClass}>{row.actor || "Removed account"}</td>
            <td className={cellClass}>
              <Badge>{row.action.replaceAll("_", " ")}</Badge>
            </td>
            <td className={cellClass}>{row.subject}</td>
            <td
              className={`${cellClass} max-w-xs break-words text-xs text-[var(--hms-text-muted)]`}
            >
              {Object.entries(row.details)
                .map(
                  ([key, value]) =>
                    `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
                )
                .join(" · ")}
            </td>
          </tr>
        ))}
      </Table>
      {state.loading && <EmptyState loading />}
    </Page>
  );
}
