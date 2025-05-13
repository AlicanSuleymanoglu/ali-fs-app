
import React, { useState, useRef } from 'react';
import { Upload, File, X, Check } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { useToast } from "../components/ui/use-toast.ts";

interface FileUploaderProps {
  onUpload?: (file: File) => void;
  acceptedTypes?: string;
  title?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onUpload,
  acceptedTypes = "application/pdf,image/*",
  title = "Upload Contract"
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      setFile(selectedFile);
      setUploaded(false); // Reset upload status
      if (onUpload) {
        onUpload(selectedFile); // Just pass to parent, don't upload yet
      }
    }
  };



  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    // Simulate upload process
    try {
      // In a real app, you would upload to your server here
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onUpload) {
        onUpload(file);
      }

      setUploaded(true);
      toast({
        title: 'File Uploaded',
        description: 'Your file has been uploaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploaded(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  return (
    <div className="allo-card flex flex-col space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>

      {!file ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-allo-primary transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={24} className="text-allo-muted mb-2" />
          <p className="text-sm text-center text-allo-muted">
            Click to select a file or drag and drop
          </p>
          <p className="text-xs text-center text-allo-muted mt-1">
            PDF, JPG, PNG files are supported
          </p>
          <input
            type="file"
            className="hidden"
            accept={acceptedTypes}
            onChange={handleFileChange}
            ref={inputRef}
          />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-allo-secondary/50 p-2 rounded-md">
                <File size={20} className="text-allo-text" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {file.name}
                </span>
                <span className="text-xs text-allo-muted">
                  {bytesToSize(file.size)}
                </span>
              </div>
            </div>

            <button
              className="text-allo-muted hover:text-red-500 transition-colors"
              onClick={clearFile}
            >
              <X size={18} />
            </button>
          </div>



          {uploaded && (
            <div className="flex items-center space-x-2 mt-3 text-green-600 text-sm">
              <Check size={16} />
              <span>Successfully uploaded</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
