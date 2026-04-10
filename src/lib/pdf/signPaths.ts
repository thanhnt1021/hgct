// Placeholder paths for 12 zodiac signs (artboard 100×100, centered at 50,50)
// 12 shapes DISTINCT from each other — for position/accuracy verification
// Colors: EL_COLORS[i % 4] — Fire/Earth/Air/Water (caller sets fill)

export const SIGN_PATHS: string[] = [
  // 0  Aries       ▲ Triangle Up
  'M 50,5 L 95,90 L 5,90 Z',
  // 1  Taurus      ● Circle
  'M 50,10 A 40,40 0 1,0 50,90 A 40,40 0 1,0 50,10 Z',
  // 2  Gemini      ◆ Diamond
  'M 50,5 L 95,50 L 50,95 L 5,50 Z',
  // 3  Cancer      ▽ Triangle Down
  'M 50,95 L 5,10 L 95,10 Z',
  // 4  Leo         ■ Square
  'M 10,10 L 90,10 L 90,90 L 10,90 Z',
  // 5  Virgo       ⬠ Pentagon
  'M 50,5 L 93,34 L 78,90 L 22,90 L 7,34 Z',
  // 6  Libra       ⬡ Hexagon
  'M 50,5 L 92,27 L 92,73 L 50,95 L 8,73 L 8,27 Z',
  // 7  Scorpio     ✦ 4-pointed Star
  'M 50,5 L 61,39 L 95,50 L 61,61 L 50,95 L 39,61 L 5,50 L 39,39 Z',
  // 8  Sagittarius ✚ Plus Cross
  'M 35,5 L 65,5 L 65,35 L 95,35 L 95,65 L 65,65 L 65,95 L 35,95 L 35,65 L 5,65 L 5,35 L 35,35 Z',
  // 9  Capricorn   ⬆ Arrow Up
  'M 50,5 L 80,50 L 63,50 L 63,95 L 37,95 L 37,50 L 20,50 Z',
  // 10 Aquarius    ⬇ Arrow Down
  'M 50,95 L 20,50 L 37,50 L 37,5 L 63,5 L 63,50 L 80,50 Z',
  // 11 Pisces      ✖ X Cross
  'M 15,5 L 50,35 L 85,5 L 95,15 L 65,50 L 95,85 L 85,95 L 50,65 L 15,95 L 5,85 L 35,50 L 5,15 Z',
]
