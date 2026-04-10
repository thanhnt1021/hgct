# FIX GUIDE V2: BẢN ĐỒ SAO /demochartpdf

> File này dành cho Claude CLI. Fix theo thứ tự.
> Khi gặp `[ASK]`, dừng lại hỏi user trước khi làm.
> QUAN TRỌNG: Luôn so sánh output với chart hiện có tại hệ thống để verify.

-----

## PHƯƠNG PHÁP VERIFY: SO SÁNH VỚI CHART HIỆN CÓ

Trước khi fix bất cứ gì, lấy dữ liệu tham chiếu từ chart đã hoạt động đúng trong hệ thống.

### Bước 1: Tìm chart reference

Trang chart hiện có: `https://demo.hatgiongchiemtinh.com/chart?id=1`
Profile: “Ngụy” của user hentaiikidd
Sinh: 12/01/1994, 8:00, Hà Nội (21°14’N, 105°42’E), GMT+7

### Bước 2: Lấy dữ liệu từ code hiện tại

```bash
# Tìm file render chart hiện tại (trang /chart)
grep -r "chart?id" src/ --include="*.ts" --include="*.tsx" -l
grep -r "generateChart\|renderChart\|chartSvg\|natal.*chart" src/ --include="*.ts" --include="*.tsx" -l
```

Tìm cách trang `/chart?id=1` lấy và render dữ liệu. Chart hiện tại (ảnh đính kèm - dark theme, có ký hiệu cung trên vòng zodiac) đã hiển thị ĐÚNG vị trí hành tinh, nhà, trục. Dùng nó làm ground truth.

### Bước 3: Log so sánh

Trong API `/api/chart/preview`, thêm console.log tạm:

```typescript
const chart = calculateChart(...)
console.log('=== CHART DEBUG ===')
console.log('ASC:', chart.angles.Asc)
console.log('MC:', chart.angles.MC)
console.log('cusps:', chart.cusps)
console.log('cusps[0] (should be ASC):', chart.cusps[0])
console.log('cusps[0] === ASC?', Math.abs(chart.cusps[0] - chart.angles.Asc) < 0.01)
console.log('cusps[9] === MC?', Math.abs(chart.cusps[9] - chart.angles.MC) < 0.01)
console.log('Sun lon:', chart.planets.Sun?.lon)
console.log('Moon lon:', chart.planets.Moon?.lon)
```

So sánh giá trị này với dữ liệu hiển thị ở `/chart?id=1`. Nếu cusps data khớp nhau thì lỗi nằm ở phần RENDER, không phải phần tính toán.

-----

## FIX 1: NHÀ BỊ ĐẢO NGƯỢC (CRITICAL)

### Vấn đề

Nhìn chart hiện tại: nhà 1-6 đang ở NỬA TRÊN, nhà 7-12 ở NỬA DƯỚI. Đây là SAI.

Convention đúng (xem chart reference tại /chart?id=1):

```
                    MC
                   ┌──┐
              10  /    \  9
             11  /      \  8
            12  /   TOP   \  7
    AC ────────┤          ├──────── DC
             1  \  BOTTOM /  6
              2  \      /  5
               3  \    /  4
                   └──┘
                    IC
```

- AC ở bên trái (9 giờ), DC ở bên phải (3 giờ)
- MC ở trên (12 giờ), IC ở dưới (6 giờ)
- Nhà 1 bắt đầu TỪ AC, đi XUỐNG (theo chiều kim đồng hồ)
- Nhà 1-6 nằm ở NỬA DƯỚI chart
- Nhà 7-12 nằm ở NỬA TRÊN chart

### Nguyên nhân có thể

**Khả năng 1: svgAngle() bị ngược chiều**

Hàm `svgAngle()` chuyển ecliptic longitude sang góc SVG. Chiều zodiac đi ngược chiều kim đồng hồ (CCW) trên ecliptic, nhưng SVG vẽ CW. Nếu sweep direction sai, toàn bộ chart bị mirror.

