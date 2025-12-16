/**
 * Custom SVG Login Icon - أيقونة تسجيل الدخول المخصصة
 * تصميم احترافي يجمع بين رمز المستخدم وسهم الدخول
 */
export default function LoginIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* User circle - رأس المستخدم */}
      <circle
        cx="9"
        cy="7"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* User body - جسم المستخدم */}
      <path
        d="M3 19c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow pointing right - سهم الدخول */}
      <path
        d="M15 12l3-3m0 3l-3-3m3 3H12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door frame - إطار الباب (اختياري للوضوح) */}
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  )
}

