import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { AdminJourneyProgress } from "./AdminJourneyProgress";

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
  link_url: string | null;
  metadata_json: string | null;
  created_at: string;
}

interface QuizQuestionDraft {
  prompt: string;
  options: string;
  correct_index: number;
}

interface JourneyMetadata {
  completion_rule?: string;
  repeatable?: boolean;
  passing_score?: number;
  questions?: Array<{ prompt?: string; options?: unknown; correct_index?: number }>;
}

function parseMetadata(raw: string | null | undefined): JourneyMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as JourneyMetadata) : {};
  } catch {
    return {};
  }
}

function draftQuestions(meta: JourneyMetadata): QuizQuestionDraft[] {
  if (!Array.isArray(meta.questions)) return [];
  return meta.questions.map((q) => ({
    prompt: typeof q.prompt === "string" ? q.prompt : "",
    options: Array.isArray(q.options) ? q.options.filter((o) => typeof o === "string").join("\n") : "",
    correct_index: Number.isInteger(q.correct_index) ? Number(q.correct_index) : 0,
  }));
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

const COMPLETION_RULES = [
  { value: "acknowledge", label: "Read and acknowledge" },
  { value: "resource", label: "Open a linked resource" },
  { value: "quiz", label: "Pass an assessment" },
  { value: "activity", label: "Complete an activity" },
  { value: "admin", label: "Administrator verification" },
] as const;

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  LEVELS.map((l) => [l.value, l.label]),
);
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));
const RULE_LABEL: Record<string, string> = Object.fromEntries(
  COMPLETION_RULES.map((r) => [r.value, r.label]),
);

function defaultRuleForType(type: string): string {
  if (type === "quiz" || type === "assessment") return "quiz";
  if (type === "assignment" || type === "claim_file") return "admin";
  if (type === "rel_fi") return "activity";
  return "acknowledge";
}

