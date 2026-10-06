import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { HOUSES, HOUSE_MAP, type HouseId } from "@/lib/constants";
import {
  AdminTable,
  EmptyRow,
  MemberCell,
  SectionHeader,
  TInput,
  TSelect,
  adminSend,
  fmtDate,
  useAdminList,
} from "./AdminKit";

interface Member {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_r2_key: string | null;
  primary_house: string | null;
  role: string;
  is_active: number;
  email_verified: number;
  last_active_at: string | null;
  created_at: string;
}

const ROLES = [
  { value: "member", label: "Member" },
  { value: "moderator", label: "Moderator" },
  { value: "house_lead", label: "House Lead" },
  { value: "admin", label: "Admin" },
  { value: "founder", label: "Founder" },
] as const;

export function AdminMembers() {
  const qc = useQueryClient();
  const { member: me } = useAuthStore();
  const { data, isLoading } = useAdminList<Member>("members", "/v1/admin/members?limit=100");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [houseFilter, setHouseFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.data ?? []).filter((m) => {
      if (roleFilter && m.role !== roleFilter) return false;
      if (houseFilter && m.primary_house !== houseFilter) return false;
      if (q && !`${m.display_name} ${m.username} ${m.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, roleFilter, houseFilter]);

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminSend(`/v1/admin/members/${id}`, "PATCH", body),
    onSuccess: () => {
      toast.success("Member updated");
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (err: any, vars) => {
      toast.error(err.message ?? "Update failed");
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
  });

  return (
    <div>
      <SectionHeader
        title="Members"
        subtitle="Manage roles and account status. Changes take effect immediately."
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <TInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username or email…"
          />
        </div>
        <TSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </TSelect>
      </div>

      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Member</th>
            <th className="text-left px-4 py-3 font-bold">House</th>
            <th className="text-left px-4 py-3 font-bold">Role</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Joined</th>
            <th className="text-left px-4 py-3 font-bold">Last active</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} message="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyRow colSpan={6} message={search || roleFilter || houseFilter ? "No members match these filters." : "No members found."} />
        ) : (
          filtered.map((m) => {
            const house = m.primary_house ? HOUSE_MAP[m.primary_house as HouseId] : null;
            const isSelf = me?.id === m.id;
            return (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <MemberCell name={m.display_name || m.username} email={m.email} avatarKey={m.avatar_r2_key} />
                </td>
                <td className="px-4 py-3">
                  {house ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: house.color }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: house.color }} />
                      {house.name}
                    </span>
                  ) : (
                    <span className="text-text-secondary text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isSelf ? (
                    <span className="text-xs font-bold text-text-secondary capitalize">{m.role.replace("_", " ")} (you)</span>
                  ) : (
                    <TSelect
                      value={m.role}
                      onChange={(e) => update.mutate({ id: m.id, body: { role: e.target.value } })}
                      className="w-auto min-w-[130px] py-1.5 text-xs"
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </TSelect>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isSelf ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[11px] font-bold">Active</span>
                  ) : (
                    <button
                      onClick={() => update.mutate({ id: m.id, body: { is_active: m.is_active !== 1 } })}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${m.is_active === 1 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}
                    >
                      {m.is_active === 1 ? "Active" : "Suspended"}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{fmtDate(m.created_at)}</td>
                <td className="px-4 py-3 text-text-secondary">{m.last_active_at ? fmtDate(m.last_active_at) : "—"}</td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </div>
  );
}
