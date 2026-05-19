import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, Hash, Link, FileText, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

export function ArtifactCreator({ onArtifactCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    artifact_title: '',
    artifact_type: 'proofbook',
    destination_url: '',
    owner_email: '',
    provenance_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!form.artifact_title.trim() || !form.destination_url.trim()) {
      setError('Title and destination URL are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        destination_url: form.destination_url.startsWith('http') ? form.destination_url : `https://${form.destination_url}`,
      };
      const data = await api.createArtifact(payload);
      setResult(data);
      setForm({ artifact_title: '', artifact_type: 'proofbook', destination_url: '', owner_email: '', provenance_notes: '' });
      setFile(null);
      setPreview(null);
      onArtifactCreated?.(data);
    } catch (e) {
      setError(e.message || 'Failed to create artifact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Photo Upload */}
      <div className="neo-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[var(--accent-orange)]" />
          Photo Capture
        </h3>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="neo-card-pressed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-white/10 hover:border-[var(--accent-orange)]/30 transition-colors"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {preview ? (
            <img src={preview} alt="preview" className="h-full w-full object-contain rounded-xl p-2" />
          ) : (
            <>
              <Upload className="w-10 h-10 text-[var(--text-muted)] mb-3" />
              <p className="text-sm text-[var(--text-muted)]">Drop photo or click to browse</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">JPG, PNG, WebP</p>
            </>
          )}
        </div>
        {file && (
          <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-[var(--accent-success)]" />
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Artifact Form */}
      <div className="neo-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5 text-[var(--accent-gold)]" />
          Artifact Metadata
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1 block">Title *</label>
            <input
              value={form.artifact_title}
              onChange={(e) => setForm((f) => ({ ...f, artifact_title: e.target.value }))}
              placeholder="e.g., Vintage Chair #2047"
              className="neo-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1 block">Type</label>
              <select
                value={form.artifact_type}
                onChange={(e) => setForm((f) => ({ ...f, artifact_type: e.target.value }))}
                className="neo-input w-full px-3 py-2.5 text-sm appearance-none"
              >
                <option value="proofbook">Proofbook</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="nft">NFT</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1 block">Destination URL *</label>
              <input
                value={form.destination_url}
                onChange={(e) => setForm((f) => ({ ...f, destination_url: e.target.value }))}
                placeholder="your-site.com/item"
                className="neo-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1 block">Owner Email</label>
            <input
              value={form.owner_email}
              onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
              placeholder="owner@example.com"
              className="neo-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1 block">Provenance Notes</label>
            <textarea
              value={form.provenance_notes}
              onChange={(e) => setForm((f) => ({ ...f, provenance_notes: e.target.value }))}
              placeholder="Origin, condition, history..."
              rows={3}
              className="neo-input w-full px-3 py-2.5 text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Submit & Result */}
      <div className="lg:col-span-2">
        {error && (
          <div className="neo-card p-3 mb-3 flex items-center gap-2 text-[var(--accent-danger)]">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="neo-btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {loading ? 'Minting Artifact...' : 'Create Artifact & Generate QR'}
        </button>
      </div>

      {result && (
        <div className="lg:col-span-2 neo-card p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[var(--accent-success)]" />
            <h4 className="font-semibold">Artifact Created</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="neo-card-pressed p-3 rounded-lg">
              <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">ID</p>
              <p className="mono text-xs mt-1 truncate">{result.artifact_id}</p>
            </div>
            <div className="neo-card-pressed p-3 rounded-lg">
              <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Hash</p>
              <p className="mono text-xs mt-1 truncate">{result.artifact_hash}</p>
            </div>
            <div className="neo-card-pressed p-3 rounded-lg">
              <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">QR URL</p>
              <a href={result.qr_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent-orange)] truncate block mt-1">Open QR</a>
            </div>
            <div className="neo-card-pressed p-3 rounded-lg">
              <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Status</p>
              <p className="text-xs mt-1 text-[var(--accent-success)]">{result.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
