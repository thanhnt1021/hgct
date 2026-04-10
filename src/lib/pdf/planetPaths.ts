// Placeholder paths for 15 planet/point symbols (artboard 100×100, centered at 50,50)
// All 15 shapes DISTINCT from each other AND from the 12 SIGN_PATHS — for verification
// Colors are passed by the caller (black / #0033ff / #ff0000 / #00cc00)

// ── 10 main planets ─────────────────────────────────────────────────
const S8    = 'M 50,10 L 58,32 L 78,22 L 69,42 L 90,50 L 69,58 L 78,78 L 58,68 L 50,90 L 42,68 L 22,78 L 32,58 L 10,50 L 32,42 L 22,22 L 42,32 Z'  // ★ 8-pointed star
const CRE   = 'M 40,10 Q 85,50 40,90 Q 65,50 40,10 Z'                                                                                                    // ☽ Right crescent — visual center ≈(51,50)
const OCT   = 'M 65,13 L 87,35 L 87,65 L 65,87 L 35,87 L 13,65 L 13,35 L 35,13 Z'                                                                       // ⬡ Octagon
const HRT   = 'M 50,30 C 50,18 35,12 26,20 C 14,28 14,44 26,55 L 50,80 L 74,55 C 86,44 86,28 74,20 C 65,12 50,18 50,30 Z'                               // ♥ Heart
const TRI_R = 'M 30,15 L 30,85 L 90,50 Z'                                                                                                                 // ▶ Right-pointing Triangle — centroid (50,50)
const TRI_L = 'M 70,15 L 70,85 L 10,50 Z'                                                                                                                 // ◀ Left-pointing Triangle
const TRAP  = 'M 8,20 L 92,20 L 75,80 L 25,80 Z'                                                                                                          // ⏢ Trapezoid (wide top)
const S5    = 'M 50,10 L 59,37 L 88,38 L 65,55 L 74,82 L 50,66 L 27,82 L 35,55 L 12,38 L 41,37 Z'                                                       // ⭐ 5-pointed star
const S6    = 'M 50,5 L 62,28 L 88,23 L 77,47 L 95,65 L 70,65 L 65,90 L 50,72 L 35,90 L 30,65 L 5,65 L 23,47 L 12,23 L 38,28 Z'                       // ✡ 6-pointed star
const PAR   = 'M 25,10 L 90,10 L 75,90 L 10,90 Z'                                                                                                          // ▱ Parallelogram

// ── 5 minor planets / points ─────────────────────────────────────────
const ARR   = 'M 5,35 L 60,35 L 60,15 L 95,50 L 60,85 L 60,65 L 5,65 Z'                                                                                  // ➡ Right Arrow
const ARL   = 'M 95,35 L 40,35 L 40,15 L 5,50 L 40,85 L 40,65 L 95,65 Z'                                                                                  // ⬅ Left Arrow
const SHD   = 'M 10,10 L 90,10 L 90,65 L 50,92 L 10,65 Z'                                                                                                 // 🛡 Shield / Home-plate
const BOW   = 'M 10,10 L 50,42 L 90,10 L 90,90 L 50,58 L 10,90 Z'                                                                                         // ⧖ Bowtie / Hourglass
const CRL   = 'M 60,10 Q 15,50 60,90 Q 35,50 60,10 Z'                                                                                                       // ☾ Left crescent — visual center ≈(49,50)

export const PLANET_PATH_DEFAULT = S8

export const PLANET_PATHS: Record<string, string> = {
  Sun:          S8,      // ★ 8-pointed star
  Moon:         CRE,     // ☽ Right crescent
  Mercury:      OCT,     // ⬡ Octagon
  Venus:        HRT,     // ♥ Heart
  Mars:         TRI_R,   // ▶ Right triangle
  Jupiter:      TRI_L,   // ◀ Left triangle
  Saturn:       TRAP,    // ⏢ Trapezoid
  Uranus:       S5,      // ⭐ 5-pointed star
  Neptune:      S6,      // ✡ 6-pointed star
  Pluto:        PAR,     // ▱ Parallelogram
  'True Node':  ARR,     // ➡ Right arrow
  'South Node': CRL,     // ☾ Left crescent
  Chiron:       ARL,     // ⬅ Left arrow
  Vertex:       SHD,     // 🛡 Shield
  Lilith:       BOW,     // ⧖ Bowtie
}
