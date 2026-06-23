import React from 'react';
import { cn } from '../../lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative rounded-full overflow-hidden flex items-center justify-center", className)}>
      {/* Outer Glass Ring */}
      <div className="absolute inset-0 rounded-full border border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.3)] mix-blend-overlay"></div>
      
      {/* Top Purple Gradient */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#C411E0]/80 to-transparent"></div>
      
      {/* Bottom Cyan Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#00E5FF]/80 to-transparent"></div>

      {/* Inner Dark Core */}
      <div className="absolute inset-[15%] rounded-full bg-black border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"></div>
      
      {/* Glass Highlight Top */}
      <div className="absolute top-[5%] inset-x-[20%] h-[15%] bg-white/40 rounded-full blur-[1px]"></div>
      {/* Glass Highlight Bottom */}
      <div className="absolute bottom-[5%] inset-x-[20%] h-[10%] bg-white/20 rounded-full blur-[2px]"></div>
    </div>
  );
}
