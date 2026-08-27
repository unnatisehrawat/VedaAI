import React, { useState } from "react";
import { 
  Home, 
  Users, 
  FileSpreadsheet, 
  GraduationCap, 
  BookOpen, 
  Settings, 
  ChevronDown, 
  Sparkles,
  ChevronsRight,
  ChevronsLeft
} from "lucide-react";

export default function Sidebar({ collapsed: initialCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  // Sync with prop if it changes
  React.useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  const menuItems = [
    { name: "Home", icon: Home, active: false },
    { name: "My Classroom", icon: Users, active: false },
    { name: "Assignments", icon: FileSpreadsheet, active: false },
    { name: "Exams", icon: GraduationCap, active: true },
    { name: "My Library", icon: BookOpen, active: false },
  ];

  if (isCollapsed) {
    return (
      <aside className="relative z-10 w-[72px] bg-white rounded-2xl border border-zinc-200 flex flex-col justify-between items-center py-6 h-full shrink-0 shadow-[0_32px_48px_rgba(0,0,0,0.15)] transition-all duration-300">
        <div className="flex flex-col items-center gap-6 w-full px-3">
          {/* Brand Logo Icon */}
          <div className="bg-zinc-950 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-sm h-[40px] w-[40px] shrink-0">
            V
          </div>

          {/* AI Teacher's Toolkit Icon Button */}
          <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-r from-[#FF7950] to-[#C0350A] p-[3px] shadow-sm flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#272727] flex items-center justify-center text-white">
              <Sparkles className="h-[18px] w-[18px]" />
            </div>
          </div>

          {/* Navigation Menu Icons */}
          <nav className="flex flex-col items-center gap-2 mt-2 w-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  title={item.name}
                  className={`flex items-center justify-center w-[40px] h-[40px] rounded-xl transition-all ${
                    item.active
                      ? "bg-zinc-100 text-zinc-900 shadow-xs"
                      : "text-[#5E5E5E]/80 hover:bg-zinc-50 hover:text-zinc-800"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${item.active ? "text-zinc-900" : "text-[#5E5E5E]/80"}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Icons & Expand Toggle */}
        <div className="flex flex-col items-center gap-3 w-full px-3">
          <button 
            title="Settings"
            className="flex items-center justify-center w-[40px] h-[40px] rounded-xl text-[#5E5E5E]/80 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* School Icon */}
          <div 
            title="Delhi Public School, Bokaro Steel City"
            className="h-[40px] w-[40px] rounded-xl bg-[#F0F0F0] flex items-center justify-center border border-zinc-200 text-zinc-600 font-bold shrink-0 cursor-pointer hover:bg-[#E5E5E5] transition-all"
          >
            🏫
          </div>

          {/* Expand Toggle */}
          <button 
            onClick={() => setIsCollapsed(false)}
            title="Expand Sidebar"
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors mt-1"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative z-10 w-[304px] bg-white rounded-2xl border border-zinc-200 flex flex-col justify-between h-full shrink-0 shadow-[0_32px_48px_rgba(0,0,0,0.2),0_16px_48px_rgba(0,0,0,0.12)] transition-all duration-300">
      <div className="w-[251px] mx-auto pt-6 flex flex-col gap-[56px]">
        {/* Brand Logo */}
        <div className="flex items-center justify-between px-1 h-[40px]">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-950 text-white p-1.5 rounded-xl flex items-center justify-center font-bold text-lg leading-none shadow-sm h-[40px] w-[40px]">
              V
            </div>
            <span className="font-bold text-[28px] text-[#303030] leading-[20px] tracking-[-0.06em]">VedaAI</span>
          </div>
          <button 
            onClick={() => setIsCollapsed(true)}
            title="Collapse Sidebar"
            className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 hover:bg-zinc-50 rounded-lg"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>

        {/* AI Teacher's Toolkit Button */}
        <div className="rounded-full bg-gradient-to-r from-[#FF7950] to-[#C0350A] p-[4px] shadow-[0_32px_48px_rgba(255,255,255,0.2),0_16px_48px_rgba(255,255,255,0.12)] shrink-0">
          <button className="flex items-center justify-center gap-[10px] w-full h-[42px] rounded-full bg-[#272727] text-white hover:bg-[#333333] transition-all">
            <Sparkles className="h-[18px] w-[18px]" />
            <span className="text-[16px] font-medium tracking-[-0.04em]">AI Teacher's Toolkit</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-[6px]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`flex items-center gap-3 px-4 h-[38px] rounded-lg transition-all ${
                  item.active
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-[#5E5E5E]/80 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${item.active ? "text-zinc-900" : "text-[#5E5E5E]/80"}`} />
                <span className="text-[16px] font-normal leading-[1.4] tracking-[-0.04em]">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="w-[251px] mx-auto pb-6 flex flex-col gap-2">
        {/* Settings button */}
        <button className="flex items-center gap-2 px-[12px] h-[38px] rounded-lg text-[16px] font-normal leading-[1.4] tracking-[-0.04em] text-[#5E5E5E]/80 hover:bg-zinc-100 hover:text-zinc-900 transition-all">
          <Settings className="h-4.5 w-4.5 text-[#5E5E5E]/80" />
          <span>Settings</span>
        </button>

        {/* School Selector Dropdown */}
        <div className="flex items-center justify-between p-[12px] h-[84px] rounded-2xl bg-[#F0F0F0] hover:bg-[#E5E5E5] cursor-pointer transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-600 font-bold shrink-0">
              🏫
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] leading-[1.4] tracking-[-0.04em] text-[#303030] truncate">Delhi Public School</span>
              <span className="text-[14px] font-normal leading-[1.4] tracking-[-0.04em] text-[#5E5E5E] truncate">Bokaro Steel City</span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
