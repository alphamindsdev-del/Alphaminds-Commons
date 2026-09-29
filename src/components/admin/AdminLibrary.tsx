import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HOUSES, HOUSE_MAP, type HouseId } from "@/lib/constants";
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

interface LibraryArticle {
  id: string;
  house: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_r2_key: string | null;
  author_name: string;
  read_time_min: number;
  is_published: number;
  created_at: string;
}

function LibraryModal({ onClose, editItem }: { onClose: () => void; editItem: LibraryArticle | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [house, setHouse] = useState<string>(editItem?.house ?? "becoming");
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [slug, setSlug] = useState(editItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editItem);
  const [excerpt, setExcerpt] = useState(editItem?.excerpt ?? "");
  const [body, setBody] = useState(editItem?.body ?? "");
  const [authorName, setAuthorName] = useState(editItem?.author_name ?? "AlphaMinds Guides");
  const [readTime, setReadTime] = useState<string>(String(editItem?.read_time_min ?? 5));
  const [coverKey, setCoverKey] = useState<string | null>(editItem?.cover_r2_key ?? null);
  const [published, setPublished] = useState(editItem ? editItem.is_published === 1 : true);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        house,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        body: body.trim(),
        author_name: authorName.trim() || "AlphaMinds Guides",
        read_time_min: parseInt(readTime, 10) || 5,
        cover_r2_key: coverKey ?? undefined,
      };
      if (editId) {
        payload.is_published = published ? 1 : 0;
        return adminSend(`/v1/admin/library/${editId}`, "PATCH", payload);
      }
      return adminSend("/v1/admin/library", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Article updated" : "Article published");
      qc.invalidateQueries({ queryKey: ["admin", "library"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  const handleSave = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    if (!body.trim()) { toast.error("Body is required"); return; }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Library Article" : "New Library Article"}
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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="House">
            <TSelect value={house} onChange={(e) => setHouse(e.target.value)}>
              {HOUSES.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </TSelect>
          </Field>
          <Field label="Author">
            <TInput value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="AlphaMinds Guides" />
          </Field>
        </div>
        <Field label="Title">
          <TInput value={title} onChange={(e) => onTitleChange(e.target.value)} maxLength={200} placeholder="Article title" />
        </Field>
        <Field label="Slug" hint="Used in the article URL. Auto-generated from the title.">
          <TInput
            value={slug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            placeholder="article-slug"
          />
        </Field>
        <Field label="Excerpt" hint="Short summary shown on the Library card (optional).">
          <TArea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="A one or two sentence summary" />
        </Field>
        <Field label="Body" hint="Full article. No length limit.">
          <TArea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Write the full article here" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4 items-start">
          <Field label="Read time (minutes)">
            <TInput type="number" min={1} max={120} value={readTime} onChange={(e) => setReadTime(e.target.value)} />
          </Field>
          {editId && (
            <div className="pt-6">
              <Toggle checked={published} onChange={setPublished} label={published ? "Published" : "Draft (hidden from members)"} />
            </div>
          )}
        </div>
        <MediaUploadField value={coverKey} onChange={setCoverKey} kind="image" label="Cover image (optional)" />
      </div>
    </AdminModal>
  );
}

export function AdminLibrary() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<LibraryArticle>("library", "/v1/admin/library?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<LibraryArticle | null>(null);

  const sorted = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [data],
  );

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/library/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Article deleted");
      qc.invalidateQueries({ queryKey: ["admin", "library"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const handleDelete = async (item: LibraryArticle) => {
    if (await confirmDelete(`article "${item.title}"`)) remove.mutate(item.id);
  };

  return (
    <div>
      <SectionHeader
        title="Library"
        subtitle="Guides and long-form articles organized by House."
        action={
          <PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>
            New Article
          </PrimaryBtn>
        }
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">House</th>
            <th className="text-left px-4 py-3 font-bold">Author</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Created</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} message="Loading…" />
        ) : sorted.length === 0 ? (
          <EmptyRow colSpan={6} message="No articles yet. Write the first one." />
        ) : (
          sorted.map((item) => {
            const house = HOUSE_MAP[item.house as HouseId];
            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-semibold text-text-primary max-w-[280px] truncate">{item.title}</p>
                  <p className="text-xs text-text-secondary truncate max-w-[280px]">/{item.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: house?.color }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: house?.color }} />
                    {house?.name ?? item.house}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{item.author_name}</td>
                <td className="px-4 py-3"><StatusPill ok={item.is_published === 1} /></td>
                <td className="px-4 py-3 text-text-secondary">{fmtDate(item.created_at)}</td>
                <td className="px-4 py-3">
                  <RowActions onEdit={() => { setEditItem(item); setModalOpen(true); }} onDelete={() => handleDelete(item)} />
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>

      {modalOpen && (
        <LibraryModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} />
      )}
    </div>
  );
}
