import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Calendar, formatDate, formatDisplayDate } from "./Calendar";

interface DateRangePickerProps {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  /** 개별 콜백 (deprecated - onChange 사용 권장) */
  onStartDateChange?: (date: string | undefined) => void;
  onEndDateChange?: (date: string | undefined) => void;
  /** 두 날짜를 한 번에 전달하는 콜백 */
  onChange?: (startDate: string | undefined, endDate: string | undefined) => void;
  placeholder?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onChange,
  placeholder = "기간 선택",
}: DateRangePickerProps) {
  // 날짜 변경 헬퍼 함수
  const notifyChange = (newStart: string | undefined, newEnd: string | undefined) => {
    if (onChange) {
      onChange(newStart, newEnd);
    } else {
      onStartDateChange?.(newStart);
      onEndDateChange?.(newEnd);
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // 내부 상태로 선택 관리
  const [internalStart, setInternalStart] = useState<string | undefined>(startDate);
  const [internalEnd, setInternalEnd] = useState<string | undefined>(endDate);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // SSR 대응
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // props 변경 시 내부 상태 동기화
  useEffect(() => {
    setInternalStart(startDate);
    setInternalEnd(endDate);
  }, [startDate, endDate]);

  // 드롭다운 위치 계산
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 400; // w-28 (112px) + w-72 (288px)
        const dropdownHeight = 360;

        let left = rect.right - dropdownWidth;
        if (left < 8) left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 8) {
          left = window.innerWidth - dropdownWidth - 8;
        }

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

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInternalStart(undefined);
    setInternalEnd(undefined);
    setSelectingEnd(false);
    notifyChange(undefined, undefined);
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    setInternalStart(startStr);
    setInternalEnd(endStr);
    setSelectingEnd(false);
    // 빠른 선택은 바로 적용
    notifyChange(startStr, endStr);
    setIsOpen(false);
  };

  const handleDateSelect = (date: string) => {
    if (!selectingEnd) {
      // 시작일 선택
      setInternalStart(date);
      setInternalEnd(undefined);
      setSelectingEnd(true);
    } else {
      // 종료일 선택
      if (internalStart && date < internalStart) {
        // 종료일이 시작일보다 이전이면 시작일로 설정
        setInternalStart(date);
        setInternalEnd(undefined);
      } else {
        setInternalEnd(date);
        setSelectingEnd(false);
      }
    }
  };

  const handleConfirm = () => {
    notifyChange(internalStart, internalEnd);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // 원래 값으로 복원
    setInternalStart(startDate);
    setInternalEnd(endDate);
    setSelectingEnd(false);
    setIsOpen(false);
  };

  const hasValue = startDate || endDate;
  const hasInternalValue = internalStart || internalEnd;

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          hasValue
            ? "border-indigo-200 bg-indigo-50 text-indigo-600"
            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
        }`}
      >
        <CalendarIcon className="w-4 h-4" />
        <span>
          {startDate && endDate
            ? `${formatDisplayDate(startDate)} ~ ${formatDisplayDate(endDate)}`
            : startDate
              ? `${formatDisplayDate(startDate)} ~`
              : placeholder}
        </span>
        {hasValue && (
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
            className="z-[9999] bg-white rounded-xl shadow-lg border border-gray-200 flex"
          >
            {/* 왼쪽: 빠른 선택 */}
            <div className="w-28 p-3 border-r border-gray-100 flex flex-col">
              <div className="text-[10px] text-gray-400 mb-2 font-medium">빠른 선택</div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickSelect(7)}
                  className="px-2 py-1.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors text-left"
                >
                  최근 7일
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(30)}
                  className="px-2 py-1.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors text-left"
                >
                  최근 30일
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSelect(90)}
                  className="px-2 py-1.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors text-left"
                >
                  최근 90일
                </button>
              </div>
              <div className="flex-1" />
              {hasInternalValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="mt-2 px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors text-left"
                >
                  초기화
                </button>
              )}
            </div>

            {/* 오른쪽: 달력 */}
            <div className="p-3 w-72 flex flex-col">
              {/* 선택된 날짜 표시 */}
              <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-gray-100">
                <div className={`text-xs font-medium px-3 py-1.5 rounded-md min-w-[60px] text-center ${
                  internalStart
                    ? "bg-indigo-100 text-indigo-700"
                    : !selectingEnd
                      ? "bg-indigo-50 text-indigo-400 border border-dashed border-indigo-300"
                      : "bg-gray-50 text-gray-400"
                }`}>
                  {internalStart ? formatDisplayDate(internalStart) : "시작"}
                </div>
                <span className="text-gray-300 text-sm">~</span>
                <div className={`text-xs font-medium px-3 py-1.5 rounded-md min-w-[60px] text-center ${
                  internalEnd
                    ? "bg-indigo-100 text-indigo-700"
                    : selectingEnd
                      ? "bg-indigo-50 text-indigo-400 border border-dashed border-indigo-300"
                      : "bg-gray-50 text-gray-400"
                }`}>
                  {internalEnd ? formatDisplayDate(internalEnd) : "종료"}
                </div>
              </div>

              {/* 선택 안내 */}
              <div className="text-xs text-gray-500 mb-2 text-center">
                {selectingEnd ? "종료일을 선택하세요" : "시작일을 선택하세요"}
              </div>

              {/* 캘린더 */}
              <Calendar
                startDate={internalStart}
                endDate={internalEnd}
                onDateSelect={handleDateSelect}
                isRangeMode={true}
              />

              {/* 완료/취소 버튼 */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!internalStart}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  완료
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
