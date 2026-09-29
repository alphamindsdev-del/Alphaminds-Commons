import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminModal,
  AdminTable,
  EmptyRow,
  Field,
  GhostBtn,
  PrimaryBtn,
  RowActions,
  SectionHeader,
  TInput,
  TSelect,
  Toggle,
  adminSend,
  confirmDelete,
  fmtDate,
  slugify,
  useAdminList,
} from "./AdminKit";

interface Chapter {
  id: string;
  slug: string;
  name: string;
  type: string;
  country_code: string | null;
  city: string | null;
  university: string | null;
  timezone: string;
  is_active: number;
  created_at: string;
}

const CHAPTER_TYPES = [
  { value: "university", label: "University" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "global", label: "Global" },
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(CHAPTER_TYPES.map((t) => [t.value, t.label]));

function ChapterModal({ onClose, editItem }: { onClose: () => void; editItem: Chapter | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [name, setName] = useState(editItem?.name ?? "");
  const [slug, setSlug] = useState(editItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editItem);
  const [type, setType] = useState(editItem?.type ?? "city");
  const [countryCode, setCountryCode] = useState(editItem?.country_code ?? "");
  const [city, setCity] = useState(editItem?.city ?? "");
  const [timezone, setTimezone] = useState(editItem?.timezone ?? "UTC");
  const [active, setActive] = useState(editItem ? editItem.is_active === 1 : true);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        type,
        country_code: countryCode.trim() || undefined,
        city: city.trim() || undefined,
        timezone: timezone.trim() || "UTC",
      };
      if (editId) {
        payload.is_active = active;
        return adminSend(`/v1/admin/chapters/${editId}`, "PATCH", payload);
      }
      return adminSend("/v1/admin/chapters", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Chapter updated" : "Chapter created");
      qc.invalidateQueries({ queryKey: ["admin", "chapters"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Chapter" : "New Chapter"}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            onClick={() => {
              if (!name.trim()) { toast.error("Name is required"); return; }
              if (!slug.trim()) { toast.error("Slug is required"); return; }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create chapter"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <TInput
            value={name}
            onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
            placeholder="e.g. Lagos City Chapter"
          />
        </Field>
        <Field label="Slug" hint="Used in URLs. Auto-generated from the name.">
          <TInput value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="lagos-city" />
        </Field>
        <Field label="Type">
          <TSelect value={type} onChange={(e) => setType(e.target.value)}>
            {CHAPTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </TSelect>
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Country code" hint="e.g. NG, US, GB">
            <TInput value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={2} placeholder="NG" />
          </Field>
          <Field label="City">
            <TInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" />
          </Field>
          <Field label="Timezone">
            <TInput value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Africa/Lagos" />
          </Field>
        </div>
        {editId && <Toggle checked={active} onChange={setActive} label={active ? "Active" : "Inactive (hidden from members)"} />}
      </div>
    </AdminModal>
  );
}

export function AdminChapters() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<Chapter>("chapters", "/v1/admin/chapters?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Chapter | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/chapters/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Chapter deleted");
      qc.invalidateQueries({ queryKey: ["admin", "chapters"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  return (
    <div>
      <SectionHeader
        title="Chapters"
        subtitle="Local communities that members can join."
        action={<PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>New Chapter</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Name</th>
            <th className="text-left px-4 py-3 font-bold">Type</th>
            <th className="text-left px-4 py-3 font-bold">Location</th>
            <th className="text-left px-4 py-3 font-bold">Timezone</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Created</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={7} message="Loading…" />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyRow colSpan={7} message="No chapters yet. Create the first one." />
        ) : (
          (data?.data ?? []).map((chapter) => (
            <tr key={chapter.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary">{chapter.name}</p>
                <p className="text-xs text-text-secondary">/{chapter.slug}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary">{TYPE_LABEL[chapter.type] ?? chapter.type}</td>
              <td className="px-4 py-3 text-text-secondary">
                {[chapter.city, chapter.country_code].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-text-secondary">{chapter.timezone}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${chapter.is_active === 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-subtle text-text-secondary"}`}>
                  {chapter.is_active === 1 ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(chapter.created_at)}</td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => { setEditItem(chapter); setModalOpen(true); }}
                  onDelete={async () => { if (await confirmDelete(`chapter "${chapter.name}"`)) remove.mutate(chapter.id); }}
                />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {modalOpen && (
        <ChapterModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} />
      )}
    </div>
  );
}
