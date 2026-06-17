import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Share2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = () => {
    setIsLoading(true);
    API.get('/documents')
      .then(({ data }) => {
        setDocuments(data.documents);
      })
      .catch((err) => console.error('Error fetching documents:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    setIsUploading(true);
    const toastId = toast.loading('Uploading document...');
    try {
      const { data } = await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully!', { id: toastId });
      // Reload documents to ensure populated owners
      loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (cloudinaryUrl: string) => {
    window.open(cloudinaryUrl, '_blank');
  };

  const handleShare = async (docId: string) => {
    const targetUserId = prompt('Enter the User Database ID to share this document with:');
    if (!targetUserId) return;

    try {
      await API.post(`/documents/${docId}/share`, { userIds: [targetUserId] });
      toast.success('Document shared successfully!');
      loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to share document');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await API.delete(`/documents/${docId}`);
      toast.success('Document deleted successfully');
      setDocuments(prev => prev.filter(d => d._id !== docId && d.id !== docId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          />
          <Button
            leftIcon={<Upload size={18} />}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Storage info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage Info</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium text-gray-900">{formatBytes(documents.reduce((acc, d) => acc + (d.fileSize || 0), 0))}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-primary-600 rounded-full" style={{ width: '10%' }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Files Count</span>
                <span className="font-medium text-gray-900">{documents.length} files</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Filters</h3>
              <div className="space-y-2">
                <button
                  onClick={loadDocuments}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md font-medium"
                >
                  All Documents
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500 animate-pulse">Loading documents...</div>
              ) : documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => {
                    const docId = doc._id || doc.id;
                    const isOwner = user && doc.ownerId?._id === user.id || doc.ownerId === user?.id;

                    return (
                      <div
                        key={docId}
                        className="flex items-center p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors duration-200"
                      >
                        <div className="p-2 bg-primary-50 rounded-lg mr-4">
                          <FileText size={24} className="text-primary-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {doc.name}
                            </h3>
                            {doc.sharedWith && doc.sharedWith.length > 0 && (
                              <Badge variant="secondary" size="sm">Shared</Badge>
                            )}
                            {doc.status === 'signed' && (
                              <Badge variant="success" size="sm">Signed</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="uppercase">{doc.fileType?.split('/')[1] || 'FILE'}</span>
                            <span>{formatBytes(doc.fileSize)}</span>
                            <span>Uploaded by {doc.ownerId?.name || 'You'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2"
                            aria-label="Download"
                            onClick={() => handleDownload(doc.cloudinaryUrl)}
                          >
                            <Download size={18} />
                          </Button>

                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2"
                              aria-label="Share"
                              onClick={() => handleShare(docId)}
                            >
                              <Share2 size={18} />
                            </Button>
                          )}

                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2 text-error-600 hover:text-error-700"
                              aria-label="Delete"
                              onClick={() => handleDelete(docId)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No documents uploaded yet</p>
                  <p className="text-sm text-gray-500 mt-1">Upload a file to store it in your document vault</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};