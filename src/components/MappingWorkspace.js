import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, XCircle, ZoomIn, ZoomOut, ChevronLeft, AlertTriangle } from "lucide-react";

export default function MappingWorkspace({ finalResult, answerSheetImages }) {
  const { questions, unmatchedAnswers } = finalResult;

  const [selectedQId, setSelectedQId] = useState(null);
  const [expandedQIds, setExpandedQIds] = useState({});
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed
  const [zoom, setZoom] = useState(100); // Percentage zoom
  const [mobileTab, setMobileTab] = useState("questions"); // "questions" | "answers"

  const highlightRef = useRef(null);
  const pageContainerRef = useRef(null);

  // Auto-scroll the answer sheet viewer to position the highlighted answer box nicely
  useEffect(() => {
    if (!selectedQId) return;

    const timer = setTimeout(() => {
      if (pageContainerRef.current) {
        const selectedQ = questions.find(q => q.id === selectedQId);
        // Find the region for the current page
        const regionOnCurrentPage = selectedQ?.answer?.regions?.find(r => r.page === currentPage);

        if (regionOnCurrentPage) {
          const container = pageContainerRef.current;
          const [ymin] = regionOnCurrentPage.box; // ymin is 0-1000

          // Calculate the Y pixel position of the top of the box
          // ymin / 10 is the percentage. So (ymin / 10) / 100 = ymin / 1000
          const boxTopPixel = (ymin / 1000) * container.scrollHeight;

          // Scroll so the box top is ~15% down from the top of the viewport for a clean view
          const targetY = boxTopPixel - container.clientHeight * 0.15;

          container.scrollTo({
            top: Math.max(0, targetY),
            behavior: "smooth"
          });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedQId, currentPage, questions]);

  // Auto-scroll/navigate the answer sheet viewer when a question is clicked
  const handleQuestionClick = (q) => {
    setSelectedQId(q.id);

    // Toggle expand state
    setExpandedQIds(prev => ({
      ...prev,
      [q.id]: !prev[q.id]
    }));

    // Find the first mapping region for this question (if answered)
    if (q.status === "answered" && q.answer?.regions?.length > 0) {
      const firstRegion = q.answer.regions[0];
      if (firstRegion.page !== currentPage) {
        setCurrentPage(firstRegion.page);
      }
    }
  };

  // Zoom control handlers
  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));

  // Helper to determine badge text and color based on marks presence and verdict
  const getBadgeInfo = (q) => {
    const hasAnswer = q.status === "answered";
    const hasMaxMarks = q.maxMarks !== null && q.maxMarks !== undefined && Number(q.maxMarks) > 0;
    const verdict = q.answer?.verdict || (hasAnswer ? "correct" : "unanswered");
    const score = hasAnswer ? (q.answer?.score ?? 0) : 0;
    const maxMarks = Number(q.maxMarks) || 0;

    const badges = [];

    // Verdict Badge
    if (!hasAnswer) {
      badges.push({ text: "Unattempted", style: "bg-[#FEECEC] text-[#DC2626]" });
    } else if (verdict === "correct") {
      if (!hasMaxMarks) badges.push({ text: "Correct", style: "bg-[#E8F8EE] text-[#16A34A]" });
    } else if (verdict === "partially correct") {
      if (!hasMaxMarks) badges.push({ text: "Partially Correct", style: "bg-[#FEF6E7] text-[#D97706]" });
    } else {
      badges.push({ text: "Incorrect", style: "bg-[#FEECEC] text-[#DC2626]" });
    }

    // Score Badge
    if (hasMaxMarks) {
      if (!hasAnswer || score === 0) {
        badges.push({ text: `${score}/${maxMarks}`, style: "bg-[#FEECEC] text-[#DC2626]" });
      } else if (score === maxMarks) {
        badges.push({ text: `${score}/${maxMarks}`, style: "bg-[#E8F8EE] text-[#16A34A]" });
      } else {
        badges.push({ text: `${score}/${maxMarks}`, style: "bg-[#FEF6E7] text-[#D97706]" });
      }
    }

    return badges;
  };

  // Helper to retrieve active highlighting regions for the current page
  const getActiveHighlightsForCurrentPage = () => {
    const highlights = [];

    // Check questions
    questions.forEach((q) => {
      if (q.status === "answered" && q.id === selectedQId && q.answer?.regions) {
        q.answer.regions.forEach((region) => {
          if (region.page === currentPage) {
            const cleanNum = String(q.number || "").replace(/\s*\n\s*/g, " ").replace(/[^\w()]/g, "").trim();
            const nextRegion = q.answer.regions.find((r) => r.page > currentPage);
            const continuesOnNextPage = !!nextRegion;
            const nextPage = nextRegion ? nextRegion.page : null;

            highlights.push({
              label: `Q${cleanNum}`,
              box: region.box,
              confidence: region.boxConfidence,
              color: "border-[#34AC15] bg-[#34AC15]/10",
              badgeBg: "bg-[#34AC15]",
              continuesOnNextPage,
              nextPage
            });
          }
        });
      }
    });

    // Check unmatched answers
    unmatchedAnswers.forEach((unmatched, index) => {
      unmatched.regions.forEach((region) => {
        if (region.page === currentPage) {
          const nextRegion = unmatched.regions.find((r) => r.page > currentPage);
          const continuesOnNextPage = !!nextRegion;
          const nextPage = nextRegion ? nextRegion.page : null;

          highlights.push({
            label: `Unmatched #${index + 1}`,
            box: region.box,
            confidence: region.boxConfidence,
            color: "border-purple-500 bg-purple-500/10",
            badgeBg: "bg-purple-600",
            continuesOnNextPage,
            nextPage
          });
        }
      });
    });

    return highlights;
  };

  const activeHighlights = getActiveHighlightsForCurrentPage();
  const totalPages = answerSheetImages.length;
  const currentPageImage = answerSheetImages[currentPage - 1]?.previewUrl;

  const allExpanded = questions.every(q => expandedQIds[q.id]);
  const hasAnyMaxMarks = questions.some(q => q.maxMarks !== null && q.maxMarks !== undefined && Number(q.maxMarks) > 0);
  const handleToggleExpandAll = () => {
    const nextState = !allExpanded;
    const newExpanded = {};
    questions.forEach(q => {
      newExpanded[q.id] = nextState;
    });
    setExpandedQIds(newExpanded);
  };

  const MobileTabSwitcher = () => (
    <div className="md:hidden flex p-[6px] bg-white rounded-[40px] mb-4 shrink-0 shadow-[0_4px_16px_rgba(67,67,67,0.05),0_8px_8.8px_rgba(134,134,134,0.05)] z-10 w-full">
      <button
        onClick={() => setMobileTab("questions")}
        className={`flex-1 h-[40px] rounded-[40px] text-[14px] font-bold transition-all ${mobileTab === "questions" ? "bg-[#303030] text-white shadow-sm" : "text-[#5E5E5E] bg-transparent"}`}
      >
        Questions
      </button>
      <button
        onClick={() => setMobileTab("answers")}
        className={`flex-1 h-[40px] rounded-[40px] text-[14px] font-bold transition-all ${mobileTab === "answers" ? "bg-[#303030] text-white shadow-sm" : "text-[#5E5E5E] bg-transparent"}`}
      >
        Answer Sheet
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-3 h-full min-h-0 overflow-hidden bg-transparent rounded-none">

      <MobileTabSwitcher />

      {/* LEFT PANEL: Extracted Questions (Standalone rounded card) */}
      <div className={`w-full md:w-1/2 bg-[#F2F2F2] md:bg-white rounded-t-[24px] md:rounded-2xl border-none md:border md:border-zinc-200 flex flex-col min-h-0 md:h-full overflow-hidden shadow-none md:shadow-xs ${mobileTab === "questions" ? "flex" : "hidden md:flex"}`}>
        {/* Clean Header without border divider */}
        <div className="pt-5 pb-4 px-4 md:p-4 md:px-5 flex items-center justify-between shrink-0">
          <h2 className="text-[14px] md:text-[16px] font-bold text-[#303030] leading-[140%] tracking-[-0.04em]">
            Extracted Questions (from question paper)
          </h2>
          <button
            onClick={handleToggleExpandAll}
            className="hidden md:block text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-800 px-4 py-1.5 rounded-full shadow-xs border border-zinc-200/80 transition-all select-none"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>

        {!hasAnyMaxMarks && (
          <div className="px-4 md:px-5 mb-3 shrink-0">
            <div className="bg-[#FFF8E6] border border-[#FDE68A] px-3.5 py-2.5 rounded-xl flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-[#D97706] shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-[#B45309]">No max marks provided in the question paper</span>
                <span className="text-[11px] text-[#B45309]/90 leading-snug mt-0.5">Answers will be evaluated for factual correctness without numeric scores.</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-5 space-y-3.5">
          {questions.map((q) => {
            const isSelected = selectedQId === q.id;
            const isExpanded = expandedQIds[q.id];
            const badgeInfo = getBadgeInfo(q);

            return (
              <div
                key={q.id}
                onClick={() => handleQuestionClick(q)}
                className={`border rounded-2xl py-[16px] pl-[16px] pr-[8px] md:py-[12px] md:px-[24px] bg-white transition-all cursor-pointer select-none ${isSelected
                  ? "border-[#FF5623] shadow-sm ring-1 ring-[#FF5623]"
                  : "border-zinc-200 hover:border-zinc-300"
                  }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Question Number Badge (Frame 1618872464: 32x32px, 2px border-white/25, 100px radius, drop shadows) */}
                    <div className={`w-[32px] min-w-[32px] h-[32px] rounded-full border-[2px] border-white/25 font-bold flex items-center justify-center text-xs shrink-0 whitespace-nowrap transition-all duration-200 shadow-[0_4px_16px_rgba(67,67,67,0.1),0_8px_8.8px_rgba(134,134,134,0.1)] ${isSelected
                      ? "bg-[#FF5623] text-white"
                      : "bg-[#2B2B2B]/80 text-white"
                      }`}>
                      {String(q.number || "").replace(/[.:]/g, "").trim()}
                    </div>
                    <span className="text-[14px] font-normal leading-[140%] tracking-[-0.04em] text-[#303030]">
                      {q.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Score / Verdict Badges */}
                    <div className="flex items-center gap-2">
                      {badgeInfo.map((badge, idx) => (
                        <span key={idx} className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${badge.style}`}>
                          {badge.text}
                        </span>
                      ))}
                    </div>

                    {/* Chevron Container */}
                    <div className="w-7 h-7 bg-[#F4F4F6] rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 rotate-180 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-[#F6F6F6] rounded-[16px] px-[24px] py-[16px] flex flex-col gap-2.5">
                      {q.answer?.feedback ? (
                        <>
                          <span className="text-[16px] font-bold text-[#303030] leading-[140%] tracking-[-0.04em]">AI Feedback</span>
                          <p className="text-[#303030] text-[14px] font-normal leading-[140%] tracking-[-0.04em]">{q.answer.feedback}</p>
                        </>
                      ) : q.answer?.transcription ? (
                        <>
                          <span className="text-[16px] font-bold text-[#303030] leading-[140%] tracking-[-0.04em]">Student Transcription</span>
                          <p className="text-[#303030] text-[14px] font-normal italic leading-[140%] tracking-[-0.04em]">"{q.answer.transcription}"</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-600 text-[13px] font-semibold">
                          <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>This question was left unanswered on the answer sheet.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {unmatchedAnswers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-200">
              <h3 className="font-bold text-zinc-700 text-sm mb-3">Unmatched content found on sheet</h3>
              <div className="space-y-2.5">
                {unmatchedAnswers.map((unmatched, index) => (
                  <div key={index} className="border border-purple-200 bg-purple-50/30 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-[11px] text-purple-700 uppercase tracking-wide">Unmatched Work #{index + 1}</span>
                      <span className="text-[10px] text-zinc-400 font-semibold">Page {unmatched.regions[0]?.page}</span>
                    </div>
                    <p className="text-zinc-600 font-mono text-xs italic mb-1.5">"{unmatched.transcription}"</p>
                    {unmatched.note && <p className="text-[11px] text-zinc-500"><span className="font-semibold">Note:</span> {unmatched.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Answer Sheet PDF/Image Viewer */}
      <div className={`w-full md:w-1/2 bg-[#F5F5F7] rounded-t-[24px] md:rounded-2xl border-none md:border md:border-zinc-200 flex flex-col min-h-0 md:h-full overflow-hidden relative z-0 ${mobileTab === "answers" ? "flex" : "hidden md:flex"}`}>
        {/* Top Attached Dark Header Bar: rounded-t-[24px] on mobile */}
        <div className="h-14 px-4 md:px-6 bg-[#2B2B2B] rounded-t-[24px] md:rounded-t-2xl flex items-center justify-between shrink-0 select-none">
          <span className="hidden md:block font-bold text-white text-[15px] tracking-tight">Answer Sheet</span>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Zoom Controls Pill */}
            <div className="bg-[#383838] h-9 px-3 rounded-xl flex items-center gap-2 text-white">
              <button
                onClick={handleZoomOut}
                className="text-zinc-300 hover:text-white transition-colors text-sm font-bold px-1"
                title="Zoom out"
              >
                &minus;
              </button>
              <span className="text-xs font-medium text-white px-1 min-w-[36px] text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="text-zinc-300 hover:text-white transition-colors text-sm font-bold px-1"
                title="Zoom in"
              >
                &#43;
              </button>
            </div>

            {/* Pagination Controls Pill */}
            <div className="bg-[#383838] h-9 px-3 rounded-xl flex items-center gap-2 text-white">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300 transition-colors p-0.5"
                title="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-medium text-white px-1 whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-zinc-300 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-300 transition-colors p-0.5"
                title="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Scroll Area */}
        <div className="flex-1 overflow-auto p-0 md:p-6 flex justify-center items-start bg-zinc-100" ref={pageContainerRef}>
          {currentPageImage ? (
            <div
              className="relative border-none md:border border-zinc-300 bg-white shadow-none md:shadow-lg transition-transform duration-200 origin-top shrink-0 inline-block"
              style={{
                width: `${zoom}%`,
                maxWidth: "100%",
              }}
            >
              <img
                src={currentPageImage}
                alt={`Answer sheet page ${currentPage}`}
                className="w-full h-auto block pointer-events-none select-none"
              />

              {activeHighlights.map((hl, idx) => {
                const [rawYmin, rawXmin, rawYmax, rawXmax] = hl.box;
                const [ymin, xmin, ymax, xmax] = [rawYmin / 10, rawXmin / 10, rawYmax / 10, rawXmax / 10];

                return (
                  <div
                    key={idx}
                    ref={idx === 0 ? highlightRef : null}
                    className={`absolute border-[2px] rounded-lg transition-all duration-300 flex items-start justify-center ${hl.color} ${hl.confidence === 'low' ? 'border-dashed opacity-80' : ''}`}
                    style={{
                      top: `${Math.max(0, ymin - 1)}%`,
                      left: `${Math.max(0, xmin - 1.8)}%`,
                      height: `${ymax - ymin + 2}%`,
                      width: `${xmax - xmin + 2.5}%`,
                    }}
                  >
                    {/* Badge */}
                    <div className="absolute -top-[14px] bg-[#2B2B2B] text-white font-bold text-[11px] px-[10px] py-[3px] rounded-full shadow-md flex items-center justify-center select-none whitespace-nowrap z-10 border border-white/20">
                      <span>{hl.label}</span>
                    </div>

                    {/* Continues on next page indicator */}
                    {hl.continuesOnNextPage && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hl.nextPage) setCurrentPage(hl.nextPage);
                        }}
                        className="absolute -bottom-[12px] right-[14px] bg-[#2B2B2B] hover:bg-[#3B3B3B] cursor-pointer transition-colors text-white font-semibold text-[10px] px-[10px] py-[3px] rounded-full shadow-md flex items-center justify-center select-none whitespace-nowrap z-10 border border-white/20"
                      >
                        <span>Continues on next page &rarr;</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 font-medium">
              <span>No image available for page {currentPage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
