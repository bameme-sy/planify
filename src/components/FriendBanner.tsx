import React from 'react';
import { User } from '../types';
import { Eye, ArrowLeft } from 'lucide-react';

interface FriendBannerProps {
  friend: User;
  onReturnToMySchedule: () => void;
}

export const FriendBanner: React.FC<FriendBannerProps> = ({
  friend,
  onReturnToMySchedule,
}) => {
  return (
    <div className="bg-[#007aff]/10 dark:bg-[#0a84ff]/15 border-b border-[#007aff]/30 py-2 px-3 sm:px-5 z-20 flex items-center justify-between gap-3 animate-in slide-in-from-top-1 duration-150 no-print select-none">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-[5px] bg-[#007aff]/15 dark:bg-[#0a84ff]/25 text-[#007aff] dark:text-[#70baff] shrink-0">
          <Eye className="h-3.5 w-3.5" />
        </div>
        <div className="truncate text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7]">
          <span className="opacity-75">Planning partagé de </span>
          <span className="font-semibold">{friend.name}</span>
          <span className="text-[11px] text-[#8e8e93] ml-1">(@{friend.username})</span>
          <span className="hidden md:inline-block ml-2 text-[10px] uppercase font-medium tracking-wide px-1.5 py-0.5 rounded-[4px] bg-[#007aff]/15 dark:bg-[#0a84ff]/25 text-[#007aff] dark:text-[#70baff]">
            Lecture seule
          </span>
        </div>
      </div>

      <button
        onClick={onReturnToMySchedule}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] active:bg-[#0051a8] text-white text-[12px] font-medium shadow-2xs transition-colors shrink-0"
      >
        <ArrowLeft className="h-3 w-3" />
        <span>Mon planning</span>
      </button>
    </div>
  );
};