```typescript
// Hàm hiện tại:
function svgAngle(lon: number, asc: number): number {
  return ((180 + asc - lon) % 360 + 360) % 360
}
```

Kiểm tra: với profile Ngụy (ASC ≈ 312.97° = Aquarius 12°58’):

- `svgAngle(312.97, 312.97)` phải = 180° (AC ở bên trái, 9 giờ) ✓
- `svgAngle(312.97 + 180, 312.97)` phải = 0° (DC ở bên phải, 3 giờ)

Nhưng vấn đề có thể ở chiều quay: khi lon TĂNG, góc SVG phải GIẢM (đi CW trên màn hình = CCW trên ecliptic).

**Khả năng 2: sector() vẽ ngược**

Hàm `sector()` vẽ arc giữa 2 longitude. Nếu sweep-flag sai, arc đi ngược hướng.

```typescript
// Trong sector():
// sweep-flag cho arc ngoài: 0 = CW, 1 = CCW
// sweep-flag cho arc trong: ngược lại
return `M... A${rO},${rO} 0 0 0 ... A${rI},${rI} 0 0 1 ...Z`
//                              ^ ^                ^ ^
//                     large-arc  sweep        large  sweep
```

**Khả năng 3: Vẽ nhà bị lệch index**

Số nhà `i+1` được đặt ở giữa sector giữa `cusps[i]` và `cusps[(i+1)%12]`. Nếu logic này đúng nhưng vạch nhà (cusp lines) vẽ sai vị trí thì số nhà cũng sai theo.

### Cách debug chi tiết

```typescript
// Thêm vào generateNatalChartSvg() tạm thời:
// Vẽ marker đỏ tại vị trí cusps[0] (phải trùng AC)
const debugA = svgAngle(cusps[0], asc)
const debugP = pol(R_ZODIAC_INNER - 20, debugA)
svg += `<circle cx="${debugP.x}" cy="${debugP.y}" r="5" fill="red" />`
svg += `<text x="${debugP.x}" y="${debugP.y - 10}" fill="red" font-size="8"
  text-anchor="middle">cusps[0]</text>`

// Vẽ marker xanh tại MC = cusps[9]
const debugM = svgAngle(cusps[9], asc)
const debugMP = pol(R_ZODIAC_INNER - 20, debugM)
svg += `<circle cx="${debugMP.x}" cy="${debugMP.y}" r="5" fill="blue" />`
svg += `<text x="${debugMP.x}" y="${debugMP.y - 10}" fill="blue" font-size="8"
  text-anchor="middle">cusps[9]</text>`
```

- Nếu marker đỏ (`cusps[0]`) ở đúng vị trí AC (bên trái) → cusps data đúng, lỗi ở rendering
- Nếu marker đỏ ở vị trí khác → cusps data hoặc svgAngle() sai

### Fix approach

Sau khi xác định nguyên nhân bằng debug markers:

**Nếu chiều quay SVG bị ngược:**

```typescript
// Thử đổi chiều:
function svgAngle(lon: number, asc: number): number {
  return ((180 - asc + lon) % 360 + 360) % 360  // đảo dấu
}
```

**Nếu sector sweep bị ngược:**

```typescript
// Đổi sweep-flag trong sector():
// Thử: outer arc sweep=1, inner arc sweep=0 (ngược lại)
```

**Nếu nhà index bị lệch:**

```typescript
// Verify: cusps[0] phải === angles.Asc
// Nếu cusps có 13 phần tử và chưa slice:
const cusps = rawCusps.slice(1)  // bỏ index 0
```

QUAN TRỌNG: Sau mỗi thay đổi, deploy test và SO SÁNH với chart tại `/chart?id=1` cùng profile Ngụy. Các hành tinh, trục, nhà phải khớp vị trí.

```
[ASK] Sau khi debug:
- cusps[0] có trùng vị trí AC trên chart không?
- Chiều quay zodiac signs có đúng không? (Aries → Taurus → Gemini... đi CCW)
- So với /chart?id=1, vị trí Sun/Moon có khớp không?
```

