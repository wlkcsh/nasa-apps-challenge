"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectItem<T extends string> {
  id: T;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  numericIndicator?: {
    label: string;
    value: string | number;
    color?: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
}

interface CustomSelectProps<T extends string> {
  label: string;
  helperText?: string;
  value: T;
  options: CustomSelectItem<T>[];
  onChange: (value: T) => void;
  renderExtra?: (item: CustomSelectItem<T>) => React.ReactNode;
}

export function CustomSelect<T extends string>({
  label,
  helperText,
  value,
  options,
  onChange,
  renderExtra,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = options.find((opt) => opt.id === value) || options[0];

  // Close on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = (id: T) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5 text-left">
      {/* Header Label */}
      <div className="flex items-center justify-between text-xs font-medium text-espresso-700">
        <span>{label}</span>
        {selectedItem?.badge && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              selectedItem.badgeColor || "bg-paper-200 text-espresso-700 border-paper-300"
            }`}
          >
            {selectedItem.badge}
          </span>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          transition: "all 180ms var(--spring-snappy)",
        }}
        className={`group w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-paper-50 border text-xs font-medium text-espresso-950 shadow-sm transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-harvest-500 ${
          isOpen
            ? "border-harvest-500 shadow-md ring-1 ring-harvest-500/30 bg-white"
            : "border-paper-300 hover:border-harvest-500/50 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedItem?.icon && (
            <div className="p-1 rounded-md bg-paper-200 text-espresso-700 shrink-0">
              <selectedItem.icon className="w-4 h-4 text-harvest-600" />
            </div>
          )}
          <div className="flex flex-col text-left truncate">
            <span className="text-espresso-950 font-semibold truncate">
              {selectedItem?.label}
            </span>
            {selectedItem?.sublabel && (
              <span className="text-[11px] text-espresso-600 font-normal truncate">
                {selectedItem.sublabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedItem?.numericIndicator && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-paper-200 text-espresso-700 border border-paper-300">
              {selectedItem.numericIndicator.value}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-espresso-500 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-harvest-600" : "group-hover:text-espresso-800"
            }`}
          />
        </div>
      </button>

      {/* Floating Bespoke Options List */}
      {isOpen && (
        <div
          style={{
            animation: "fadeInScale 160ms var(--spring-snappy) forwards",
          }}
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl bg-white border border-paper-300 p-1.5 shadow-xl focus:outline-none"
        >
          {options.map((opt) => {
            const isCurrent = opt.id === value;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                  isCurrent
                    ? "bg-harvest-50 text-espresso-950 font-bold border border-harvest-500/30"
                    : "text-espresso-800 hover:bg-paper-100 hover:text-espresso-950"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isCurrent ? "text-harvest-600" : "text-espresso-500"
                      }`}
                    />
                  )}
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[11px] text-espresso-600 font-normal truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {opt.numericIndicator && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-paper-200 text-espresso-700">
                      {opt.numericIndicator.value}
                    </span>
                  )}
                  {opt.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        opt.badgeColor || "bg-paper-200 text-espresso-700 border-paper-300"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isCurrent && <Check className="w-3.5 h-3.5 text-harvest-600" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {helperText && <p className="text-[11px] text-espresso-500">{helperText}</p>}
    </div>
  );
}
