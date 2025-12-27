import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

interface CalendarProps {
  /** 선택된 날짜 (단일 선택 모드) */
  selectedDate?: string;
  /** 시작일 (범위 선택 모드) */
  startDate?: string;
  /** 종료일 (범위 선택 모드) */
  endDate?: string;
  /** 날짜 클릭 핸들러 */
  onDateSelect: (date: string) => void;
  /** 최소 선택 가능 날짜 */
  minDate?: string;
  /** 최대 선택 가능 날짜 */
  maxDate?: string;
  /** 범위 선택 모드 여부 */
  isRangeMode?: boolean;
}

export function Calendar({
  selectedDate,
  startDate,
  endDate,
  onDateSelect,
  minDate,
  maxDate,
  isRangeMode = false,
}: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate);
    if (startDate) return new Date(startDate);
    return new Date();
  });

  // 선택된 날짜가 변경되면 해당 월로 이동
  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate));
    } else if (startDate) {
      setViewDate(new Date(startDate));
    }
  }, [selectedDate, startDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const isSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    return formatDate(new Date(year, month, day)) === selectedDate;
  };

  const isInRange = (day: number): boolean => {
    if (!isRangeMode || !startDate) return false;
    const current = formatDate(new Date(year, month, day));
    if (!endDate) return current === startDate;
    return current >= startDate && current <= endDate;
  };

  const isRangeStart = (day: number): boolean => {
    if (!isRangeMode || !startDate) return false;
    return formatDate(new Date(year, month, day)) === startDate;
  };

  const isRangeEnd = (day: number): boolean => {
    if (!isRangeMode || !endDate) return false;
    return formatDate(new Date(year, month, day)) === endDate;
  };

  const isDisabled = (day: number): boolean => {
    const dateStr = formatDate(new Date(year, month, day));
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  // 달력 그리드 생성
  const calendarDays: { day: number; isCurrentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthLastDay - i, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, isCurrentMonth: true });
  }

  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({ day, isCurrentMonth: false });
  }

  const handleDateClick = (day: number) => {
    if (isDisabled(day)) return;
    onDateSelect(formatDate(new Date(year, month, day)));
  };

  const handleTodayClick = () => {
    const today = new Date();
    setViewDate(today);
    onDateSelect(formatDate(today));
  };

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {year}년 {MONTHS[month]}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((item, idx) => {
          const dayOfWeek = idx % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          if (!item.isCurrentMonth) {
            return (
              <div
                key={idx}
                className="aspect-square flex items-center justify-center text-xs text-gray-300"
              >
                {item.day}
              </div>
            );
          }

          const disabled = isDisabled(item.day);
          const selected = isSelected(item.day);
          const today = isToday(item.day);
          const inRange = isInRange(item.day);
          const rangeStart = isRangeStart(item.day);
          const rangeEnd = isRangeEnd(item.day);

          // 범위 모드 스타일
          if (isRangeMode) {
            // 시작/종료일 스타일
            const startEndClass = rangeStart || rangeEnd
              ? "bg-indigo-600 text-white font-semibold z-10"
              : "";
            // 범위 내 스타일
            const inRangeClass = inRange && !rangeStart && !rangeEnd
              ? "bg-indigo-100 text-indigo-700"
              : "";
            // 오늘 스타일
            const todayClass = today && !inRange
              ? "font-semibold text-indigo-600"
              : "";
            // 기본 스타일
            const defaultClass = !inRange && !rangeStart && !rangeEnd && !today
              ? disabled
                ? "text-gray-300 cursor-not-allowed"
                : isSunday
                  ? "text-red-500 hover:bg-gray-100"
                  : isSaturday
                    ? "text-blue-500 hover:bg-gray-100"
                    : "text-gray-700 hover:bg-gray-100"
              : "";
            // 라운드 처리
            const roundedClass = rangeStart && !rangeEnd
              ? "rounded-l-lg"
              : rangeEnd && !rangeStart
                ? "rounded-r-lg"
                : rangeStart && rangeEnd
                  ? "rounded-lg"
                  : "";

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => handleDateClick(item.day)}
                className={`aspect-square flex items-center justify-center text-xs transition-all ${startEndClass} ${inRangeClass} ${todayClass} ${defaultClass} ${roundedClass}`}
              >
                {item.day}
              </button>
            );
          }

          // 단일 선택 모드 스타일
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handleDateClick(item.day)}
              className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
                selected
                  ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-1"
                  : today
                    ? "bg-indigo-50 text-indigo-600 font-semibold ring-1 ring-indigo-200"
                    : disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : isSunday
                        ? "text-red-500 hover:bg-gray-100"
                        : isSaturday
                          ? "text-blue-500 hover:bg-gray-100"
                          : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* 오늘 버튼 (단일 선택 모드만) */}
      {!isRangeMode && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
          <button
            type="button"
            onClick={handleTodayClick}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            오늘
          </button>
        </div>
      )}
    </div>
  );
}

export { DAYS, MONTHS };

// 유틸리티 함수 export
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatFullDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}