-----

## FIX 2: CĂN GIỮA CHART THEO CHIỀU NGANG

### Vấn đề

Chart đã fit vào khung nhưng chưa căn giữa chiều ngang trên ảnh nền -02.jpg.

### Cách fix

Trong ChartPreview.tsx, sửa container SVG overlay:

```typescript
{svgHtml && (
  <div style={{ marginTop: 24 }}>
    <h2>Preview - {SERVICES.find(s => s.value === service)?.label}</h2>
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        src={`/imgs/pdf-${imgPrefix}-02.jpg`}
        alt="PDF background"
        style={{ display: 'block', maxWidth: 800, width: '100%' }}
      />
      {/* SVG overlay - căn giữa cả ngang lẫn dọc */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '75%',  // điều chỉnh % cho vừa khung
        }}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  </div>
)}
```

Nếu chart cần offset dọc (không nằm chính giữa trang A4 mà hơi lệch lên):

```typescript
// Đo vị trí vùng trống trên -02.jpg rồi điều chỉnh:
top: '45%',   // lệch lên một chút so với 50%
```

Đồng thời đảm bảo SVG output có `viewBox` + responsive sizing:

```typescript
// Trong generateNatalChartSvg():
return `<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${SIZE} ${SIZE}"
  width="100%" height="100%"
  preserveAspectRatio="xMidYMid meet">
  ${svgContent}
</svg>`
```

-----

## FIX 3: STYLE ĐƯỜNG NHÀ - THICK/THIN + OPACITY + DASHES

### Vấn đề

Đường nhà hiện tại vẽ đồng nhất. Cần phân biệt trục chính vs nhà phụ với style khác nhau.

### Style theo CHART_DRAWING_GUIDE_HGCT.md (bản cập nhật)

Lấy từ bản gốc Python, giữ nguyên logic dày/mỏng:

**Trục chính AC/IC/DC/MC (4 đường):**

- Vẽ từ R_INNER_RING (33) đến R_ZODIAC_INNER (189)
- `stroke="black"`, `stroke-width="2.5"` (dày)
- Không dashes, không opacity giảm

**Nhà phụ (8 đường còn lại):**

- Vẽ từ R_MID (130) đến R_ZODIAC_INNER (189)
- `stroke="black"`, `stroke-width="0.5"` (mỏng)
- Không dashes (theo bản MD mới nhất: “KHÔNG có dashes”)

**Tick trục ngoài zodiac (Layer 6):**

- Chỉ 4 trục AC/IC/DC/MC
- Vẽ từ R_ZODIAC_OUTER (225) đến R_AXIS_TICK (229)
- `stroke="black"`, `stroke-width="1.5"`

### Code

```typescript
// === Trục chính (Layer 3) ===
const AXIS_INDICES = [0, 3, 6, 9]
for (const i of AXIS_INDICES) {
  const a = svgAngle(cusps[i], asc)
  const p1 = pol(R_INNER_RING, a)    // 33
  const p2 = pol(R_ZODIAC_INNER, a)  // 189
  svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
           stroke="black" stroke-width="2.5" />`
}

// === Nhà phụ (Layer 7) ===
for (let i = 0; i < 12; i++) {
  if (AXIS_INDICES.includes(i)) continue
  const a = svgAngle(cusps[i], asc)
  const p1 = pol(R_MID, a)            // 130
  const p2 = pol(R_ZODIAC_INNER, a)   // 189
  svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
           stroke="black" stroke-width="0.5" />`
}

// === Tick trục ngoài (Layer 6) ===
for (const i of AXIS_INDICES) {
  const a = svgAngle(cusps[i], asc)
  const p1 = pol(R_ZODIAC_OUTER, a)   // 225
  const p2 = pol(R_AXIS_TICK, a)      // 229
  svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
           stroke="black" stroke-width="1.5" />`
}
```

### Áp dụng cho cả 3 loại chart

**Synastry (Section 8.6/8.7):**

```typescript
// Người A (xanh) - vùng R_ASPECT_SYN → R_A_OUT
const isAxis = AXIS_HOUSES.includes(i)
svg += `<line ... stroke="#0033ff"
  stroke-width="${isAxis ? 2.5 : 0.5}" />`

