"use client";

import {
  type UploadFileResponse,
  useUploadFiles,
} from "@xixixao/uploadstuff/react";
import { type InputHTMLAttributes, useRef } from "react";

export function UploadInput({
  generateUploadUrl,
  onUploadComplete,
  ...props
}: {
  generateUploadUrl: () => Promise<string>;
  onUploadComplete: (uploaded: UploadFileResponse[]) => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "accept" | "id" | "type" | "className" | "required" | "tabIndex"
>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startUpload } = useUploadFiles(generateUploadUrl, {
    onUploadComplete: async (uploaded) => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadComplete(uploaded);
    },
  });
  return (
    <input
      ref={fileInputRef}
      type="file"
      onChange={async (event) => {
        if (!event.target.files) {
          return;
        }
        const files = Array.from(event.target.files);
        if (files.length === 0) {
          return;
        }
        startUpload(files);
      }}
      {...props}
    />
  );
}
