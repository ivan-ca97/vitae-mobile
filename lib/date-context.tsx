import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { todayStr } from "./format";

interface DateContextValue {
  date: string;
  isToday: boolean;
  setDate: (d: string) => void;
  goToToday: () => void;
  goPrev: () => void;
  goNext: () => void;
}

const DateContext = createContext<DateContextValue | null>(null);

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [date, setDate] = useState(todayStr);

  const isToday = useMemo(() => date === todayStr(), [date]);

  const goToToday = useCallback(() => setDate(todayStr()), []);
  const goPrev = useCallback(() => setDate((d) => addDays(d, -1)), []);
  const goNext = useCallback(() => setDate((d) => addDays(d, 1)), []);

  return (
    <DateContext.Provider value={{ date, isToday, setDate, goToToday, goPrev, goNext }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDate must be inside DateProvider");
  return ctx;
}
