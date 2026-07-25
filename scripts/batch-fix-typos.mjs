import { readFileSync, writeFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })

// fixes.json: [{ tab, row, col, old, new }]
const fixes = JSON.parse(readFileSync(process.argv[2], 'utf8'))

function colLetter(n) {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

// group fixes by tab+cell
const byCell = new Map()
for (const f of fixes) {
  const key = `${f.tab}\t${f.row}\t${f.col}`
  if (!byCell.has(key)) byCell.set(key, [])
  byCell.get(key).push(f)
}

const report = []

for (const [key, list] of byCell) {
  const [tab, rowStr, colStr] = key.split('\t')
  const row = Number(rowStr), col = Number(colStr)
  const cellRef = `${colLetter(col)}${row}`
  const range = `'${tab}'!${cellRef}`

  const cur = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range })
  let val = cur.data.values?.[0]?.[0] ?? ''
  let ok = true
  for (const f of list) {
    const count = val.split(f.old).length - 1
    if (count !== 1) {
      report.push({ tab, cellRef, old: f.old, status: `ABORT count=${count}` })
      ok = false
      continue
    }
    val = val.split(f.old).join(f.new)
    report.push({ tab, cellRef, old: f.old, status: 'applied-sheet-pending-write' })
  }
  if (ok || list.some(f => report.find(r => r.tab === tab && r.cellRef === cellRef && r.old === f.old && r.status === 'applied-sheet-pending-write'))) {
    await sheets.spreadsheets.values.update({ spreadsheetId: sid, range, valueInputOption: 'RAW', requestBody: { values: [[val]] } })
    // readback
    const rb = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range })
    const rbVal = rb.data.values?.[0]?.[0] ?? ''
    for (const f of list) {
      const idx = report.findIndex(r => r.tab === tab && r.cellRef === cellRef && r.old === f.old && r.status === 'applied-sheet-pending-write')
      if (idx >= 0) report[idx].status = rbVal.includes(f.new) && !rbVal.includes(f.old) ? 'OK' : 'READBACK_MISMATCH'
    }
  }
}

writeFileSync(process.argv[2] + '.report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
const bad = report.filter(r => r.status !== 'OK')
console.log('\nTOTAL:', report.length, 'OK:', report.length - bad.length, 'FAILED:', bad.length)
