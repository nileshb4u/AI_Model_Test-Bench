import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Upload,
  FolderSearch,
  Cpu,
  HardDrive,
  Hash,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { modelsApi } from "@/api";
import type { Model } from "@/types";
import { formatBytes, formatNumber, formatDate } from "@/utils/format";

export default function Models() {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [importPath, setImportPath] = useState("");
  const [scanDir, setScanDir] = useState("");
  const [scanResults, setScanResults] = useState<Model[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchModels = async () => {
    try {
      const data = await modelsApi.list();
      setModels(data);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleImport = async () => {
    if (!importPath.trim()) return;
    setImporting(true);
    try {
      await modelsApi.create({ file_path: importPath.trim() });
      setImportOpen(false);
      setImportPath("");
      fetchModels();
    } catch {
      // handle error
    } finally {
      setImporting(false);
    }
  };

  const handleScan = async () => {
    if (!scanDir.trim()) return;
    setScanning(true);
    try {
      const results = await modelsApi.scan(scanDir.trim());
      setScanResults(results);
      fetchModels();
    } catch {
      // handle error
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading models..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setImportOpen(true)}
        >
          Import Model
        </Button>
        <Button
          variant="secondary"
          icon={<FolderSearch className="w-4 h-4" />}
          onClick={() => setScanOpen(true)}
        >
          Scan Directory
        </Button>
      </div>

      {/* Model grid */}
      {models.length === 0 ? (
        <Card>
          <EmptyState
            icon={Box}
            title="No models found"
            description="Import a GGUF model file or scan a directory to get started."
            action={{
              label: "Import Model",
              onClick: () => setImportOpen(true),
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => navigate(`/models/${model.id}`)}
              className="card-hover p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-primary-400" />
                </div>
                {model.quantization && (
                  <Badge text={model.quantization} variant="info" />
                )}
              </div>

              <h3 className="text-base font-semibold text-zinc-100 mb-1 truncate">
                {model.name}
              </h3>

              <div className="space-y-2 mt-3">
                {model.architecture && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{model.architecture}</span>
                  </div>
                )}
                {model.parameter_count > 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{formatNumber(model.parameter_count)} parameters</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>{formatBytes(model.file_size_bytes)}</span>
                </div>
                {model.context_length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Box className="w-3.5 h-3.5" />
                    <span>{formatNumber(model.context_length, 0)} ctx</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-600">
                  Added {formatDate(model.added_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportPath("");
        }}
        title="Import Model"
      >
        <div className="space-y-4">
          <Input
            label="Model File Path"
            value={importPath}
            onChange={(e) => setImportPath(e.target.value)}
            placeholder="/path/to/model.gguf"
          />
          <p className="text-xs text-zinc-500">
            Enter the full path to a GGUF model file on the server.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={importing}
              disabled={!importPath.trim()}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Scan Modal */}
      <Modal
        isOpen={scanOpen}
        onClose={() => {
          setScanOpen(false);
          setScanDir("");
          setScanResults([]);
        }}
        title="Scan Directory"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Directory Path"
                value={scanDir}
                onChange={(e) => setScanDir(e.target.value)}
                placeholder="/path/to/models/"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleScan}
                loading={scanning}
                disabled={!scanDir.trim()}
              >
                Scan
              </Button>
            </div>
          </div>

          {scanResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">
                Found {scanResults.length} model(s):
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {scanResults.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-zinc-200">{m.name}</p>
                      <p className="text-xs text-zinc-500">
                        {formatBytes(m.file_size_bytes)}
                        {m.quantization && ` - ${m.quantization}`}
                      </p>
                    </div>
                    <Badge text="Added" variant="success" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setScanOpen(false);
                setScanDir("");
                setScanResults([]);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