// Người B (đỏ) - vùng R_A_OUT → R_B_OUT
svg += `<line ... stroke="#ff0000"
  stroke-width="${isAxis ? 2.5 : 0.5}" />`
```

**Transit:**
Giống Natal (phần natal bên trong giữ nguyên).

-----

## FIX 4: ZODIAC BELT - BỎ DẢI ELEMENT, KÝ HIỆU MANG MÀU

### Vấn đề

Zodiac belt cần theo adaptation mới: không tô dải element, ký hiệu cung mang màu element.

### Thay đổi

**BỎ:**

- Tô 12 sector fill `EL_COLORS` cho vùng R_EL_IN → R_EL_OUT
- 2 border circles R_EL_IN (193) và R_EL_OUT (221)

**ĐỔI:**

- Vạch chia cung: `stroke="black"` (vì nền kem, trắng sẽ không thấy)
- Ký hiệu cung: `fill="${EL_COLORS[i % 4]}"` thay vì `fill="#fffff0"`

**GIỮ:**

- Nền zodiac belt kem `#fffff0` (từ background rings)
- Border circles: R_MID, R_ZODIAC_INNER, R_ZODIAC_OUTER
- Ký hiệu cung vẫn ở giữa sector (R_ZODIAC_INNER + R_ZODIAC_OUTER) / 2

### Code

```typescript
const EL_COLORS = ['#e94031', '#65c846', '#eeab41', '#2341f2']

for (let i = 0; i < 12; i++) {
  // KHÔNG tô sector element - bỏ hẳn

  // Vạch chia cung - đen
  const sepA = svgAngle(i * 30, asc)
  const sep1 = pol(R_ZODIAC_INNER, sepA)
  const sep2 = pol(R_ZODIAC_OUTER, sepA)
  svg += `<line x1="${sep1.x}" y1="${sep1.y}" x2="${sep2.x}" y2="${sep2.y}"
           stroke="black" stroke-width="0.5" />`

  // Ký hiệu cung - màu element
  const midAngle = svgAngle(i * 30 + 15, asc)
  const pos = pol((R_ZODIAC_INNER + R_ZODIAC_OUTER) / 2, midAngle)

  // Hiện tại dùng placeholder shape hoặc Unicode, sau thay bằng custom SVG
  // Placeholder Unicode:
  const ZODIAC_SYMS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓']
  svg += `<text x="${pos.x}" y="${pos.y}"
    text-anchor="middle" dominant-baseline="central"
    font-size="13" font-weight="bold"
    fill="${EL_COLORS[i % 4]}"
    font-family="serif">${ZODIAC_SYMS[i]}</text>`
}

// Border circles - chỉ 3 (bỏ R_EL_IN, R_EL_OUT):
const borderCircles = [R_MID, R_ZODIAC_INNER, R_ZODIAC_OUTER]
for (const r of borderCircles) {
  svg += `<circle cx="${CX}" cy="${CY}" r="${r}"
           fill="none" stroke="black" stroke-width="0.5" />`
}
```

-----

## FIX 5: HÀNH TINH FALLBACK UNICODE

### Vấn đề

Hành tinh đang hiển thị placeholder shapes (hình học). Cần fallback về Unicode cho đến khi có custom SVG.

### Code

```typescript
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
  'True Node': '☊', 'South Node': '☋', Chiron: '⚷',
  Vertex: 'Vx', Lilith: '⚸',
}

for (const { name, r, angle } of spreadP) {
  const p = pol(r, angle)
  const sym = PLANET_SYMBOLS[name] ?? name.slice(0, 2)
  const isSpecial = SPECIAL_PLANETS.has(name)

  svg += `<text x="${p.x}" y="${p.y}"
    text-anchor="middle" dominant-baseline="central"
    font-size="${isSpecial ? 10 : 14}"
    font-weight="700" fill="black"
    font-family="serif" style="user-select:none">${sym}</text>`
}
```

