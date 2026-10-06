import type { CSSProperties } from "react";
export type OfficeIconName =
  | "wallet"
  | "groups"
  | "chart"
  | "bell"
  | "user"
  | "logout"
  | "receipt"
  | "check"
  | "arrow"
  | "plus"
  | "shield"
  | "camera"
  | "bank"
  | "phone";
const paths: Record<OfficeIconName, string[]> = {
  wallet: [
    "M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7",
    "M20 12h-5v4h5",
    "M16.5 14h.01",
  ],
  groups: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  chart: ["M3 3v18h18", "M7 15v3", "M12 10v8", "M17 6v12"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
  user: ["M20 21v-2a7 7 0 0 0-14 0v2", "M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
  logout: [
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    "M16 17l5-5-5-5",
    "M21 12H9",
  ],
  receipt: ["M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z", "M9 9h6", "M9 13h6"],
  check: ["M20 6 9 17l-5-5"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  plus: ["M12 5v14", "M5 12h14"],
  shield: ["M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Z", "m8 12 3 3 5-5"],
  camera: [
    "M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3Z",
    "M16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  ],
  bank: [
    "m3 9 9-6 9 6H3Z",
    "M5 9v10",
    "M10 9v10",
    "M14 9v10",
    "M19 9v10",
    "M3 21h18",
  ],
  phone: [
    "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z",
    "M10 18h4",
  ],
};
export default function OfficeIcon({
  name,
  size = 20,
  className,
  style,
}: {
  name: OfficeIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
