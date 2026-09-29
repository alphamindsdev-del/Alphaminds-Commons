import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  StatusPill,
  TArea,
  TInput,
  TSelect,
  Toggle,
  adminSend,
  confirmDelete,
  useAdminList,
} from "./AdminKit";

interface JourneyActivity {
  id: string;
  level: string;
  title: string;
  description: string | null;
  type: string;
  instructions: string | null;
  position: number;
  is_required: number;
  is_published: number;
  content: string | null;
  created_at: string;
}

const LEVELS = [
  { value: "SEEKER", label: "Seeker" },
  { value: "EXAMINER", label: "Examiner" },
  { value: "FACILITATOR", label: "Facilitator" },
  { value: "STEWARD", label: "Steward" },
  { value: "CHAPTER_LEADER", label: "Chapter Leader" },
  { value: "COORDINATOR", label: "Coordinator" },
] as const;

const TYPES = [
  { value: "course", label: "Course" },
  { value: "lesson", label: "Lesson" },
  { value: "reading", label: "Reading" },
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "assessment", label: "Assessment" },
  { value: "rel_fi", label: "Rel-Fi" },
  { value: "claim_file", label: "Claim File" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "article", label: "Article" },
  { value: "resource", label: "Resource" },
  { value: "custom", label: "Custom" },
] as const;

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

function JourneyModal({ onClose, editItem, nextPosition }: { onClose: () => void; editItem: JourneyActivity | null; nextPosition: number }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [level, setLevel] = useState<string>(editItem?.level ?? "SEEKER");
  const [type, setType] = useState<string>(editItem?.type ?? "lesson");
  const [position, setPosition] = useState(String(editItem?.position ?? nextPosition));
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [instructions, setInstructions] = useState(editItem?.instructions ?? "");
  const [content, setContent] = useState(editItem?.content ?? "");
  const [required, setRequired] = useState(editItem ? editItem.is_required === 1 : true);
  const [published, setPublished] = useState(editItem ? editItem.is_published === 1 : false);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        level,
        type,
        position: Math.max(1, parseInt(position, 10) || 1),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        content: content.trim() || undefined,
        is_required: required,
        is_published: published,
      };
      if (editId) return adminSend(`/v1/admin/journey-activities/${editId}`, "PATCH", payload);
      return adminSend("/v1/admin/journey-activities", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Activity updated" : "Activity created");
      qc.invalidateQueries({ queryKey: ["admin", "journey"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Journey Activity" : "New Journey Activity"}
      size="lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            onClick={() => { if (!title.trim()) { toast.error("Title is required"); return; } save.mutate(); }}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create activity"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Activity title" />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Level">
            <TSelect value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </TSelect>
          </Field>
          <Field label="Type">
            <TSelect value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </TSelect>
          </Field>
          <Field label="Position">
            <TInput type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
        </div>
        <Field label="Description">
          <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What this activity is about" />
        </Field>
        <Field label="Instructions" hint="Shown to the member when they open the activity.">
          <TArea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Step-by-step instructions" />
        </Field>
        <Field label="Content" hint="Optional embedded content or resource text. No length limit.">
          <TArea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Content body" />
        </Field>
        <div className="flex flex-wrap gap-6 pt-1">
          <Toggle checked={required} onChange={setRequired} label="Required to advance" />
          <Toggle checked={published} onChange={setPublished} label={published ? "Published" : "Draft (hidden from members)"} />
        </div>
      </div>
    </AdminModal>
  );
}

export function AdminJourney() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<JourneyActivity>("journey", "/v1/admin/journey-activities?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<JourneyActivity | null>(null);

  const sorted = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => a.position - b.position),
    [data],
  );
  const nextPosition = sorted.length ? Math.max(...sorted.map((a) => a.position)) + 1 : 1;

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/journey-activities/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Activity deleted");
      qc.invalidateQueries({ queryKey: ["admin", "journey"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  return (
    <div>
      <SectionHeader
        title="Journey"
        subtitle="The step-by-step membership path from Seeker to Coordinator."
        action={<PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>New Activity</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Pos</th>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Level</th>
            <th className="text-left px-4 py-3 font-bold">Type</th>
            <th className="text-left px-4 py-3 font-bold">Required</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={7} message="Loading…" />
        ) : sorted.length === 0 ? (
          <EmptyRow colSpan={7} message="No journey activities yet. Create the first step of the path." />
        ) : (
          sorted.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3 text-text-secondary tabular-nums font-bold">{item.position}</td>
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary max-w-[280px] truncate">{item.title}</p>
                {item.description && <p className="text-xs text-text-secondary truncate max-w-[280px]">{item.description}</p>}
              </td>
              <td className="px-4 py-3 text-text-secondary">{LEVEL_LABEL[item.level] ?? item.level}</td>
              <td className="px-4 py-3 text-text-secondary">{TYPE_LABEL[item.type] ?? item.type}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-bold ${item.is_required === 1 ? "text-text-primary" : "text-text-secondary"}`}>
                  {item.is_required === 1 ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-3"><StatusPill ok={item.is_published === 1} /></td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => { setEditItem(item); setModalOpen(true); }}
                  onDelete={async () => { if (await confirmDelete(`activity "${item.title}"`)) remove.mutate(item.id); }}
                />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {modalOpen && (
        <JourneyModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} nextPosition={nextPosition} />
      )}
    </div>
  );
}
