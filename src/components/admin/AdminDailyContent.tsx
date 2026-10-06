import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminModal,
  AdminTable,
  EmptyRow,
  Field,
  GhostBtn,
  MediaUploadField,
  PrimaryBtn,
  RowActions,
  SectionHeader,
  TArea,
  TInput,
  TSelect,
  adminSend,
  confirmDelete,
  fmtDate,
  useAdminList,
} from "./AdminKit";

interface DailyContent {
  id: string;
  house: string;
  content_type: string;
  title: string;
  body: string;
  media_r2_key: string | null;
  scheduled_date: string | null;
  day_of_week: string | null;
  is_published: number;
  created_at: string;
}

const CONTENT_TYPES = [
  { value: "insight", label: "Insight" },
  { value: "challenge", label: "Challenge" },
  { value: "question", label: "Question" },
  { value: "wellness_tip", label: "Wellness Tip" },
  { value: "humanity_action", label: "Humanity Action" },
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(CONTENT_TYPES.map((t) => [t.value, t.label]));

function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function DailyContentModal({ onClose, editItem }: { onClose: () => void; editItem: DailyContent | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [body, setBody] = useState(editItem?.body ?? "");
  const [contentType, setContentType] = useState<string>(editItem?.content_type ?? "insight");
  const [scheduledDate, setScheduledDate] = useState(editItem?.scheduled_date ?? todayLocal());
  const [mediaKey, setMediaKey] = useState<string | null>(editItem?.media_r2_key ?? null);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        content_type: contentType,
        scheduled_date: scheduledDate || undefined,
        media_r2_key: mediaKey ?? undefined,
      };
      if (editId) return adminSend(`/v1/admin/daily-content/${editId}`, "PATCH", payload);
      return adminSend("/v1/admin/daily-content", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Daily content updated" : "Daily content published");
      qc.invalidateQueries({ queryKey: ["admin", "daily-content"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Daily Content" : "Create Daily Content"}
      size="lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Publish"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-text-secondary rounded-xl bg-subtle/60 border border-border px-3.5 py-2.5">
          Content is published to the member's Home feed on the selected date.
        </p>
        <Field label="Title">
          <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Today's headline" />
        </Field>
        <Field label="Body">
          <TArea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Write the full content — there is no length limit." />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type">
            <TSelect value={contentType} onChange={(e) => setContentType(e.target.value)}>
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </TSelect>
          </Field>
          <Field label="Publish Date">
            <TInput type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
        </div>
        <MediaUploadField value={mediaKey} onChange={setMediaKey} kind="media" label="Media (image or video, optional)" />
      </div>
    </AdminModal>
  );
}

export function AdminDailyContent() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<DailyContent>("daily-content", "/v1/admin/daily-content?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<DailyContent | null>(null);

  const sorted = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? "") || b.created_at.localeCompare(a.created_at)),
    [data],
  );

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/daily-content/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Daily content deleted");
      qc.invalidateQueries({ queryKey: ["admin", "daily-content"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const handleDelete = async (item: DailyContent) => {
    if (await confirmDelete(`daily content "${item.title}"`)) remove.mutate(item.id);
  };

  return (
    <div>
      <SectionHeader
        title="Daily Content"
        subtitle="What members see on Home each day."
        action={
          <PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>
            New Daily Content
          </PrimaryBtn>
        }
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Type</th>
            <th className="text-left px-4 py-3 font-bold">Date</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={4} message="Loading…" />
        ) : sorted.length === 0 ? (
          <EmptyRow colSpan={4} message="Nothing published yet. Create the first daily post." />
        ) : (
          sorted.map((item) => {
            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-text-primary max-w-[320px] truncate">{item.title}</td>
                <td className="px-4 py-3 text-text-secondary">{TYPE_LABEL[item.content_type] ?? item.content_type}</td>
                <td className="px-4 py-3 text-text-secondary">{fmtDate(item.scheduled_date)}</td>
                <td className="px-4 py-3">
                  <RowActions onEdit={() => { setEditItem(item); setModalOpen(true); }} onDelete={() => handleDelete(item)} />
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>

      {modalOpen && (
        <DailyContentModal
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          editItem={editItem}
        />
      )}
    </div>
  );
}
