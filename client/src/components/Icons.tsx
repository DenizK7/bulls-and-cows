// Cohesive inline line-icon set (matches the app's existing stroke SVGs).
// 24x24, stroke = currentColor, no fills (except tiny dots), rounded joins.

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconTrophy({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10" />
      <path d="M12 14v3M9 21h6M10 21l.5-4M14 21l-.5-4" />
    </svg>
  );
}

export function IconUser({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IconUsers({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17.2 20a5.5 5.5 0 0 0-3-4.9" />
    </svg>
  );
}

export function IconCalendar({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.5h.01M12 16.5h.01" />
    </svg>
  );
}

export function IconBolt({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />
    </svg>
  );
}

export function IconRobot({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="5" y="8" width="14" height="11" rx="2.5" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M10 16h4M12 4.5v3.5M3.5 13.5h1.5M19 13.5h1.5" />
      <circle cx="12" cy="3.5" r="1" />
    </svg>
  );
}

export function IconHelp({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 0 1 4.7 1.1c0 1.6-2.3 2-2.3 3.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconSwords({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M14.5 14.5 21 21M14.5 17.5 17.5 14.5M3 3h3l11 11-3 3L3 6V3Z" />
      <path d="M9.5 14.5 3 21M9.5 17.5 6.5 14.5M21 3h-3L7 14l3 3L21 6V3Z" />
    </svg>
  );
}

export function IconGlobe({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.5 2.6 15.5 0 18M12 3c-2.6 2.5-2.6 15.5 0 18" />
    </svg>
  );
}
