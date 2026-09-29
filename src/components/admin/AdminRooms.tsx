import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { HOUSES, HOUSE_MAP, type HouseId } from "@/lib/constants";
import { Lock } from "lucide-react";
import {
  AdminModal,
  AdminTable,
  EmptyRow,
  Field,
  GhostBtn,
  PrimaryBtn,
  RowActions,
  SectionHeader,
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

interface RoomItem {
  id: string;
  chapter_id: string | null;
  house: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: number;
  is_active: number;
  created_at: string;
}

function RoomModal({ onClose, editItem }: { onClose: () => void; editItem: RoomItem | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [name, setName] = useState(editItem?.name ?? "");
  const [slug, setSlug] = useState(editItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editItem);
  const [house, setHouse] = useState<string>(editItem?.house ?? "wellness");
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(editItem ? editItem.is_private === 1 : false);

  const handleName = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        house,
        description: description.trim() || null,
        is_private: isPrivate,
      };
      if (editId) return adminSend(`/v1/admin/rooms/${editId}`, "PATCH", payload);
      return adminSend("/v1/admin/rooms", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Room updated" : "Room created");
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) { toast.error("Name is required"); return; }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Room" : "Create Room"}
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create Room"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <TInput value={name} onChange={(e) => handleName(e.target.value)} placeholder="e.g. Wellness Lounge" />
        </Field>
        <Field label="Slug" hint="Used in the room URL.">
          <TInput value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="House">
          <TSelect value={house} onChange={(e) => setHouse(e.target.value)}>
            {HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </TSelect>
        </Field>
        <Field label="Description">
          <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Toggle checked={isPrivate} onChange={setIsPrivate} label="Private room (members only)" />
      </div>
    </AdminModal>
  );
}

export function AdminRooms() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<RoomItem>("rooms", "/v1/admin/rooms?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RoomItem | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/rooms/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Room deleted");
      qc.invalidateQueries({ queryKey: ["admin", "rooms"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const handleDelete = async (item: RoomItem) => {
    if (await confirmDelete(`room "${item.name}"`)) remove.mutate(item.id);
  };

  const items = data?.data ?? [];

  return (
    <div>
      <SectionHeader
        title="Rooms"
        subtitle="House rooms where members gather and talk."
        action={<PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>Create Room</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Name</th>
            <th className="text-left px-4 py-3 font-bold">House</th>
            <th className="text-left px-4 py-3 font-bold">Privacy</th>
            <th className="text-left px-4 py-3 font-bold">Created</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={5} message="Loading…" />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={5} message="No rooms yet. Create the first one." />
        ) : (
          items.map((item) => {
            const house = HOUSE_MAP[item.house as HouseId];
            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">/{item.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: house?.color }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: house?.color }} />
                    {house?.name ?? item.house}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.is_private === 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-text-secondary">
                      <Lock className="h-3 w-3" /> Private
                    </span>
                  ) : (
                    <span className="text-xs text-text-secondary">Open</span>
                  )}
                </td>
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
        <RoomModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} />
      )}
    </div>
  );
}
