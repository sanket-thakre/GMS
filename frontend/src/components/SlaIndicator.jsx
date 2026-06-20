import { useEffect, useState } from "react";
import { formatRemaining } from "../utils/time";

// Phase 16: Red/Amber/Green/Breached SLA urgency cue — a colored dot + label.
const DOT_CLASS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500 animate-pulse",
  breached: "bg-red-700",
};

export default function SlaIndicator({ slaStatus, secondsRemaining }) {
  // `live` is the displayed remaining-seconds. It is reset whenever the source
  // value changes (e.g. a list refetch) and ticked down every 60s by a timer,
  // so the label stays current without re-fetching. All wall-clock reads happen
  // inside the effect, keeping render pure.
  const [live, setLive] = useState(secondsRemaining);

  useEffect(() => {
    setLive(secondsRemaining);
    if (secondsRemaining === null || secondsRemaining === undefined) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      setLive(secondsRemaining - Math.floor((Date.now() - startedAt) / 1000));
    }, 60000);
    return () => clearInterval(id);
  }, [secondsRemaining, slaStatus]);

  const dotClass = DOT_CLASS[slaStatus] ?? "bg-gray-400";
  const isBreached = slaStatus === "breached";

  return (
    <span
      className="inline-flex items-center gap-2"
      title={`SLA: ${slaStatus ?? "unknown"}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      <span
        className={`text-xs ${isBreached ? "text-red-700 font-medium" : "text-gray-600"}`}
      >
        {isBreached ? "Breached" : formatRemaining(live)}
      </span>
    </span>
  );
}
