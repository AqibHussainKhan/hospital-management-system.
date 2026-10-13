import { useState } from "react";
import type { FormEvent } from "react";
import { UserPlus, ShieldCheck, Pencil, Mail } from "lucide-react";
import { useAccess } from "../../features/access/useAccess";
import {
  roles,
  roleLabel,
  modules,
  actions,
} from "../../features/access/accessModel";
import type { Role } from "../../features/access/accessModel";
import {
  callRpc,
  useHospitalRpc,
  operationError,
} from "../../features/access/rpc";
import { useDoctors } from "../../data/departmentStore";
import { useWards } from "../../data/activityStore";
import {
  useRecords,
  keys,
  Page,
  Card,
  Stats,
  Field,
  Table,
  Badge,
  ErrorMessage,
  buttonClass,
  cellClass,
  rowClass,
} from "../../components/administration/shared";
import type { StaffRecord } from "../../data/administrationModel";
import { getSupabase } from "../../lib/supabaseClient";
import {
  EmptyState,
  SearchField,
  RefreshButton,
  WorkspaceDialog,
  secondaryButton,
} from "../../components/common/WorkspaceControls";
interface Account {
  userId: string;
  email: string;
  role: Role | "unassigned";
  department: string;
  staffId: string | null;
  doctorId: string | null;
  wardIds: string[];
  active: boolean;
}
interface Permission {
  role: Role;
  permission: string;
  enabled: boolean;
}
const blank = () => ({
  email: "",
  name: "",
  password: "",
  method: "invite",
  role: "staff" as Role,
  staffId: "",
  doctorId: "",
  department: "",
  wardIds: [] as string[],
  active: true,
});
export default function UsersRoles({ onLogout }: { onLogout: () => void }) {
  const access = useAccess();
  const accounts = useHospitalRpc<Account[]>("hms_list_users");
  const permissions = useHospitalRpc<Permission[]>("hms_get_permissions");
  const staff = useRecords<StaffRecord>(keys.staff),
    doctors = useDoctors(),
    wards = useWards();
  const [tab, setTab] = useState("accounts"),
    [query, setQuery] = useState(""),
    [selectedRole, setSelectedRole] = useState<Role>("doctor");
  const [editing, setEditing] = useState<Account | "new" | null>(null),
    [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const all = accounts.data || [];
  const rows = all.filter((item) =>
    `${item.email} ${item.role} ${item.department}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  function open(account?: Account) {
    setError("");
    setNotice("");
    setEditing(account || "new");
    setForm(
      account
        ? {
            ...blank(),
            email: account.email,
            role: account.role === "unassigned" ? "staff" : account.role,
            staffId: account.staffId || "",
            doctorId: account.doctorId || "",
            department: account.department,
            wardIds: account.wardIds,
            active: account.role === "unassigned" ? true : account.active,
          }
        : blank(),
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const member = {
      role_name: form.role,
      department_name: form.department,
      staff_record: form.staffId || null,
      doctor_record: form.role === "doctor" ? form.doctorId || null : null,
      assigned_wards: form.wardIds,
      is_active: form.active,
    };
    try {
      if (editing === "new") {
        const { data, error: failure } = await getSupabase().functions.invoke(
          "hms-users",
          {
            body: {
              action: form.method,
              email: form.email,
              name: form.name,
              password: form.method === "create" ? form.password : undefined,
              membership: member,
            },
          },
        );
        if (failure) {
          let message =
            "Account service is unavailable. Check the account service setup.";
          try {
            const body = await failure.context?.json();
            if (typeof body?.error === "string") message = body.error;
          } catch {
            /* No response body. */
          }
          throw new Error(message);
        }
        if (data?.error) throw new Error(String(data.error));
        setNotice(
          form.method === "invite"
            ? "Account access saved and invitation sent."
            : "Account created and access saved.",
        );
      } else if (editing) {
        await callRpc("hms_set_membership", {
          target_user: editing.userId,
          ...member,
        });
        setNotice("Account permissions updated.");
      }
      setEditing(null);
      setForm(blank());
      accounts.refresh();
      permissions.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : operationError(cause));
    } finally {
      setBusy(false);
    }
  }
  async function reset(account: Account) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data, error: failure } = await getSupabase().functions.invoke(
        "hms-users",
        { body: { action: "reset", userId: account.userId } },
      );
      if (failure || data?.error)
        throw new Error(
          "Reset email could not be sent. Check account service and email setup.",
        );
      setNotice(`Password reset email sent to ${account.email}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : operationError(cause));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(permission: string, enabled: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await callRpc("hms_set_permission", {
        role_name: selectedRole,
        permission_name: permission,
        is_enabled: enabled,
      });
      permissions.refresh();
      setNotice("Role permission updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : operationError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      path="/users"
      title="Users & Roles"
      subtitle="Manage hospital login accounts, roles and assigned records"
      onLogout={onLogout}
    >
      <Stats
        items={[
          {
            label: "Hospital accounts",
            value: all.filter((item) => item.role !== "unassigned").length,
          },
          {
            label: "Active accounts",
            value: all.filter((item) => item.active).length,
          },
          {
            label: "Administrators",
            value: all.filter((item) => item.role === "admin" && item.active)
              .length,
          },
          { label: "Available roles", value: roles.length },
        ]}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["accounts", "permissions"].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={tab === value}
                className={tab === value ? buttonClass : secondaryButton}
                onClick={() => setTab(value)}
              >
                {value === "accounts" ? "Login accounts" : "Role permissions"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <RefreshButton
              loading={accounts.loading || permissions.loading}
              refresh={() => {
                accounts.refresh();
                permissions.refresh();
              }}
            />
            <button
              type="button"
              className={buttonClass}
              onClick={() => open()}
            >
              <UserPlus size={15} className="mr-2 inline" />
              Add account
            </button>
          </div>
        </div>
      </Card>
      <ErrorMessage
        message={
          !editing
            ? error || accounts.error || permissions.error
            : accounts.error || permissions.error
        }
      />
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-500"
        >
          {notice}
        </p>
      )}
      {tab === "accounts" ? (
        <>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search accounts, roles or departments…"
          />
          <Table
            headers={[
              "Account",
              "Access role",
              "Department",
              "Status",
              "Actions",
            ]}
            empty={!rows.length && !accounts.loading}
          >
            {rows.map((account) => (
              <tr key={account.userId} className={rowClass}>
                <td className={cellClass}>
                  <p className="font-semibold">{account.email}</p>
                  <p className="mt-1 text-xs text-[var(--hms-text-muted)]">
                    {staff.records.find((item) => item.id === account.staffId)
                      ?.name || "Staff record not linked"}
                  </p>
                </td>
                <td className={cellClass}>
                  {account.role === "unassigned"
                    ? "Unassigned"
                    : roleLabel(account.role)}
                </td>
                <td className={cellClass}>
                  {account.department || "Hospital"}
                </td>
                <td className={cellClass}>
                  <Badge>
                    {account.role === "unassigned"
                      ? "No access"
                      : account.active
                        ? "Active"
                        : "Inactive"}
                  </Badge>
                </td>
                <td className={cellClass}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => open(account)}
                    >
                      <Pencil size={13} />
                      Edit access
                    </button>
                    {account.role !== "unassigned" && (
                      <button
                        type="button"
                        disabled={busy}
                        className={secondaryButton}
                        onClick={() => void reset(account)}
                      >
                        <Mail size={13} />
                        Reset password
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          {accounts.loading && <EmptyState loading />}
        </>
      ) : (
        <Card>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <ShieldCheck size={22} className="text-blue-500" />
            <div className="flex-1">
              <h2 className="font-semibold">
                Permissions within assigned records
              </h2>
              <p className="mt-2 text-xs leading-6 text-[var(--hms-text-muted)]">
                Role permissions control available actions. Assigned patients,
                wards and departments continue to limit record access. Final
                clinical records retain their history.
              </p>
            </div>
            <select
              aria-label="Choose access role"
              className="hms-form-field sm:max-w-xs"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as Role)}
            >
              {roles
                .filter((role) => role.id !== "admin")
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-4">Module</th>
                  {actions
                    .filter((action) => action !== "delete")
                    .map((action) => (
                      <th key={action} className="p-3 text-center capitalize">
                        {action}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {modules
                  .filter(
                    (module) =>
                      !["users", "audit", "hospital-settings"].includes(module),
                  )
                  .map((module) => (
                    <tr key={module} className={rowClass}>
                      <td className="py-4 capitalize">
                        {module.replaceAll("-", " ")}
                      </td>
                      {actions
                        .filter((action) => action !== "delete")
                        .map((action) => {
                          const key = `${module}:${action}`,
                            checked =
                              permissions.data?.some(
                                (item) =>
                                  item.role === selectedRole &&
                                  item.permission === key &&
                                  item.enabled,
                              ) || false;
                          return (
                            <td key={key} className="p-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-blue-600"
                                disabled={busy || permissions.loading}
                                aria-label={`${selectedRole} ${module} ${action}`}
                                checked={checked}
                                onChange={(event) =>
                                  void toggle(key, event.target.checked)
                                }
                              />
                            </td>
                          );
                        })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-xs text-[var(--hms-text-muted)]">
            Administrators have all modules. Approval decisions and dispensing
            also require the relevant professional role.
          </p>
        </Card>
      )}
      {editing && (
        <WorkspaceDialog
          busy={busy}
          title={
            editing === "new" ? "Add hospital account" : "Edit account access"
          }
          description="Link each staff login to the correct employee record. Designation in Staff Directory is separate from the login role."
          onClose={() => {
            setEditing(null);
            setForm(blank());
          }}
        >
          <form
            onSubmit={(event) => {
              void save(event);
            }}
            className="space-y-5"
          >
            <fieldset disabled={busy} className="space-y-5">
              <Field label="Login email">
                <input
                  required
                  readOnly={editing !== "new"}
                  type="email"
                  maxLength={254}
                  className="hms-form-field"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              </Field>
              {editing === "new" && (
                <>
                  <Field label="Account name">
                    <input
                      required
                      maxLength={100}
                      className="hms-form-field"
                      value={form.name}
                      onChange={(event) => set("name", event.target.value)}
                    />
                  </Field>
                  <Field label="Account setup">
                    <select
                      className="hms-form-field"
                      value={form.method}
                      onChange={(event) => set("method", event.target.value)}
                    >
                      <option value="invite">Send invitation email</option>
                      <option value="create">Create with password</option>
                    </select>
                  </Field>
                  {form.method === "create" && (
                    <Field label="Initial password">
                      <input
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        className="hms-form-field"
                        value={form.password}
                        onChange={(event) =>
                          set("password", event.target.value)
                        }
                      />
                    </Field>
                  )}
                </>
              )}
              <Field label="Access role">
                <select
                  className="hms-form-field"
                  value={form.role}
                  disabled={
                    editing !== "new" && editing.userId === access.userId
                  }
                  onChange={(event) => {
                    set("role", event.target.value as Role);
                    set("doctorId", "");
                  }}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  form.role === "admin"
                    ? "Staff record (optional)"
                    : "Staff record"
                }
              >
                <select
                  required={form.role !== "admin"}
                  className="hms-form-field"
                  value={form.staffId}
                  onChange={(event) => {
                    const chosen = staff.records.find(
                      (item) => item.id === event.target.value,
                    );
                    setForm((old) => ({
                      ...old,
                      staffId: event.target.value,
                      department: chosen?.department || "",
                      doctorId: "",
                    }));
                  }}
                >
                  <option value="">Select staff record</option>
                  {staff.records
                    .filter(
                      (item) =>
                        item.status === "Active" || item.id === form.staffId,
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.role} · {item.department}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Department">
                <input
                  readOnly
                  className="hms-form-field"
                  value={form.department}
                  placeholder="From the linked staff record"
                />
              </Field>
              {form.role === "doctor" && (
                <Field label="Doctor record">
                  <select
                    required
                    className="hms-form-field"
                    value={form.doctorId}
                    onChange={(event) => set("doctorId", event.target.value)}
                  >
                    <option value="">Select doctor</option>
                    {doctors.records
                      .filter(
                        (item) =>
                          (item.status === "Active" ||
                            item.id === form.doctorId) &&
                          item.department === form.department,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.specialty}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
              {["nurse", "ward_incharge", "department_head"].includes(
                form.role,
              ) && (
                <div className="space-y-3">
                  <p className="text-xs font-medium">
                    Assigned wards
                    {form.role === "department_head" ? " (optional)" : ""}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {wards.records.map((ward) => (
                      <label
                        key={ward.id}
                        className="flex items-center gap-2 rounded-xl border border-[var(--hms-border)] p-3 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={form.wardIds.includes(ward.id)}
                          onChange={(event) =>
                            set(
                              "wardIds",
                              event.target.checked
                                ? [...form.wardIds, ward.id]
                                : form.wardIds.filter((id) => id !== ward.id),
                            )
                          }
                        />
                        {ward.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={
                    editing !== "new" && editing.userId === access.userId
                  }
                  checked={form.active}
                  onChange={(event) => set("active", event.target.checked)}
                />
                Account active
              </label>
              <ErrorMessage
                message={error || staff.error || doctors.error || wards.error}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    setEditing(null);
                    setForm(blank());
                  }}
                >
                  Cancel
                </button>
                <button
                  className={buttonClass}
                  disabled={staff.loading || doctors.loading || wards.loading}
                >
                  {busy ? "Saving…" : "Save account"}
                </button>
              </div>
            </fieldset>
          </form>
        </WorkspaceDialog>
      )}
    </Page>
  );
}
