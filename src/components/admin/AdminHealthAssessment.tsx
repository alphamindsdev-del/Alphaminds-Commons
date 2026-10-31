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
  TArea,
  TInput,
  Toggle,
  adminSend,
  fmtDate,
  useAdminList,
} from "./AdminKit";

interface QuestionSet {
  id: string;
  detector_type: string;
  version: string;
  title: string;
  description: string | null;
  questions_json: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const STARTER_QUESTIONS = [
  {
    id: "sleep",
    prompt: "Over the past two weeks, how would you describe your sleep?",
    options: [
      { label: "Restful most nights", value: 3 },
      { label: "Mostly okay", value: 2 },
      { label: "Often disrupted", value: 1 },
      { label: "Rarely restful", value: 0 },
    ],
  },
  {
    id: "movement",
    prompt: "How often do you move your body in a way you enjoy?",
    options: [
      { label: "Most days", value: 3 },
      { label: "A few times a week", value: 2 },
      { label: "Once a week or less", value: 1 },
      { label: "Rarely or never", value: 0 },
    ],
  },
  {
    id: "nutrition",
    prompt: "How satisfied are you with the nourishment in your daily meals?",
    options: [
      { label: "Very satisfied", value: 3 },
      { label: "Mostly satisfied", value: 2 },
      { label: "Somewhat unsatisfied", value: 1 },
      { label: "Very unsatisfied", value: 0 },
    ],
  },
  {
    id: "stress",
    prompt: "I feel able to manage the everyday stress in my life.",
    options: [
      { label: "Strongly agree", value: 3 },
      { label: "Agree", value: 2 },
      { label: "Disagree", value: 1 },
      { label: "Strongly disagree", value: 0 },
    ],
  },
  {
    id: "energy",
    prompt: "How would you describe your energy across a typical day?",
    options: [
      { label: "Steady and sufficient", value: 3 },
      { label: "Mostly steady", value: 2 },
      { label: "Often low", value: 1 },
      { label: "Consistently drained", value: 0 },
    ],
  },
  {
    id: "connection",
    prompt: "I have people I can turn to when I need support.",
    options: [
      { label: "Strongly agree", value: 3 },
      { label: "Agree", value: 2 },
      { label: "Disagree", value: 1 },
      { label: "Strongly disagree", value: 0 },
    ],
  },
  {
    id: "checkups",
    prompt: "How up to date are you with routine health check-ups?",
    options: [
      { label: "Fully up to date", value: 3 },
      { label: "Mostly up to date", value: 2 },
      { label: "Overdue in some areas", value: 1 },
      { label: "Not sure or not up to date", value: 0 },
    ],
  },
];

const STARTER_JSON = JSON.stringify(STARTER_QUESTIONS, null, 2);

function validateQuestionsJson(value: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return "Questions must be valid JSON.";
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return "Questions must be a non-empty JSON array.";
  }
  for (let index = 0; index < parsed.length; index += 1) {
    const raw = parsed[index] as unknown;
    if (!raw || typeof raw !== "object") {
      return `Question ${index + 1} is malformed.`;
    }
    const question = raw as Record<string, unknown>;
    if (typeof question.id !== "string" || typeof question.prompt !== "string") {
      return `Question ${index + 1} needs an id and prompt.`;
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `Question ${index + 1} needs at least two options.`;
    }
    for (const option of question.options) {
      if (!option || typeof option !== "object") {
        return `Every option in question ${index + 1} needs a label and numeric value.`;
      }
      const candidate = option as Record<string, unknown>;
      if (typeof candidate.label !== "string" || typeof candidate.value !== "number") {
        return `Every option in question ${index + 1} needs a label and numeric value.`;
      }
    }
  }
  return null;
}

