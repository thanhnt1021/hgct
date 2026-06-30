import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ args:[...chromium.args,'--no-sandbox','--disable-setuid-sandbox'], executablePath: await chromium.executablePath(), headless:true })
const p = await b.newPage()
await p.setViewport({ width: 1100, height: 1500 })
const id = '999000111'
const chart = { id, name:'Test', inputData:{ name:'Test', ten:'Test', gender:'Female', dob:{day:15,month:1,year:1990}, tob:{hour:10,minute:30,unknown:false}, loc:{address:'Hà Nội, Việt Nam', lat:21.0245, lon:105.8412, tz:'Asia/Ho_Chi_Minh'} }, savedAt: 1700000000000 }
// set localStorage truoc khi load route (goto origin truoc roi set)
await p.goto('https://demo.hatgiongchiemtinh.com/', { waitUntil:'domcontentloaded', timeout:60000 })
await p.evaluate((id,chart)=>{ localStorage.setItem('astros_charts', JSON.stringify({[id]:chart})) }, id, chart)
await p.goto(`https://demo.hatgiongchiemtinh.com/ket-qua/${id}`, { waitUntil:'networkidle2', timeout:60000 })
await new Promise(r=>setTimeout(r,2500))
await p.screenshot({ path:'/work/scripts/shot-ketqua.png', fullPage:true })
console.log('shot ok')
await b.close()
