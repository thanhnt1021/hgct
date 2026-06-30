'use client'

// Vòng hoàng đạo quay — CONTAINED (chỉ dùng trong S2 hero, không phải nền toàn trang).
// Tái dùng đúng kỹ thuật của ZodiacBackground: TẤT CẢ (vòng + tick + glyph) trong
// 1 <svg> viewBox 720×720 → cùng hệ toạ độ → tâm LUÔN trùng mọi screen size.
// Khác bản nền: recolor glyph sang đồng (copper) + glow vàng cho hợp nền SÁNG.

const ZODIAC = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

const SIZE = 720
const CENTER = SIZE / 2
const R_OUTER = 330
const R_INNER = 230
const R_GLYPH = (R_OUTER + R_INNER) / 2  // 280
const GLYPH = 56

export default function AstroZodiacWheel({ size = 'min(78vw, 430px)' }: { size?: string }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-center pointer-events-none select-none">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: size, height: size,
          animation: 'asSpin 240s linear infinite',
          transformOrigin: 'center', willChange: 'transform',
        }}
      >
        <defs>
          {/* Recolor source (fill near-black) -> đồng #BA7C3B, kèm 2 lớp glow vàng mềm */}
          <filter id="asZodiacGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.051
                      0 0 0 0 0.075
                      0 0 0 0 0.200
                      0 0 0 1 0"
              result="copper"
            />
            <feGaussianBlur in="copper" stdDeviation="1.4" result="glow1" />
            <feGaussianBlur in="copper" stdDeviation="4" result="glow2" />
            <feMerge>
              <feMergeNode in="glow2" />
              <feMergeNode in="glow1" />
              <feMergeNode in="copper" />
            </feMerge>
          </filter>
        </defs>

        {/* Vòng ngoài + trong */}
        <circle cx={CENTER} cy={CENTER} r={R_OUTER} fill="none" stroke="rgba(22,54,83,0.5)" strokeWidth="1.4" />
        <circle cx={CENTER} cy={CENTER} r={R_INNER} fill="none" stroke="rgba(22,54,83,0.25)" strokeWidth="0.9" />

        {/* 12 tick chia */}
        {ZODIAC.map((_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180
          return (
            <line
              key={i}
              x1={CENTER + Math.cos(a) * R_INNER}
              y1={CENTER + Math.sin(a) * R_INNER}
              x2={CENTER + Math.cos(a) * R_OUTER}
              y2={CENTER + Math.sin(a) * R_OUTER}
              stroke="rgba(22,54,83,0.35)"
              strokeWidth="1"
            />
          )
        })}

        {/* Glyph cung — toạ độ trong viewBox nên LUÔN cùng tâm vòng tròn */}
        {ZODIAC.map((name, i) => {
          const angleDeg = i * 30 + 15 - 90
          const a = angleDeg * Math.PI / 180
          const cx = CENTER + Math.cos(a) * R_GLYPH
          const cy = CENTER + Math.sin(a) * R_GLYPH
          const rot = angleDeg - 90
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
              filter="url(#asZodiacGlow)"
              style={{ animation: `signPulse 14s ease-in-out ${i * (14 / 12)}s infinite`, willChange: 'opacity' }}
            />
          )
        })}
      </svg>
    </div>
  )
}
