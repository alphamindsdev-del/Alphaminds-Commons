import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminModal,
  AdminTable,
  EmptyRow,
  Field,
  GhostBtn,
  MemberCell,
  PrimaryBtn,
  SectionHeader,
  TArea,
  TSelect,
  adminSend,
  fmtDate,
  useAdminList,
} from "./AdminKit";
import { cn } from "@/lib/utils";

interface ClinicRequest {
  id: string;
  member_id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_r2_key: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  mode: "in_person" | "virtual";
  reason: string;
  contact_phone: string | null;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUSES = ["requested", "scheduled", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const statusCls: Record<Status, string> = {
  requested: "bg-amber-500/10 text-amber-700",
  scheduled: "bg-blue-500/10 text-blue-700",
  completed: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-subtle text-text-secondary",
};

function ClinicModal({ item, onClose }: { item: ClinicRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>(item.status);
  const [notes, setNotes] = useState(item.admin_notes ?? "");

  const save = useMutation({
    mutationFn: () =>
      adminSend(`/v1/admin/clinic-requests/${item.id}`, "PATCH", {
        status,
        admin_notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin", "clinic-requests"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message || "Could not update request"),
  });

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Update clinic request"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-subtle/50 p-4">
          <MemberCell name={item.display_name} email={item.email} avatarKey={item.avatar_r2_key} />
          <p className="mt-3 text-xs text-text-secondary">
            {item.mode === "virtual" ? "Virtual visit" : "In-person visit"} ·{" "}
            {item.preferred_date
              ? new Date(`${item.preferred_date}T00:00:00`).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Flexible date"}
            {item.preferred_time ? ` at ${item.preferred_time}` : ""}
          </p>
          {item.contact_phone && (
            <p className="mt-1 text-xs text-text-secondary">Phone: {item.contact_phone}</p>
          )}
          <p className="mt-3 rounded-lg bg-card px-3 py-2 text-sm text-text-primary">
            {item.reason}
          </p>
        </div>

        <Field label="Status">
          <TSelect value={status} onChange={(event) => setStatus(event.target.value as Status)}>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </TSelect>
        </Field>

        <Field label="Clinic note" hint="Visible to the member on their clinic page.">
          <TArea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Confirmation details, preparation notes or follow-up guidance."
          />
        </Field>
      </div>
    </AdminModal>
  );
}

export function AdminClinic() {
  const { data, isLoading } = useAdminList<ClinicRequest>(
    "clinic-requests",
    "/v1/admin/clinic-requests",
  );
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [editing, setEditing] = useState<ClinicRequest | null>(null);

  const requests = useMemo(() => {
    const rows = data?.data ?? [];
    return filter === "all" ? rows : rows.filter((row) => row.status === filter);
  }, [data, filter]);

  return (
    <div>
      <SectionHeader
        back
        title="Clinic Requests"
        subtitle="Member requests for wellness consultations. Health records stay private to the member."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-colors",
              filter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border text-text-secondary hover:text-text-primary",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Member</th>
            <th className="text-left px-4 py-3 font-bold">Visit</th>
            <th className="text-left px-4 py-3 font-bold">Reason</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Requested</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} message="Loading…" />
        ) : requests.length === 0 ? (
          <EmptyRow colSpan={6} message="No clinic requests in this view." />
        ) : (
          requests.map((item) => (
            <tr key={item.id} className="border-t border-border align-top">
              <td className="px-4 py-3">
                <MemberCell
                  name={item.display_name}
                  email={item.email}
                  avatarKey={item.avatar_r2_key}
                />
              </td>
              <td className="px-4 py-3 text-text-secondary">
                <p className="text-sm font-semibold text-text-primary">
                  {item.mode === "virtual" ? "Virtual" : "In person"}
                </p>
                <p className="text-xs">
                  {item.preferred_date
                    ? new Date(`${item.preferred_date}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Flexible"}
                  {item.preferred_time ? ` · ${item.preferred_time}` : ""}
                </p>
              </td>
              <td className="px-4 py-3">
                <p className="max-w-[240px] text-sm text-text-secondary line-clamp-2">
                  {item.reason}
                </p>
                {item.admin_notes && (
                  <p className="mt-1 max-w-[240px] truncate text-[11px] text-primary">
                    Note: {item.admin_notes}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider",
                    statusCls[item.status],
                  )}
                >
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(item.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-primary/40"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {editing && <ClinicModal item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
