import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { promptsApi } from '../api';
import { SystemPrompt } from '../types';
import { MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/format';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'coding', label: 'Coding' },
  { value: 'creative', label: 'Creative' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'instruction', label: 'Instruction Following' },
  { value: 'roleplay', label: 'Roleplay' },
  { value: 'safety', label: 'Safety' },
];

export default function Prompts() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [form, setForm] = useState({ name: '', content: '', category: 'general' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, [filterCategory]);

  async function loadPrompts() {
    try {
      const data = await promptsApi.list(filterCategory || undefined);
      setPrompts(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingPrompt(null);
    setForm({ name: '', content: '', category: 'general' });
    setShowModal(true);
  }

  function openEdit(prompt: SystemPrompt) {
    setEditingPrompt(prompt);
    setForm({ name: prompt.name, content: prompt.content, category: prompt.category || 'general' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.content) return;
    setSaving(true);
    try {
      if (editingPrompt) {
        await promptsApi.update(editingPrompt.id, form);
      } else {
        await promptsApi.create(form);
      }
      setShowModal(false);
      loadPrompts();
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this system prompt?')) return;
    try {
      await promptsApi.remove(id);
      loadPrompts();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner text="Loading prompts..." />
      </div>
    );
  }

  const grouped = prompts.reduce<Record<string, SystemPrompt[]>>((acc, p) => {
    const cat = p.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">System Prompts</h1>
        <Button variant="primary" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          New Prompt
        </Button>
      </div>

      {/* Filter */}
      <div className="w-64">
        <Select
          label="Category"
          value={filterCategory}
          onChange={setFilterCategory}
          options={CATEGORIES}
        />
      </div>

      {/* Prompts */}
      {prompts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No system prompts"
          description="Create system prompts to use in your test runs."
          action={{ label: 'Create Prompt', onClick: openCreate }}
        />
      ) : (
        Object.entries(grouped).map(([category, categoryPrompts]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300 capitalize">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryPrompts.map((prompt) => (
                <Card key={prompt.id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-200">{prompt.name}</h3>
                        <Badge text={prompt.category || 'general'} variant="info" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(prompt)}
                          className="p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prompt.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {prompt.content}
                    </div>
                    <div className="text-xs text-zinc-600">
                      Created {prompt.created_at ? formatDate(prompt.created_at) : 'Unknown'}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPrompt ? 'Edit System Prompt' : 'New System Prompt'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Helpful Assistant"
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            options={CATEGORIES.filter(c => c.value !== '')}
          />
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="You are a helpful AI assistant..."
              rows={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name || !form.content}>
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
