import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { suitesApi } from "@/api";
import type { TestSuite, TestPrompt } from "@/types";
import { formatDate } from "@/utils/format";

export default function TestSuiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [rubric, setRubric] = useState("");
  const [adding, setAdding] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);

  const fetchSuite = async () => {
    if (!id) return;
    try {
      const data = await suitesApi.get(id);
      setSuite(data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuite();
  }, [id]);

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(promptId)) next.delete(promptId);
      else next.add(promptId);
      return next;
    });
  };

  const handleAddPrompt = async () => {
    if (!id || !promptText.trim()) return;
    setAdding(true);
    try {
      await suitesApi.addPrompts(id, [
        {
          prompt_text: promptText.trim(),
          expected_output: expectedOutput.trim(),
          grading_rubric: rubric.trim(),
          order_index: (suite?.prompts?.length ?? 0),
        },
      ]);
      setAddOpen(false);
      setPromptText("");
      setExpectedOutput("");
      setRubric("");
      fetchSuite();
    } catch {
      // handle error
    } finally {
      setAdding(false);
    }
  };

  const handleImport = async () => {
    if (!id || !importJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const prompts = Array.isArray(parsed) ? parsed : parsed.prompts || [];
      await suitesApi.importPrompts(id, { prompts });
      setImportOpen(false);
      setImportJson("");
      fetchSuite();
    } catch {
      // handle JSON parse or API error
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm("Are you sure you want to delete this test suite?")) {
      try {
        await suitesApi.remove(id);
        navigate("/tests");
      } catch {
        // handle error
      }
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading test suite..." />;
  }

  if (!suite) {
    return (
      <Card>
        <EmptyState
          icon={FlaskConical}
          title="Suite not found"
          description="The requested test suite could not be found."
          action={{
            label: "Back to Test Suites",
            onClick: () => navigate("/tests"),
          }}
        />
      </Card>
    );
  }

  const sortedPrompts = [...(suite.prompts || [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Button
        variant="ghost"
        icon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate("/tests")}
      >
        Back to Test Suites
      </Button>

      {/* Suite header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <FlaskConical className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">
                {suite.name}
              </h1>
              <Badge text={suite.category || "general"} variant="info" />
            </div>
            {suite.description && (
              <p className="text-sm text-zinc-500 mt-1">{suite.description}</p>
            )}
            <p className="text-xs text-zinc-600 mt-1">
              Created {formatDate(suite.created_at)}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setAddOpen(true)}
        >
          Add Prompt
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setImportOpen(true)}
        >
          Import Prompts
        </Button>
      </div>

      {/* Prompts list */}
      <Card title={`Prompts (${sortedPrompts.length})`}>
        {sortedPrompts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No prompts yet"
            description="Add prompts to this test suite to start benchmarking."
            action={{ label: "Add Prompt", onClick: () => setAddOpen(true) }}
          />
        ) : (
          <div className="space-y-2">
            {sortedPrompts.map((prompt, idx) => (
              <div
                key={prompt.id}
                className="border border-zinc-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => togglePrompt(prompt.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  {expandedPrompts.has(prompt.id) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <span className="text-xs font-mono text-zinc-600 w-8">
                    #{idx + 1}
                  </span>
                  <span className="text-sm text-zinc-300 truncate">
                    {prompt.prompt_text}
                  </span>
                </button>
                {expandedPrompts.has(prompt.id) && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-800 bg-zinc-950/50">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">
                        Prompt
                      </p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                        {prompt.prompt_text}
                      </p>
                    </div>
                    {prompt.expected_output && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-1">
                          Expected Output
                        </p>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {prompt.expected_output}
                        </p>
                      </div>
                    )}
                    {prompt.grading_rubric && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-1">
                          Grading Rubric
                        </p>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {prompt.grading_rubric}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Prompt Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Prompt"
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Prompt Text
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter the prompt to test..."
              className="input-base w-full h-28 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Expected Output (optional)
            </label>
            <textarea
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="What should the ideal response look like?"
              className="input-base w-full h-20 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Grading Rubric (optional)
            </label>
            <textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder="Criteria for scoring this prompt..."
              className="input-base w-full h-20 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPrompt}
              loading={adding}
              disabled={!promptText.trim()}
            >
              Add Prompt
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Prompts (JSON)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              JSON Data
            </label>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder={`[{"prompt_text": "...", "expected_output": "...", "grading_rubric": "..."}]`}
              className="input-base w-full h-40 resize-none font-mono text-xs"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Paste a JSON array of prompt objects. Each should have at least a "prompt_text" field.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={importing}
              disabled={!importJson.trim()}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
