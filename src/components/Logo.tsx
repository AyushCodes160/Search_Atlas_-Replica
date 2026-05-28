// GoToSEO mark — a magnifying glass (search) with an upward trend arrow
// (ranking growth) inside. Brand teal lens/handle, gold accent arrow.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      {/* lens */}
      <circle cx="104" cy="104" r="66" stroke="#006a6a" strokeWidth="22" fill="none" />
      {/* handle */}
      <line
        x1="151"
        y1="151"
        x2="214"
        y2="214"
        stroke="#006a6a"
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* upward trend arrow (gold) */}
      <path
        d="M78 130 L130 78"
        stroke="#e2b203"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d="M104 78 L130 78 L130 104"
        stroke="#e2b203"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
