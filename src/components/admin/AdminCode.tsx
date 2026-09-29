import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  AdminModal,
  AdminTable,
  EmptyRow,
  Field,
  GhostBtn,
  PrimaryBtn,
  RowActions,
  SectionHeader,
  StatusPill,
  TArea,
  TInput,
  Toggle,
  adminSend,
  confirmDelete,
  fmtDate,
} from "./AdminKit";

interface CodeEntry {
  id: string;
  title: string;
  passage: string;
  scheduled_date: string | null;
  is_published: number;
  created_at: string;
}

function CodeModal({ onClose, editItem }: { onClose: () => void; editItem: CodeEntry | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [passage, setPassage] = useState(editItem?.passage ?? "");
  const [scheduledDate, setScheduledDate] = useState(editItem?.scheduled_date ?? "");
  const [isPublished, setIsPublished] = useState(editItem ? editItem.is_published === 1 : true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        passage: passage.trim(),
        scheduled_date: scheduledDate || undefined,
        is_published: isPublished,
      };
      if (editId) return adminSend(`/v1/admin/code/${editId}`, "PATCH", payload);
      return adminSend("/v1/admin/code", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Passage updated" : "Passage created");
      qc.invalidateQueries({ queryKey: ["admin", "code"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  const handleSave = () => {
    if (!title.trim() || !passage.trim()) {
      toast.error("Title and passage are required");
      return;
    }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Code Passage" : "Create Code Passage"}
      size="lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. The Code — On Discipline" />
        </Field>
        <Field label="Passage" hint="Full text. No character limit — write as much as needed.">
          <TArea value={passage} onChange={(e) => setPassage(e.target.value)} rows={10} placeholder="Write the passage…" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <Field label="Scheduled Date" hint="Leave empty to publish immediately.">
            <TInput type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
          <div className="pb-1">
            <Toggle checked={isPublished} onChange={setIsPublished} label="Published" />
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

export function AdminCode() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ data: CodeEntry[] }>({
    queryKey: ["admin", "code"],
    queryFn: () => apiFetch<{ data: CodeEntry[] }>("/v1/admin/code"),
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CodeEntry | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/code/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Passage deleted");
      qc.invalidateQueries({ queryKey: ["admin", "code"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const handleDelete = async (item: CodeEntry) => {
    if (await confirmDelete(`code passage "${item.title}"`)) remove.mutate(item.id);
  };

  const items = data?.data ?? [];

  return (
    <div>
      <SectionHeader
        title="The Code"
        subtitle="Daily passages shown on the Home page."
        action={<PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>New Passage</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Scheduled</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={4} message="Loading…" />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={4} message="No passages yet. Create the first one." />
        ) : (
          items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary max-w-[340px] truncate">{item.title}</p>
                <p className="text-xs text-text-secondary max-w-[340px] truncate mt-0.5">{item.passage}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(item.scheduled_date)}</td>
              <td className="px-4 py-3"><StatusPill ok={item.is_published === 1} /></td>
              <td className="px-4 py-3">
                <RowActions onEdit={() => { setEditItem(item); setModalOpen(true); }} onDelete={() => handleDelete(item)} />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {modalOpen && (
        <CodeModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} />
      )}
    </div>
  );
}
