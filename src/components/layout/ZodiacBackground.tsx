'use client'

// VISUAL ONLY — Background zodiac wheel that slowly rotates.
//
// EVERYTHING (rings, ticks, glyphs) lives inside one <svg> with viewBox 0 0 720
// 720. That guarantees circles and symbols share the SAME coordinate system —
// browser rounding/scaling applies uniformly to all → tâm luôn trùng nhau bất
// kể screen size.
//
// Symbols are radial-oriented (top of glyph hướng tâm) — same convention as
// natal chart in PDF. Wheel rotates as a rigid unit → radial orientation
// preserved at every angle.
//
// Recolour to white + glow via SVG <filter> (feColorMatrix + feGaussianBlur +
// feMerge). Source glyph stays sharp on top of soft glow.

const ZODIAC = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

const SIZE = 720
const CENTER = SIZE / 2
const R_OUTER = 330
const R_INNER = 230
const R_GLYPH = (R_OUTER + R_INNER) / 2  // 280
const GLYPH = 60                          // glyph size in viewBox units

export default function ZodiacBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-[5] flex items-center justify-center pointer-events-none overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: 'min(119vmin, 1120px)',
          height: 'min(119vmin, 1120px)',
          opacity: 0.45,
          animation: 'zodiacRotate 240s linear infinite',
          transformOrigin: 'center',
          willChange: 'transform',
        }}
      >
        <defs>
          {/* Recolour source (which is fill="#010101") to white, then add two
              soft glow layers around it. Source stays sharp on top. */}
          <filter id="zodiacGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1 0"
              result="white"
            />
            <feGaussianBlur in="white" stdDeviation="2" result="glow1" />
            <feGaussianBlur in="white" stdDeviation="6" result="glow2" />
            <feMerge>
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="white" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer + inner rings */}
        <circle cx={CENTER} cy={CENTER} r={R_OUTER} fill="none" stroke="rgba(220,200,160,0.55)" strokeWidth="1.4" />
        <circle cx={CENTER} cy={CENTER} r={R_INNER} fill="none" stroke="rgba(220,200,160,0.35)" strokeWidth="0.9" />

        {/* 12 dividing ticks */}
        {ZODIAC.map((_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180
          return (
            <line
              key={i}
              x1={CENTER + Math.cos(a) * R_INNER}
              y1={CENTER + Math.sin(a) * R_INNER}
              x2={CENTER + Math.cos(a) * R_OUTER}
              y2={CENTER + Math.sin(a) * R_OUTER}
              stroke="rgba(220,200,160,0.4)"
              strokeWidth="1"
            />
          )
        })}

        {/* Sign glyphs — positioned in viewBox coords so they ALWAYS share the
            circle's center. Each rotated by (angleDeg - 90°) so top points
            inward; wheel rotates rigidly → radial orientation preserved. */}
        {ZODIAC.map((name, i) => {
          const angleDeg = i * 30 + 15 - 90        // midpoint of each segment
          const a = angleDeg * Math.PI / 180
          const cx = CENTER + Math.cos(a) * R_GLYPH
          const cy = CENTER + Math.sin(a) * R_GLYPH
          const rot = angleDeg - 90                // top points to center
          const half = GLYPH / 2
          return (
            <image
              key={name}
              href={`/chart-symbols/signs/${name}.svg`}
              x={cx - half}
              y={cy - half}
              width={GLYPH}
              height={GLYPH}
              transform={`rotate(${rot} ${cx} ${cy})`}
              filter="url(#zodiacGlow)"
              style={{
                animation: `signPulse 14s ease-in-out ${i * (14 / 12)}s infinite`,
                willChange: 'opacity',
              }}
            />
          )
        })}
      </svg>

      <style>{`
        @keyframes zodiacRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes signPulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
