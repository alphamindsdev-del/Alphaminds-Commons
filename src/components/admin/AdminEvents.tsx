import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  AdminModal,
  MemberCell,
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
  fromLocalInput,
  slugify,
  toLocalInput,
  useAdminList,
} from "./AdminKit";

interface EventItem {
  id: string;
  chapter_id: string | null;
  house: string | null;
  title: string;
  slug: string;
  description: string | null;
  event_type: string;
  format: string;
  location_name: string | null;
  location_address: string | null;
  online_url: string | null;
  registration_url: string | null;
  starts_at: string;
  ends_at: string;
  rsvp_limit: number | null;
  cover_r2_key: string | null;
  is_published: number;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "alpha_circle", label: "Alpha Circle" },
  { value: "beatlift", label: "BetaLift" },
  { value: "humanity_day", label: "Humanity Day" },
  { value: "book_club", label: "Book Club" },
  { value: "workshop", label: "Workshop" },
  { value: "swimming", label: "Swimming" },
  { value: "games", label: "Games" },
  { value: "summit", label: "Summit" },
  { value: "festival", label: "Festival" },
  { value: "other", label: "Other" },
] as const;

const FORMATS = [
  { value: "physical", label: "Physical" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.label]));

function EventModal({ onClose, editItem }: { onClose: () => void; editItem: EventItem | null }) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [slug, setSlug] = useState(editItem?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!editItem);
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [eventType, setEventType] = useState(editItem?.event_type ?? "alpha_circle");
  const [format, setFormat] = useState(editItem?.format ?? "physical");
  const [startsAt, setStartsAt] = useState(toLocalInput(editItem?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(editItem?.ends_at));
  const [locationName, setLocationName] = useState(editItem?.location_name ?? "");
  const [locationAddress, setLocationAddress] = useState(editItem?.location_address ?? "");
  const [onlineUrl, setOnlineUrl] = useState(editItem?.online_url ?? "");
  const [registrationUrl, setRegistrationUrl] = useState(editItem?.registration_url ?? "");
  const [rsvpLimit, setRsvpLimit] = useState(editItem?.rsvp_limit != null ? String(editItem.rsvp_limit) : "");
  const [coverKey, setCoverKey] = useState<string | null>(editItem?.cover_r2_key ?? null);

  const handleTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        event_type: eventType,
        format,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        location_name: locationName.trim() || null,
        location_address: locationAddress.trim() || null,
        online_url: onlineUrl.trim() || null,
        registration_url: registrationUrl.trim() || null,
        rsvp_limit: rsvpLimit ? Number(rsvpLimit) : null,
        cover_r2_key: coverKey,
      };
      if (editId) return adminSend(`/v1/admin/events/${editId}`, "PATCH", payload);
      return adminSend("/v1/admin/events", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editId ? "Event updated" : "Event created");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to save"),
  });

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) { toast.error("Title is required"); return; }
    if (!startsAt || !endsAt) { toast.error("Start and end time are required"); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { toast.error("End time must be after start time"); return; }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editId ? "Edit Event" : "Create Event"}
      size="lg"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create Event"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title">
            <TInput value={title} onChange={(e) => handleTitle(e.target.value)} placeholder="Event name" />
          </Field>
          <Field label="Slug" hint="Used in the event URL.">
            <TInput
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
              placeholder="event-slug"
            />
          </Field>
        </div>
        <Field label="Description">
          <TArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type">
            <TSelect value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </TSelect>
          </Field>
          <Field label="Format">
            <TSelect value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </TSelect>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Starts At">
            <TInput type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Ends At">
            <TInput type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Location Name">
            <TInput value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="e.g. Hub Auditorium" />
          </Field>
          <Field label="Location Address">
            <TInput value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Online URL">
            <TInput value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Registration URL">
            <TInput value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} placeholder="https://" />
          </Field>
          <Field label="RSVP Limit">
            <TInput type="number" min={1} value={rsvpLimit} onChange={(e) => setRsvpLimit(e.target.value)} placeholder="Unlimited" />
          </Field>
        </div>
        <MediaUploadField value={coverKey} onChange={setCoverKey} kind="image" label="Cover Image (optional)" />
      </div>
    </AdminModal>
  );
}

function RegistrationsModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ["admin", "event-registrations", event.id],
    queryFn: () => apiFetch<{ data: any[] }>(`/v1/admin/events/${event.id}/registrations`),
  });

  const rows = data?.data ?? [];

  return (
    <AdminModal open onClose={onClose} title={`RSVPs — ${event.title}`} size="lg">
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Member</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">RSVP’d</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={3} message="Loading RSVPs…" />
        ) : rows.length === 0 ? (
          <EmptyRow colSpan={3} message="No RSVPs yet." />
        ) : (
          rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-3">
                <MemberCell name={r.display_name ?? "Member"} email={r.email} avatarKey={r.avatar_r2_key} />
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "going" ? "bg-emerald-500/10 text-emerald-600" : r.status === "maybe" ? "bg-amber-500/10 text-amber-600" : "bg-subtle text-text-secondary"}`}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(r.rsvped_at)}</td>
            </tr>
          ))
        )}
      </AdminTable>
    </AdminModal>
  );
}

export function AdminEvents() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<EventItem>("events", "/v1/admin/events?limit=100");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventItem | null>(null);
  const [rsvpItem, setRsvpItem] = useState<EventItem | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/events/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin", "events"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const handleDelete = async (item: EventItem) => {
    if (await confirmDelete(`event "${item.title}"`)) remove.mutate(item.id);
  };

  const items = data?.data ?? [];

  return (
    <div>
      <SectionHeader
        title="Events"
        subtitle="Create and manage gatherings, circles, and summits."
        action={<PrimaryBtn onClick={() => { setEditItem(null); setModalOpen(true); }}>Create Event</PrimaryBtn>}
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Type</th>
            <th className="text-left px-4 py-3 font-bold">Starts</th>
            <th className="text-left px-4 py-3 font-bold">Format</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={5} message="Loading…" />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={5} message="No events yet. Create the first one." />
        ) : (
          items.map((item) => {
            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-text-primary max-w-[260px] truncate">{item.title}</td>
                <td className="px-4 py-3 text-text-secondary">{TYPE_LABEL[item.event_type] ?? item.event_type}</td>
                <td className="px-4 py-3 text-text-secondary">{fmtDate(item.starts_at)}</td>
                <td className="px-4 py-3 text-text-secondary capitalize">{item.format}</td>
                <td className="px-4 py-3">
                  <RowActions
                    extra={
                      <button
                        onClick={() => setRsvpItem(item)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-primary/40 transition-colors"
                      >
                        RSVPs
                      </button>
                    }
                    onEdit={() => { setEditItem(item); setModalOpen(true); }}
                    onDelete={() => handleDelete(item)}
                  />
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>

      {modalOpen && (
        <EventModal onClose={() => { setModalOpen(false); setEditItem(null); }} editItem={editItem} />
      )}
      {rsvpItem && <RegistrationsModal event={rsvpItem} onClose={() => setRsvpItem(null)} />}
    </div>
  );
}
