// eslint-disable-next-line @typescript-eslint/no-require-imports
const swe = require('swisseph')

// --- PLANET IDS (mapped to swisseph constants) ---
export const PLANET_IDS: Record<string, number> = {
  Sun: swe.SE_SUN, Moon: swe.SE_MOON, Mercury: swe.SE_MERCURY,
  Venus: swe.SE_VENUS, Mars: swe.SE_MARS, Jupiter: swe.SE_JUPITER,
  Saturn: swe.SE_SATURN, Uranus: swe.SE_URANUS, Neptune: swe.SE_NEPTUNE,
  Pluto: swe.SE_PLUTO, 'True Node': swe.SE_TRUE_NODE, Chiron: swe.SE_CHIRON,
  Lilith: swe.SE_MEAN_APOG,
}

export const CORE_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
export const PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']
export const PERSONAL_PLANETS_SET = new Set(PERSONAL_PLANETS)
export const PLANET_ORDER = [...CORE_PLANETS]

export const OUTER_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

export const TRANSIT_PLANET_ORDER = ['Pluto', 'Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun']
export const NATAL_SPECIAL_POINTS = ['MC', 'Asc', 'Vertex', 'Chiron', 'South Node', 'True Node']
export const MAJOR_ASPECTS = ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition']
export const RETURN_PLANET_ORDER = ['Pluto', 'Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Chiron']

export const FULL_OBJECTS_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'True Node', 'Chiron', 'Vertex', 'Asc', 'MC',
]

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆',
  Pluto: '♇', 'True Node': '☊', Chiron: '⚷', Vertex: 'Vx',
  Asc: 'AC', MC: 'MC', 'South Node': '☋',
}

export const PLANET_POINTS: Record<string, number> = {
  Asc: 4, Sun: 4, Moon: 4, Mercury: 3, Venus: 3, Mars: 3,
  Jupiter: 2, Saturn: 2, Uranus: 1, Neptune: 1, Pluto: 1,
}

export const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
export const ZODIAC_NAMES = ['Bạch Dương', 'Kim Ngưu', 'Song Tử', 'Cự Giải', 'Sư Tử', 'Xử Nữ', 'Thiên Bình', 'Bọ Cạp', 'Nhân Mã', 'Ma Kết', 'Bảo Bình', 'Song Ngư']
export const ZODIAC_CODES = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis']

// Element/Modality matrix: zodiac index → [row, col]
export const ZODIAC_MATRIX: Record<number, [number, number]> = {
  0: [0, 0], 1: [1, 1], 2: [2, 2], 3: [3, 0],
  4: [0, 1], 5: [1, 2], 6: [2, 0], 7: [3, 1],
  8: [0, 2], 9: [1, 0], 10: [2, 1], 11: [3, 2],
}
export const ELEMENT_NAMES = ['Fire', 'Earth', 'Air', 'Water']

export const ASPECTS_DEF: Record<string, {
  angle: number; orb: number; type: 'Hard' | 'Soft' | 'Minor';
  symbol: string; name_vn: string; color: string
}> = {
  Conjunction: { angle: 0, orb: 10, type: 'Hard', symbol: '☌', name_vn: 'Trùng', color: '#000000' },
  Semisextile: { angle: 30, orb: 3.0, type: 'Minor', symbol: '⚺', name_vn: 'Bán Lục Hợp', color: '#00cc00' },
  Sextile: { angle: 60, orb: 6, type: 'Soft', symbol: '⚹', name_vn: 'Lục Hợp', color: '#0033ff' },
  Square: { angle: 90, orb: 10, type: 'Hard', symbol: '□', name_vn: 'Vuông Góc', color: '#ff0000' },
  Trine: { angle: 120, orb: 10, type: 'Soft', symbol: '△', name_vn: 'Tam Hợp', color: '#0033ff' },
  Quincunx: { angle: 150, orb: 3.0, type: 'Minor', symbol: '⚻', name_vn: 'Ngũ Chiếu', color: '#00cc00' },
  Opposition: { angle: 180, orb: 10, type: 'Hard', symbol: '☍', name_vn: 'Đối Đỉnh', color: '#ff0000' },
}

export const RULER_MAP: Record<string, string> = {
  'Bạch Dương': 'Mars', 'Kim Ngưu': 'Venus', 'Song Tử': 'Mercury', 'Cự Giải': 'Moon',
  'Sư Tử': 'Sun', 'Xử Nữ': 'Mercury', 'Thiên Bình': 'Venus', 'Bọ Cạp': 'Pluto',
  'Nhân Mã': 'Jupiter', 'Ma Kết': 'Saturn', 'Bảo Bình': 'Uranus', 'Song Ngư': 'Neptune',
}

export const PLANET_NAMES_VN: Record<string, string> = {
  Sun: 'Mặt Trời', Moon: 'Mặt Trăng', Mercury: 'Sao Thủy', Venus: 'Sao Kim', Mars: 'Sao Hỏa',
  Jupiter: 'Sao Mộc', Saturn: 'Sao Thổ', Uranus: 'Thiên Vương', Neptune: 'Hải Vương', Pluto: 'Diêm Vương',
  'True Node': 'La Hầu', 'South Node': 'Kế Đô', Asc: 'Cung Mọc', Chiron: 'Chiron', Vertex: 'Vertex', MC: 'Thiên Đỉnh',
}

export const COUNTRIES_WITH_STATES = ['us', 'ca', 'au', 'br', 'in', 'mx']

export const COUNTRIES = [
  { name: 'Vietnam', code: 'vn' }, { name: 'United States', code: 'us' }, { name: 'United Kingdom', code: 'gb' },
  { name: 'Australia', code: 'au' }, { name: 'Canada', code: 'ca' }, { name: 'France', code: 'fr' },
  { name: 'Germany', code: 'de' }, { name: 'Japan', code: 'jp' }, { name: 'South Korea', code: 'kr' },
  { name: 'Russia', code: 'ru' }, { name: 'India', code: 'in' }, { name: 'Thailand', code: 'th' },
  { name: 'Singapore', code: 'sg' }, { name: 'Toàn thế giới', code: '' }, { name: 'Khác...', code: 'other' },
]
