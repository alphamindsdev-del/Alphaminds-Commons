import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
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
  StatusPill,
  TArea,
  TInput,
  TSelect,
  Toggle,
  adminSend,
  confirmDelete,
  fmtDate,
  slugify,
  useAdminList,
} from "./AdminKit";

interface Plan {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_r2_key: string | null;
  difficulty: string;
  estimated_duration: string | null;
  is_published: number;
  created_at: string;
}

interface PlanSection {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  sort_order: number;
}

interface PlanItem {
  id: string;
  plan_id: string;
  section_id: string | null;
  title: string;
  body: string;
  content_type: string;
  media_r2_key: string | null;
  sort_order: number;
}

interface PlanFull extends Plan {
  sections: PlanSection[];
  items: PlanItem[];
}

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const ITEM_TYPES = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "article", label: "Article" },
  { value: "image", label: "Image" },
] as const;

// ─── Section sub-form ────────────────────────────────────────────

function SectionForm({ planId, section, nextOrder, onBack }: { planId: string; section: PlanSection | null; nextOrder: number; onBack: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(section?.title ?? "");
  const [description, setDescription] = useState(section?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(section?.sort_order ?? nextOrder));

  const save = useMutation({
    mutationFn: () => {
      const payload = { title: title.trim(), description: description.trim(), sort_order: parseInt(sortOrder, 10) || 0 };
      if (section) return adminSend(`/v1/admin/plans/${planId}/sections/${section.id}`, "PATCH", payload);
      return adminSend(`/v1/admin/plans/${planId}/sections`, "POST", payload);
    },
    onSuccess: () => {
      toast.success(section ? "Section updated" : "Section added");
      qc.invalidateQueries({ queryKey: ["admin", "plan", planId] });
      onBack();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save section"),
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to plan
      </button>
      <Field label="Title">
        <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Section title" />
      </Field>
      <Field label="Description">
        <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional summary of this section" />
      </Field>
      <Field label="Sort order">
        <TInput type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostBtn onClick={onBack}>Cancel</GhostBtn>
        <PrimaryBtn
          onClick={() => { if (!title.trim()) { toast.error("Title is required"); return; } save.mutate(); }}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : section ? "Save section" : "Add section"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─── Item sub-form ───────────────────────────────────────────────

function ItemForm({ planId, item, sections, nextOrder, onBack }: { planId: string; item: PlanItem | null; sections: PlanSection[]; nextOrder: number; onBack: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [contentType, setContentType] = useState<string>(item?.content_type ?? "article");
  const [sectionId, setSectionId] = useState(item?.section_id ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sort_order ?? nextOrder));
  const [mediaKey, setMediaKey] = useState<string | null>(item?.media_r2_key ?? null);

  const mediaKind: "video" | "audio" | "image" | null =
    contentType === "video" ? "video" : contentType === "audio" ? "audio" : contentType === "image" ? "image" : null;

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        content_type: contentType,
        sort_order: parseInt(sortOrder, 10) || 0,
      };
      if (sectionId) payload.section_id = sectionId;
      if (mediaKind && mediaKey) payload.media_r2_key = mediaKey;
      if (item) return adminSend(`/v1/admin/plans/${planId}/items/${item.id}`, "PATCH", payload);
      return adminSend(`/v1/admin/plans/${planId}/items`, "POST", payload);
    },
    onSuccess: () => {
      toast.success(item ? "Item updated" : "Item added");
      qc.invalidateQueries({ queryKey: ["admin", "plan", planId] });
      onBack();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save item"),
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to plan
      </button>
      <Field label="Title">
        <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Item title" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Content type">
          <TSelect value={contentType} onChange={(e) => { setContentType(e.target.value); }}>
            {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </TSelect>
        </Field>
        <Field label="Section" hint={sections.length === 0 ? "Create a section first to group items." : undefined}>
          <TSelect value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">— No section —</option>
            {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </TSelect>
        </Field>
      </div>
      <Field label="Body" hint="The reading content or a description of the media. No length limit.">
        <TArea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Content for this item" />
      </Field>
      <Field label="Sort order">
        <TInput type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </Field>
      {mediaKind && (
        <MediaUploadField
          value={mediaKey}
          onChange={setMediaKey}
          kind={mediaKind}
          label={`${ITEM_TYPES.find((t) => t.value === contentType)?.label} file`}
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <GhostBtn onClick={onBack}>Cancel</GhostBtn>
        <PrimaryBtn
          onClick={() => { if (!title.trim()) { toast.error("Title is required"); return; } save.mutate(); }}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : item ? "Save item" : "Add item"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─── Plan details form ───────────────────────────────────────────

function PlanDetailsForm({ plan }: { plan: PlanFull }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(plan.title);
  const [slug, setSlug] = useState(plan.slug);
  const [description, setDescription] = useState(plan.description ?? "");
  const [difficulty, setDifficulty] = useState(plan.difficulty ?? "beginner");
  const [duration, setDuration] = useState(plan.estimated_duration ?? "");
  const [coverKey, setCoverKey] = useState<string | null>(plan.cover_image_r2_key);
  const [published, setPublished] = useState(plan.is_published === 1);

  const save = useMutation({
    mutationFn: () =>
      adminSend(`/v1/admin/plans/${plan.id}`, "PATCH", {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        difficulty,
        estimated_duration: duration.trim() || undefined,
        cover_image_r2_key: coverKey ?? undefined,
        is_published: published,
      }),
    onSuccess: () => {
      toast.success("Plan updated");
      qc.invalidateQueries({ queryKey: ["admin", "plan", plan.id] });
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save plan"),
  });

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Title">
          <TInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Slug" hint="Lowercase letters, numbers and dashes only.">
          <TInput value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="plan-slug" />
        </Field>
      </div>
      <Field label="Description">
        <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Difficulty">
          <TSelect value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
          </TSelect>
        </Field>
        <Field label="Estimated duration" hint="e.g. 4 weeks, 12 hours">
          <TInput value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="4 weeks" />
        </Field>
      </div>
      <MediaUploadField value={coverKey} onChange={setCoverKey} kind="image" label="Cover image (optional)" />
      <div className="flex items-center justify-between pt-1">
        <Toggle checked={published} onChange={setPublished} label={published ? "Published" : "Draft (hidden from members)"} />
        <PrimaryBtn
          onClick={() => {
            if (!title.trim() || !slug.trim()) { toast.error("Title and slug are required"); return; }
            save.mutate();
          }}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save plan details"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─── Detail modal ────────────────────────────────────────────────

type SubEditor = { kind: "section"; section: PlanSection | null } | { kind: "item"; item: PlanItem | null } | null;

function PlanDetailModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [sub, setSub] = useState<SubEditor>(null);

  const { data: plan, isLoading } = useQuery<PlanFull>({
    queryKey: ["admin", "plan", planId],
    queryFn: () => apiFetch<PlanFull>(`/v1/admin/plans/${planId}`),
  });

  const removeSection = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/plans/${planId}/sections/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Section deleted");
      qc.invalidateQueries({ queryKey: ["admin", "plan", planId] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/plans/${planId}/items/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["admin", "plan", planId] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const sections = plan?.sections ?? [];
  const items = plan?.items ?? [];
  const nextSectionOrder = sections.length ? Math.max(...sections.map((s) => s.sort_order)) + 1 : 1;
  const nextItemOrder = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 1;
  const sectionName = (id: string | null) => sections.find((s) => s.id === id)?.title;

  return (
    <AdminModal open onClose={onClose} title={plan ? `Edit Plan — ${plan.title}` : "Plan"} size="xl">
      {isLoading || !plan ? (
        <p className="py-10 text-center text-sm text-text-secondary">Loading plan…</p>
      ) : sub?.kind === "section" ? (
        <SectionForm planId={planId} section={sub.section} nextOrder={nextSectionOrder} onBack={() => setSub(null)} />
      ) : sub?.kind === "item" ? (
        <ItemForm planId={planId} item={sub.item} sections={sections} nextOrder={nextItemOrder} onBack={() => setSub(null)} />
      ) : (
        <div className="space-y-8">
          <PlanDetailsForm plan={plan} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary">Sections</h3>
              <button
                onClick={() => setSub({ kind: "section", section: null })}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add section
              </button>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-text-secondary rounded-xl border border-dashed border-border px-4 py-6 text-center">
                No sections yet. Sections group the items below into chapters.
              </p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-black text-text-secondary tabular-nums w-6">{s.sort_order}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-text-primary truncate">{s.title}</p>
                      {s.description && <p className="text-xs text-text-secondary truncate">{s.description}</p>}
                    </div>
                    <RowActions
                      onEdit={() => setSub({ kind: "section", section: s })}
                      onDelete={async () => { if (await confirmDelete(`section "${s.title}"`)) removeSection.mutate(s.id); }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary">Items</h3>
              <button
                onClick={() => setSub({ kind: "item", item: null })}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-text-secondary rounded-xl border border-dashed border-border px-4 py-6 text-center">
                No items yet. Items are the lessons, videos and readings members work through.
              </p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-black text-text-secondary tabular-nums w-6">{it.sort_order}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-text-primary truncate">{it.title}</p>
                      <p className="text-xs text-text-secondary truncate">
                        {ITEM_TYPES.find((t) => t.value === it.content_type)?.label ?? it.content_type}
                        {sectionName(it.section_id) ? ` · ${sectionName(it.section_id)}` : ""}
                        {it.media_r2_key ? " · media attached" : ""}
                      </p>
                    </div>
                    <RowActions
                      onEdit={() => setSub({ kind: "item", item: it })}
                      onDelete={async () => { if (await confirmDelete(`item "${it.title}"`)) removeItem.mutate(it.id); }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminModal>
  );
}

// ─── Plan create modal ───────────────────────────────────────────

function PlanCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [duration, setDuration] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const res = await adminSend("/v1/admin/plans", "POST", {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        difficulty,
        estimated_duration: duration.trim() || undefined,
        is_published: false,
      });
      return res as { id: string };
    },
    onSuccess: (plan) => {
      toast.success("Plan created — now add sections and items");
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      onCreated(plan.id);
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to create plan"),
  });

  return (
    <AdminModal
      open
      onClose={onClose}
      title="New Plan"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            onClick={() => {
              if (!title.trim() || !slug.trim()) { toast.error("Title and slug are required"); return; }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Creating…" : "Create plan"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TInput value={title} onChange={(e) => { setTitle(e.target.value); if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value)); }} maxLength={200} placeholder="Plan title" />
        </Field>
        <Field label="Slug" hint="Lowercase letters, numbers and dashes only.">
          <TInput value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="plan-slug" />
        </Field>
        <Field label="Description">
          <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will members achieve with this plan?" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Difficulty">
            <TSelect value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
            </TSelect>
          </Field>
          <Field label="Estimated duration" hint="e.g. 4 weeks, 12 hours">
            <TInput value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="4 weeks" />
          </Field>
        </div>
        <p className="text-xs text-text-secondary rounded-xl bg-subtle/60 border border-border px-3.5 py-2.5">
          New plans start as drafts. You'll add sections and items next, then publish when ready.
        </p>
      </div>
    </AdminModal>
  );
}

// ─── Main tab ────────────────────────────────────────────────────

export function AdminPlans() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<Plan>("plans", "/v1/admin/plans?limit=100");
  const [createOpen, setCreateOpen] = useState(false);
  const [manageId, setManageId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/plans/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Plan deleted");
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  return (
    <div>
      <SectionHeader
        title="Plans"
        subtitle="Structured growth programs made of sections and items."
        action={<PrimaryBtn onClick={() => setCreateOpen(true)}>New Plan</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Difficulty</th>
            <th className="text-left px-4 py-3 font-bold">Duration</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Created</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} message="Loading…" />
        ) : (data?.data ?? []).length === 0 ? (
          <EmptyRow colSpan={6} message="No plans yet. Create the first one." />
        ) : (
          (data?.data ?? []).map((plan) => (
            <tr key={plan.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary max-w-[280px] truncate">{plan.title}</p>
                <p className="text-xs text-text-secondary truncate max-w-[280px]">/{plan.slug}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary capitalize">{plan.difficulty}</td>
              <td className="px-4 py-3 text-text-secondary">{plan.estimated_duration || "—"}</td>
              <td className="px-4 py-3"><StatusPill ok={plan.is_published === 1} /></td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(plan.created_at)}</td>
              <td className="px-4 py-3">
                <RowActions
                  extra={
                    <button
                      onClick={() => setManageId(plan.id)}
                      className="rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold hover:bg-primary/20 transition-colors"
                    >
                      Manage
                    </button>
                  }
                  onDelete={async () => { if (await confirmDelete(`plan "${plan.title}"`)) remove.mutate(plan.id); }}
                />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {createOpen && (
        <PlanCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => { setCreateOpen(false); setManageId(id); }}
        />
      )}
      {manageId && <PlanDetailModal planId={manageId} onClose={() => setManageId(null)} />}
    </div>
  );
}
