import React, { useState, useRef } from "react";
import { Upload, X, ArrowRight, FileText, Loader2, HelpCircle, Bell, ChevronDown } from "lucide-react";

// Load PDF.js from CDN dynamically to avoid Webpack configuration issues
const loadPdfJS = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js engine"));
    document.head.appendChild(script);
  });
};

export default function UploadWorkspace({ onFilesProcessed }) {
  const [qpFile, setQpFile] = useState(null);
  const [asFile, setAsFile] = useState(null);
  const [processing, setProcessing] = useState({ qp: false, as: false });
  const [error, setError] = useState("");

  const qpInputRef = useRef(null);
  const asInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper to split data URL into raw base64 and mimeType
  const parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    if (!matches) throw new Error("Invalid image data");
    return {
      mimeType: matches[1],
      base64: matches[2],
      previewUrl: dataUrl // Keep dataUrl for client-side preview rendering
    };
  };

  // Client-side downscaler for images (PNG, JPEG, etc.)
  const resizeImage = (dataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = (err) => reject(err);
    });
  };

  const processFile = async (file, type) => {
    setError("");
    setProcessing((prev) => ({ ...prev, [type]: true }));

    try {
      const pageImages = [];
      const fileType = file.type;

      if (fileType === "application/pdf") {
        const pdfjsLib = await loadPdfJS();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);

          // Downscale rendering viewport client-side directly
          const originalViewport = page.getViewport({ scale: 1.0 });
          const maxDim = 1600;
          let scale = 1.5;
          if (originalViewport.width > maxDim || originalViewport.height > maxDim) {
            scale = maxDim / Math.max(originalViewport.width, originalViewport.height);
          }

          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          pageImages.push(parseDataUrl(dataUrl));
        }
      } else if (fileType.startsWith("image/")) {
        const rawDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        // Resize image to max 1600px
        const resizedDataUrl = await resizeImage(rawDataUrl);
        pageImages.push(parseDataUrl(resizedDataUrl));
      } else {
        throw new Error("Unsupported file format. Please upload a PDF or an Image.");
      }

      const fileData = {
        name: file.name,
        size: formatFileSize(file.size),
        pageCount: pageImages.length,
        pages: pageImages, // Array of { base64, mimeType, previewUrl }
      };

      if (type === "qp") {
        setQpFile(fileData);
      } else {
        setAsFile(fileData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process file.");
    } finally {
      setProcessing((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Process one or many files — combines all pages in order
  const processFiles = async (files, type) => {
    setError("");
    setProcessing((prev) => ({ ...prev, [type]: true }));

    try {
      const allPages = [];
      let firstName = files[0].name;
      let totalSize = 0;

      for (const file of files) {
        totalSize += file.size;
        const fileType = file.type;

        if (fileType === "application/pdf") {
          const pdfjsLib = await loadPdfJS();
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const originalViewport = page.getViewport({ scale: 1.0 });
            const maxDim = 1600;
            let scale = 1.5;
            if (originalViewport.width > maxDim || originalViewport.height > maxDim) {
              scale = maxDim / Math.max(originalViewport.width, originalViewport.height);
            }
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            allPages.push(parseDataUrl(canvas.toDataURL("image/jpeg", 0.82)));
          }
        } else if (fileType.startsWith("image/")) {
          const rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const resizedDataUrl = await resizeImage(rawDataUrl);
          allPages.push(parseDataUrl(resizedDataUrl));
        } else {
          throw new Error(`Unsupported file: "${file.name}". Please upload PDFs or images only.`);
        }
      }

      const fileData = {
        name: files.length === 1 ? firstName : `${files.length} files (${allPages.length} pages)`,
        size: formatFileSize(totalSize),
        pageCount: allPages.length,
        pages: allPages,
        fileType: files.every(f => f.type === "application/pdf") ? "pdf" : files.every(f => f.type.startsWith("image/")) ? "image" : "mixed",
      };

      if (type === "qp") setQpFile(fileData);
      else setAsFile(fileData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process file.");
    } finally {
      setProcessing((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files, type);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) processFiles(files, type);
  };

  const removeFile = (type) => {
    if (type === "qp") {
      setQpFile(null);
      if (qpInputRef.current) qpInputRef.current.value = "";
    } else {
      setAsFile(null);
      if (asInputRef.current) asInputRef.current.value = "";
    }
  };

  const handleStartMapping = () => {
    if (qpFile && asFile) {
      onFilesProcessed(qpFile, asFile);
    }
  };

  const isReady = qpFile && asFile && !processing.qp && !processing.as;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      {/* Main content scroll container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-[24px] md:py-[36px] flex flex-col items-center">
        {/* Frame 1984077325: 1103px x 694px with 36px gap */}
        <div className="flex flex-col items-center gap-[36px] w-[1103px] max-w-full">
          {/* Frame 1984078310: 789px x 475.03px with 20px gap */}
          <div className="w-[789px] max-w-full flex flex-col items-center gap-[20px]">

            {/* Header Title Section */}
            <div className="flex flex-col items-center">
              {/* Desktop header */}
              <div className="hidden md:flex flex-col items-center">
                <div className="flex flex-row items-center gap-[10px] mb-1.5">
                  <span className="text-[40px] font-bold text-[#2B2B2B] tracking-[-0.04em] leading-[1.2]">Upload</span>
                  <span className="text-[40px] font-bold text-[#FF5623] tracking-[-0.04em] leading-[1.2] px-[8px] py-[4px] bg-[#FF9350]/15 rounded-lg">Question Paper & Answer Sheets</span>
                </div>
                <p className="text-[20px] font-normal text-[#303030] leading-[28px] tracking-[-0.04em] mt-1">Upload both files to get started</p>
              </div>

              {/* Mobile header */}
              <div className="flex md:hidden flex-col items-center text-center mt-2 mb-2">
                <h1 className="text-[28px] font-bold text-[#303030] leading-[1.2] tracking-[-0.04em]">
                  Upload Question Paper <br /> & Answer Sheets
                </h1>
              </div>
            </div>

            {/* Centered Decorative Avatar with Orbiting Glow */}
            <div className="relative flex items-center justify-center w-[110px] h-[110px] md:w-[137px] md:h-[138px] my-6 md:my-1">
              <div className="w-[110px] h-[110px] md:w-[137px] md:h-[137px] rounded-full bg-gradient-to-br from-[#FFE8DE] via-[#FFD5C2] to-[#FFB99A] flex items-center justify-center relative shadow-sm">
                {/* Outer orbital ring */}
                <div className="absolute inset-[-6px] md:inset-[-6px] rounded-full border border-[#FF8253]/20"></div>

                {/* Orbital badges */}
                <div className="absolute top-1 right-2 md:right-4 w-3.5 h-3.5 md:w-4.5 md:h-4.5 rounded-full bg-[#FF7950] border-2 border-white flex items-center justify-center shadow-xs">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white"></div>
                </div>
                <div className="absolute bottom-2 md:bottom-3 left-1 md:left-2 w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#FF7950] border-2 border-white shadow-xs"></div>
                <div className="absolute top-4 left-0 md:top-6 md:left-1 w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#FF7950] border-2 border-white shadow-xs"></div>
                <div className="absolute bottom-4 right-0 md:bottom-5 md:right-1 w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-[#FF7950] border border-white shadow-xs"></div>

                {/* Inner Avatar Graphic */}
                <div className="w-[76px] h-[76px] md:w-[94px] md:h-[94px] rounded-full bg-white overflow-hidden shadow-inner flex items-center justify-center relative z-10 border-2 border-white/90">
                  <img src="/assets/avatar.jpg" alt="Avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Cards Upload Outer Container with Rounded Border and Background */}
            <div className="w-full md:w-[789px] max-w-full bg-[#EFEFF1]/70 border border-[#E4E4E7] p-[10.5px] rounded-[28px]">
              <div className="flex flex-col md:flex-row gap-[16px] w-full">
                {/* Question Paper Upload Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "qp")}
                  className="w-full md:flex-1 min-h-[140px] md:min-h-0 md:h-[181px] py-6 md:py-0 border-[1.5px] border-dashed border-[#CECECE] hover:border-[#FF5623] bg-white rounded-2xl flex flex-col items-center justify-center transition-all relative group cursor-pointer"
                  onClick={() => !qpFile && qpInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={qpInputRef}
                    onChange={(e) => handleFileChange(e, "qp")}
                    accept="application/pdf,image/*"
                    multiple
                    className="hidden"
                  />

                  {processing.qp ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                      <span className="text-sm text-zinc-600 font-medium animate-pulse">Processing Question Paper...</span>
                    </div>
                  ) : qpFile ? (
                    <div className="flex flex-row items-center bg-[#F4F4F5] rounded-xl pl-4 pr-5 py-3 w-[90%] md:w-[320px] text-left relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeFile("qp")}
                        className="absolute -top-[10px] -right-[10px] h-[24px] w-[24px] rounded-full bg-[#5E5E5E] flex items-center justify-center hover:bg-[#303030] transition-colors shadow-sm z-10"
                      >
                        <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      </button>
                      <div className="w-[32px] h-[40px] bg-[#E5484D] rounded-[4px] relative flex flex-col items-center justify-end pb-[2px] shrink-0 shadow-sm overflow-hidden">
                        <div className="absolute top-0 right-0 w-[10px] h-[10px] bg-white/30 rounded-bl-[4px]" />
                        <span className="text-white font-bold text-[8px] tracking-wider leading-none">
                          {qpFile.fileType === "image" ? "IMG" : qpFile.fileType === "mixed" ? "MIX" : "PDF"}
                        </span>
                      </div>
                      <div className="flex flex-col ml-3 flex-1 min-w-0 pr-2">
                        <span className="font-bold text-[14px] text-[#303030] truncate tracking-[-0.02em]">{qpFile.name}</span>
                        <span className="text-[12px] text-[#8E8E93] mt-[2px] font-medium tracking-tight">
                          {qpFile.size} &bull; {qpFile.pageCount} {qpFile.pageCount === 1 ? "Page" : "Pages"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center w-full">
                      <div className="w-11 h-11 bg-[#F5F5F7] rounded-xl flex items-center justify-center mb-[10px] group-hover:bg-[#FFF0EB] transition-colors">
                        <Upload className="h-5 w-5 text-[#2B2B2B] group-hover:text-[#FF5623] transition-colors" strokeWidth={1.8} />
                      </div>
                      <span className="font-semibold text-[20px] leading-[22px] tracking-[-0.06em] text-[#303030]">
                        Upload <span className="text-[#FF5623]">Question Paper</span>
                      </span>
                      <span className="font-normal text-[14px] leading-[22px] tracking-[-0.06em] text-[#5E5E5E]/55">Max 10MB</span>
                    </div>
                  )}
                </div>

                {/* Answer Sheet Upload Box */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "as")}
                  className="w-full md:flex-1 min-h-[140px] md:min-h-0 md:h-[181px] py-6 md:py-0 border-[1.5px] border-dashed border-[#CECECE] hover:border-[#FF5623] bg-white rounded-2xl flex flex-col items-center justify-center transition-all relative group cursor-pointer"
                  onClick={() => !asFile && asInputRef.current.click()}
                >
                  <input
                    type="file"
                    ref={asInputRef}
                    onChange={(e) => handleFileChange(e, "as")}
                    accept="application/pdf,image/*"
                    multiple
                    className="hidden"
                  />

                  {processing.as ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                      <span className="text-sm text-zinc-600 font-medium animate-pulse">Processing Answer Sheet...</span>
                    </div>
                  ) : asFile ? (
                    <div className="flex flex-row items-center bg-[#F4F4F5] rounded-xl pl-4 pr-5 py-3 w-[90%] md:w-[320px] text-left relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeFile("as")}
                        className="absolute -top-[10px] -right-[10px] h-[24px] w-[24px] rounded-full bg-[#5E5E5E] flex items-center justify-center hover:bg-[#303030] transition-colors shadow-sm z-10"
                      >
                        <X className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      </button>
                      <div className="w-[32px] h-[40px] bg-[#E5484D] rounded-[4px] relative flex flex-col items-center justify-end pb-[2px] shrink-0 shadow-sm overflow-hidden">
                        <div className="absolute top-0 right-0 w-[10px] h-[10px] bg-white/30 rounded-bl-[4px]" />
                        <span className="text-white font-bold text-[8px] tracking-wider leading-none">
                          {asFile.fileType === "image" ? "IMG" : asFile.fileType === "mixed" ? "MIX" : "PDF"}
                        </span>
                      </div>
                      <div className="flex flex-col ml-3 flex-1 min-w-0 pr-2">
                        <span className="font-bold text-[14px] text-[#303030] truncate tracking-[-0.02em]">{asFile.name}</span>
                        <span className="text-[12px] text-[#8E8E93] mt-[2px] font-medium tracking-tight">
                          {asFile.size} &bull; {asFile.pageCount} {asFile.pageCount === 1 ? "Page" : "Pages"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center w-full">
                      <div className="w-11 h-11 bg-[#F5F5F7] rounded-xl flex items-center justify-center mb-[10px] group-hover:bg-[#FFF0EB] transition-colors">
                        <Upload className="h-5 w-5 text-[#2B2B2B] group-hover:text-[#FF5623] transition-colors" strokeWidth={1.8} />
                      </div>
                      <span className="font-semibold text-[20px] leading-[22px] tracking-[-0.06em] text-[#303030]">
                        Upload <span className="text-[#FF5623]">Answer Sheet</span>
                      </span>
                      <span className="font-normal text-[14px] leading-[22px] tracking-[-0.06em] text-[#5E5E5E]/55">Max 10MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Section */}
          <div className="flex flex-col items-center gap-[12px]">
            <button
              onClick={handleStartMapping}
              disabled={!isReady}
              className={`h-[44px] rounded-full flex items-center pl-[24px] pr-[20px] py-[12px] gap-[8px] text-[14px] font-medium leading-[1.4] tracking-[-0.04em] text-white transition-all duration-300 border-[2px] border-white/15 ${isReady
                ? "bg-[#2B2B2B] hover:bg-black cursor-pointer shadow-md"
                : "bg-[#9E9E9E] cursor-not-allowed shadow-none"
                }`}
            >
              <span>Start Mapping</span>
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            <span className="text-[14px] font-normal text-[#5E5E5E]/80 leading-[22px] tracking-[-0.06em] text-center select-none max-w-[285px] md:max-w-none md:whitespace-nowrap">
              Once both files are uploaded, you'll be able to map answers with questions
            </span>
          </div>

          {error && (
            <div className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl text-center font-medium max-w-md shadow-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
