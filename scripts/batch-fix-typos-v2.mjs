import { readFileSync, writeFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })

const fixes = JSON.parse(readFileSync(process.argv[2], 'utf8'))

function colLetter(n) {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

const byCell = new Map()
for (const f of fixes) {
  const key = `${f.tab}\t${f.row}\t${f.col}`
  if (!byCell.has(key)) byCell.set(key, [])
  byCell.get(key).push(f)
}

const cellKeys = [...byCell.keys()]
const ranges = cellKeys.map(key => {
  const [tab, row, col] = key.split('\t')
  return `'${tab}'!${colLetter(Number(col))}${row}`
})

// 1 batchGet call for ALL cells at once (avoids per-cell read quota)
const getRes = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sid, ranges })
const valueRanges = getRes.data.valueRanges || []

const report = []
const dataForUpdate = []

cellKeys.forEach((key, i) => {
  const list = byCell.get(key)
  const [tab] = key.split('\t')
  const range = ranges[i]
  let val = valueRanges[i]?.values?.[0]?.[0] ?? ''
  let changed = false
  for (const f of list) {
    const count = val.split(f.old).length - 1
    if (count !== 1) {
      report.push({ tab, range, old: f.old, status: `SKIP count=${count}` })
      continue
    }
    val = val.split(f.old).join(f.new)
    changed = true
    report.push({ tab, range, old: f.old, new: f.new, status: 'applied' })
  }
  if (changed) dataForUpdate.push({ range, values: [[val]] })
})

// 1 batchUpdate call for ALL cells at once (avoids per-cell write quota)
if (dataForUpdate.length) {
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sid,
    requestBody: { valueInputOption: 'RAW', data: dataForUpdate },
  })
}

// 1 batchGet readback for ALL updated cells
if (dataForUpdate.length) {
  const rbRanges = dataForUpdate.map(d => d.range)
  const rbRes = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sid, ranges: rbRanges })
  const rbMap = new Map(rbRanges.map((r, i) => [r, rbRes.data.valueRanges?.[i]?.values?.[0]?.[0] ?? '']))
  for (const r of report) {
    if (r.status === 'applied') {
      const rbVal = rbMap.get(r.range) ?? ''
      r.status = rbVal.includes(r.new) ? 'OK' : 'READBACK_CHECK_FAILED'
    }
  }
}

writeFileSync(process.argv[2] + '.report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
const bad = report.filter(r => r.status !== 'OK' && r.status !== 'SKIP count=0')
console.log('\nTOTAL:', report.length, 'OK:', report.filter(r => r.status === 'OK').length, 'SKIP(already-fixed):', report.filter(r => r.status === 'SKIP count=0').length, 'PROBLEM:', bad.length)
