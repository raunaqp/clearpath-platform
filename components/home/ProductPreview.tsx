"use client";

/**
 * Demo-box frame for the home page's "For hospitals" accordion (brief §3).
 *
 * This is a FRAME, not a mock: it scales a real product component down, clips
 * it to a fixed height, and swallows every interaction so the marketing page
 * can never mutate demo state. The component inside is the same one the
 * product renders, so the demo stays true as the product changes — which is
 * the whole reason the brief prefers this over a screenshot.
 *
 * `pointer-events-none` + `aria-hidden` mean the preview is inert and invisible
 * to screen readers; the surrounding copy carries the meaning, and the "Open
 * the real thing" link is the accessible route to the live view.
 */
export function ProductPreview({
  label,
  height,
  scale = 0.75,
  children,
}: {
  /** What the visitor is looking at, shown in the frame's caption bar. */
  label: string;
  /** Clipped height of the frame, in px. */
  height: number;
  /** How far down to scale the real component. */
  scale?: number;
  children: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-card border border-line bg-bg-card">
      <figcaption className="flex items-center gap-2 border-b border-line bg-bg-sink/50 px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {label}
        </span>
      </figcaption>
      <div className="relative overflow-hidden" style={{ height }}>
        <div
          aria-hidden
          className="pointer-events-none select-none"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: `${100 / scale}%`,
          }}
        >
          {children}
        </div>
        {/* Fade the clip line so it reads as "continues below", not "cut off". */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg-card to-transparent" />
      </div>
    </figure>
  );
}
