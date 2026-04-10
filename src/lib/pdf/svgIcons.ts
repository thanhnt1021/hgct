// SVG icon cache — reads planet/sign SVG files from public/chart-symbols/ at module load
import { readFileSync } from 'fs'
import { join } from 'path'

const SYMBOLS_DIR = join(process.cwd(), 'public', 'chart-symbols')

function readSvgContent(filePath: string): string {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    return raw
      .replace(/<\?xml[^?]*\?>\s*/g, '')
      .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
      .trim()
  } catch (e) {
    console.error(`[svgIcons] Failed to read: ${filePath}`, e)
    return ''
  }
}

const PLANET_FILES: Record<string, string> = {
  Sun: 'sun.svg',
  Moon: 'moon.svg',
  Mercury: 'mercury.svg',
  Venus: 'venus.svg',
  Mars: 'mars.svg',
  Jupiter: 'jupiter.svg',
  Saturn: 'saturn.svg',
  Uranus: 'uranus.svg',
  Neptune: 'neptune.svg',
  Pluto: 'pluto.svg',
  'True Node': 'true-node.svg',
  'South Node': 'south-node.svg',
  Chiron: 'chiron.svg',
  Vertex: 'vertex.svg',
}

const SIGN_FILES = [
  'aries.svg', 'taurus.svg', 'gemini.svg', 'cancer.svg',
  'leo.svg', 'virgo.svg', 'libra.svg', 'scorpio.svg',
  'sagittarius.svg', 'capricorn.svg', 'aquarius.svg', 'pisces.svg',
]

export const PLANET_SVGS: Record<string, string> = {}
for (const [name, file] of Object.entries(PLANET_FILES)) {
  PLANET_SVGS[name] = readSvgContent(join(SYMBOLS_DIR, 'planets', file))
}

export const SIGN_SVGS: string[] = SIGN_FILES.map(file =>
  readSvgContent(join(SYMBOLS_DIR, 'signs', file))
)