function JourneyModal({
  onClose,
  editItem,
  nextPosition,
}: {
  onClose: () => void;
  editItem: JourneyActivity | null;
  nextPosition: number;
}) {
  const qc = useQueryClient();
  const editId = editItem?.id ?? null;
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [level, setLevel] = useState<string>(editItem?.level ?? "SEEKER");
  const [type, setType] = useState<string>(editItem?.type ?? "lesson");
  const [position, setPosition] = useState(String(editItem?.position ?? nextPosition));
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [instructions, setInstructions] = useState(editItem?.instructions ?? "");
  const [content, setContent] = useState(editItem?.content ?? "");
  const [linkUrl, setLinkUrl] = useState(editItem?.link_url ?? "");
  const [required, setRequired] = useState(editItem ? editItem.is_required === 1 : true);
  const [published, setPublished] = useState(editItem ? editItem.is_published === 1 : false);
  const initialMeta = useMemo(() => parseMetadata(editItem?.metadata_json), [editItem?.metadata_json]);
  const [completionRule, setCompletionRule] = useState(
    initialMeta.completion_rule ?? defaultRuleForType(editItem?.type ?? "lesson"),
  );
  const [repeatable, setRepeatable] = useState(initialMeta.repeatable !== false);
  const [passingScore, setPassingScore] = useState(String(initialMeta.passing_score ?? 70));
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>(draftQuestions(initialMeta));

  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const save = useMutation({
    mutationFn: () => {
      const preparedQuestions = questions
        .map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
          correct_index: q.correct_index,
        }))
        .filter((q) => q.prompt && q.options.length >= 2);
      const metadata = {
        completion_rule: completionRule,
        repeatable,
        passing_score: Math.min(100, Math.max(0, parseInt(passingScore, 10) || 70)),
        questions: completionRule === "quiz" ? preparedQuestions : [],
      };
      const payload: Record<string, unknown> = {
        title: title.trim(),
        level,
        type,
        position: Math.max(1, parseInt(position, 10) || 1),
        description: description.trim(),
        instructions: instructions.trim(),
        content: content.trim(),
        link_url: linkUrl.trim(),
        is_required: required,
        is_published: published,
        metadata_json: JSON.stringify(metadata),
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
            onClick={() => {
              if (!title.trim()) {
                toast.error("Title is required");
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : editId ? "Save changes" : "Create activity"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <TInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Activity title"
          />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Level">
            <TSelect value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </TSelect>
          </Field>
          <Field label="Type">
            <TSelect value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </TSelect>
          </Field>
          <Field label="Position">
            <TInput
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Description">
          <TArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What this activity is about"
          />
        </Field>
        <Field label="Instructions" hint="Shown to the member when they open the activity.">
          <TArea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="Step-by-step instructions"
          />
        </Field>
        <Field label="Content" hint="Optional embedded content or resource text. No length limit.">
          <TArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Content body"
          />
        </Field>
        <Field
          label="Link / video URL"
          hint={
            type === "video"
              ? "Paste a YouTube link — members get an embedded player and must watch it to the end before they can mark this step complete."
              : "Optional. YouTube links embed automatically; pasting a Commons path (e.g. /library/…) or any URL gives members a button they must open before completing."
          }
        >
          <TInput
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            maxLength={500}
            placeholder="https://www.youtube.com/watch?v=… or /library/article-id"
          />
        </Field>
        <div className="rounded-xl border border-divider bg-bg-card-white/60 p-4 space-y-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Completion requirements
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How members complete this step">
              <TSelect
                value={completionRule}
                onChange={(e) => setCompletionRule(e.target.value)}
              >
                {COMPLETION_RULES.map((rule) => (
                  <option key={rule.value} value={rule.value}>
                    {rule.label}
                  </option>
                ))}
              </TSelect>
            </Field>
            <Field label="Pass mark (%)" hint="Used for assessment steps.">
              <TInput
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                disabled={completionRule !== "quiz"}
              />
            </Field>
          </div>

          {completionRule === "quiz" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">Questions</p>
                <button
                  type="button"
                  onClick={() =>
                    setQuestions((prev) => [
                      ...prev,
                      { prompt: "", options: "", correct_index: 0 },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-divider bg-bg-card-white px-3 py-1.5 text-xs font-semibold text-text-primary"
                >
                  <Plus className="h-3 w-3" /> Add question
                </button>
              </div>
              {questions.length === 0 && (
                <p className="text-xs text-text-secondary">
                  Add at least one question with two or more options. Members cannot complete this
                  step until they pass.
                </p>
              )}
              {questions.map((question, index) => {
                const optionCount = question.options.split("\n").filter((o) => o.trim()).length;
                return (
                  <div key={index} className="rounded-lg border border-divider bg-card p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <TInput
                        value={question.prompt}
                        onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                        placeholder={`Question ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
                        className="mt-1 rounded-full p-1.5 text-red-600 hover:bg-red-50"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <TArea
                      value={question.options}
                      onChange={(e) => updateQuestion(index, { options: e.target.value })}
                      rows={3}
                      placeholder={"One option per line\nFirst option\nSecond option"}
                    />
                    <Field label="Correct option" hint={`Option ${question.correct_index + 1}`}>
                      <TSelect
                        value={String(question.correct_index)}
                        onChange={(e) =>
                          updateQuestion(index, { correct_index: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: Math.max(optionCount, 2) }, (_, i) => (
                          <option key={i} value={i}>
                            Option {i + 1}
                          </option>
                        ))}
                      </TSelect>
                    </Field>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            <Toggle
              checked={repeatable}
              onChange={setRepeatable}
              label="Members can retake this step"
            />
            <Toggle checked={required} onChange={setRequired} label="Required to advance" />
            <Toggle
              checked={published}
              onChange={setPublished}
              label={published ? "Published" : "Draft (hidden from members)"}
            />
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

export function AdminJourney() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<JourneyActivity>(
    "journey",
    "/v1/admin/journey-activities?limit=100",
  );
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
        back
        title="Journey"
        subtitle="The step-by-step membership path from Seeker to Coordinator."
        action={
          <PrimaryBtn
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            New Activity
          </PrimaryBtn>
        }
      />
      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Pos</th>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Level</th>
            <th className="text-left px-4 py-3 font-bold">Type</th>
            <th className="text-left px-4 py-3 font-bold">Completion</th>
            <th className="text-left px-4 py-3 font-bold">Required</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={8} message="Loading…" />
        ) : sorted.length === 0 ? (
          <EmptyRow
            colSpan={8}
            message="No journey activities yet. Create the first step of the path."
          />
        ) : (
          sorted.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3 text-text-secondary tabular-nums font-bold">
                {item.position}
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary max-w-[280px] truncate">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-text-secondary truncate max-w-[280px]">
                    {item.description}
                  </p>
                )}
                {item.link_url && (
                  <p className="mt-0.5 truncate max-w-[280px] text-[11px] font-semibold text-accent-dark-green">
                    Link: {item.link_url}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {LEVEL_LABEL[item.level] ?? item.level}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {TYPE_LABEL[item.type] ?? item.type}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {RULE_LABEL[
                  parseMetadata(item.metadata_json).completion_rule ??
                    defaultRuleForType(item.type)
                ] ?? "Read and acknowledge"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs font-bold ${item.is_required === 1 ? "text-text-primary" : "text-text-secondary"}`}
                >
                  {item.is_required === 1 ? "Yes" : "No"}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusPill ok={item.is_published === 1} />
              </td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => {
                    setEditItem(item);
                    setModalOpen(true);
                  }}
                  onDelete={async () => {
                    if (await confirmDelete(`activity "${item.title}"`)) remove.mutate(item.id);
                  }}
                />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {modalOpen && (
        <JourneyModal
          onClose={() => {
            setModalOpen(false);
            setEditItem(null);
          }}
          editItem={editItem}
          nextPosition={nextPosition}
        />
      )}
    </div>
  );
}
