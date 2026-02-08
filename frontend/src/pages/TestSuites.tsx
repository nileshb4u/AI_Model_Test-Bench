import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Plus, FileText, Tag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { suitesApi } from "@/api";
import type { TestSuite } from "@/types";
import { formatDate } from "@/utils/format";

export default function TestSuites() {
  const navigate = useNavigate();
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchSuites = async () => {
    try {
      const data = await suitesApi.list();
      setSuites(data);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuites();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      await suitesApi.create({
        name: formName.trim(),
        description: formDesc.trim(),
        category: formCategory.trim() || "general",
      });
      setCreateOpen(false);
      setFormName("");
      setFormDesc("");
      setFormCategory("");
      fetchSuites();
    } catch {
      // handle error
    } finally {
      setCreating(false);
    }
  };

  // Group suites by category
  const grouped = suites.reduce<Record<string, TestSuite[]>>((acc, suite) => {
    const cat = suite.category || "uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(suite);
    return acc;
  }, {});

  if (loading) {
    return <LoadingSpinner text="Loading test suites..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Create Suite
        </Button>
      </div>

      {suites.length === 0 ? (
        <Card>
          <EmptyState
            icon={FlaskConical}
            title="No test suites"
            description="Create a test suite to organize your prompts and benchmarks."
            action={{
              label: "Create Suite",
              onClick: () => setCreateOpen(true),
            }}
          />
        </Card>
      ) : (
        Object.entries(grouped).map(([category, categorySuites]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {category}
              </h3>
              <span className="text-xs text-zinc-600">
                ({categorySuites.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categorySuites.map((suite) => (
                <div
                  key={suite.id}
                  onClick={() => navigate(`/tests/${suite.id}`)}
                  className="card-hover p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-amber-400" />
                    </div>
                    <Badge text={suite.category || "general"} variant="default" />
                  </div>
                  <h4 className="text-base font-semibold text-zinc-100 mb-1">
                    {suite.name}
                  </h4>
                  {suite.description && (
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-3">
                      {suite.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{suite.prompts?.length ?? 0} prompts</span>
                    </div>
                    <span>{formatDate(suite.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Test Suite"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., Coding Tasks"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Describe what this test suite evaluates..."
              className="input-base w-full h-24 resize-none"
            />
          </div>
          <Input
            label="Category"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            placeholder="e.g., coding, reasoning, creative"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!formName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
