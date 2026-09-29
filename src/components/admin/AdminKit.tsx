import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { apiFetch, getApiBaseUrl, getApiToken } from "@/lib/api";
import { cn, getMediaUrl } from "@/lib/utils";
import { toast } from "sonner";

// ─── Field primitives ────────────────────────────────────────────

export const inputCls =
  "w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-primary/50 transition-colors";

export const labelCls =
  "block text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-1.5";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-text-secondary">{hint}</p>}
    </div>
  );
}

export function TInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(inputCls, className)} />;
}

export function TArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cn(inputCls, "resize-y min-h-[90px]", className)} />;
}

export function TSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(inputCls, "appearance-none", className)}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm font-semibold text-text-primary"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary" : "bg-subtle border border-border")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Modal ───────────────────────────────────────────────────────

const SIZES = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

export function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn("relative z-10 w-full rounded-2xl border border-border bg-card card-shadow flex flex-col max-h-[88vh]", SIZES[size])}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-bold text-text-primary">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full hover:bg-subtle flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PrimaryBtn({ children, onClick, disabled, type = "button", className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-4 py-2.5 text-sm transition-opacity disabled:opacity-50", className)}
    >
      {disabled && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 rounded-xl border border-border font-bold px-4 py-2.5 text-sm hover:border-primary/40 transition-colors", className)}>
      {children}
    </button>
  );
}

// ─── Table primitives ────────────────────────────────────────────

export function AdminTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card card-shadow">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="text-text-secondary text-[11px] uppercase tracking-widest bg-subtle/60">
          {head}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function RowActions({ onEdit, onDelete, extra }: { onEdit?: () => void; onDelete?: () => void; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {extra}
      {onEdit && (
        <button onClick={onEdit} className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold hover:border-primary/40 transition-colors">
          Edit
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="rounded-lg border border-destructive/30 text-destructive px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 transition-colors">
          Delete
        </button>
      )}
    </div>
  );
}

export function StatusPill({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold", ok ? "bg-emerald-500/10 text-emerald-600" : "bg-subtle text-text-secondary")}>
      {label ?? (ok ? "Published" : "Draft")}
    </span>
  );
}

// ─── Data helpers ────────────────────────────────────────────────

export function useAdminList<T>(key: string, path: string) {
  return useQuery<{ data: T[] }>({
    queryKey: ["admin", key],
    queryFn: () => apiFetch<{ data: T[] }>(path),
  });
}

export async function adminSend(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  return apiFetch<Record<string, unknown>>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function confirmDelete(what: string): Promise<boolean> {
  return window.confirm(`Delete this ${what}? This cannot be undone.`);
}

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Media upload ────────────────────────────────────────────────

export function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<{ r2_key: string; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.max(3, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Upload failed: invalid response"));
        }
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err.error || msg;
        } catch { /* keep default */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error"));
    xhr.open("POST", `${getApiBaseUrl()}/v1/media/upload`);
    const token = getApiToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(fd);
  });
}

export function MediaUploadField({
  value,
  onChange,
  kind = "image",
  label,
}: {
  value: string | null;
  onChange: (r2Key: string | null) => void;
  kind?: "image" | "video" | "audio" | "media";
  label: string;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const accept =
    kind === "image" ? "image/*" :
    kind === "video" ? "video/*" :
    kind === "audio" ? "audio/*" :
    "image/*,video/*,audio/*";

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const localPreview = kind === "image" || kind === "media" ? URL.createObjectURL(file) : null;
    setPreview(localPreview);
    setPct(1);
    try {
      const res = await uploadWithProgress(file, setPct);
      onChange(res.r2_key);
      toast.success("Media uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
      setPreview(null);
    } finally {
      setPct(null);
    }
  };

  const shownUrl = preview ?? (value ? getMediaUrl(value) : null);

  return (
    <Field label={label}>
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-subtle/50">
        {shownUrl ? (
          kind === "video" ? (
            <video src={shownUrl} className="h-36 w-full object-cover" muted playsInline controls />
          ) : kind === "audio" ? (
            <div className="h-36 flex items-center justify-center px-6">
              <audio src={shownUrl} controls className="w-full" />
            </div>
          ) : (
            <img src={shownUrl} alt={label} className="h-36 w-full object-cover" />
          )
        ) : (
          <div className="h-36 flex flex-col items-center justify-center text-text-secondary gap-2">
            <ImageIcon className="h-7 w-7 opacity-50" />
            <span className="text-xs font-semibold">No media yet</span>
          </div>
        )}

        {pct !== null && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 px-8">
            <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] font-bold text-white uppercase tracking-widest">Uploading {pct}%</p>
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex gap-1.5">
          {value && pct === null && (
            <button
              type="button"
              onClick={() => { onChange(null); setPreview(null); }}
              className="rounded-lg bg-black/60 text-white text-xs font-bold px-2.5 py-1.5 hover:bg-black/75 transition-colors"
            >
              Remove
            </button>
          )}
          <label className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 text-white text-xs font-bold px-2.5 py-1.5 cursor-pointer hover:bg-black/75 transition-colors">
            <Upload className="h-3.5 w-3.5" /> {value ? "Replace" : "Upload"}
            <input type="file" accept={accept} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    </Field>
  );
}

// ─── Misc ────────────────────────────────────────────────────────

export function MemberCell({ name, email, avatarKey }: { name: string; email?: string | null; avatarKey?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {avatarKey ? (
        <img src={getMediaUrl(avatarKey)} alt={name} className="h-8 w-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-text-primary truncate">{name}</p>
        {email && <p className="text-xs text-text-secondary truncate">{email}</p>}
      </div>
    </div>
  );
}

export function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap",
        active ? "bg-primary text-primary-foreground" : "border border-border text-text-secondary hover:text-text-primary hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-text-secondary text-sm">
        {message}
      </td>
    </tr>
  );
}