function QuestionSetModal({
  editItem,
  onClose,
}: {
  editItem: QuestionSet | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [version, setVersion] = useState(editItem?.version ?? "1.0");
  const [title, setTitle] = useState(editItem?.title ?? "HID Lifestyle Self-Reflection");
  const [description, setDescription] = useState(editItem?.description ?? "");
  const [questionsJson, setQuestionsJson] = useState(editItem?.questions_json ?? STARTER_JSON);
  const [active, setActive] = useState(editItem ? editItem.is_active === 1 : true);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        version: version.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        questions_json: questionsJson,
        is_active: active,
      };
      if (editItem) {
        return adminSend(`/v1/admin/health-assessment/${editItem.id}`, "PATCH", payload);
      }
      return adminSend("/v1/admin/health-assessment", "POST", payload);
    },
    onSuccess: () => {
      toast.success(editItem ? "Question set updated" : "Question set created");
      qc.invalidateQueries({ queryKey: ["admin", "health-assessment"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message || "Could not save question set"),
  });

  const formatJson = () => {
    try {
      setQuestionsJson(JSON.stringify(JSON.parse(questionsJson), null, 2));
    } catch {
      toast.error("Questions must be valid JSON.");
    }
  };

  const handleSave = () => {
    if (!version.trim()) {
      toast.error("Version is required");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const error = validateQuestionsJson(questionsJson);
    if (error) {
      toast.error(error);
      return;
    }
    save.mutate();
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title={editItem ? "Edit health assessment" : "New health assessment"}
      size="xl"
      footer={
        <>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : editItem ? "Save changes" : "Create question set"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-subtle/50 px-4 py-3 text-xs leading-relaxed text-text-secondary">
          This is a self-reflection questionnaire, not a clinical risk score. Keep language
          non-diagnostic. The member API serves the most recently created active set.
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Field label="Version" hint="For example 1.0 or 2026-01.">
            <TInput
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              maxLength={20}
              placeholder="1.0"
            />
          </Field>
          <Field label="Title">
            <TInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder="HID Lifestyle Self-Reflection"
            />
          </Field>
        </div>

        <Field label="Description" hint="Shown to members above the questions (optional).">
          <TArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="A short, non-clinical description of this self-reflection."
          />
        </Field>

        <Field
          label="Questions JSON"
          hint="Array of { id, prompt, options: [{ label, value }] }. Values must be numbers."
        >
          <div className="mb-2 flex flex-wrap gap-2">
            <GhostBtn onClick={() => setQuestionsJson(STARTER_JSON)}>Load starter set</GhostBtn>
            <GhostBtn onClick={formatJson}>Format JSON</GhostBtn>
          </div>
          <textarea
            value={questionsJson}
            onChange={(event) => setQuestionsJson(event.target.value)}
            spellCheck={false}
            className="min-h-[320px] w-full resize-y rounded-[10px] border border-border bg-surface px-3.5 py-2.5 font-mono text-xs leading-relaxed text-text-primary focus:outline-none focus:border-primary/50"
          />
        </Field>

        <Toggle
          checked={active}
          onChange={setActive}
          label={active ? "Active — available to members" : "Inactive — hidden from members"}
        />
      </div>
    </AdminModal>
  );
}

export function AdminHealthAssessment() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminList<QuestionSet>(
    "health-assessment",
    "/v1/admin/health-assessment",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<QuestionSet | null>(null);

  const sorted = useMemo(
    () =>
      [...(data?.data ?? [])].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      ),
    [data],
  );

  const deactivate = useMutation({
    mutationFn: (id: string) => adminSend(`/v1/admin/health-assessment/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Question set deactivated");
      qc.invalidateQueries({ queryKey: ["admin", "health-assessment"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not deactivate"),
  });

  const handleDeactivate = (item: QuestionSet) => {
    if (window.confirm(`Deactivate "${item.title}"? Members will no longer see it.`)) {
      deactivate.mutate(item.id);
    }
  };

  const questionCount = (item: QuestionSet) => {
    try {
      const parsed = JSON.parse(item.questions_json);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div>
      <SectionHeader
        back
        title="Health Assessment"
        subtitle="Manage the HID self-reflection question sets used by AlphaBody."
        action={
          <PrimaryBtn
            onClick={() => {
              setEditItem(null);
              setModalOpen(true);
            }}
          >
            New Question Set
          </PrimaryBtn>
        }
      />

      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Title</th>
            <th className="text-left px-4 py-3 font-bold">Version</th>
            <th className="text-left px-4 py-3 font-bold">Questions</th>
            <th className="text-left px-4 py-3 font-bold">Status</th>
            <th className="text-left px-4 py-3 font-bold">Created</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} message="Loading…" />
        ) : sorted.length === 0 ? (
          <EmptyRow colSpan={6} message="No question sets yet. Create the first one." />
        ) : (
          sorted.map((item) => (
            <tr key={item.id} className="border-t border-border align-top">
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 max-w-[320px] truncate text-xs text-text-secondary">
                    {item.description}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-text-secondary">{item.version}</td>
              <td className="px-4 py-3 text-text-secondary">{questionCount(item)}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    item.is_active === 1
                      ? "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700"
                      : "inline-flex rounded-full bg-subtle px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-text-secondary"
                  }
                >
                  {item.is_active === 1 ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-text-secondary">{fmtDate(item.created_at)}</td>
              <td className="px-4 py-3">
                <RowActions
                  onEdit={() => {
                    setEditItem(item);
                    setModalOpen(true);
                  }}
                  extra={
                    item.is_active === 1 ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(item)}
                        className="rounded-lg border border-destructive/30 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        Deactivate
                      </button>
                    ) : undefined
                  }
                />
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {modalOpen && (
        <QuestionSetModal
          editItem={editItem}
          onClose={() => {
            setModalOpen(false);
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}
