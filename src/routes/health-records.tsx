import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Eye,
  FileImage,
  FileText,
  FolderHeart,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { apiFetch, getApiBaseUrl, getApiToken } from "@/lib/api";
import { AssetImage } from "@/components/alphabody/AssetImage";

export const Route = createFileRoute("/health-records")({
  head: () => ({
    meta: [
      { title: "Health Records · AlphaBody" },
      {
        name: "description",
        content:
          "Upload and organise your medical reports, lab results and prescriptions securely.",
      },
    ],
  }),
  component: HealthRecordsPage,
});

const RECORDS_IMAGE = "/assets/images/health-records.webp";

const categories = [
  { value: "lab_result", label: "Lab result" },
  { value: "prescription", label: "Prescription" },
  { value: "report", label: "Medical report" },
  { value: "imaging", label: "Imaging" },
  { value: "consultation_note", label: "Consultation note" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof categories)[number]["value"];

interface HealthRecord {
  id: string;
  title: string;
  category: Category;
  notes: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  recorded_at: string | null;
  created_at: string;
  file_url: string;
}

function categoryLabel(value: Category) {
  return categories.find((category) => category.value === value)?.label ?? "Record";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function openRecord(record: HealthRecord) {
  const token = getApiToken();
  const response = await fetch(`${getApiBaseUrl()}${record.file_url}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error("Could not open this file");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function HealthRecordsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("lab_result");
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery<{ data: HealthRecord[] }>({
    queryKey: ["health/records"],
    queryFn: () => apiFetch<{ data: HealthRecord[] }>("/v1/health/records"),
    staleTime: 30_000,
  });

  const upload = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ record: HealthRecord }>("/v1/health/records", {
        method: "POST",
        body: formData,
      }),
    onSuccess: () => {
      toast.success("Record uploaded");
      setTitle("");
      setNotes("");
      setRecordedAt("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["health/records"] });
      setShowForm(false);
    },
    onError: (error: Error) => toast.error(error.message || "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/v1/health/records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Record removed");
      queryClient.invalidateQueries({ queryKey: ["health/records"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not remove record"),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be 20MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim() || file.name);
    formData.append("category", category);
    if (notes.trim()) formData.append("notes", notes.trim());
    if (recordedAt) formData.append("recorded_at", recordedAt);
    upload.mutate(formData);
  };

  const records = data?.data ?? [];

  return (
    <div className="mx-auto max-w-[960px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#EDEAF8] p-5 sm:p-8">
        <div className="grid items-center gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5B4FE0]">
              AlphaBody Records
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.02] tracking-tight text-[#2D255C] sm:text-4xl">
              Health Records
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#5B5478]">
              Keep your medical reports, lab results, prescriptions and consultation notes in one
              private place, ready when you need them.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#5B4FE0]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <Lock className="h-3.5 w-3.5" /> Only you can access
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> 20MB per file
              </span>
            </div>
          </div>
          <div className="relative h-44 overflow-hidden rounded-[22px] bg-white/50 sm:h-56">
            <AssetImage
              src={RECORDS_IMAGE}
              alt="A folder of medical records"
              loading="eager"
              className="h-full w-full"
              imgClassName="h-full w-full object-cover object-center"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#ffffff,#e1ddf5_75%)]">
                  <span className="grid h-20 w-20 place-items-center rounded-3xl bg-[#5B4FE0] text-white shadow-sm">
                    <FolderHeart className="h-10 w-10" />
                  </span>
                </div>
              }
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-text-primary">Your records</h2>
          <p className="mt-1 text-xs text-text-secondary">
            {records.length} {records.length === 1 ? "document" : "documents"} stored privately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#5B4FE0] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" /> {showForm ? "Close" : "Upload record"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-[24px] border border-divider bg-card p-5 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                File
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-divider bg-subtle/40 px-4 py-8 text-center transition hover:border-[#5B4FE0]/50"
              >
                <UploadCloud className="h-7 w-7 text-[#5B4FE0]" />
                <span className="text-sm font-semibold text-text-primary">
                  {file ? file.name : "Choose a PDF, image, Word or text file"}
                </span>
                <span className="text-[11px] text-text-secondary">
                  {file ? formatSize(file.size) : "Up to 20MB"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*,.doc,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="e.g. Annual blood panel"
                className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#5B4FE0]"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
                className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#5B4FE0]"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Record date <span className="font-normal normal-case">(optional)</span>
              </span>
              <input
                type="date"
                value={recordedAt}
                onChange={(event) => setRecordedAt(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#5B4FE0]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Notes <span className="font-normal normal-case">(optional)</span>
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Anything you want to remember about this record."
                className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#5B4FE0]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={upload.isPending}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5B4FE0] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {upload.isPending ? "Uploading…" : "Save record"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-subtle" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <section className="rounded-[24px] border border-dashed border-divider bg-subtle/40 p-8 text-center">
          <FolderHeart className="mx-auto h-9 w-9 text-[#5B4FE0]" />
          <h2 className="mt-3 font-display text-xl font-bold text-text-primary">No records yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Upload your first document to keep your health history organised and easy to find.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-full bg-[#5B4FE0] px-4 py-2 text-sm font-bold text-white"
          >
            Upload a record
          </button>
        </section>
      ) : (
        <div className="space-y-2.5">
          {records.map((record) => (
            <article
              key={record.id}
              className="flex items-center gap-3 rounded-2xl border border-divider bg-card p-3.5 sm:p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EDEAF8] text-[#5B4FE0]">
                {record.mime_type.startsWith("image/") ? (
                  <FileImage className="h-5 w-5" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary">{record.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                  {categoryLabel(record.category)} · {formatSize(record.size_bytes)}
                  {record.recorded_at
                    ? ` · ${new Date(`${record.recorded_at}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openRecord(record).catch((error) => toast.error(error.message))}
                  className="grid h-9 w-9 place-items-center rounded-full text-text-secondary hover:bg-subtle"
                  aria-label={`View ${record.title}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openRecord(record).catch((error) => toast.error(error.message))}
                  className="hidden h-9 w-9 place-items-center rounded-full text-text-secondary hover:bg-subtle sm:grid"
                  aria-label={`Download ${record.title}`}
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this record? This cannot be undone.")) {
                      remove.mutate(record.id);
                    }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-text-secondary hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${record.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl border border-divider bg-[#F7F5EE] px-4 py-3 text-[11px] leading-relaxed text-text-secondary">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#5B4FE0]" />
        <p>
          Your records are private to your account. Clinic staff do not see these files unless you
          choose to share them.{" "}
          <Link to="/health-profile" className="font-bold text-[#5B4FE0]">
            Complete your health profile
          </Link>{" "}
          for better context.
        </p>
      </div>
    </div>
  );
}
