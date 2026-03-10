import { PERSONAL_PLANETS_SET, CORE_PLANETS } from './constants'
import { checkAspect, ChartData } from './calculations'

interface ScoreStats {
  count: number
  tight_count: number
  loose_count: number
  total_orb_round: number
  total_orb_raw: number
  is_personal: boolean
}

export function analyzeSynastryGrid(cA: ChartData, cB: ChartData) {
  const TARGET_OBJS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Asc']
  const CANDIDATE_OBJS = CORE_PLANETS

  const listATargets = TARGET_OBJS.filter(p => p in cA.planets)
  const listBTargets = TARGET_OBJS.filter(p => p in cB.planets)

  function calculateScore(pName: string, pLon: number, targetList: string[], targetChart: ChartData): ScoreStats {
    const stats: ScoreStats = {
      count: 0, tight_count: 0, loose_count: 0,
      total_orb_round: 0, total_orb_raw: 0,
      is_personal: PERSONAL_PLANETS_SET.has(pName),
    }

    for (const targetName of targetList) {
      if (!(targetName in targetChart.planets)) continue
      const targetLon = targetChart.planets[targetName].lon
      const asp = checkAspect(pLon, targetLon)
      if (asp) {
        if (asp.type === 'Minor') continue
        const orb = asp.orb
        if (orb >= 10.0) continue
        stats.count++
        stats.total_orb_round += asp.orb_round
        stats.total_orb_raw += orb
        if (orb < 1.0) stats.tight_count++
        if (orb > 6.5 && orb <= 10.0) stats.loose_count++
      }
    }
    return stats
  }

  const scoresA: Record<string, ScoreStats> = {}
  const scoresB: Record<string, ScoreStats> = {}

  for (const p of CANDIDATE_OBJS) {
    if (p in cA.planets) scoresA[p] = calculateScore(p, cA.planets[p].lon, listBTargets, cB)
    if (p in cB.planets) scoresB[p] = calculateScore(p, cB.planets[p].lon, listATargets, cA)
  }

  function solveTieBreaker(candidates: Record<string, ScoreStats>, checkPersonalAtLevel4 = true): string | null {
    let group = Object.keys(candidates)
    if (!group.length) return null

    // Tier 1: Max Count
    const maxCount = Math.max(...group.map(p => candidates[p].count))
    group = group.filter(p => candidates[p].count === maxCount)
    if (group.length === 1) return group[0]

    // Tier 2: Max Tight
    const maxTight = Math.max(...group.map(p => candidates[p].tight_count))
    group = group.filter(p => candidates[p].tight_count === maxTight)
    if (group.length === 1) return group[0]

    // Tier 3: Min Loose
    const minLoose = Math.min(...group.map(p => candidates[p].loose_count))
    group = group.filter(p => candidates[p].loose_count === minLoose)
    if (group.length === 1) return group[0]

    // Tier 4: Personal priority
    if (checkPersonalAtLevel4) {
      const personal = group.filter(p => candidates[p].is_personal)
      if (personal.length === 1) return personal[0]
      if (personal.length > 1) group = personal
    }

    // Tier 5: Min Orb Round
    const minOrbRound = Math.min(...group.map(p => candidates[p].total_orb_round))
    group = group.filter(p => candidates[p].total_orb_round === minOrbRound)
    if (group.length === 1) return group[0]

    // Tier 6: Min Orb Raw
    return group.reduce((best, p) => candidates[p].total_orb_raw < candidates[best].total_orb_raw ? p : best)
  }

  const winnerA = solveTieBreaker(scoresA)
  const winnerB = solveTieBreaker(scoresB)

  let finalThemeA = winnerA
  let finalThemeB = winnerB
  let accompanyingPlanet: { name: string; owner: string } | null = null

  if (winnerA && winnerB) {
    if (!scoresA[winnerA].is_personal && !scoresB[winnerB].is_personal) {
      const subsetA: Record<string, ScoreStats> = {}
      const subsetB: Record<string, ScoreStats> = {}
      for (const [p, s] of Object.entries(scoresA)) if (s.is_personal) subsetA[p] = s
      for (const [p, s] of Object.entries(scoresB)) if (s.is_personal) subsetB[p] = s

      const wA1 = solveTieBreaker(subsetA, false)
      const wB1 = solveTieBreaker(subsetB, false)

      if (wA1 && wB1) {
        const sA1 = subsetA[wA1]
        const sB1 = subsetB[wB1]
        let kem = 'B'
        if (sA1.count > sB1.count) kem = 'A'
        else if (sA1.count === sB1.count) {
          if (sA1.tight_count > sB1.tight_count) kem = 'A'
          else if (sA1.tight_count === sB1.tight_count) {
            if (sA1.loose_count < sB1.loose_count) kem = 'A'
            else if (sA1.loose_count === sB1.loose_count) {
              if (sA1.total_orb_round < sB1.total_orb_round) kem = 'A'
              else if (sA1.total_orb_round === sB1.total_orb_round) {
                if (sA1.total_orb_raw <= sB1.total_orb_raw) kem = 'A'
              }
            }
          }
        }

        if (kem === 'A') {
          finalThemeA = wA1
          accompanyingPlanet = { name: wA1, owner: 'A' }
        } else {
          finalThemeB = wB1
          accompanyingPlanet = { name: wB1, owner: 'B' }
        }
      }
    }
  }

  return {
    scores_A: scoresA, scores_B: scoresB,
    dominant_A: finalThemeA, dominant_B: finalThemeB,
    accompanying: accompanyingPlanet,
  }
}