```
[ASK] Kiểm tra:
- Puppeteer trên server có font hỗ trợ Unicode thiên văn không?
  Test bằng cách render 1 char ♈ xem có hiện không.
- Nếu font không hỗ trợ, dùng text fallback: Su, Mo, Me, Ve, Ma, Ju, Sa, Ur, Ne, Pl
```

-----

## FIX 6: VẬN HẠN DEFAULT DATE RANGE

### Vấn đề

Vận Hạn cần date range nhưng user phải nhập tay. Cần default hợp lý.

### Code fix trong ChartPreview.tsx

```typescript
// Default: hôm nay → +1 năm
const today = new Date()
const nextYear = new Date(today)
nextYear.setFullYear(nextYear.getFullYear() + 1)
const fmtDate = (d: Date) => d.toISOString().split('T')[0]

const [startDate, setStartDate] = useState(fmtDate(today))
const [endDate, setEndDate] = useState(fmtDate(nextYear))
```

### API route - đảm bảo getOuterPlanetCycleData hoạt động

```
[ASK] Xác nhận:
- getOuterPlanetCycleData() đã tồn tại trong calculations.ts chưa?
- Nếu chưa, tạo theo Section 9.5 trong CHART_DRAWING_GUIDE_HGCT.md
```

-----

## FIX 7: ASPECT LINES - MÀU ĐÚNG

### Vấn đề

Aspect lines cần dùng đúng bảng màu từ guide.

### Bảng màu

```typescript
// Màu theo loại aspect:
if (asp.aspect === 'Conjunction') color = '#000000'       // Đen
else if (asp.type === 'Hard')    color = '#ff0000'        // Đỏ (Square, Opposition)
else if (asp.type === 'Minor')   color = '#00cc00'        // Xanh lá (Semisextile, Quincunx)
else                             color = '#0033ff'        // Xanh dương (Trine, Sextile)
```

-----

## THỨ TỰ THỰC HIỆN

```
1. FIX 1 - Nhà bị đảo (debug + so sánh với /chart?id=1)
   → Deploy test → verify vị trí khớp chart reference
2. FIX 2 - Căn giữa ngang
3. FIX 3 - Style đường nhà thick/thin
4. FIX 4 - Zodiac belt (bỏ dải element, ký hiệu màu element)
5. FIX 5 - Hành tinh Unicode fallback
6. FIX 6 - Vận Hạn default date
7. FIX 7 - Aspect colors

Sau mỗi fix, deploy và so sánh với /chart?id=1 profile Ngụy.
```

-----

## CHECKLIST SO SÁNH VỚI CHART REFERENCE

Sau khi fix xong, so sánh demochartpdf output với `/chart?id=1` (profile Ngụy):

```
[ ] AC ở bên trái (~Aquarius 12°58')
[ ] MC ở trên (~Scorpio 24°30')
[ ] Nhà 1 ngay dưới AC, nhà 12 ngay trên AC
[ ] Nhà 10 bên trái MC, nhà 9 bên phải MC
[ ] Sun ở khoảng nhà 12 (Capricorn ~21°)
[ ] Moon ở khoảng nhà 12 (Capricorn ~22°)
[ ] Cụm hành tinh (Sun/Moon/Mercury/Venus/Mars/Uranus/Neptune) ở vùng Capricorn-Aquarius (khoảng nhà 11-12)
[ ] Jupiter ở Scorpio (khoảng nhà 9-10)
[ ] Saturn ở Aquarius (khoảng nhà 1)
[ ] Chiều zodiac signs: từ AC đi lên (CCW) = Aquarius → Capricorn → Sagittarius...
[ ] Aspect lines: có đường đỏ (hard), xanh (soft), đen (conjunction)
```