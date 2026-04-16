import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: any;
  label: string;
}

interface CustomDropdownProps {
  value: any;
  options: Option[];
  onChange: (val: any) => void;
  label?: string;
  compact?: boolean;
  variant?: 'header' | 'light';
  className?: string;
}

export default function CustomDropdown({
  value,
  options,
  onChange,
  label,
  compact = false,
  variant = 'header',
  className = ''
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const isHeader = variant === 'header';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-xl font-black transition-all cursor-pointer focus:ring-2 outline-none select-none transition-all duration-200 active:scale-[0.98] ${
          isHeader
            ? 'bg-white/10 border-white/10 text-white hover:bg-white/20 focus:ring-blue-400'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 focus:border-blue-500 focus:ring-blue-500/10'
        } ${compact ? 'text-[10px] min-w-[60px]' : 'text-xs sm:text-sm min-w-[100px]'}`}
      >
        <span className="truncate">{selectedOption?.label || label || value}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-250 ${
          isHeader ? 'text-white/50' : 'text-gray-400'
        } ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[160px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden backdrop-blur-lg bg-white/95">
          <div className="max-h-64 overflow-y-auto custom-scrollbar px-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] sm:text-xs font-black rounded-xl transition-all mb-0.5 ${
                  value === opt.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-gray-500 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span className="truncate uppercase tracking-tighter">{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
