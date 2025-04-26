"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface BatchFileUploadProps {
  maxFiles: number;
  allowedMimeTypes: string[];
  maxFileSize: number;
  onFilesChange: (files: File[]) => void;
}

export function BatchFileUpload({
  maxFiles,
  allowedMimeTypes,
  maxFileSize,
  onFilesChange,
}: BatchFileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        setErrorMessage(`You can only upload a maximum of ${maxFiles} files.`);
        return;
      }

      const newFiles = acceptedFiles.filter((file) => {
        if (!allowedMimeTypes.includes(file.type)) {
          setErrorMessage(`File type ${file.type} is not allowed.`);
          return false;
        }

        if (file.size > maxFileSize) {
          setErrorMessage(
            `File size ${file.size} is too large. Maximum file size is ${maxFileSize} bytes.`
          );
          return false;
        }

        return true;
      });

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      onFilesChange([...files, ...newFiles]);
      setErrorMessage(null);
    },
    [allowedMimeTypes, maxFiles, maxFileSize, files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept: allowedMimeTypes.reduce((acc, mimeType) => {
      acc[mimeType] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
  });

  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFiles = files.filter((file) => file !== fileToRemove);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div>
      <div {...getRootProps()} className="dropzone">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>
            Drag 'n' drop some files here, or click to select files.
          </p>
        )}
      </div>
      {errorMessage && <p className="error">{errorMessage}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.name}>
            {file.name} - {file.size} bytes
            <button onClick={() => handleRemoveFile(file)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
