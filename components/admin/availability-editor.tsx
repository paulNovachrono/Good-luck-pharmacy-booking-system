"use client";

export interface Availability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isAvailable: boolean;
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function defaultAvailability(): Availability[] {
  return DAY_LABELS.map((_, i) => ({
    dayOfWeek: i,
    startTime: "10:00",
    endTime: "14:00",
    slotDuration: 30,
    isAvailable: i < 5,
  }));
}

const timeCls =
  "rounded-md border border-hairline bg-white px-2 py-1.5 text-sm focus:outline-none focus:border-focus-blue";

export default function AvailabilityEditor({
  value,
  onChange,
}: {
  value: Availability[];
  onChange: (next: Availability[]) => void;
}) {
  function update(day: number, patch: Partial<Availability>) {
    onChange(value.map((a) => (a.dayOfWeek === day ? { ...a, ...patch } : a)));
  }

  return (
    <div className="divide-y divide-hairline border border-hairline rounded-md">
      {value.map((a) => (
        <div key={a.dayOfWeek} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <label className="flex items-center gap-2 w-28 text-sm text-primary">
            <input
              type="checkbox"
              checked={a.isAvailable}
              onChange={(e) => update(a.dayOfWeek, { isAvailable: e.target.checked })}
              className="accent-deep-green h-4 w-4"
            />
            <span className={a.isAvailable ? "font-semibold" : "text-body-muted"}>
              {DAY_LABELS[a.dayOfWeek]}
            </span>
          </label>
          <div className="flex items-center gap-2 ml-6">
            <input
              type="time"
              className={timeCls}
              value={a.startTime}
              disabled={!a.isAvailable}
              onChange={(e) => update(a.dayOfWeek, { startTime: e.target.value })}
            />
            <span className="text-body-muted">–</span>
            <input
              type="time"
              className={timeCls}
              value={a.endTime}
              disabled={!a.isAvailable}
              onChange={(e) => update(a.dayOfWeek, { endTime: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-body-muted ml-4">
            Slot duration
            <select
              className={timeCls}
              value={a.slotDuration}
              disabled={!a.isAvailable}
              onChange={(e) => update(a.dayOfWeek, { slotDuration: Number(e.target.value) })}
            >
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}
