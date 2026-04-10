# HƯỚNG DẪN VẼ BIỂU ĐỒ SYNASTRY + VẬN HẠN ĐẠI HẠN TƯƠNG LAI

> Tài liệu chi tiết cách vẽ bản đồ Synastry kết hợp Vận Hạn Đại Hạn (5 hành tinh ngoài: Jupiter, Saturn, Uranus, Neptune, Pluto) với chu kỳ hành trình di chuyển. Mọi logic, công nghệ, màu sắc giữ nguyên y hệt dự án `chiemtinh.jst4.fun`.

---

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Thư viện & Dependencies](#2-thư-viện--dependencies)
3. [Dữ liệu đầu vào](#3-dữ-liệu-đầu-vào)
4. [Hệ thống bán kính (Radius System)](#4-hệ-thống-bán-kính-radius-system)
5. [Bước 1 — Tính toán dữ liệu Synastry](#5-bước-1--tính-toán-dữ-liệu-synastry)
6. [Bước 2 — Tính toán dữ liệu Vận Hạn Đại Hạn (5 hành tinh ngoài)](#6-bước-2--tính-toán-dữ-liệu-vận-hạn-đại-hạn-5-hành-tinh-ngoài)
7. [Bước 3 — Phân lane chu kỳ & Tính R_OUTER động](#7-bước-3--phân-lane-chu-kỳ--tính-r_outer-động)
8. [Bước 4 — Thiết lập Matplotlib Polar](#8-bước-4--thiết-lập-matplotlib-polar)
9. [Bước 5 — Vẽ nền (Background Rings)](#9-bước-5--vẽ-nền-background-rings)
10. [Bước 6 — Vẽ vòng Zodiac (12 cung hoàng đạo)](#10-bước-6--vẽ-vòng-zodiac-12-cung-hoàng-đạo)
11. [Bước 7 — Vẽ đỉnh nhà Người A (xanh) & Người B (đỏ)](#11-bước-7--vẽ-đỉnh-nhà-người-a-xanh--người-b-đỏ)
12. [Bước 8 — Vẽ hành tinh Người A & Người B](#12-bước-8--vẽ-hành-tinh-người-a--người-b)
13. [Bước 9 — Vẽ đường Aspect chéo (A ↔ B)](#13-bước-9--vẽ-đường-aspect-chéo-a--b)
14. [Bước 10 — Vẽ 5 hành tinh Transit (xanh lá, vòng ngoài)](#14-bước-10--vẽ-5-hành-tinh-transit-xanh-lá-vòng-ngoài)
15. [Bước 11 — Vẽ chu kỳ hành trình di chuyển (Cycle Arcs)](#15-bước-11--vẽ-chu-kỳ-hành-trình-di-chuyển-cycle-arcs)
16. [Bước 12 — Tiêu đề & Xuất ảnh](#16-bước-12--tiêu-đề--xuất-ảnh)
17. [Thuật toán phụ trợ](#17-thuật-toán-phụ-trợ)
18. [Hằng số tham chiếu](#18-hằng-số-tham-chiếu)
19. [Cấu trúc dữ liệu tham chiếu](#19-cấu-trúc-dữ-liệu-tham-chiếu)
20. [Luồng hoạt động end-to-end](#20-luồng-hoạt-động-end-to-end)
21. [Code mẫu tối thiểu](#21-code-mẫu-tối-thiểu)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
┌───────────────────────────────────────────────────────────────────┐
│  Input:                                                           │
│    - Người A: DOB, TOB, Location                                  │
│    - Người B: DOB, TOB, Location                                  │
│    - Khoảng thời gian đại hạn: start_date → end_date              │
│         ↓                                                         │
│  calculate_chart() × 2  → cA, cB (Natal 2 người)                 │
│  get_outer_planet_cycle_data() → cycle_data (5 hành tinh ngoài)   │
│         ↓                                                         │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ Drawing Module (Matplotlib Polar)                    │         │
│  │                                                      │         │
│  │  VÒNG TRONG:   Aspect lines chéo A ↔ B              │         │
│  │  VÒNG GIỮA 1:  Hành tinh Người A (xanh #0033ff)     │         │
│  │  VÒNG GIỮA 2:  Hành tinh Người B (đỏ #ff0000)       │         │
│  │  VÒNG ZODIAC:  12 cung hoàng đạo                     │         │
│  │  VÒNG NGOÀI 1: 5 hành tinh transit (xanh lá #00cc00) │         │
│  │  VÒNG NGOÀI 2: Chu kỳ hành trình (Cycle Arcs, xanh lá)│       │
│  └──────────────────────────────────────────────────────┘         │
│         ↓                                                         │
│  Output: Base64 PNG                                               │
└───────────────────────────────────────────────────────────────────┘
```

**Bản chất:** Lấy nền Synastry (2 người A + B) rồi phủ lên vòng ngoài 5 hành tinh đại hạn (Jupiter, Saturn, Uranus, Neptune, Pluto) cùng cung tròn chu kỳ hành trình — tất cả đều màu xanh lá (`#00cc00`).

**Công nghệ vẽ:** Matplotlib với `polar` projection
**Output:** Base64-encoded PNG
**Hệ nhà:** Placidus (mã `b'P'` trong Swiss Ephemeris)

---

## 2. THƯ VIỆN & DEPENDENCIES

```python
# Tính toán thiên văn
import swisseph as swe          # pip install pyswisseph
from timezonefinder import TimezoneFinder
from geopy.geocoders import Nominatim
import pytz

# Vẽ biểu đồ
import matplotlib
matplotlib.use('Agg')           # Backend không cần GUI
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import matplotlib.patches as patches
import numpy as np

# Xuất ảnh
import io
import base64
```

**Dữ liệu Ephemeris** (BẮT BUỘC): Cần 3 file `.se1` trong thư mục `ephe/`:
- `sepl_18.se1` — Dữ liệu hành tinh
- `semo_18.se1` — Dữ liệu mặt trăng
- `seas_18.se1` — Dữ liệu tiểu hành tinh

```python
swe.set_ephe_path('/path/to/ephe/')
```

---

## 3. DỮ LIỆU ĐẦU VÀO

Biểu đồ này cần **3 bộ dữ liệu**:

| # | Dữ liệu | Nguồn | Mô tả |
|---|----------|-------|-------|
| 1 | `cA` | `calculate_chart()` cho Người A | Natal chart Người A (cusps, planets, angles) |
| 2 | `cB` | `calculate_chart()` cho Người B | Natal chart Người B (cusps, planets, angles) |
| 3 | `cycle_data` | `get_outer_planet_cycle_data()` | Dữ liệu hành trình 5 hành tinh ngoài trong khoảng thời gian |

**5 hành tinh ngoài (Đại Hạn):**

| Hành tinh | Swiss Eph ID | Symbol | Chu kỳ quay | Ý nghĩa |
|-----------|-------------|--------|-------------|---------|
| Jupiter | `swe.JUPITER` | ♃ | ~12 năm | Mở rộng, may mắn |
| Saturn | `swe.SATURN` | ♄ | ~29 năm | Cấu trúc, bài học |
| Uranus | `swe.URANUS` | ♅ | ~84 năm | Thay đổi đột phá |
| Neptune | `swe.NEPTUNE` | ♆ | ~165 năm | Tâm linh, ảo tưởng |
| Pluto | `swe.PLUTO` | ♇ | ~248 năm | Chuyển hóa sâu sắc |

---

## 4. HỆ THỐNG BÁN KÍNH (RADIUS SYSTEM)

### 4.1 Bán kính cố định (phần Synastry)

```
Tâm (R=0) ──────────────────────────────────────────── Ngoài (R=11.5+)

R = 0.0     → R0             : Tâm bản đồ
R = 4.0     → R_CENTER       : Ranh giới vùng Aspect / vùng Người A
R = 6.0     → R_A_OUT        : Ranh giới vùng Người A / vùng Người B
R = 8.0     → R_B_OUT        : Ranh giới vùng Người B / vùng Zodiac
R = 8.15    →                : Cạnh trong vùng tô màu nguyên tố
R = 9.35    →                : Cạnh ngoài vùng tô màu nguyên tố
R = 9.5     → R_ZODIAC_OUTER : Viền ngoài vòng Zodiac
```

### 4.2 Bán kính động (phần Transit + Cycle Arcs)

```
R = 9.5     → R_ZODIAC_OUTER      : Gốc tick transit
R = 10.0    → R_ZODIAC_OUTER+0.5  : Đầu tick transit
R = 11.0    → R_ZODIAC_OUTER+1.5  : Vị trí symbol transit
R = 12.0    → LANE_BASE_R         : Lane 0 (cycle arc đầu tiên)
R = 12.5    →                     : Lane 1
R = 13.0    →                     : Lane 2 (nếu cần)
R = ...     →                     : Lane N
R = LANE_BASE_R + N*0.5 + 0.5 → R_OUTER (động, tùy số lane)
```

### 4.3 Sơ đồ tổng thể

```
     ┌──────────────── R_OUTER (động, >= 11.5) ────────────────┐
     │  ┌── CYCLE ARCS (Lane 0, 1, 2... — xanh lá #00cc00) ──┐│
     │  │  ┌── 5 TRANSIT SYMBOLS (xanh lá, R ≈ 11.0) ────┐   ││
     │  │  │  ┌── R_ZODIAC_OUTER (9.5) ──────────────┐    │   ││
     │  │  │  │  ┌── ZODIAC RING (8.0 → 9.5) ──────┐ │    │   ││
     │  │  │  │  │  ┌── NGƯỜI B (đỏ, 6.0→8.0) ───┐ │ │    │   ││
     │  │  │  │  │  │  ┌── NGƯỜI A (xanh, 4.0→6.0)│ │ │    │   ││
     │  │  │  │  │  │  │  ┌── ASPECT (0→4.0) ──┐  │ │ │    │   ││
     │  │  │  │  │  │  │  │  Spindle shapes    │  │ │ │    │   ││
     │  │  │  │  │  │  │  │  (chéo A ↔ B)      │  │ │ │    │   ││
     │  │  │  │  │  │  │  └─────────────────────┘  │ │ │    │   ││
     │  │  │  │  │  │  │  HÀNH TINH A (♃♄♅... xanh)│ │ │    │   ││
     │  │  │  │  │  │  └───────────────────────────┘ │ │    │   ││
     │  │  │  │  │  │  HÀNH TINH B (♃♄♅... đỏ)       │ │    │   ││
     │  │  │  │  │  └─────────────────────────────────┘ │    │   ││
     │  │  │  │  │  KÝ HIỆU CUNG (♈♉♊...)               │    │   ││
     │  │  │  │  └─────────────────────────────────────────┘    │   ││
     │  │  │  │  TICK + SYMBOL 5 TRANSIT (xanh lá)              │   ││
     │  │  │  └─────────────────────────────────────────────────┘   ││
     │  │  │  CUNG TRÒN CHU KỲ (Cycle Arcs — xanh lá)              ││
     │  │  └────────────────────────────────────────────────────────┘│
     │  └──────────────────────────────────────────────────────────┘
     └──────────────────────────────────────────────────────────────┘
```

---

## 5. BƯỚC 1 — TÍNH TOÁN DỮ LIỆU SYNASTRY

### 5.1 Tính natal chart cho 2 người

```python
swe.set_ephe_path('/path/to/ephe/')

# Người A
cA = calculate_chart(
    dob_str="15/03/1990",  # Ngày sinh A
    tob_str="08:30",        # Giờ sinh A
    lat=21.028511, lon=105.854161,
    tz_str="Asia/Ho_Chi_Minh"
)

# Người B
cB = calculate_chart(
    dob_str="22/07/1992",  # Ngày sinh B
    tob_str="14:00",        # Giờ sinh B
    lat=10.823099, lon=106.629664,
    tz_str="Asia/Ho_Chi_Minh"
)
```

### 5.2 Output `cA`, `cB` (xem cấu trúc ở mục 19)

Mỗi chart_data chứa:
- `cusps`: 12 giá trị đỉnh nhà (Placidus)
- `angles`: `{"Asc": float, "MC": float, "Vertex": float}`
- `planets`: Dict 15 thiên thể (Sun, Moon, Mercury... Pluto, True Node, Chiron, Lilith, Vertex, Asc, MC)
- `info`, `meta`: Thông tin phụ

### 5.3 Quy tắc xoay bản đồ

**Luôn xoay theo ASC Người A** (Người A là trung tâm):

```python
offset = 180 - cA["angles"]["Asc"]
ax.set_theta_offset(np.deg2rad(offset))
```

→ ASC Người A luôn nằm ở vị trí 9 giờ (bên trái).

---

## 6. BƯỚC 2 — TÍNH TOÁN DỮ LIỆU VẬN HẠN ĐẠI HẠN (5 HÀNH TINH NGOÀI)

### 6.1 Hàm `get_outer_planet_cycle_data()`

```python
def get_outer_planet_cycle_data(lat, lon, start_date_obj, end_date_obj):
    """
    Tính dữ liệu hành trình 5 hành tinh ngoài trong khoảng thời gian.

    Tham số:
      - lat, lon: Tọa độ địa lý (float)
      - start_date_obj: datetime.date — ngày bắt đầu
      - end_date_obj: datetime.date — ngày kết thúc

    Trả về dict:
      {
        "Jupiter": {"A": float, "B": float, "start": float, "end": float, "len": float},
        "Saturn":  {...},
        "Uranus":  {...},
        "Neptune": {...},
        "Pluto":   {...}
      }
    """
    outer_map = {
        "Jupiter": swe.JUPITER,
        "Saturn":  swe.SATURN,
        "Uranus":  swe.URANUS,
        "Neptune": swe.NEPTUNE,
        "Pluto":   swe.PLUTO
    }
    result = {}

    # 1. Tính chart tại ngày bắt đầu + ngày kết thúc
    chart_A = calculate_chart(start_date_obj.strftime("%d/%m/%Y"), "00:00", lat, lon, "UTC")
    chart_B = calculate_chart(end_date_obj.strftime("%d/%m/%Y"), "00:00", lat, lon, "UTC")
    if not chart_A or not chart_B: return None

    jd_start, jd_end = chart_A["jd"], chart_B["jd"]
    total_days = int(jd_end - jd_start)
    step_days = 5  # Sample mỗi 5 ngày

    steps = max(1, total_days // step_days)

    for p_name, p_id in outer_map.items():
        if p_name not in chart_A["planets"]: continue

        lon_A = chart_A["planets"][p_name]["lon"]  # Vị trí ngày bắt đầu
        lon_B = chart_B["planets"][p_name]["lon"]   # Vị trí ngày kết thúc

        # 2. Sample vị trí mỗi 5 ngày
        longitudes = [lon_A]
        for i in range(1, steps + 1):
            res = swe.calc_ut(jd_start + (i * step_days), p_id,
                              swe.FLG_SWIEPH | swe.FLG_SPEED)
            longitudes.append(res[0][0])
        longitudes.append(lon_B)

        # 3. Tính biên min/max tương đối (xử lý retrograde + vượt 0°)
        diffs = [((l - lon_A + 180) % 360 - 180) for l in longitudes]
        min_diff, max_diff = min(diffs), max(diffs)

        result[p_name] = {
            'A': lon_A,                          # Vị trí ngày bắt đầu (độ ecliptic)
            'B': lon_B,                           # Vị trí ngày kết thúc
            'start': (lon_A + min_diff) % 360,   # Biên trái arc (có thể retrograde)
            'end': (lon_A + max_diff) % 360,      # Biên phải arc
            'len': max_diff - min_diff             # Tổng độ dài cung (độ)
        }

    return result
```

### 6.2 Giải thích các trường trong `cycle_data`

| Trường | Ý nghĩa | Ví dụ |
|--------|---------|-------|
| `A` | Kinh độ ecliptic tại ngày **bắt đầu** khoảng thời gian | 15.2° (= 15°12' Bạch Dương) |
| `B` | Kinh độ ecliptic tại ngày **kết thúc** khoảng thời gian | 25.8° (= 25°48' Bạch Dương) |
| `start` | **Biên trái** arc (vị trí cực tây) — có thể < A nếu retrograde | 12.5° |
| `end` | **Biên phải** arc (vị trí cực đông) | 28.1° |
| `len` | **Tổng độ dài cung** = end - start (tính tương đối) | 15.6° |

**Tại sao `start` có thể khác `A`?**
Vì hành tinh có thể **retrograde** (đi lùi) trước khi đi tới. Ví dụ Jupiter bắt đầu ở 15°, lùi về 12° rồi tiến đến 28°. Khi đó: `A=15, start=12, end=28, B=25`.

### 6.3 Công thức tính diff tương đối (xử lý vượt 0°/360°)

```python
# Công thức chuẩn: Chuyển hiệu số về khoảng [-180, +180]
diff = ((longitude - lon_A + 180) % 360 - 180)

# Ví dụ: lon_A = 350°, longitude = 10°
# diff = ((10 - 350 + 180) % 360 - 180) = ((-160) % 360 - 180) = (200 - 180) = +20°
# → Đúng: 10° nằm 20° phía trước 350° (qua 0°)
```

---

## 7. BƯỚC 3 — PHÂN LANE CHU KỲ & TÍNH R_OUTER ĐỘNG

### 7.1 Chuẩn bị danh sách hành tinh

```python
LANE_BASE_R = 12.0      # Bắt đầu lane (sau vùng text transit)
LANE_HEIGHT = 0.5        # Chiều cao mỗi lane

sorted_planets = []
for p_name, data in cycle_data.items():
    sorted_planets.append({
        'name': p_name,
        'sym': PLANET_SYMBOLS.get(p_name, '?'),
        'start': data['start'],    # Biên trái arc
        'end': data['end'],        # Biên phải arc
        'len': data['len'],        # Độ dài cung
        'A': data['A'],            # Vị trí ngày bắt đầu
        'B': data['B']             # Vị trí ngày kết thúc
    })
```

### 7.2 Sắp xếp theo độ dài cung (dài nhất trước)

```python
sorted_planets.sort(key=lambda x: x['len'], reverse=True)
```

**Lý do:** Hành tinh có cung dài nhất (chiếm nhiều diện tích nhất) được đặt trước, giúp tối ưu phân bổ lane.

### 7.3 Thuật toán phân lane (Greedy Lane Allocation)

```python
lanes = []  # List of lists — mỗi list = các hành tinh trong lane đó

for p in sorted_planets:
    assigned_idx = -1

    # Thử đặt vào lane đầu tiên không bị va chạm
    for idx, lane_objs in enumerate(lanes):
        collision = False
        for existing in lane_objs:
            if check_arc_collision(p, existing):
                collision = True
                break
        if not collision:
            assigned_idx = idx
            break

    # Nếu tất cả lane đều bị va chạm → tạo lane mới
    if assigned_idx == -1:
        lanes.append([])
        assigned_idx = len(lanes) - 1

    lanes[assigned_idx].append(p)
    p['lane_idx'] = assigned_idx
```

### 7.4 Tính R_OUTER động

```python
# R_OUTER phải đủ lớn để chứa tất cả lane
calculated_outer = LANE_BASE_R + (len(lanes) * LANE_HEIGHT) + 0.5
R_OUTER = max(11.5, calculated_outer)

# Scale fig_size theo R_OUTER
scale_factor = R_OUTER / 11.5
fig_size = min(12 * scale_factor, 20)  # Tối đa 20 inch
```

**Ví dụ:**
- 5 hành tinh, 2 lane → `R_OUTER = 12.0 + 2*0.5 + 0.5 = 13.5`
- 5 hành tinh, 3 lane → `R_OUTER = 12.0 + 3*0.5 + 0.5 = 14.0`

---

## 8. BƯỚC 4 — THIẾT LẬP MATPLOTLIB POLAR

```python
matplotlib.use('Agg')

fig = Figure(figsize=(fig_size, fig_size), dpi=100)
ax = fig.add_subplot(111, projection='polar')

# Thiết lập hướng
ax.set_theta_zero_location('E')  # 0° nằm ở bên PHẢI (hướng Đông)
ax.set_theta_direction(1)         # Quay ngược chiều kim đồng hồ (CCW)

# Xoay theo ASC Người A (luôn ở vị trí 9 giờ)
offset = 180 - cA["angles"]["Asc"]
ax.set_theta_offset(np.deg2rad(offset))

# Ẩn lưới và nhãn
ax.grid(False)
ax.set_yticklabels([])
ax.set_xticklabels([])
ax.spines['polar'].set_visible(False)
```

---

## 9. BƯỚC 5 — VẼ NỀN (BACKGROUND RINGS)

```python
theta = np.linspace(0, 2 * np.pi, 100)

# Tô nền từ tâm ra ngoài
ax.fill_between(theta, 0.0, 4.0, color='#fffff0')     # Vùng Aspect (kem)
ax.fill_between(theta, 4.0, 6.0, color='#ffffff')      # Vùng Người A (trắng)
ax.fill_between(theta, 6.0, 8.0, color='#ffffff')      # Vùng Người B (trắng)
ax.fill_between(theta, 8.0, 9.5, color='#fffff0')      # Vùng Zodiac (kem)
ax.fill_between(theta, 9.5, R_OUTER, color='#ffffff')   # Vùng ngoài (trắng) — R_OUTER động

# Vẽ các đường tròn biên
borders = [4.0, 6.0, 8.0, 8.15, 9.35, 9.5]
for r in borders:
    ax.plot(theta, [r] * 100, color='black', linewidth=0.5)
```

**Bảng màu nền:**

| Vùng | Từ R | Đến R | Màu | Mã hex |
|------|------|-------|-----|--------|
| Aspect (tâm) | 0.0 | 4.0 | Kem | `#fffff0` |
| Người A | 4.0 | 6.0 | Trắng | `#ffffff` |
| Người B | 6.0 | 8.0 | Trắng | `#ffffff` |
| Zodiac | 8.0 | 9.5 | Kem | `#fffff0` |
| Transit + Cycles | 9.5 | R_OUTER | Trắng | `#ffffff` |

---

## 10. BƯỚC 6 — VẼ VÒNG ZODIAC (12 CUNG HOÀNG ĐẠO)

```python
ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]

for i in range(12):
    rad_start = np.deg2rad(i * 30)        # Vạch chia cung
    rad_mid = np.deg2rad(i * 30 + 15)     # Điểm giữa cung

    # Tô màu nguyên tố (Fire/Earth/Air/Water)
    elem_color = get_element_color(i)
    ax.bar(rad_mid, 9.35 - 8.15, width=np.deg2rad(30), bottom=8.15,
           color=elem_color, edgecolor='none')

    # Vạch chia cung (trắng)
    ax.plot([rad_start, rad_start], [8.0, 9.5], color='white', linewidth=0.5)

    # Symbol cung (♈♉♊...)
    ax.text(rad_mid, (8.0 + 9.5) / 2, ZODIAC_SYMBOLS[i],
            ha='center', va='center', fontsize=25, fontweight='bold', color='#fffff0')
```

**Màu 4 nguyên tố:**

| Nguyên tố | Màu | Hex | Cung |
|-----------|-----|-----|------|
| Lửa (Fire) | Đỏ cam | `#e94031` | ♈ Bạch Dương, ♌ Sư Tử, ♐ Nhân Mã |
| Đất (Earth) | Xanh lá | `#65c846` | ♉ Kim Ngưu, ♍ Xử Nữ, ♑ Ma Kết |
| Khí (Air) | Vàng cam | `#eeab41` | ♊ Song Tử, ♎ Thiên Bình, ♒ Bảo Bình |
| Nước (Water) | Xanh dương | `#2341f2` | ♋ Cự Giải, ♏ Bọ Cạp, ♓ Song Ngư |

Quy tắc: `z_idx % 4` → 0=Fire, 1=Earth, 2=Air, 3=Water

---

## 11. BƯỚC 7 — VẼ ĐỈNH NHÀ NGƯỜI A (XANH) & NGƯỜI B (ĐỎ)

### 11.1 Đỉnh nhà Người A — Vạch XANH trong vùng 4.0 → 6.0

```python
COLOR_A = '#0033ff'  # Xanh dương
angle_indices = [0, 3, 6, 9]  # AC(nhà 1), IC(nhà 4), DC(nhà 7), MC(nhà 10)

cuspsA = cA["cusps"][1:] if len(cA["cusps"]) == 13 else cA["cusps"]

for i, deg in enumerate(cuspsA):
    rad = np.deg2rad(deg)

    # Độ dày: Trục chính (AC/IC/DC/MC) = 2.5, nhà phụ = 0.5
    lw = 2.5 if i in angle_indices else 0.5

    # Vạch nhà (từ R_CENTER đến R_A_OUT)
    ax.plot([rad, rad], [4.0, 6.0], color=COLOR_A, linewidth=lw, alpha=0.6)

    # Số nhà (đặt gần R_CENTER, lệch +3° để không đè lên vạch)
    num_rad = np.deg2rad(deg + 3.0)
    ax.text(num_rad, 4.0 + 0.25, str(i + 1),
            fontsize=9, fontweight='bold', color=COLOR_A, ha='center', va='center')
```

### 11.2 Đỉnh nhà Người B — Vạch ĐỎ trong vùng 6.0 → 8.0

```python
COLOR_B = '#ff0000'  # Đỏ

cuspsB = cB["cusps"][1:] if len(cB["cusps"]) == 13 else cB["cusps"]

for i, deg in enumerate(cuspsB):
    rad = np.deg2rad(deg)
    lw = 2.5 if i in angle_indices else 0.5

    # Vạch nhà (từ R_A_OUT đến R_B_OUT)
    ax.plot([rad, rad], [6.0, 8.0], color=COLOR_B, linewidth=lw, alpha=0.6)

    # Số nhà (đặt gần R_B_OUT, lệch +3°)
    num_rad = np.deg2rad(deg + 3.0)
    ax.text(num_rad, 8.0 - 0.25, str(i + 1),
            fontsize=9, fontweight='bold', color=COLOR_B, ha='center', va='center')
```

### 11.3 So sánh 2 lớp nhà

| Thuộc tính | Người A (xanh) | Người B (đỏ) |
|-----------|----------------|---------------|
| Màu | `#0033ff` | `#ff0000` |
| Vùng R | 4.0 → 6.0 | 6.0 → 8.0 |
| Vị trí số nhà | R = 4.25 (gần tâm) | R = 7.75 (gần zodiac) |
| Alpha | 0.6 | 0.6 |

---

## 12. BƯỚC 8 — VẼ HÀNH TINH NGƯỜI A & NGƯỜI B

### 12.1 Chuẩn bị danh sách hành tinh

```python
# Người A — Bỏ qua Lilith, Asc, MC
p_list_A = []
for k, v in cA["planets"].items():
    if k not in PLANET_SYMBOLS: continue
    if k in ['Lilith', 'Asc', 'MC']: continue
    p_list_A.append({'name': k, 'lon': v['lon'], 'sym': PLANET_SYMBOLS[k]})

# Người B — Tương tự
p_list_B = []
for k, v in cB["planets"].items():
    if k not in PLANET_SYMBOLS: continue
    if k in ['Lilith', 'Asc', 'MC']: continue
    p_list_B.append({'name': k, 'lon': v['lon'], 'sym': PLANET_SYMBOLS[k]})
```

### 12.2 Tối ưu vị trí (tránh chồng chéo)

```python
# Người A: 2 lane trong vùng 4.0-6.0
lanes_A = [5.4, 4.6]   # Lane ngoài = 5.4, lane trong = 4.6
opt_A = optimize_planet_positions_by_house(p_list_A, cA["cusps"], lanes=lanes_A)

# Người B: 2 lane trong vùng 6.0-8.0
lanes_B = [7.4, 6.6]   # Lane ngoài = 7.4, lane trong = 6.6
opt_B = optimize_planet_positions_by_house(p_list_B, cB["cusps"], lanes=lanes_B)
```

### 12.3 Vẽ hành tinh Người A (xanh)

```python
for p in opt_A:
    true_rad = np.deg2rad(p['lon'])         # Vị trí thật
    disp_rad = np.deg2rad(p['disp_lon'])    # Vị trí hiển thị (đã dàn đều)
    r_pos = p['disp_r']                      # Bán kính lane (5.4 hoặc 4.6)

    # Vạch đánh dấu vị trí thật (2 tick xanh ở biên vùng A)
    ax.plot([true_rad, true_rad], [6.0, 6.0 - 0.1], color=COLOR_A, linewidth=1.5)   # Biên ngoài
    ax.plot([true_rad, true_rad], [4.0, 4.0 + 0.1], color=COLOR_A, linewidth=1.5)   # Biên trong

    # Ký hiệu hành tinh (XANH)
    f_size = 20
    if p['name'] in ["Vertex", "Chiron", "True Node", "Lilith"]:
        f_size = 15
    ax.text(disp_rad, r_pos, p['sym'],
            fontsize=f_size, fontweight='bold', color=COLOR_A, ha='center', va='center')
```

### 12.4 Vẽ hành tinh Người B (đỏ)

```python
for p in opt_B:
    true_rad = np.deg2rad(p['lon'])
    disp_rad = np.deg2rad(p['disp_lon'])
    r_pos = p['disp_r']                      # 7.4 hoặc 6.6

    # Vạch đánh dấu vị trí thật (2 tick đỏ ở biên vùng B)
    ax.plot([true_rad, true_rad], [6.0, 6.0 + 0.1], color=COLOR_B, linewidth=1.5)   # Biên trong
    ax.plot([true_rad, true_rad], [8.0, 8.0 - 0.1], color=COLOR_B, linewidth=1.5)   # Biên ngoài

    # Ký hiệu hành tinh (ĐỎ)
    f_size = 18
    if p['name'] in ["Vertex", "Chiron", "True Node", "Lilith"]:
        f_size = 13
    ax.text(disp_rad, r_pos, p['sym'],
            fontsize=f_size, fontweight='bold', color=COLOR_B, ha='center', va='center')
```

### 12.5 Bảng tổng hợp lanes

| Người | Lane ngoài (R) | Lane trong (R) | Màu | Font lớn | Font nhỏ |
|-------|----------------|----------------|-----|----------|----------|
| A (xanh) | 5.4 | 4.6 | `#0033ff` | 20 | 15 |
| B (đỏ) | 7.4 | 6.6 | `#ff0000` | 18 | 13 |

---

## 13. BƯỚC 9 — VẼ ĐƯỜNG ASPECT CHÉO (A ↔ B)

### 13.1 Quy tắc

- **Chỉ vẽ aspect CHÉO giữa 2 người** (hành tinh A ↔ hành tinh B)
- **KHÔNG vẽ aspect nội bộ** (A ↔ A hoặc B ↔ B)
- **Chặn điểm ảo:** Bỏ qua Asc, MC, True Node, Chiron, Lilith, Vertex
- **Orb chặt hơn Natal** (dùng `SYNASTRY_CHART_ORBS`)

### 13.2 Bộ Orb Synastry

```python
SYNASTRY_CHART_ORBS = {
    "Conjunction": 5.0,   # Natal: 10.0
    "Opposition":  5.0,   # Natal: 10.0
    "Square":      5.0,   # Natal: 10.0
    "Trine":       5.0,   # Natal: 10.0
    "Sextile":     3.0,   # Natal: 6.0
    "Semisextile": 1.5,   # Natal: 3.0
    "Quincunx":    1.5    # Natal: 3.0
}
```

### 13.3 Vẽ Aspect lines

```python
NON_PLANETS = ["Asc", "MC", "True Node", "Chiron", "Lilith", "Vertex"]

all_A = {k: v['lon'] for k, v in cA["planets"].items() if k in PLANET_SYMBOLS}
all_B = {k: v['lon'] for k, v in cB["planets"].items() if k in PLANET_SYMBOLS}

R_CENTER = 4.0  # Điểm giao nhau của aspect lines (tâm synastry)

for pA_name, lA in all_A.items():
    for pB_name, lB in all_B.items():

        # 1. Chặn điểm ảo
        if pA_name in NON_PLANETS or pB_name in NON_PLANETS:
            continue

        # 2. Kiểm tra aspect với orb tùy biến
        asp = check_aspect(lA, lB, custom_orbs=SYNASTRY_CHART_ORBS)
        if not asp: continue

        r1, r2 = np.deg2rad(lA), np.deg2rad(lB)

        # 3. Chọn màu
        if asp['aspect'] == 'Conjunction':    col = '#000000'  # Đen
        elif asp['aspect'] == 'Opposition':   col = '#ff0000'  # Đỏ
        elif asp['type'] == 'Hard':           col = '#ff0000'  # Đỏ
        elif asp['type'] == 'Minor':          col = '#00cc00'  # Xanh lá
        else:                                 col = '#0033ff'  # Xanh dương

        # 4. Vẽ
        if asp['aspect'] == 'Conjunction':
            lw = 4.0 if asp['orb'] < 2 else 2.0
            alpha = 0.8 if asp['orb'] < 3 else 0.4
            # Đường thẳng + viền đen
            ax.plot([r1, r2], [R_CENTER, R_CENTER], color='black', linewidth=lw + 1.5, alpha=alpha)
            ax.plot([r1, r2], [R_CENTER, R_CENTER], color=col, linewidth=lw, alpha=alpha)
        else:
            # Hình thoi "thanh kiếm" (Spindle)
            max_orb = SYNASTRY_CHART_ORBS.get(asp['aspect'], 10.0)
            orb_ratio = max(0, 1.0 - (asp['orb'] / max_orb))
            alpha = 0.4 + 0.4 * orb_ratio
            draw_spindle(ax, r1, r2, R_CENTER, col,
                        max_width=0.18, alpha=alpha, orb_ratio=orb_ratio)
```

### 13.4 So sánh Aspect: Natal vs Synastry

| Thuộc tính | Natal Chart | Synastry Chart |
|-----------|-------------|----------------|
| Điểm giao | R = 5.25 | R = 4.0 |
| Vẽ giữa | Nội bộ (planet ↔ planet) | Chéo (A ↔ B) |
| max_width spindle | 0.25 | 0.18 |
| Orb Conjunction | 10.0 | 5.0 |
| Orb Trine | 10.0 | 5.0 |
| Orb Sextile | 6.0 | 3.0 |

### 13.5 Bảng màu Aspect

| Loại | Tên | Góc | Màu | Hex |
|------|-----|-----|-----|-----|
| Hard | Conjunction | 0° | Đen | `#000000` |
| Hard | Opposition | 180° | Đỏ | `#ff0000` |
| Hard | Square | 90° | Đỏ | `#ff0000` |
| Soft | Trine | 120° | Xanh dương | `#0033ff` |
| Soft | Sextile | 60° | Xanh dương | `#0033ff` |
| Minor | Semisextile | 30° | Xanh lá | `#00cc00` |
| Minor | Quincunx | 150° | Xanh lá | `#00cc00` |

---

## 14. BƯỚC 10 — VẼ 5 HÀNH TINH TRANSIT (XANH LÁ, VÒNG NGOÀI)

### 14.1 Tổng quan

5 hành tinh transit hiển thị **bên ngoài vòng zodiac** với màu xanh lá (`#00cc00`). Mỗi hành tinh có:
1. **Vạch tick** từ vòng zodiac ra ngoài
2. **Đường dẫn chấm chấm** (nếu bị dịch vị trí để tránh chồng)
3. **Symbol hành tinh** (♃, ♄, ♅, ♆, ♇)

### 14.2 Bán kính transit

```python
COLOR_TRANSIT = '#00cc00'  # Xanh lá (= COLOR_MINOR)

R_TRANSIT_BASE = 9.5       # Gốc tick (= R_ZODIAC_OUTER)
R_TRANSIT_TIP  = 10.0      # Đầu tick (+0.5)
R_TRANSIT_TEXT = 11.0       # Vị trí symbol (+1.5 từ zodiac)
```

### 14.3 Tối ưu vị trí (tránh chồng symbol)

```python
# Tạo danh sách hành tinh transit từ vị trí A (ngày bắt đầu)
p_base_list = [
    {'name': p['name'], 'lon': p['A'], 'sym': p['sym']}
    for p in sorted_planets   # sorted_planets từ bước 7
]

# Dùng cusps đều (30° mỗi cung) vì transit không gắn nhà cụ thể
dummy_cusps = [i * 30 for i in range(12)]

# Chỉ 1 lane (R_TRANSIT_TEXT)
opt_transit = optimize_planet_positions_by_house(
    p_base_list, dummy_cusps, lanes=[R_TRANSIT_TEXT]
)
```

### 14.4 Vẽ từng hành tinh transit

```python
for p in opt_transit:
    true_rad = np.deg2rad(p['lon'])          # Vị trí thật
    disp_rad = np.deg2rad(p['disp_lon'])     # Vị trí hiển thị

    # 1. Vạch tick (từ vòng zodiac ra ngoài)
    ax.plot([true_rad, true_rad], [R_TRANSIT_BASE, R_TRANSIT_TIP],
            color=COLOR_TRANSIT, linewidth=2.0)

    # 2. Đường dẫn chấm chấm (nếu vị trí hiển thị khác vị trí thật)
    ax.plot([true_rad, disp_rad], [R_TRANSIT_TIP, R_TRANSIT_TEXT - 0.3],
            color=COLOR_TRANSIT, linewidth=0.5, linestyle=':')

    # 3. Symbol hành tinh (xanh lá)
    f_size = 20
    if p['name'] in ["Vertex", "Chiron", "True Node", "Lilith"]:
        f_size = 14
    ax.text(disp_rad, R_TRANSIT_TEXT, p['sym'],
            fontsize=f_size, fontweight='bold', color=COLOR_TRANSIT,
            ha='center', va='center')
```

---

## 15. BƯỚC 11 — VẼ CHU KỲ HÀNH TRÌNH DI CHUYỂN (CYCLE ARCS)

### 15.1 Tổng quan

Mỗi hành tinh ngoài có 1 **cung tròn** (arc) thể hiện quỹ đạo di chuyển trong khoảng thời gian đại hạn. Cung tròn:
- Nằm ở vòng ngoài cùng (R >= 12.0)
- Màu xanh lá (`#00cc00`)
- Có 2 tick đánh dấu vị trí **A** (ngày bắt đầu) và **B** (ngày kết thúc)
- Phân lane tự động để tránh va chạm

### 15.2 Hằng số

```python
LANE_BASE_R = 12.0    # R bắt đầu lane đầu tiên (= 11.5 + 0.5)
LANE_HEIGHT = 0.5      # Chiều cao mỗi lane
TICK_LEN = 0.2         # Chiều dài tick đánh dấu A/B
COLOR_TRANSIT = '#00cc00'  # Xanh lá
```

### 15.3 Vẽ từng cung tròn

```python
for p in sorted_planets:  # sorted_planets đã có lane_idx từ bước 7
    r_lane = LANE_BASE_R + (p['lane_idx'] * LANE_HEIGHT)

    start_rad = np.deg2rad(p['start'])  # Biên trái arc
    end_rad = np.deg2rad(p['end'])       # Biên phải arc

    # --- VẼ CUNG ---
    if p['end'] < p['start']:
        # TRƯỜNG HỢP RETROGRADE: Cung vượt qua 0° → Vẽ 2 đoạn
        # Đoạn 1: start → 360°
        w1 = np.deg2rad(360 - p['start'])
        ax.bar(start_rad + w1 / 2, 0.05, width=w1,
               bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)

        # Đoạn 2: 0° → end
        w2 = np.deg2rad(p['end'])
        ax.bar(0 + w2 / 2, 0.05, width=w2,
               bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)
    else:
        # TRƯỜNG HỢP BÌNH THƯỜNG: Cung liên tục
        width = end_rad - start_rad
        ax.bar(start_rad + width / 2, 0.05, width=width,
               bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)

    # --- VẼ TICK ĐÁNH DẤU A VÀ B ---
    rad_A = np.deg2rad(p['A'])  # Vị trí ngày bắt đầu
    rad_B = np.deg2rad(p['B'])   # Vị trí ngày kết thúc

    # Tick A (hướng xuống)
    ax.plot([rad_A, rad_A], [r_lane, r_lane - TICK_LEN],
            color=COLOR_TRANSIT, linewidth=0.8)

    # Tick B (hướng xuống)
    ax.plot([rad_B, rad_B], [r_lane, r_lane - TICK_LEN],
            color=COLOR_TRANSIT, linewidth=0.8)
```

### 15.4 Minh họa cung tròn

```
        ╭──────── Cung (arc, height=0.05) ────────╮
        │                                          │
  Tick A ↓                                    Tick B ↓
        │      ← đoạn retrograde → ← tiến →       │
        ╰──────────────────────────────────────────╯
        ↑ start                            end ↑

  r_lane ─────────────────────────────────────────────  (R = 12.0, 12.5, ...)
  r_lane - 0.2 ──── (đầu tick) ──────────────────────
```

### 15.5 Ví dụ layout 5 hành tinh

```
Giả sử khoảng thời gian: 01/2026 → 01/2027

Jupiter:  ♃ ████████████████████████░░░░ (24.7° arc, lane 0)
Saturn:   ♄ ░░░░░░████████████████░░░░░░ (18.3° arc, lane 1)
Uranus:   ♅ ░░░░░░░░░░░░░░████████░░░░░░ (8.2° arc, lane 0)
Neptune:  ♆ ░░░░░░░░░░░████░░░░░░░░░░░░ (3.7° arc, lane 1)
Pluto:    ♇ ░░████░░░░░░░░░░░░░░░░░░░░░ (3.1° arc, lane 0)
```

**Lane allocation logic:**
1. Jupiter (24.7°) → lane 0 (mới)
2. Saturn (18.3°) → thử lane 0: collision? Nếu có → lane 1
3. Uranus (8.2°) → thử lane 0: không collision → lane 0
4. Neptune (3.7°) → thử lane 0: collision với Uranus? → lane 1
5. Pluto (3.1°) → thử lane 0: không collision → lane 0

---

## 16. BƯỚC 12 — TIÊU ĐỀ & XUẤT ẢNH

### 16.1 Tiêu đề

```python
ax.set_title(
    f"SYNASTRY & ĐẠI HẠN: {nA} & {nB} ({start_date} - {end_date})",
    y=1.08, fontsize=18, fontweight='bold'
)
```

### 16.2 Xuất ảnh Base64

```python
output = io.BytesIO()
FigureCanvas(fig).print_png(output)
base64_img = base64.b64encode(output.getvalue()).decode('utf-8')

# Sử dụng trong HTML:
# <img src="data:image/png;base64,{{ chart_img }}" />
```

---

## 17. THUẬT TOÁN PHỤ TRỢ

### 17.1 Kiểm tra va chạm cung (check_arc_collision)

```python
def check_arc_collision(arc1, arc2, buffer=2.0):
    """
    Kiểm tra 2 cung tròn có va chạm không (với buffer 2°).

    arc = {'start': deg, 'end': deg}  — đều là ecliptic longitude (0-360)
    """
    s1, e1 = arc1['start'], arc1['end']
    s2, e2 = arc2['start'], arc2['end']

    def norm(deg):
        return deg % 360

    def is_in_arc(p, s, e):
        """Kiểm tra điểm p có nằm trong cung [s, e] không (xử lý vượt 0°)"""
        p = norm(p)
        if s <= e:
            return s <= p <= e
        else:
            return p >= s or p <= e

    s1_buf = norm(s1 - buffer)
    e1_buf = norm(e1 + buffer)

    # Kiểm tra 4 trường hợp giao nhau
    if is_in_arc(s2, s1_buf, e1_buf) or is_in_arc(e2, s1_buf, e1_buf):
        return True
    if is_in_arc(s1_buf, s2, e2) or is_in_arc(e1_buf, s2, e2):
        return True
    return False
```

### 17.2 Tối ưu vị trí hành tinh (optimize_planet_positions_by_house)

```python
def optimize_planet_positions_by_house(planets, cusps, lanes):
    """
    Phân hành tinh vào 2 lane, dàn đều trong mỗi nhà.

    Tham số:
      - planets: [{'name': str, 'lon': float, 'sym': str}, ...]
      - cusps: list 12 giá trị đỉnh nhà
      - lanes: [r_outer, r_inner] — bán kính 2 vòng hiển thị

    Kết quả: Mỗi planet được thêm:
      - 'disp_lon': Vị trí hiển thị (đã dàn đều)
      - 'disp_r': Bán kính lane
    """
    BUFFER = 2.0     # Khoảng cách tối thiểu từ đỉnh nhà
    MIN_DIST = 5.0   # Khoảng cách tối thiểu giữa 2 hành tinh cùng lane

    # 1. Phân nhóm theo nhà
    # 2. Sắp xếp trong nhà theo khoảng cách từ đỉnh
    # 3. Phân lane xen kẽ (chẵn→lane 0, lẻ→lane 1)
    # 4. Forward pass: Đẩy ra xa nếu quá gần
    # 5. Backward pass: Kéo lại nếu vượt biên nhà
```

### 17.3 Vẽ hình thoi thanh kiếm (draw_spindle)

```python
def draw_spindle(ax, theta1, theta2, radius, color, max_width=0.15, alpha=0.6, orb_ratio=1.0):
    """
    Vẽ hình dạng 'thanh kiếm': Thuôn nhọn ở 5% hai đầu, thân dày đều.

    Tham số:
      - theta1, theta2: Góc radian của 2 hành tinh
      - radius: Bán kính vẽ (4.0 cho Synastry, 5.25 cho Natal)
      - color: Màu sắc
      - max_width: Độ rộng tối đa (0.18 cho Synastry, 0.25 cho Natal)
      - alpha: Độ trong suốt (0.4 → 0.8)
      - orb_ratio: 0.0 (orb lớn) → 1.0 (orb nhỏ, exact)
    """
    # 1. Polar → Cartesian
    x1 = radius * cos(theta1); y1 = radius * sin(theta1)
    x2 = radius * cos(theta2); y2 = radius * sin(theta2)

    # 2. Vector pháp tuyến
    dx, dy = x2 - x1, y2 - y1
    length = sqrt(dx*dx + dy*dy)
    nx, ny = -dy/length, dx/length

    # 3. Tính độ rộng: width = max_width * (0.3 + 0.7 * orb_ratio)
    width = max_width * (0.3 + 0.7 * orb_ratio)
    half_w = width / 2.0

    # 4. Tạo 6 đỉnh hình thoi (taper_ratio = 5%)
    taper = 0.05
    # Đỉnh 1: Nhọn đầu 1 (theta1)
    # Đỉnh 2-3: Rộng gần đầu 1
    # Đỉnh 4: Nhọn đầu 2 (theta2)
    # Đỉnh 5-6: Rộng gần đầu 2

    # 5. Cartesian → Polar, vẽ Polygon
    poly = patches.Polygon(verts, closed=True,
                          facecolor=color, edgecolor='black',
                          linewidth=0.6, alpha=alpha, zorder=3)
    ax.add_patch(poly)
```

### 17.4 Công thức alpha theo orb

```python
# Orb nhỏ → đậm, orb lớn → mờ
orb_ratio = max(0, 1.0 - (orb / max_orb))  # 0.0 (xa) → 1.0 (exact)
alpha = 0.4 + 0.4 * orb_ratio               # 0.4 (mờ nhất) → 0.8 (đậm nhất)
```

---

## 18. HẰNG SỐ THAM CHIẾU

### 18.1 Hành tinh — ID trong Swiss Ephemeris

```python
PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY,
    "Venus": swe.VENUS, "Mars": swe.MARS, "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN, "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO, "True Node": swe.TRUE_NODE, "Chiron": swe.CHIRON,
    "Lilith": swe.MEAN_APOG
}

# 5 hành tinh ngoài (đại hạn)
OUTER_PLANET_MAP = {
    "Jupiter": swe.JUPITER,
    "Saturn":  swe.SATURN,
    "Uranus":  swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto":   swe.PLUTO
}
```

### 18.2 Ký hiệu hành tinh (Unicode)

```python
PLANET_SYMBOLS = {
    "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "True Node": "☊", "Chiron": "⚷", "Vertex": "Vx", "Asc": "AC", "MC": "MC",
    "Lilith": "⚸", "South Node": "☋"
}
```

### 18.3 Ký hiệu 12 cung hoàng đạo

```python
ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
```

### 18.4 Định nghĩa góc hợp (Aspects)

```python
ASPECTS_DEF = {
    "Conjunction":  {"angle": 0,   "orb": 10,  "type": "Hard",  "symbol": "☌", "color": "#000000"},
    "Semisextile":  {"angle": 30,  "orb": 3.0, "type": "Minor", "symbol": "⚺", "color": "#00cc00"},
    "Sextile":      {"angle": 60,  "orb": 6,   "type": "Soft",  "symbol": "⚹", "color": "#0033ff"},
    "Square":       {"angle": 90,  "orb": 10,  "type": "Hard",  "symbol": "□", "color": "#ff0000"},
    "Trine":        {"angle": 120, "orb": 10,  "type": "Soft",  "symbol": "△", "color": "#0033ff"},
    "Quincunx":     {"angle": 150, "orb": 3.0, "type": "Minor", "symbol": "⚻", "color": "#00cc00"},
    "Opposition":   {"angle": 180, "orb": 10,  "type": "Hard",  "symbol": "☍", "color": "#ff0000"}
}
```

### 18.5 Bảng màu đầy đủ

```python
# Aspect
COLOR_CONJUNCTION = '#000000'  # Đen
COLOR_OPPOSITION  = '#ff0000'  # Đỏ tươi
COLOR_HARD        = '#ff0000'  # Đỏ tươi (Square, Opposition)
COLOR_SOFT        = '#0033ff'  # Xanh dương đậm (Trine, Sextile)
COLOR_MINOR       = '#00cc00'  # Xanh lá (Semisextile, Quincunx)

# Synastry
COLOR_A = '#0033ff'  # Xanh dương — Người A (vòng trong)
COLOR_B = '#ff0000'  # Đỏ — Người B (vòng giữa ngoài)

# Transit
COLOR_TRANSIT = '#00cc00'  # Xanh lá — 5 hành tinh ngoài + Cycle arcs

# Nền
BG_COLOR_1 = '#fffff0'  # Kem nhạt (Tâm, Zodiac)
BG_COLOR_2 = '#ffffff'  # Trắng (Vùng hành tinh, Vòng ngoài)

# Nguyên tố
COLOR_FIRE  = '#e94031'  # Đỏ cam (♈♌♐)
COLOR_EARTH = '#65c846'  # Xanh lá (♉♍♑)
COLOR_AIR   = '#eeab41'  # Vàng cam (♊♎♒)
COLOR_WATER = '#2341f2'  # Xanh dương (♋♏♓)
```

---

## 19. CẤU TRÚC DỮ LIỆU THAM CHIẾU

### 19.1 chart_data (cA hoặc cB)

```json
{
    "jd": 2460000.5,
    "cusps": [30.5, 55.2, 80.1, 110.3, 140.5, 170.2, 210.5, 235.2, 260.1, 290.3, 320.5, 350.2],
    "angles": {"Asc": 30.5, "MC": 290.3, "Vertex": 195.7},
    "planets": {
        "Sun":       {"lon": 45.123, "lat": 0.001, "speed": 1.019},
        "Moon":      {"lon": 120.456, "lat": -3.2, "speed": 13.2},
        "Mercury":   {"lon": 55.789, "lat": 1.5, "speed": 1.8},
        "Venus":     {"lon": 70.012, "lat": -0.5, "speed": 1.2},
        "Mars":      {"lon": 200.345, "lat": 0.8, "speed": 0.7},
        "Jupiter":   {"lon": 15.678, "lat": -0.3, "speed": 0.12},
        "Saturn":    {"lon": 340.901, "lat": 0.4, "speed": 0.05},
        "Uranus":    {"lon": 55.234, "lat": -0.1, "speed": 0.04},
        "Neptune":   {"lon": 358.567, "lat": 0.2, "speed": 0.02},
        "Pluto":     {"lon": 301.890, "lat": 15.1, "speed": 0.01},
        "True Node": {"lon": 10.123, "lat": 0.0, "speed": -0.05},
        "Chiron":    {"lon": 22.456, "lat": 3.5, "speed": 0.04},
        "Lilith":    {"lon": 180.789, "lat": 0.0, "speed": 0.11},
        "Vertex":    {"lon": 195.7, "lat": 0, "speed": 0},
        "Asc":       {"lon": 30.5, "lat": 0, "speed": 0},
        "MC":        {"lon": 290.3, "lat": 0, "speed": 0}
    },
    "info": {
        "local_time": "15/03/1990 08:30 (GMT+7)",
        "ut_time": "15/03/1990 01:30",
        "lst": "14:22",
        "lat_lon": "21°02'N, 105°51'E",
        "house_sys": "Placidus system"
    },
    "meta": {"lat": 21.028511, "lon": 105.854161, "tz": "Asia/Ho_Chi_Minh", "offset_used": 7.0}
}
```

### 19.2 cycle_data (output từ get_outer_planet_cycle_data)

```json
{
    "Jupiter": {"A": 15.2, "B": 25.8, "start": 12.5, "end": 28.1, "len": 15.6},
    "Saturn":  {"A": 340.5, "B": 355.2, "start": 338.0, "end": 358.0, "len": 20.0},
    "Uranus":  {"A": 55.1, "B": 59.3, "start": 54.0, "end": 60.5, "len": 6.5},
    "Neptune": {"A": 1.2, "B": 4.8, "start": 0.5, "end": 5.2, "len": 4.7},
    "Pluto":   {"A": 305.6, "B": 308.1, "start": 304.8, "end": 309.0, "len": 4.2}
}
```

### 19.3 Ghi chú về cusps

- `swe.houses()` trả về tuple 12 phần tử (index 0-11 = nhà 1-12)
- Một số trường hợp cusps có 13 phần tử (index 0 = padding) → cần cắt: `cusps[1:]`
- Luôn kiểm tra: `if len(cusps) == 13: cusps = cusps[1:]`

---

## 20. LUỒNG HOẠT ĐỘNG END-TO-END

```
User chọn: Người A + Người B + Khoảng thời gian đại hạn
         ↓
[Backend: calculate_chart() × 2]  → cA, cB (natal 2 người)
         ↓
[Backend: get_outer_planet_cycle_data(lat, lon, start, end)]  → cycle_data
         ↓
[Drawing: create_synastry_transit_chart_image(cA, cB, nA, nB, cycle_data, start, end)]
    │
    ├── Bước 1-3: Pre-calculate → Phân lane, tính R_OUTER
    ├── Bước 4:   Setup Matplotlib (polar, xoay theo ASC A)
    ├── Bước 5:   Vẽ nền (rings)
    ├── Bước 6:   Vẽ zodiac (12 cung)
    ├── Bước 7:   Vẽ đỉnh nhà A (xanh) + B (đỏ)
    ├── Bước 8:   Vẽ hành tinh A (xanh) + B (đỏ)
    ├── Bước 9:   Vẽ aspect chéo A ↔ B (spindle tại R=4.0)
    ├── Bước 10:  Vẽ 5 transit symbols (xanh lá, ngoài zodiac)
    ├── Bước 11:  Vẽ cycle arcs (xanh lá, lane ngoài cùng)
    └── Bước 12:  Tiêu đề + xuất Base64 PNG
         ↓
Output: Base64 PNG → <img src="data:image/png;base64,...">
```

### API Endpoints tham khảo

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/search-location` | GET | Tìm kiếm địa điểm (Nominatim geocoding) |
| `/synastry` | POST | Tạo biểu đồ synastry 2 người |
| `/vanhan/rieng` | POST | Vận hạn cá nhân (single + outer_cycle) |
| `/vanhan/chitiet` | POST | Vận hạn chi tiết (timeline) |

---

## 21. CODE MẪU TỐI THIỂU

```python
"""
Ví dụ tối thiểu: Synastry + Vận Hạn Đại Hạn Tương Lai
Kết hợp bản đồ tương hợp 2 người + 5 hành tinh ngoài + chu kỳ hành trình
"""
import io
import base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

# === GIẢ SỬ ĐÃ CÓ: cA, cB (natal 2 người), cycle_data (5 hành tinh ngoài) ===
# === VÀ CÁC HÀM: optimize_planet_positions_by_house, draw_spindle, check_arc_collision ===

def create_synastry_transit_chart(cA, cB, nA, nB, cycle_data, start_date, end_date):
    if not cA or not cB or not cycle_data:
        return None

    # ======= HẰNG SỐ =======
    COLOR_A = '#0033ff'
    COLOR_B = '#ff0000'
    COLOR_TRANSIT = '#00cc00'
    BG_1 = '#fffff0'
    BG_2 = '#ffffff'
    ELEM_COLORS = ['#e94031', '#65c846', '#eeab41', '#2341f2']
    ZODIAC_SYM = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]

    R_CENTER = 4.0
    R_A_OUT = 6.0
    R_B_OUT = 8.0
    R_ZODIAC_OUTER = 9.5
    R_TRANSIT_BASE = 9.5
    R_TRANSIT_TIP = 10.0
    R_TRANSIT_TEXT = 11.0
    LANE_BASE_R = 12.0
    LANE_HEIGHT = 0.5
    TICK_LEN = 0.2

    # ======= BƯỚC 1: PHÂN LANE CHU KỲ =======
    sorted_planets = []
    for p_name, data in cycle_data.items():
        sorted_planets.append({
            'name': p_name, 'sym': PLANET_SYMBOLS.get(p_name, '?'),
            'start': data['start'], 'end': data['end'], 'len': data['len'],
            'A': data['A'], 'B': data['B']
        })
    sorted_planets.sort(key=lambda x: x['len'], reverse=True)

    lanes = []
    for p in sorted_planets:
        assigned_idx = -1
        for idx, lane_objs in enumerate(lanes):
            collision = False
            for existing in lane_objs:
                if check_arc_collision(p, existing):
                    collision = True; break
            if not collision:
                assigned_idx = idx; break
        if assigned_idx == -1:
            lanes.append([])
            assigned_idx = len(lanes) - 1
        lanes[assigned_idx].append(p)
        p['lane_idx'] = assigned_idx

    R_OUTER = max(11.5, LANE_BASE_R + len(lanes) * LANE_HEIGHT + 0.5)
    scale = R_OUTER / 11.5
    fig_size = min(12 * scale, 20)

    # ======= BƯỚC 2: SETUP MATPLOTLIB =======
    fig = Figure(figsize=(fig_size, fig_size), dpi=100)
    ax = fig.add_subplot(111, projection='polar')
    ax.set_theta_zero_location('E')
    ax.set_theta_direction(1)
    ax.set_theta_offset(np.deg2rad(180 - cA["angles"]["Asc"]))
    ax.grid(False); ax.set_yticklabels([]); ax.set_xticklabels([])
    ax.spines['polar'].set_visible(False)

    # ======= BƯỚC 3: NỀN =======
    theta = np.linspace(0, 2 * np.pi, 100)
    ax.fill_between(theta, 0, R_CENTER, color=BG_1)
    ax.fill_between(theta, R_CENTER, R_A_OUT, color=BG_2)
    ax.fill_between(theta, R_A_OUT, R_B_OUT, color=BG_2)
    ax.fill_between(theta, R_B_OUT, R_ZODIAC_OUTER, color=BG_1)
    ax.fill_between(theta, R_ZODIAC_OUTER, R_OUTER, color=BG_2)
    for r in [R_CENTER, R_A_OUT, R_B_OUT, 8.15, 9.35, R_ZODIAC_OUTER]:
        ax.plot(theta, [r]*100, color='black', linewidth=0.5)

    # ======= BƯỚC 4: ZODIAC =======
    for i in range(12):
        rm = np.deg2rad(i*30+15)
        ax.bar(rm, 1.2, width=np.deg2rad(30), bottom=8.15, color=ELEM_COLORS[i%4], edgecolor='none')
        ax.plot([np.deg2rad(i*30)]*2, [R_B_OUT, R_ZODIAC_OUTER], color='white', linewidth=0.5)
        ax.text(rm, 8.75, ZODIAC_SYM[i], ha='center', va='center', fontsize=25, fontweight='bold', color=BG_1)

    # ======= BƯỚC 5: NHÀ A (xanh) + B (đỏ) =======
    angle_indices = [0, 3, 6, 9]
    cuspsA = cA["cusps"][1:] if len(cA["cusps"]) == 13 else cA["cusps"]
    cuspsB = cB["cusps"][1:] if len(cB["cusps"]) == 13 else cB["cusps"]

    for i, deg in enumerate(cuspsA):
        lw = 2.5 if i in angle_indices else 0.5
        ax.plot([np.deg2rad(deg)]*2, [R_CENTER, R_A_OUT], color=COLOR_A, linewidth=lw, alpha=0.6)
        ax.text(np.deg2rad(deg+3), R_CENTER+0.25, str(i+1), fontsize=9, fontweight='bold', color=COLOR_A, ha='center')

    for i, deg in enumerate(cuspsB):
        lw = 2.5 if i in angle_indices else 0.5
        ax.plot([np.deg2rad(deg)]*2, [R_A_OUT, R_B_OUT], color=COLOR_B, linewidth=lw, alpha=0.6)
        ax.text(np.deg2rad(deg+3), R_B_OUT-0.25, str(i+1), fontsize=9, fontweight='bold', color=COLOR_B, ha='center')

    # ======= BƯỚC 6: HÀNH TINH A (xanh) + B (đỏ) =======
    p_list_A = [{'name':k,'lon':v['lon'],'sym':PLANET_SYMBOLS[k]}
                for k,v in cA["planets"].items()
                if k in PLANET_SYMBOLS and k not in ['Lilith','Asc','MC']]
    opt_A = optimize_planet_positions_by_house(p_list_A, cA["cusps"], lanes=[5.4, 4.6])
    for p in opt_A:
        ax.text(np.deg2rad(p['disp_lon']), p['disp_r'], p['sym'],
                fontsize=20 if p['name'] not in ["Vertex","Chiron","True Node"] else 15,
                fontweight='bold', color=COLOR_A, ha='center', va='center')

    p_list_B = [{'name':k,'lon':v['lon'],'sym':PLANET_SYMBOLS[k]}
                for k,v in cB["planets"].items()
                if k in PLANET_SYMBOLS and k not in ['Lilith','Asc','MC']]
    opt_B = optimize_planet_positions_by_house(p_list_B, cB["cusps"], lanes=[7.4, 6.6])
    for p in opt_B:
        ax.text(np.deg2rad(p['disp_lon']), p['disp_r'], p['sym'],
                fontsize=18 if p['name'] not in ["Vertex","Chiron","True Node"] else 13,
                fontweight='bold', color=COLOR_B, ha='center', va='center')

    # ======= BƯỚC 7: ASPECT CHÉO A ↔ B =======
    NON_PLANETS = ["Asc","MC","True Node","Chiron","Lilith","Vertex"]
    SYN_ORBS = {"Conjunction":5,"Opposition":5,"Square":5,"Trine":5,"Sextile":3,"Semisextile":1.5,"Quincunx":1.5}
    all_A = {k:v['lon'] for k,v in cA["planets"].items() if k in PLANET_SYMBOLS}
    all_B = {k:v['lon'] for k,v in cB["planets"].items() if k in PLANET_SYMBOLS}

    for pa,la in all_A.items():
        for pb,lb in all_B.items():
            if pa in NON_PLANETS or pb in NON_PLANETS: continue
            asp = check_aspect(la, lb, custom_orbs=SYN_ORBS)
            if not asp: continue
            r1, r2 = np.deg2rad(la), np.deg2rad(lb)
            col = '#000000' if asp['aspect']=='Conjunction' else '#ff0000' if asp['type']=='Hard' else '#00cc00' if asp['type']=='Minor' else '#0033ff'
            if asp['aspect'] == 'Conjunction':
                lw = 4.0 if asp['orb']<2 else 2.0
                al = 0.8 if asp['orb']<3 else 0.4
                ax.plot([r1,r2],[R_CENTER]*2,color='black',linewidth=lw+1.5,alpha=al)
                ax.plot([r1,r2],[R_CENTER]*2,color=col,linewidth=lw,alpha=al)
            else:
                orb_r = max(0,1-(asp['orb']/SYN_ORBS.get(asp['aspect'],10)))
                draw_spindle(ax,r1,r2,R_CENTER,col,max_width=0.18,alpha=0.4+0.4*orb_r,orb_ratio=orb_r)

    # ======= BƯỚC 8: 5 TRANSIT SYMBOLS (xanh lá) =======
    t_list = [{'name':p['name'],'lon':p['A'],'sym':p['sym']} for p in sorted_planets]
    opt_t = optimize_planet_positions_by_house(t_list, [i*30 for i in range(12)], lanes=[R_TRANSIT_TEXT])
    for p in opt_t:
        tr, dr = np.deg2rad(p['lon']), np.deg2rad(p['disp_lon'])
        ax.plot([tr]*2, [R_TRANSIT_BASE, R_TRANSIT_TIP], color=COLOR_TRANSIT, linewidth=2.0)
        ax.plot([tr,dr], [R_TRANSIT_TIP, R_TRANSIT_TEXT-0.3], color=COLOR_TRANSIT, linewidth=0.5, linestyle=':')
        ax.text(dr, R_TRANSIT_TEXT, p['sym'], fontsize=20, fontweight='bold', color=COLOR_TRANSIT, ha='center', va='center')

    # ======= BƯỚC 9: CYCLE ARCS (xanh lá) =======
    for p in sorted_planets:
        r_lane = LANE_BASE_R + p['lane_idx'] * LANE_HEIGHT
        sr, er = np.deg2rad(p['start']), np.deg2rad(p['end'])
        if p['end'] < p['start']:
            w1 = np.deg2rad(360-p['start'])
            ax.bar(sr+w1/2, 0.05, width=w1, bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)
            w2 = np.deg2rad(p['end'])
            ax.bar(w2/2, 0.05, width=w2, bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)
        else:
            ax.bar(sr+(er-sr)/2, 0.05, width=er-sr, bottom=r_lane, color=COLOR_TRANSIT, edgecolor='none', alpha=0.8)
        ax.plot([np.deg2rad(p['A'])]*2, [r_lane, r_lane-TICK_LEN], color=COLOR_TRANSIT, linewidth=0.8)
        ax.plot([np.deg2rad(p['B'])]*2, [r_lane, r_lane-TICK_LEN], color=COLOR_TRANSIT, linewidth=0.8)

    # ======= BƯỚC 10: TIÊU ĐỀ + XUẤT ẢNH =======
    ax.set_title(f"SYNASTRY & ĐẠI HẠN: {nA} & {nB}", y=1.08, fontsize=18, fontweight='bold')
    output = io.BytesIO()
    FigureCanvas(fig).print_png(output)
    return base64.b64encode(output.getvalue()).decode('utf-8')
```

---

> **Tài liệu này được trích xuất ngày 2026-04-09 từ dự án `/root/astro_project`.**
