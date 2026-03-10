// VanHanManager - Transit (Vận Hạn) logic (ported from Python)
import {
  getHouseOfPlanet, checkAspect, getNatalPlanetNearCusp, getHouseRulerPlanet,
} from '@/lib/astrology/calculations'
import type { ChartData } from '@/lib/astrology/calculations'
import {
  scanHouseTransitsInRange, findExactAspectTimes, getOuterPlanetCycleData,
} from '@/lib/astrology/transit-stubs'
import { OUTER_PLANETS, PLANET_NAMES_VN } from '@/lib/astrology/constants'
import { normalizeStr, findColIndex, getRowValue } from '@/lib/astrology/base'

export type { ChartData }

// ─── Types ───────────────────────────────────────────────────────

export interface TransitTableEntry {
  planet: string
  startHouse: number
  endHouse: number
  cycleData: OuterPlanetCycleEntry[]
}

export interface OuterPlanetCycleEntry {
  startDate: string
  endDate: string
  house: number
  retrograde?: boolean
}

export interface VanHanBlock1 {
  transitTable: TransitTableEntry[]
}

export interface VanHanBlock2 {
  planetContents: Record<string, string>
}

// ─── Block 1: Year overview (outer planet cycle data) ────────────

function buildBlock1(
  natalChart: ChartData,
  startDate: string,
  endDate: string,
): VanHanBlock1 {
  const transitTable: TransitTableEntry[] = []

  for (const planet of OUTER_PLANETS) {
    const cycleData = getOuterPlanetCycleData(planet, natalChart, startDate, endDate)

    let startHouse = 0
    let endHouse = 0
    if (cycleData.length > 0) {
      startHouse = cycleData[0].house
      endHouse = cycleData[cycleData.length - 1].house
    }

    transitTable.push({
      planet,
      startHouse,
      endHouse,
      cycleData,
    })
  }

  return { transitTable }
}

// ─── Block 2: KB content per planet's transit house ──────────────

function buildBlock2(
  natalChart: ChartData,
  transitTable: TransitTableEntry[],
  kbVanHan: unknown[][],
): VanHanBlock2 {
  const planetContents: Record<string, string> = {}

  if (!kbVanHan || kbVanHan.length < 2) {
    return { planetContents }
  }

  const headers = kbVanHan[0] as string[]
  const rows = kbVanHan.slice(1)

  for (const entry of transitTable) {
    const { planet, endHouse } = entry
    if (endHouse === 0) continue

    // Find the column for this planet in the KB
    const planetVn = PLANET_NAMES_VN[planet] || planet
    const colIdx = findColIndex(headers, planetVn)
    if (colIdx === -1) continue

    // Find the row for the end house
    for (const row of rows) {
      const rowArr = row as string[]
      const rowLabel = normalizeStr(String(rowArr[0] || ''))
      const houseLabel = normalizeStr(`Nhà ${endHouse}`)
      const houseLabel2 = normalizeStr(`${endHouse}`)

      if (rowLabel === houseLabel || rowLabel === houseLabel2) {
        const content = getRowValue(rowArr, colIdx)
        if (content) {
          planetContents[planet] = content
        }
        break
      }
    }
  }

  return { planetContents }
}

// ─── Main entry ──────────────────────────────────────────────────

export function getVanHanBlocks(
  natalChart: ChartData,
  startDate: string,
  endDate: string,
  kb: Record<string, unknown[][]>,
): { block1: VanHanBlock1; block2: VanHanBlock2 } {
  const kbVanHan = kb['VẬN HẠN'] || []

  const block1 = buildBlock1(natalChart, startDate, endDate)
  const block2 = buildBlock2(natalChart, block1.transitTable, kbVanHan)

  return { block1, block2 }
}
