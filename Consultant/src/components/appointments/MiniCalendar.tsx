import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ========== Mini Calendar ================== */
export function useMonthMatrix(base: Date) {
    return useMemo(() => {
        const year = base.getFullYear();
        const month = base.getMonth();
        const first = new Date(year, month, 1);
        const start = new Date(first);
        // Monday-first grid
        start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
        const weeks: Date[][] = [];
        for (let w = 0; w < 6; w++) {
            const row: Date[] = [];
            for (let d = 0; d < 7; d++) {
                const cur = new Date(start);
                cur.setDate(start.getDate() + w * 7 + d);
                row.push(cur);
            }
            weeks.push(row);
        }
        return weeks;
    }, [base]);
}

function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const [view, setView] = useState<Date>(new Date(value));
    const matrix = useMonthMatrix(view);
    const title = `${view.toLocaleString("default", { month: "long" })} ${view.getFullYear()}`;
    return (
        <div className="rounded-md border p-3">
            <div className="flex items-center justify-between mb-2">
                <button
                    className="h-7 w-7 rounded-md grid place-items-center hover:bg-gray-100"
                    onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                    title="Previous"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-medium">{title}</div>
                <button
                    className="h-7 w-7 rounded-md grid place-items-center hover:bg-gray-100"
                    onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                    title="Next"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center py-1">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {matrix.flat().map((d, i) => {
                    const outMonth = d.getMonth() !== view.getMonth();
                    const selected = isSameDay(d, value);
                    const today = isSameDay(d, new Date());
                    // Disable past dates
                    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                        <button
                            key={i}
                            onClick={() => !isPast && onChange(new Date(d))}
                            disabled={isPast}
                            className={[
                                "h-8 rounded-md text-sm grid place-items-center",
                                outMonth ? "text-gray-400" : "",
                                isPast ? "text-gray-300 cursor-not-allowed" : "",
                                selected ? "bg-blue-600 text-white" : !isPast ? "hover:bg-gray-100" : "",
                                !selected && today ? "ring-1 ring-blue-400" : "",
                            ].join(" ")}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
