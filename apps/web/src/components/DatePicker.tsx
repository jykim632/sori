import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar, formatFullDisplayDate } from "./Calendar";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // SSR 대응
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 드롭다운 위치 계산
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 288;
        const dropdownHeight = 360;

        let left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 8) {
          left = rect.right - dropdownWidth;
        }
        if (left < 8) left = 8;

        let top = rect.bottom + 8;
        if (top + dropdownHeight > window.innerHeight - 8) {
          top = rect.top - dropdownHeight - 8;
          if (top < 8) top = 8;
        }

        setDropdownPosition({ top, left: Math.max(8, left) });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleDateSelect = (date: string) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          value
            ? "border-indigo-200 bg-indigo-50 text-indigo-600"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        <span>{value ? formatFullDisplayDate(value) : placeholder}</span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 p-0.5 hover:bg-indigo-100 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* 달력 드롭다운 */}
      {isOpen &&
        isMounted &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
            className="z-[9999] bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-72"
          >
            {/* 선택된 날짜 표시 */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                <span className={`text-sm font-medium ${value ? "text-gray-800" : "text-gray-400"}`}>
                  {value ? formatFullDisplayDate(value) : "날짜를 선택하세요"}
                </span>
              </div>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 캘린더 */}
            <Calendar
              selectedDate={value}
              onDateSelect={handleDateSelect}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>,
          document.body
        )}
    </>
  );
}
