import React, { useState } from "react";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import UploadWorkspace from "@/components/UploadWorkspace";
import MappingWorkspace from "@/components/MappingWorkspace";
import { mergeResults } from "@/lib/merge";
import { Sparkles, Loader2, HelpCircle, Bell, ChevronDown, ArrowLeft, Clipboard, Menu } from "lucide-react";

export default function Home() {
  const [step, setStep] = useState("upload"); // upload | loading | mapping
  const [loadingStage, setLoadingStage] = useState("none"); // none | extracting_questions | extracting_answers | grading
  const [qpFile, setQpFile] = useState(null);
  const [asFile, setAsFile] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState("");

  const handleFilesProcessed = async (processedQpFile, processedAsFile) => {
    setQpFile(processedQpFile);
    setAsFile(processedAsFile);
    setStep("loading");
    setError("");

    try {
      // Stage 1: Extract Questions
      setLoadingStage("extracting_questions");
      const qpPayload = {
        questionPaperImages: processedQpFile.pages.map((p) => ({
          base64: p.base64,
          mimeType: p.mimeType,
        })),
      };

      const qpRes = await fetch("/api/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qpPayload),
      });

      if (!qpRes.ok) {
        const errData = await qpRes.json();
        throw new Error(errData.error || "Failed to extract questions.");
      }
      const qpData = await qpRes.json();
      const extractedQuestions = qpData.questions;

      if (!extractedQuestions || extractedQuestions.length === 0) {
        throw new Error("Could not detect any questions in the provided file. Please ensure you uploaded a valid question paper.");
      }

      // Stage 2: Extract & Map Answers
      setLoadingStage("extracting_answers");
      const asPayload = {
        answerSheetImages: processedAsFile.pages.map((p) => ({
          base64: p.base64,
          mimeType: p.mimeType,
        })),
        questions: extractedQuestions,
      };

      const asRes = await fetch("/api/extract-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asPayload),
      });

      if (!asRes.ok) {
        const errData = await asRes.json();
        throw new Error(errData.error || "Failed to map answers.");
      }
      const asData = await asRes.json();
      const extractedAnswers = asData.answers;
      const unmatchedAnswers = asData.unmatchedAnswers;

      if (!extractedAnswers || extractedAnswers.length === 0) {
        throw new Error("Could not detect any mapped answers in the provided file. Please ensure you uploaded a valid student answer sheet.");
      }

      // Stage 3: Grade Answers
      setLoadingStage("grading");
      const gradePayload = {
        questions: extractedQuestions,
        answers: extractedAnswers,
      };

      const gradeRes = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gradePayload),
      });

      let grades = [];
      if (gradeRes.ok) {
        const gradeData = await gradeRes.json();
        grades = gradeData.grades;
      } else {
        console.warn("Grading step failed, proceeding with extraction only");
      }

      // Stage 4: Merge Results client-side
      const merged = mergeResults({
        questions: extractedQuestions,
        answers: extractedAnswers,
        unmatchedAnswers,
        grades,
      });

      setFinalResult(merged);
      setStep("mapping");
      setLoadingStage("none");
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
      setStep("upload");
      setLoadingStage("none");
    }
  };

  const getStageMessage = () => {
    switch (loadingStage) {
      case "extracting_questions":
        return {
          title: "Extracting...",
          subtitle: "Extracting questions",
        };
      case "extracting_answers":
        return {
          title: "Extracting...",
          subtitle: "Detecting answered regions on the student sheet",
        };
      case "grading":
        return {
          title: "Extracting...",
          subtitle: "Generating grades",
        };
      default:
        return {
          title: "Extracting...",
          subtitle: "This may take a while",
        };
    }
  };

  const stageMessage = getStageMessage();

  return (
    <>
      <Head>
        <title>VedaAI - AI Assessment Extraction & Answer Mapping</title>
        <meta name="description" content="AI teacher's grading assistance toolkit by VedaAI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen overflow-hidden bg-zinc-200 md:bg-zinc-100 p-3 gap-3 font-sans">
        {/* Left Sidebar Layout */}
        <div className="hidden md:flex h-full shrink-0">
          <Sidebar collapsed={step === "mapping"} />
        </div>

        {/* Right main panel */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative gap-3">

          {/* Global Top Navbar */}
          <header className="w-full h-[56px] flex items-center justify-between border border-zinc-200 bg-white/75 rounded-[16px] md:rounded-2xl px-[12px] md:pl-[24px] md:pr-[8px] shrink-0 shadow-sm z-10">
            <button className="flex items-center gap-2 transition-all">
              <ArrowLeft className="h-[20px] w-[20px] text-[#1E1E1E] md:text-[#A9A9A9]" />
              
              {/* Desktop text */}
              <div className="hidden md:flex items-center gap-2">
                <Clipboard className="h-[20px] w-[20px] text-[#A9A9A9]" />
                <span className="text-[16px] font-semibold leading-none tracking-[-0.04em] text-[#A9A9A9]">Exams</span>
              </div>

              {/* Mobile text */}
              <div className="flex md:hidden items-center gap-2">
                <span className="text-[16px] font-bold text-[#1E1E1E] tracking-[-0.04em] ml-1">VedaAI</span>
              </div>
            </button>

            <div className="flex items-center gap-[8px] md:gap-[10px]">
              <button className="hidden md:flex text-[#5E5E5E] bg-[#F6F6F6] hover:bg-[#EAEAEA] h-[36px] w-[36px] items-center justify-center rounded-full transition-all">
                <HelpCircle className="h-[20px] w-[20px]" />
              </button>
              <button className="text-[#1E1E1E] md:text-[#5E5E5E] bg-transparent md:bg-[#F6F6F6] hover:bg-zinc-100 md:hover:bg-[#EAEAEA] h-[36px] w-[36px] flex items-center justify-center rounded-full transition-all relative">
                <Bell className="h-[22px] w-[22px] md:h-[20px] md:w-[20px]" />
                <div className="absolute top-[6px] right-[7px] md:top-1 md:right-1 h-[8px] w-[8px] bg-[#FF5623] rounded-full border-[1.5px] border-white"></div>
              </button>
              <button className="hidden md:flex text-[#5E5E5E] bg-white hover:bg-zinc-50 h-[36px] w-[36px] items-center justify-center rounded-full transition-all">
                <Sparkles className="h-[20px] w-[20px]" />
              </button>

              {/* Desktop User Dropdown */}
              <div className="hidden md:flex items-center justify-between p-1 w-[184px] h-[40px] rounded-full hover:bg-zinc-50 cursor-pointer transition-all">
                <div className="flex items-center gap-2">
                  <div className="h-[24px] w-[24px] rounded-full overflow-hidden shrink-0">
                    <img src="/assets/user.jpg" alt="User" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#303030] select-none">Madhur Rastogi</span>
                </div>
                <ChevronDown className="h-[16px] w-[16px] text-[#5E5E5E] mr-2" />
              </div>

              {/* Mobile right side elements */}
              <div className="flex md:hidden h-[28px] w-[28px] rounded-full overflow-hidden ml-1 shrink-0">
                <img src="/assets/user.jpg" alt="User" className="w-full h-full object-cover" />
              </div>
              <button className="flex md:hidden text-[#1E1E1E] ml-1 shrink-0">
                <Menu className="h-[22px] w-[22px]" />
              </button>
            </div>
          </header>

          {/* Workspaces & Loaders */}
          <div className="flex-grow flex flex-col min-h-0 relative">
            {/* State 1: File Selection & Upload */}
            {step === "upload" && (
              <div className="flex-grow flex flex-col overflow-hidden relative">
                {error && (
                  <div className="absolute top-4 right-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2.5 rounded-xl font-semibold shadow-sm z-50 animate-bounce">
                    ⚠️ {error}
                  </div>
                )}
                <UploadWorkspace onFilesProcessed={handleFilesProcessed} />
              </div>
            )}

            {/* State 2: AI Loading Spinner Screen */}
            {step === "loading" && (
              <div className="flex-grow flex flex-col justify-center items-center bg-white rounded-[16px] md:rounded-[24px] border-none md:border border-[#EAEAEA] h-full shadow-sm md:shadow-sm">
                <div className="flex flex-col items-center w-full max-w-sm text-center px-4">
                  <div className="mb-[15px] animate-pulse flex items-center justify-center h-[72px]">
                    <img src="/assets/sparkle.jpg" alt="Loading" className="h-full object-contain" />
                  </div>
                  <h2 className="font-bold text-[24px] tracking-[-0.04em] text-[#303030] leading-[140%] mb-1">
                    {stageMessage.title}
                  </h2>
                  <span className="text-[#868686] font-normal text-[16px] leading-[140%]">
                    {stageMessage.subtitle}
                  </span>
                </div>
              </div>
            )}

            {/* State 3: Side-by-side Mapping Workspace */}
            {step === "mapping" && finalResult && (
              <MappingWorkspace
                finalResult={finalResult}
                answerSheetImages={asFile.pages}
              />
            )}
          </div>

        </main>
      </div>
    </>
  );
}
