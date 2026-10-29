import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  FolderOpen,
  Trash2,
  Download,
  Check,
  RefreshCw,
  Server,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { Workbook } from '../../types/spreadsheet';
import {
  DEFAULT_GCS_BUCKET,
  GCSFileItem,
  saveWorkbookToGCS,
  listWorkbooksFromGCS,
  loadWorkbookFromGCS,
  deleteWorkbookFromGCS,
} from '../../core/gcsStorageService';

interface GCSStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook;
  onLoadWorkbook: (loadedWb: Workbook) => void;
}

export const GCSStorageModal: React.FC<GCSStorageModalProps> = ({
  isOpen,
  onClose,
  workbook,
  onLoadWorkbook,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'open' | 'settings'>('save');
  const [bucketName, setBucketName] = useState(() => {
    return localStorage.getItem('gcs_bucket_name') || DEFAULT_GCS_BUCKET;
  });
  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem('gcs_access_token') || '';
  });

  const [files, setFiles] = useState<GCSFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'open') {
      fetchFileList();
    }
  }, [isOpen, activeTab, bucketName, accessToken]);

  const handleSaveSettings = () => {
    localStorage.setItem('gcs_bucket_name', bucketName.trim());
    localStorage.setItem('gcs_access_token', accessToken.trim());
    setSaveStatus('GCS settings saved!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const handleSaveToGCS = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSaveStatus(null);
    try {
      const res = await saveWorkbookToGCS(workbook, bucketName, accessToken || undefined);
      setSaveStatus(`Saved successfully to gs://${bucketName}/${res.fileName}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFileList = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const items = await listWorkbooksFromGCS(bucketName, accessToken || undefined);
      setFiles(items);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFromGCS = async (fileName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loaded = await loadWorkbookFromGCS(fileName, bucketName, accessToken || undefined);
      onLoadWorkbook(loaded);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFromGCS = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName} from Google Cloud Storage?`)) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await deleteWorkbookFromGCS(fileName, bucketName, accessToken || undefined);
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: '580px', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(16,185,129,0.06))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Cloud size={16} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Google Cloud Storage (GCS)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Bucket: <code style={{ fontFamily: 'var(--font-mono)' }}>gs://{bucketName}</code>
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-secondary)',
            padding: '0 12px',
          }}
        >
          <button
            onClick={() => setActiveTab('save')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'save' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'save' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CloudUpload size={15} /> Save Current Workbook
          </button>

          <button
            onClick={() => setActiveTab('open')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'open' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'open' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FolderOpen size={15} /> Cloud Library ({files.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              color: activeTab === 'settings' ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'settings' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Server size={15} /> GCS Config
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '12px',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {saveStatus && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={16} /> {saveStatus}
            </div>
          )}

          {/* TAB 1: Save */}
          {activeTab === 'save' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Save your active workbook <strong>"{workbook.title}"</strong> ({workbook.sheets.length} sheet(s)) directly to Google Cloud Storage.
              </div>

              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Destination Bucket:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-blue)' }}>
                    gs://{bucketName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Security & Encryption:</span>
                  <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <ShieldCheck size={14} /> AES-256 Server-Side
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveToGCS}
                disabled={isLoading}
                className="btn-primary"
                style={{
                  justifyContent: 'center',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  fontSize: '13px',
                }}
              >
                {isLoading ? (
                  'Uploading to GCS...'
                ) : (
                  <>
                    <CloudUpload size={16} /> Save Workbook to Google Cloud Storage
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Open / Library */}
          {activeTab === 'open' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Workbooks in gs://{bucketName}/workbooks/
                </span>
                <button className="btn-icon" onClick={fetchFileList} disabled={isLoading} title="Refresh">
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {files.length === 0 ? (
                <div
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-surface-secondary)',
                    borderRadius: '8px',
                  }}
                >
                  {isLoading ? 'Loading files from Google Cloud Storage...' : 'No workbooks found in this bucket yet. Save one from the "Save" tab!'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                  {files.map((file) => {
                    const cleanName = file.name.replace(/^workbooks\//, '').replace(/\.json$/, '');
                    const dateStr = new Date(file.updated).toLocaleString();
                    const sizeKB = (file.size / 1024).toFixed(1);

                    return (
                      <div
                        key={file.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-surface-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cleanName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {dateStr} • {sizeKB} KB
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenFromGCS(file.name)}
                            className="btn-primary"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            <FolderOpen size={13} /> Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFromGCS(file.name)}
                            className="btn-icon"
                            style={{ color: '#ef4444', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Settings */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Google Cloud Storage Bucket Name
                </label>
                <input
                  type="text"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  placeholder="ai-sheets-storage-..."
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  GCP Bearer Token (Optional for private buckets)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ya29.a0AfH6SM..."
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn-primary"
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
              >
                Save GCS Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
