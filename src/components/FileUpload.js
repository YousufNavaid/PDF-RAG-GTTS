import React from "react";
import { Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";

const FileUpload = ({ setPdfFile, handleUploadPdf, pdfFile, uploadPdfButtonRef, choosePdfButtonRef }) => {
  return (
    <div className="md:w-[70%] flex justify-start items-center w-full gap-5">
      <Upload
        id="choose-btn"
        beforeUpload={(file) => {
          setPdfFile(file);
          return false; // Prevent auto upload
        }}
        showUploadList={false}
      >
        <Button
          icon={<UploadOutlined />}
          id="upload-btn"
          ref={choosePdfButtonRef}
          className="w-full bg-orange-500 text-white border-none hover:bg-black"
        >
          Choose PDF
        </Button>
      </Upload>

      <Button
        type="primary"
        id="upload-file-btn"
        ref={uploadPdfButtonRef}
        onClick={handleUploadPdf}
        disabled={!pdfFile}
        className="w-[30%] text-white hover:bg-black-600"
      >
        Upload PDF
      </Button>
    </div>
  );
};

export default FileUpload;
