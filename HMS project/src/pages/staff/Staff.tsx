import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import DeleteConfirmationModal from "../../components/common/DeleteConfirmationModal";
import {
  Page,
  Card,
  Stats,
  Field,
  Table,
  Badge,
  ErrorMessage,
  useRecords,
  keys,
  buttonClass,
  cellClass,
  rowClass,
} from "../../components/administration/shared";
import type { StaffRecord } from "../../components/administration/shared";
import { assertUnchangedRecord } from "../../data/recordCore";

const blank: Omit<StaffRecord, "id"> = { name: "", department: "", role: "", phone: "", status: "Active" };
export default function Staff({ onLogout }: { onLogout: () => void }) {
  const { records, save, error } = useRecords<StaffRecord>(keys.staff);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = records.filter(r => `${r.name} ${r.id} ${r.department} ${r.role} ${r.phone}`.toLowerCase().includes(search.toLowerCase()) && (status === "All" || r.status === status));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.department.trim() || !form.role.trim() || !form.phone.trim()) return;
    if (editing && !records.some(r => r.id === editing)) return;
    const record: StaffRecord = { ...form, name: form.name.trim(), department: form.department.trim(), role: form.role.trim(), phone: form.phone.trim(), id: editing || crypto.randomUUID() };
    if (await save(editing ? records.map(r => r.id === editing ? record : r) : [...records, record])) { setOpen(false); setEditing(null); setForm(blank); }
  }
  return (
    <Page
      title="Staff Directory"
      subtitle="Manage hospital staff, departments and employment status."
      path="/staff"
      onLogout={onLogout}
    >
      <Stats
        items={[
          { label: "Total staff", value: records.length },
          {
            label: "Active",
            value: records.filter(r => r.status === "Active").length,
          },
          {
            label: "Inactive",
            value: records.filter(r => r.status === "Inactive").length,
          },
          {
            label: "Departments",
            value: new Set(records.map(r => r.department)).size,
          },
        ]}
      />

      <ErrorMessage message={error} />

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="hms-navbar-search flex min-w-0 flex-1">
            <Search
              size={17}
              aria-hidden="true"
              className="hms-navbar-search-icon"
            />
            <input
              type="search"
              aria-label="Search staff"
              className="hms-navbar-search-input"
              placeholder="Search name, department or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-44 md:shrink-0">
            <select
              aria-label="Staff status"
              className="hms-form-field"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {["All", "Active", "Inactive"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            className={buttonClass + " flex h-11 shrink-0 items-center justify-center gap-2"}
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Add Staff
          </button>
        </div>
      </Card>

      {open && (
        <Card>
          <h2 className="mb-5 font-semibold">
            {editing ? "Edit Staff" : "New Staff Member"}
          </h2>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            {(["name", "department", "role", "phone"] as const).map(key => (
              <Field
                key={key}
                label={
                  key === "role"
                    ? "Designation"
                    : key.charAt(0).toUpperCase() + key.slice(1)
                }
              >
                <input
                  aria-label={
                    key === "role"
                      ? "Designation"
                      : key.charAt(0).toUpperCase() + key.slice(1)
                  }
                  required
                  maxLength={100}
                  className="hms-form-field"
                  type={key === "phone" ? "tel" : "text"}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                />
              </Field>
            ))}

            <Field label="Status">
              <select
                aria-label="Status"
                className="hms-form-field"
                value={form.status}
                onChange={e =>
                  setForm({
                    ...form,
                    status: e.target.value as StaffRecord["status"],
                  })
                }
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>

            <div className="flex items-end gap-3">
              <button className={buttonClass}>Save Staff</button>
              <button
                type="button"
                className="px-4 py-3 text-sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Table
        headers={["Staff", "Department", "Designation", "Phone", "Status", "Actions"]}
        empty={!filtered.length}
      >
        {filtered.map(r => (
          <tr key={r.id} className={rowClass}>
            <td className={cellClass}>
              <p className="font-semibold">{r.name}</p>
              <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                STF-{r.id.slice(0, 8).toUpperCase()}
              </p>
            </td>
            <td className={cellClass}>{r.department}</td>
            <td className={cellClass}>{r.role}</td>
            <td className={cellClass}>{r.phone}</td>
            <td className={cellClass}>
              <Badge>{r.status}</Badge>
            </td>
            <td className={cellClass}>
              <div className="flex gap-3">
                <button
                  aria-label={`Edit ${r.name}`}
                  className="text-blue-500"
                  onClick={() => {
                    setEditing(r.id);
                    setForm({
                      name: r.name,
                      department: r.department,
                      role: r.role,
                      phone: r.phone,
                      status: r.status,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil size={16} />
                </button>

                <button
                  aria-label={`Delete ${r.name}`}
                  className="text-red-500"
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      {deleteTarget && (
        <DeleteConfirmationModal
          title="Delete staff member?"
          description="This staff member will be removed from the hospital staff directory."
          recordLabel="Selected staff member"
          recordName={deleteTarget.name}
          recordMeta={`${deleteTarget.role} · ${deleteTarget.department} · ${deleteTarget.id}`}
          warning="This action cannot be undone. Use Inactive status to retain attendance history."
          confirmLabel="Delete staff"
          error={error}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            assertUnchangedRecord(records, deleteTarget);
            return save(records.filter((record) => record.id !== deleteTarget.id));
          }}
        />
      )}
    </Page>
  );
}
