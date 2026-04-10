# HƯỚNG DẪN ĐẦY ĐỦ VẼ BẢN ĐỒ SAO (ASTROLOGY CHART)

> Tài liệu trích xuất từ dự án `chiemtinh.jst4.fun` — đủ chi tiết để tái tạo toàn bộ hệ thống vẽ bản đồ sao trong bất kỳ dự án nào.

---

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Thư viện & Dependencies](#2-thư-viện--dependencies)
3. [Tính toán dữ liệu bản đồ sao (API Engine)](#3-tính-toán-dữ-liệu-bản-đồ-sao-api-engine)
4. [Hằng số: Ký hiệu Cung, Hành tinh, Góc](#4-hằng-số-ký-hiệu-cung-hành-tinh-góc)
5. [Hệ thống màu sắc (Color System)](#5-hệ-thống-màu-sắc-color-system)
6. [Vẽ Natal Chart (Bản đồ cá nhân)](#6-vẽ-natal-chart-bản-đồ-cá-nhân)
7. [Vẽ Synastry Chart (Bản đồ tương hợp)](#7-vẽ-synastry-chart-bản-đồ-tương-hợp)
8. [Vẽ Transit Chart (Bản đồ vận hạn)](#8-vẽ-transit-chart-bản-đồ-vận-hạn)
9. [Vẽ Aspect Grid (Bảng góc hợp)](#9-vẽ-aspect-grid-bảng-góc-hợp)
10. [Vẽ Timeline (Biểu đồ vận hạn chi tiết)](#10-vẽ-timeline-biểu-đồ-vận-hạn-chi-tiết)
11. [Thuật toán tối ưu vị trí hành tinh](#11-thuật-toán-tối-ưu-vị-trí-hành-tinh)
12. [Thuật toán vẽ đường aspect (Spindle)](#12-thuật-toán-vẽ-đường-aspect-spindle)
13. [Cấu trúc dữ liệu chart_data](#13-cấu-trúc-dữ-liệu-chart_data)
14. [Luồng hoạt động end-to-end](#14-luồng-hoạt-động-end-to-end)

---

## 1. TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────┐
│  User Input (DOB, TOB, Location)                        │
│         ↓                                               │
│  calculate_chart() ← Swiss Ephemeris (pyswisseph)       │
│         ↓                                               │
│  chart_data = {jd, cusps, angles, planets, info, meta}  │
│         ↓                                               │
│  ┌──────────────────────────────────────┐               │
│  │ Drawing Module (Matplotlib Polar)    │               │
│  │  - natal.py    → Bản đồ tròn cá nhân│               │
│  │  - synastry.py → Bản đồ 2 người     │               │
│  │  - transit_chart.py → Transit overlay│               │
│  │  - grid.py     → Bảng góc hợp       │               │
│  │  - timeline.py → Timeline vận hạn    │               │
│  └──────────────────────────────────────┘               │
│         ↓                                               │
│  Output: Base64 PNG (embed trong HTML <img>)            │
└─────────────────────────────────────────────────────────┘
```

**Công nghệ vẽ:** Matplotlib với `polar` projection
**Output:** Base64-encoded PNG
**Hệ nhà:** Placidus (mã `b'P'` trong Swiss Ephemeris)

---

## 2. THƯ VIỆN & DEPENDENCIES

```python
# Tính toán thiên văn
import swisseph as swe          # pip install pyswisseph
from timezonefinder import TimezoneFinder  # pip install timezonefinder
from geopy.geocoders import Nominatim      # pip install geopy
import pytz                     # pip install pytz

# Vẽ biểu đồ
import matplotlib               # pip install matplotlib
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
import matplotlib.patches as patches
import matplotlib.lines as lines
import matplotlib.patheffects as path_effects
import numpy as np              # pip install numpy

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

## 3. TÍNH TOÁN DỮ LIỆU BẢN ĐỒ SAO (API ENGINE)

### 3.1 Hàm chính: `calculate_chart()`

```python
def calculate_chart(dob_str, tob_str, lat, lon, tz_str=None, manual_offset=None):
    """
    Tham số:
      - dob_str: "DD/MM/YYYY" (ngày sinh)
      - tob_str: "HH:MM" (giờ sinh)
      - lat, lon: Tọa độ địa lý (float)
      - tz_str: Tên timezone IANA (vd: "Asia/Ho_Chi_Minh")
      - manual_offset: Offset thủ công (vd: 7.0 cho UTC+7)

    Trả về dict:
      {
        "jd": Julian Day (float),
        "cusps": tuple 12 hoặc 13 giá trị (độ ecliptic của đỉnh mỗi nhà),
        "angles": {"Asc": float, "MC": float, "Vertex": float},
        "planets": {
            "Sun": {"lon": float, "lat": float, "speed": float},
            "Moon": {...}, "Mercury": {...}, ...
            "Asc": {"lon": float, "lat": 0, "speed": 0},
            "MC":  {"lon": float, "lat": 0, "speed": 0},
            "Vertex": {"lon": float, "lat": 0, "speed": 0}
        },
        "info": {
            "local_time": "DD/MM/YYYY HH:MM (GMT+X)",
            "ut_time": "DD/MM/YYYY HH:MM",
            "lst": "HH:MM",
            "lat_lon": "21°02'N, 105°51'E",
            "house_sys": "Placidus system"
        },
        "meta": {"lat": float, "lon": float, "tz": str, "offset_used": float}
      }
    """
```

### 3.2 Quy trình tính toán bên trong

```python
# 1. Parse ngày giờ
dt_local = datetime.strptime(f"{dob_str} {tob_str}", "%d/%m/%Y %H:%M")

# 2. Xác định UTC offset
#    - Nếu có manual_offset → dùng trực tiếp
#    - Nếu tọa độ thuộc Việt Nam → dùng logic lịch sử VN
#    - Còn lại → dùng ZoneInfo(iana_tz) để tính DST tự động

# 3. Chuyển sang UTC
dt_utc = dt_local - timedelta(hours=final_offset)

# 4. Tính Julian Day
jd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                dt_utc.hour + dt_utc.minute / 60.0)

# 5. Set vị trí quan sát
swe.set_topo(lat, lon, 0)

# 6. Tính House cusps + Angles (Hệ Placidus)
cusps, ascmc = swe.houses(jd, lat, lon, b'P')
# cusps = tuple 12 giá trị (đỉnh mỗi nhà, tính theo ecliptic longitude)
# ascmc[0] = Ascendant, ascmc[1] = MC, ascmc[3] = Vertex

# 7. Tính vị trí hành tinh
for p_name, p_id in PLANET_IDS.items():
    res = swe.calc_ut(jd, p_id, swe.FLG_SWIEPH | swe.FLG_SPEED)
    # res[0][0] = ecliptic longitude (0-360)
    # res[0][1] = ecliptic latitude
    # res[0][3] = speed (degree/day)
```

### 3.3 Xác định cung hoàng đạo từ kinh độ

```python
def get_zodiac(lon):
    lon = lon % 360
    idx = int(lon / 30)        # 0=Bạch Dương, 1=Kim Ngưu...
    deg_in_sign = lon % 30     # Bao nhiêu độ trong cung đó
    return idx, ZODIAC_NAMES[idx], ZODIAC_CODES[idx], deg_in_sign
```

### 3.4 Xác định hành tinh nằm ở nhà nào

```python
def get_house_of_planet(planet_lon, cusps):
    p_lon = planet_lon % 360
    real_cusps = list(cusps)
    if len(real_cusps) == 13: real_cusps = real_cusps[1:]
    for i in range(12):
        c_curr = real_cusps[i]
        c_next = real_cusps[(i + 1) % 12]
        dist_p = (p_lon - c_curr) % 360
        size_h = (c_next - c_curr) % 360
        if dist_p < size_h:
            return i + 1  # Nhà 1-12
    return 1
```

### 3.5 Kiểm tra góc hợp (Aspect)

```python
def check_aspect(p1_lon, p2_lon, custom_orbs=None):
    diff = abs(p1_lon - p2_lon)
    if diff > 180: diff = 360 - diff

    for asp_name, asp_data in ASPECTS_DEF.items():
        limit = custom_orbs.get(asp_name, asp_data["orb"]) if custom_orbs else asp_data["orb"]
        if abs(diff - asp_data["angle"]) <= limit:
            raw_orb = abs(diff - asp_data["angle"])
            if raw_orb >= 10.0: return None
            return {
                "aspect": asp_name,        # "Conjunction", "Trine"...
                "name_vn": asp_data["name_vn"],
                "orb": raw_orb,            # Sai số (độ)
                "type": asp_data["type"],  # "Hard", "Soft", "Minor"
                "symbol": asp_data["symbol"]
            }
    return None
```

---

## 4. HẰNG SỐ: KÝ HIỆU CUNG, HÀNH TINH, GÓC

### 4.1 Hành tinh — ID trong Swiss Ephemeris

```python
import swisseph as swe

PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY,
    "Venus": swe.VENUS, "Mars": swe.MARS, "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN, "Uranus": swe.URANUS, "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO, "True Node": swe.TRUE_NODE, "Chiron": swe.CHIRON,
    "Lilith": swe.MEAN_APOG
}
```

### 4.2 Ký hiệu hành tinh (Unicode)

```python
PLANET_SYMBOLS = {
    "Sun": "☉",         # U+2609
    "Moon": "☽",        # U+263D
    "Mercury": "☿",     # U+263F
    "Venus": "♀",       # U+2640
    "Mars": "♂",        # U+2642
    "Jupiter": "♃",     # U+2643
    "Saturn": "♄",      # U+2644
    "Uranus": "♅",      # U+2645
    "Neptune": "♆",     # U+2646
    "Pluto": "♇",       # U+2647
    "True Node": "☊",   # U+260A
    "Chiron": "⚷",      # U+26B7
    "Vertex": "Vx",     # Dùng text thay vì Unicode
    "Asc": "AC",        # Dùng text
    "MC": "MC",         # Dùng text
    "Lilith": "⚸",      # U+26B8
    "South Node": "☋"   # U+260B
}
```

### 4.3 Ký hiệu 12 cung hoàng đạo (Unicode)

```python
ZODIAC_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]
# Index:          0     1     2     3     4     5     6     7     8     9     10    11
# Tên:     Bạch Dương Kim Ngưu Song Tử Cự Giải Sư Tử Xử Nữ Thiên Bình Bọ Cạp Nhân Mã Ma Kết Bảo Bình Song Ngư

ZODIAC_NAMES = [
    "Bạch Dương", "Kim Ngưu", "Song Tử", "Cự Giải", "Sư Tử", "Xử Nữ",
    "Thiên Bình", "Bọ Cạp", "Nhân Mã", "Ma Kết", "Bảo Bình", "Song Ngư"
]

ZODIAC_CODES = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"]
```

### 4.4 Định nghĩa góc hợp (Aspects)

```python
ASPECTS_DEF = {
    "Conjunction":  {"angle": 0,   "orb": 10,  "type": "Hard",  "symbol": "☌", "name_vn": "Trùng",       "color": "#000000"},
    "Semisextile":  {"angle": 30,  "orb": 3.0, "type": "Minor", "symbol": "⚺", "name_vn": "Bán Lục Hợp", "color": "#00cc00"},
    "Sextile":      {"angle": 60,  "orb": 6,   "type": "Soft",  "symbol": "⚹", "name_vn": "Lục Hợp",     "color": "#0033ff"},
    "Square":       {"angle": 90,  "orb": 10,  "type": "Hard",  "symbol": "□", "name_vn": "Vuông Góc",   "color": "#ff0000"},
    "Trine":        {"angle": 120, "orb": 10,  "type": "Soft",  "symbol": "△", "name_vn": "Tam Hợp",     "color": "#0033ff"},
    "Quincunx":     {"angle": 150, "orb": 3.0, "type": "Minor", "symbol": "⚻", "name_vn": "Ngũ Chiếu",   "color": "#00cc00"},
    "Opposition":   {"angle": 180, "orb": 10,  "type": "Hard",  "symbol": "☍", "name_vn": "Đối Đỉnh",   "color": "#ff0000"}
}
```

### 4.5 Bảng chủ tinh (Ruler Map)

```python
RULER_MAP = {
    "Bạch Dương": "Mars",    "Kim Ngưu": "Venus",   "Song Tử": "Mercury",
    "Cự Giải": "Moon",       "Sư Tử": "Sun",        "Xử Nữ": "Mercury",
    "Thiên Bình": "Venus",   "Bọ Cạp": "Pluto",     "Nhân Mã": "Jupiter",
    "Ma Kết": "Saturn",      "Bảo Bình": "Uranus",   "Song Ngư": "Neptune"
}
```

### 4.6 Thứ tự hiển thị

```python
# Thứ tự hành tinh chuẩn
PLANET_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]

# Thứ tự đầy đủ (bao gồm điểm ảo)
FULL_OBJECTS_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn",
                      "Uranus", "Neptune", "Pluto", "True Node", "Chiron", "Vertex", "Asc", "MC"]

# Hành tinh Transit (ngoài → trong)
TRANSIT_PLANET_ORDER = ["Pluto", "Neptune", "Uranus", "Saturn", "Jupiter", "Mars", "Venus", "Mercury", "Moon", "Sun"]

# Các góc chính (dùng cho Transit)
MAJOR_ASPECTS = ["Conjunction", "Sextile", "Square", "Trine", "Opposition"]
```

---

## 5. HỆ THỐNG MÀU SẮC (COLOR SYSTEM)

### 5.1 Màu đường Aspect

```python
COLOR_CONJUNCTION = '#000000'  # Đen — Trùng (0°)
COLOR_OPPOSITION  = '#ff0000'  # Đỏ tươi — Đối đỉnh (180°)
COLOR_HARD        = '#ff0000'  # Đỏ tươi — Vuông (90°), Đối đỉnh
COLOR_SOFT        = '#0033ff'  # Xanh dương đậm — Tam hợp (120°), Lục hợp (60°)
COLOR_MINOR       = '#00cc00'  # Xanh lá — Bán lục hợp (30°), Ngũ chiếu (150°)
```

### 5.2 Màu Synastry (Người A/B)

```python
COLOR_A = '#0033ff'  # Xanh dương — Người trong (inner ring)
COLOR_B = '#ff0000'  # Đỏ — Người ngoài (outer ring)
```

### 5.3 Màu nền bản đồ

```python
BG_COLOR_1 = '#fffff0'  # Kem nhạt — Dùng cho: Tâm, Vùng cung hoàng đạo
BG_COLOR_2 = '#ffffff'  # Trắng — Dùng cho: Vùng hành tinh, Vòng ngoài
```

### 5.4 Màu 4 nguyên tố (Element Colors)

```python
COLOR_FIRE  = '#e94031'  # Đỏ cam — Lửa (Bạch Dương, Sư Tử, Nhân Mã)
COLOR_EARTH = '#65c846'  # Xanh lá — Đất (Kim Ngưu, Xử Nữ, Ma Kết)
COLOR_AIR   = '#eeab41'  # Vàng cam — Khí (Song Tử, Thiên Bình, Bảo Bình)
COLOR_WATER = '#2341f2'  # Xanh dương — Nước (Cự Giải, Bọ Cạp, Song Ngư)
```

**Quy tắc gán nguyên tố:** `z_idx % 4` → 0=Fire, 1=Earth, 2=Air, 3=Water

```python
def get_element_color(z_idx):
    rem = z_idx % 4
    if rem == 0: return COLOR_FIRE    # ♈♌♐
    if rem == 1: return COLOR_EARTH   # ♉♍♑
    if rem == 2: return COLOR_AIR     # ♊♎♒
    if rem == 3: return COLOR_WATER   # ♋♏♓
```

### 5.5 Màu nền Grid (Bảng góc hợp)

```python
BG_EMPTY          = '#faf8f0'  # Kem — Ô trống
BG_FILLED          = 'white'   # Trắng — Ô có aspect
BG_HEADER_STD     = '#f3f4f6'  # Xám nhạt — Header hành tinh chính
BG_HEADER_EXT     = '#c5c5c5'  # Xám đậm — Header điểm mở rộng (Node, Chiron...)
BG_GRID_EMPTY_EXT = '#d2c8aa'  # Nâu nhạt — Ô trống vùng mở rộng
BG_GRID_FILLED_EXT= '#f1f1f1'  # Xám sáng — Ô có aspect vùng mở rộng
```

---

## 6. VẼ NATAL CHART (BẢN ĐỒ CÁ NHÂN)

### 6.1 Thiết lập Matplotlib Polar

```python
matplotlib.use('Agg')  # Backend không cần GUI

fig = Figure(figsize=(12, 12), dpi=100)
ax = fig.add_subplot(111, projection='polar')

# Thiết lập hướng:
ax.set_theta_zero_location('E')  # 0° nằm ở bên PHẢI (hướng Đông)
ax.set_theta_direction(1)         # Quay ngược chiều kim đồng hồ (CCW)

# Ẩn lưới và nhãn
ax.grid(False)
ax.set_yticklabels([])
ax.set_xticklabels([])
ax.spines['polar'].set_visible(False)
```

### 6.2 Xoay bản đồ theo Ascendant (QUAN TRỌNG)

**Quy tắc:** ASC luôn nằm ở vị trí 9 giờ (180° hình học = bên trái)

```python
# Mode bình thường: Xoay theo ASC thật
asc_deg = chart_data["angles"]["Asc"]
ax.set_theta_offset(np.deg2rad(180 - asc_deg))

# Mode "Bầu trời hiện tại" (Current Sky): Ép 0° Bạch Dương về 9 giờ
# asc_deg = 0
# ax.set_theta_offset(np.deg2rad(180))
```

**Giải thích công thức:** `set_theta_offset(π - asc_rad)` xoay toàn bộ bản đồ sao cho ASC luôn ở góc 180° (bên trái), giống chuẩn chiêm tinh phương Tây.

### 6.3 Hệ thống bán kính (từ tâm ra ngoài)

```
Tâm (R=0) ───────────────────────────────────────── Ngoài (R=11.5)

R = 0.0    → R_CENTER     : Tâm bản đồ
R = 0.05   → R_CENTER_DOT : Chấm đen ở tâm
R = 1.4    → R_INNER_RING : Vòng tròn nội (chấm chấm)
R = 5.25   → R_ASPECT_TIP : Đầu mút đường aspect (tâm giao nhau)
R = 5.5    → R_MID        : Ranh giới vùng tâm / vùng hành tinh
R = 8.0    → R_PLANET     : Vùng hiển thị hành tinh (= R_ZODIAC_INNER)
R = 8.15   → (trong vòng zodiac): Cạnh trong vùng tô màu nguyên tố
R = 9.35   → (trong vòng zodiac): Cạnh ngoài vùng tô màu nguyên tố
R = 9.5    → R_ZODIAC_OUTER: Viền ngoài vòng cung hoàng đạo
R = 11.5   → R_OUTER      : Viền ngoài cùng bản đồ
```

```
     ┌──────────────── R_OUTER (11.5) ────────────────┐
     │  ┌─────────── R_ZODIAC_OUTER (9.5) ──────────┐ │
     │  │  ┌──── Vùng tô màu element (8.15-9.35) ──┐│ │
     │  │  │  ┌── R_ZODIAC_INNER / R_PLANET (8.0) ─┐││ │
     │  │  │  │  ┌──── R_MID (5.5) ────────────┐   │││ │
     │  │  │  │  │  ┌─ R_ASPECT_TIP (5.25) ──┐ │   │││ │
     │  │  │  │  │  │                          │ │   │││ │
     │  │  │  │  │  │    ĐƯỜNG ASPECT          │ │   │││ │
     │  │  │  │  │  │    (Spindle shapes)      │ │   │││ │
     │  │  │  │  │  └──────────────────────────┘ │   │││ │
     │  │  │  │  │   VẠ́CH NHÀ + SỐ NHÀ           │   │││ │
     │  │  │  │  └───────────────────────────────┘   │││ │
     │  │  │  │      HÀNH TINH (Symbol)              │││ │
     │  │  │  └──────────────────────────────────────┘││ │
     │  │  │        VÙNG TÔ MÀU NGUYÊN TỐ            ││ │
     │  │  └──────────────────────────────────────────┘│ │
     │  │   KÝ HIỆU CUNG HOÀNG ĐẠO (♈♉♊...)         │ │
     │  └──────────────────────────────────────────────┘ │
     │     VÙNG NGOÀI (AC/DC/IC/MC labels, Transit)      │
     └───────────────────────────────────────────────────┘
```

### 6.4 Vẽ nền (Background Rings)

```python
theta = np.linspace(0, 2 * np.pi, 100)

# Tô nền từ tâm ra ngoài
ax.fill_between(theta, 0.0, 5.25, color='#fffff0')    # Vùng tâm (kem)
ax.fill_between(theta, 5.25, 5.5, color='#fffff0')    # Ranh giới
ax.fill_between(theta, 5.5, 8.0, color='#ffffff')     # Vùng hành tinh (trắng)
ax.fill_between(theta, 8.0, 9.5, color='#fffff0')     # Vùng zodiac (kem)
ax.fill_between(theta, 9.5, 11.5, color='#ffffff')    # Vùng ngoài (trắng)

# Vẽ các đường tròn biên
for r in [5.5, 8.0, 8.15, 9.35, 9.5]:
    ax.plot(theta, [r] * 100, color='black', linewidth=0.5)

# Vòng tròn nội (chấm chấm)
ax.plot(theta, [1.4] * 100, color='gray', linewidth=1.0, linestyle=':')

# Chấm đen ở tâm
ax.fill_between(theta, 0, 0.05, color='black')
```

### 6.5 Vẽ 12 cung hoàng đạo (Zodiac Ring)

```python
for i in range(12):
    rad_start = np.deg2rad(i * 30)       # Vạch chia cung (mỗi cung 30°)
    rad_mid = np.deg2rad(i * 30 + 15)    # Điểm giữa cung (đặt symbol)

    # Tô màu nguyên tố
    elem_color = get_element_color(i)     # Fire/Earth/Air/Water
    ax.bar(rad_mid, 9.35 - 8.15, width=np.deg2rad(30), bottom=8.15,
           color=elem_color, edgecolor='none')

    # Vạch chia cung (trắng)
    ax.plot([rad_start, rad_start], [8.0, 9.5], color='white', linewidth=0.5)

    # Symbol cung (♈♉♊...)
    ax.text(rad_mid, (8.0 + 9.5) / 2, ZODIAC_SYMBOLS[i],
            ha='center', va='center', fontsize=25, fontweight='bold', color='#fffff0')
```

### 6.6 Vẽ đỉnh nhà (House Cusps) & Đánh số

```python
cusps = chart_data["cusps"][1:] if len(chart_data["cusps"]) == 13 else chart_data["cusps"]

angle_indices = [0, 3, 6, 9]  # Nhà 1(AC), 4(IC), 7(DC), 10(MC)

for i, deg in enumerate(cusps):
    rad = np.deg2rad(deg)

    if i in angle_indices:
        # TRỤC CHÍNH (AC-IC-DC-MC): Đường đậm từ vòng nội đến vùng hành tinh
        ax.plot([rad, rad], [1.4, 8.0], color='black', linewidth=2.5)

        # Tick nhỏ thò ra ngoài vòng zodiac
        ax.plot([rad, rad], [9.5, 9.7], color='black', linewidth=1.5)

        # Nhãn AC/IC/DC/MC (bên ngoài vòng zodiac)
        label_txt = ["AC", "IC", "DC", "MC"][i // 3]
        ax.text(rad, 9.5 + 1, label_txt, ha='center', va='center',
                fontsize=20, fontweight='bold', color='black')
    else:
        # NHÀ PHỤ: Đường mảnh từ vùng giữa đến vùng hành tinh
        ax.plot([rad, rad], [5.5, 8.0], color='black', linewidth=0.5)

    # SỐ NHÀ (đặt ở giữa mỗi nhà)
    next_deg = cusps[(i + 1) % 12]
    mid = (deg + next_deg) / 2 if next_deg > deg else (deg + next_deg + 360) / 2
    ax.text(np.deg2rad(mid), 5.5 + 0.35, str(i + 1),
            fontsize=10, fontweight='bold', color='gray', ha='center')
```

**Quy tắc trục:**
| Index nhà | Trục   | Công thức                                |
|-----------|--------|------------------------------------------|
| 0         | AC     | `cusps[0]` (= Ascendant)                |
| 3         | IC     | `cusps[3]` (đỉnh nhà 4)                 |
| 6         | DC     | `cusps[6]` (= AC + 180°, đỉnh nhà 7)   |
| 9         | MC     | `cusps[9]` (đỉnh nhà 10)                |

### 6.7 Vẽ hành tinh (Planets)

```python
# 1. Chuẩn bị danh sách hành tinh
p_list = []
for p_name, info in chart_data["planets"].items():
    if p_name not in PLANET_SYMBOLS: continue
    if p_name in ['Asc', 'MC', 'Lilith']: continue  # Bỏ qua các điểm không vẽ
    p_list.append({'name': p_name, 'lon': info['lon'], 'sym': PLANET_SYMBOLS[p_name]})

# 2. Tối ưu vị trí (tránh chồng chéo) — Xem mục 11
lanes_natal = [7.3, 6.2]  # 2 vòng hiển thị (gần vòng zodiac, xa vòng zodiac)
optimized = optimize_planet_positions_by_house(p_list, cusps, lanes=lanes_natal)

# 3. Vẽ từng hành tinh
for p in optimized:
    true_rad = np.deg2rad(p['lon'])       # Vị trí thật (ecliptic)
    disp_rad = np.deg2rad(p['disp_lon'])  # Vị trí hiển thị (đã dàn đều)
    r_pos = p['disp_r']                    # Bán kính hiển thị (lane)

    # Vạch đánh dấu vị trí thật (2 gạch xanh ở biên vùng MID và PLANET)
    ax.plot([true_rad, true_rad], [5.5, 5.3], color='blue', linewidth=1.5)
    ax.plot([true_rad, true_rad], [8.0, 7.8], color='blue', linewidth=1.5)

    # Ký hiệu hành tinh
    f_size = 20
    if p['name'] in ["Vertex", "Chiron", "True Node", "Lilith"]:
        f_size = 14  # Nhỏ hơn cho điểm phụ
    ax.text(disp_rad, r_pos, p['sym'],
            fontsize=f_size, fontweight='bold', color='black', ha='center', va='center')
```

### 6.8 Vẽ đường Aspect (Aspect Lines)

```python
NON_PLANETS = ["Asc", "MC", "True Node", "Chiron", "Lilith", "Vertex"]
all_objs = {k: v['lon'] for k, v in chart_data["planets"].items() if k in PLANET_SYMBOLS}
keys = list(all_objs.keys())

for i in range(len(keys)):
    for j in range(i + 1, len(keys)):
        p1, p2 = keys[i], keys[j]
        if p1 in NON_PLANETS or p2 in NON_PLANETS: continue  # Chỉ vẽ giữa hành tinh thật

        asp = check_aspect(all_objs[p1], all_objs[p2])
        if not asp: continue

        r1 = np.deg2rad(all_objs[p1])
        r2 = np.deg2rad(all_objs[p2])

        # Chọn màu
        if asp['aspect'] == 'Conjunction':   col = '#000000'  # Đen
        elif asp['aspect'] == 'Opposition':  col = '#ff0000'  # Đỏ
        elif asp['type'] == 'Hard':          col = '#ff0000'  # Đỏ
        elif asp['type'] == 'Minor':         col = '#00cc00'  # Xanh lá
        else:                                col = '#0033ff'  # Xanh dương

        # Vẽ
        if asp['aspect'] == 'Conjunction':
            # CONJUNCTION: Vẽ đường thẳng có viền đen
            lw = 4.0 if asp['orb'] < 2 else 2.0
            alpha = 0.8 if asp['orb'] < 3 else 0.4
            ax.plot([r1, r2], [5.25, 5.25], color='black', linewidth=lw + 1.5, alpha=alpha)
            ax.plot([r1, r2], [5.25, 5.25], color=col, linewidth=lw, alpha=alpha)
        else:
            # CÁC GÓC KHÁC: Vẽ hình thoi "thanh kiếm" (Spindle)
            max_orb = ASPECTS_DEF[asp['aspect']]['orb']
            orb_ratio = max(0, 1.0 - (asp['orb'] / max_orb))
            alpha = 0.4 + 0.4 * orb_ratio  # Orb nhỏ → đậm hơn
            draw_spindle(ax, r1, r2, 5.25, col, max_width=0.25, alpha=alpha, orb_ratio=orb_ratio)
```

### 6.9 Xuất ảnh

```python
output = io.BytesIO()
FigureCanvas(fig).print_png(output)
base64_img = base64.b64encode(output.getvalue()).decode('utf-8')

# Sử dụng trong HTML:
# <img src="data:image/png;base64,{{ chart_img }}" />
```

---

## 7. VẼ SYNASTRY CHART (BẢN ĐỒ TƯƠNG HỢP)

### 7.1 Cấu trúc vòng tròn Synastry

```
R = 0.0  → Tâm
R = 4.0  → R_CENTER    : Ranh giới vùng Aspect / vùng người A
R = 6.0  → R_A_OUT     : Ranh giới vùng người A / vùng người B
R = 8.0  → R_B_OUT     : Ranh giới vùng người B / vùng Zodiac
R = 9.5  → R_ZODIAC_OUTER
R = 11.5 → R_OUTER
```

```
     Vòng ngoài: ZODIAC + Labels (AC/IC/DC/MC)
     Vòng giữa ngoài: HÀNH TINH NGƯỜI B (đỏ, lane 7.4 / 6.6)
     Vòng giữa trong: HÀNH TINH NGƯỜI A (xanh, lane 5.4 / 4.6)
     Vòng trong: ĐƯỜNG ASPECT (Spindle tới R_CENTER = 4.0)
```

### 7.2 Khác biệt với Natal

1. **Xoay theo ASC người A**: `offset = 180 - cA["angles"]["Asc"]`
2. **2 lớp đỉnh nhà riêng biệt:**
   - Người A: Vạch từ `R_CENTER(4.0)` đến `R_A_OUT(6.0)`, màu xanh
   - Người B: Vạch từ `R_A_OUT(6.0)` đến `R_B_OUT(8.0)`, màu đỏ
3. **Aspect vẽ chéo giữa 2 người** (pA ↔ pB, không phải nội bộ)
4. **Orb chặt hơn** cho chart synastry:

```python
SYNASTRY_CHART_ORBS = {
    "Conjunction": 5.0, "Opposition": 5.0, "Square": 5.0,
    "Trine": 5.0, "Sextile": 3.0, "Semisextile": 1.5, "Quincunx": 1.5
}
```

5. **Aspect lines** giao nhau tại `R_CENTER = 4.0` (thay vì 5.25 như natal)

### 7.3 Số nhà hiển thị

```python
# Người A: Số nhà ghi gần R_CENTER (bên trong)
ax.text(num_rad, R_CENTER + 0.25, str(i + 1), fontsize=9, color=COLOR_A)

# Người B: Số nhà ghi gần R_B_OUT (bên ngoài)
ax.text(num_rad, R_B_OUT - 0.25, str(i + 1), fontsize=9, color=COLOR_B)
```

---

## 8. VẼ TRANSIT CHART (BẢN ĐỒ VẬN HẠN)

### 8.1 Transit overlay trên Natal (Mode 'single')

Transit hiển thị **bên ngoài vòng zodiac** với màu xanh lá (`COLOR_MINOR = '#00cc00'`).

```python
R_ROOT_BASE = 9.5       # Gốc tick (= R_ZODIAC_OUTER)
R_ROOT_TIP  = 10.0      # Đầu tick (+0.5)
R_TEXT_POS  = 11.0       # Vị trí text (+1.5 từ zodiac)

# Mỗi hành tinh transit:
# 1. Vạch tick từ vòng zodiac ra ngoài (màu xanh lá, dày)
ax.plot([true_rad, true_rad], [R_ROOT_BASE, R_ROOT_TIP], color='#00cc00', linewidth=2.0)

# 2. Đường dẫn chấm chấm (nếu bị dịch vị trí)
ax.plot([true_rad, disp_rad], [R_ROOT_TIP, R_TEXT_POS - 0.3], color='#00cc00', linewidth=0.5, linestyle=':')

# 3. Symbol hành tinh (màu xanh lá)
ax.text(disp_rad, R_TEXT_POS, sym, fontsize=20, fontweight='bold', color='#00cc00')
```

### 8.2 Transit overlay (Mode 'outer_cycle')

Hiển thị chu kỳ hành tinh ngoài dưới dạng **cung tròn phân lane** bên ngoài bản đồ.

```python
LANE_BASE_R = 12.0    # Bắt đầu lane (sau vùng text)
LANE_HEIGHT = 0.5     # Chiều cao mỗi lane

# Thuật toán phân lane (tránh chồng cung):
# 1. Sắp xếp hành tinh theo chiều dài cung (dài nhất trước)
# 2. Với mỗi hành tinh, thử đặt vào lane đầu tiên không bị collision
# 3. Nếu tất cả lane đều collision → tạo lane mới

# Vẽ mỗi cung:
ax.bar(start_rad + width/2, 0.05, width=width, bottom=r_lane, color='#00cc00')

# Tick đánh dấu vị trí A (đầu kỳ) và B (cuối kỳ):
ax.plot([rad_A, rad_A], [r_lane, r_lane - 0.2], color='#00cc00', linewidth=0.8)
```

### 8.3 Transit Chart riêng biệt (transit_chart.py)

Biểu đồ transit riêng với natal ở vòng trong, transit ở vòng ngoài:

```python
# Bán kính:
R_INNER = 6.0          # Ranh giới vùng natal
R_PLANET = 8.0         # Vùng hành tinh natal
R_ZODIAC_OUTER = 9.5   # Viền zodiac

# Transit:
R_TRANS_TICK_START = 9.5       # Gốc tick
R_TRANS_TICK_END = 10.0        # Đầu tick
R_TRANS_TEXT = 11.0            # Vị trí symbol

COLOR_TRANSIT = '#00cc00'      # Xanh lá
```

---

## 9. VẼ ASPECT GRID (BẢNG GÓC HỢP)

### 9.1 Tổng quan

Grid dùng **Matplotlib axes thường** (không phải polar). Mỗi ô là 1 hình vuông 1×1 unit.

### 9.2 Cấu hình kích thước

```python
DPI = 100
UNIT_INCH = 0.6      # Mỗi ô = 0.6 inch
FONT_SYM = 26        # Cỡ chữ ký hiệu aspect
FONT_HEADER = 12     # Cỡ chữ header
FONT_PLANET = 21     # Cỡ chữ ký hiệu hành tinh
```

### 9.3 Grid Natal (Tam giác dưới)

```
Layout (15 hành tinh):
          Cột Header (2 cột) | Cột Grid (tam giác dưới)

Hàng 0:  [Count] [☉]        | [☉]
Hàng 1:  [Count] [☽]        | [asp] [☽]
Hàng 2:  [Count] [☿]        | [asp] [asp] [☿]
...
Hàng 14: [Count] [MC]        | [asp] [asp] ... [MC]
```

- **Cột 0**: Số lượng aspect (chỉ hành tinh chính, bỏ Minor)
- **Cột 1**: Ký hiệu hành tinh
- **Cột 2+**: Grid tam giác — đường chéo là ký hiệu hành tinh, dưới đường chéo là aspect

### 9.4 Grid Synastry (Ma trận đầy đủ)

```
Layout:
          5 cột header trái     |  N cột cho Người B

Hàng 0-3: (Header dọc cho B)   |  [Zodiac] [Degree] [Score] [Symbol]
Hàng 4+:  [Name][Zodiac][Deg][Score][Symbol] | [asp] [asp] [asp] ...
          ←── Người A ──→       ←── Người B ──→
```

### 9.5 Vẽ từng ô (draw_cell)

```python
def draw_cell(ax, x, y, text=None, sub_text_tr=None, sub_text_bl=None,
              bg_color='white', border_style='normal', text_color='black',
              font_size=12, is_bold=False, draw_sextile_manual=False,
              custom_symbol=None, text_scale=1.0, text_stroke_width=None):

    GAP = 0.04
    SQUARE_SIZE = 1.0 - 2 * GAP

    # Vẽ hình vuông nền
    rect = patches.Rectangle((x + GAP, y + GAP), SQUARE_SIZE, SQUARE_SIZE,
                             linewidth=lw, edgecolor=ec, facecolor=bg_color)
    ax.add_patch(rect)

    # Nội dung ô: Text hoặc Symbol đặc biệt
    # - "□" → Vẽ hình vuông (Square aspect)
    # - "△" → Vẽ tam giác (Trine aspect)
    # - "⚹" → Vẽ thủ công hình hoa thị 6 cánh (Sextile)
    # - "⚺" / "⚻" → Vẽ thủ công Semisextile/Quincunx

    # sub_text_tr: Góc phải trên (orb tròn, vd "3")
    # sub_text_bl: Góc trái dưới (orb chính xác, vd "2°45'")
```

### 9.6 Vẽ Symbol Sextile thủ công (⚹)

Sextile không dùng text font mà vẽ thủ công bằng 3 đường thẳng giao nhau (hình hoa thị):

```python
# Trong polar chart (natal/synastry) — hàm nằm trong draw_cell:
cx, cy = x + 0.5, y + 0.5
r = 0.12
# Đường dọc
ax.plot([cx, cx], [cy - r, cy + r], color=color, linewidth=1.2)
# Đường chéo 60°
dx = r * 0.866; dy = r * 0.5
ax.plot([cx - dx, cx + dx], [cy - dy, cy + dy], color=color, linewidth=1.2)
ax.plot([cx - dx, cx + dx], [cy + dy, cy - dy], color=color, linewidth=1.2)
```

### 9.7 Vẽ Symbol Semisextile (⚺) và Quincunx (⚻) thủ công

```python
# Semisextile (⚺): Tam giác đỉnh dưới + gạch ngang dưới
# Gạch ngang ở dưới
ax.add_line(Line2D([x_left, x_right], [y_base, y_base], color=color, linewidth=2))
# Hai cạnh tam giác hướng lên
ax.add_line(Line2D([cx, x_left], [y_base, y_top], color=color, linewidth=2))
ax.add_line(Line2D([cx, x_right], [y_base, y_top], color=color, linewidth=2))

# Quincunx (⚻): Ngược lại — Gạch ngang ở trên + tam giác hướng xuống
ax.add_line(Line2D([x_left, x_right], [y_bar, y_bar], color=color, linewidth=2))
ax.add_line(Line2D([cx, x_left], [y_bar, y_bottom], color=color, linewidth=2))
ax.add_line(Line2D([cx, x_right], [y_bar, y_bottom], color=color, linewidth=2))
```

### 9.8 Border styles theo orb

```python
# Orb < 1°  → 'bold' (viền đen dày 2.5px)
# Orb > 6.5° → 'dashed' (viền chấm chấm)
# Còn lại   → 'normal' (viền xám mảnh)

# Synastry có thêm:
# 'blue_bold'      → Viền xanh dày (hành tinh trội A)
# 'red_bold'       → Viền đỏ dày (hành tinh trội B)
# 'blue_bold_soft' → Viền xanh nhạt (hành tinh phụ A)
# 'red_bold_soft'  → Viền đỏ nhạt (hành tinh phụ B)
```

---

## 10. VẼ TIMELINE (BIỂU ĐỒ VẬN HẠN CHI TIẾT)

### 10.1 Tổng quan

Timeline là biểu đồ **tuyến tính ngang** (không phải tròn), hiển thị:
- Trục thời gian ngang ở trên
- Các dòng vận hạn dưới, mỗi dòng = 1 sự kiện chiêm tinh

### 10.2 Cấu trúc dữ liệu

```python
rows_data = [
    {"type": "separator", "label": "NHÀ 1"},       # Tiêu đề nhóm nhà
    {"type": "house_entry", "full_label": "♄=H1",   # Hành tinh transit vào nhà
     "periods": [
         {"start": date, "end": date, "exacts": [date, ...],
          "is_clamped_start": bool, "is_clamped_end": bool, "type": "entry"}
     ]},
    {"type": "aspect", "full_label": "♇☌☉",         # Góc hợp transit
     "periods": [
         {"start": date, "end": date, "exacts": [date, ...],
          "is_clamped_start": bool, "is_clamped_end": bool,
          "has_early_e": bool, "has_late_e": bool, "type": "aspect"}
     ]}
]
```

### 10.3 Cách vẽ

```python
# Tỷ lệ X: ngày → tọa độ [0, 1]
def get_x(dt_obj):
    return (dt_obj - start_date).days / total_days

# TRỤC THỜI GIAN CHÍNH (y = 0)
ax.plot([0, 1.02], [0, 0], color='black', lw=3.5)
ax.annotate('', xy=(1.04, 0), xytext=(1.02, 0),
            arrowprops=dict(arrowstyle='->', color='black', lw=3.5))

# Mốc tháng (vạch đứng + nhãn ngày/tháng)
ax.plot([x, x], [-0.12, 0.12], color='black', lw=2)
ax.text(x, -0.2, f"{day}/{month}", fontsize=11, fontweight='black')

# MỖI DÒNG DỮ LIỆU:
# 1. Nhãn (symbol hành tinh + aspect + hành tinh natal)
ax.text(label_x, y, full_txt, fontsize=18, ha='right')

# 2. Mũi tên thời gian (--- →)
ax.annotate('', xy=(x2, y), xytext=(x1, y),
            arrowprops=dict(arrowstyle='->', color='#888888', ls='--', lw=1.5))

# 3. Vạch đầu mút (màu xanh lá cho House Entry, xám cho Aspect)
bar_color = '#00cc00' if row["type"] == "house_entry" else 'gray'
ax.plot([x, x], [y - 0.15, y + 0.15], color=bar_color, lw=4)

# 4. Đường dóng xuống từ trục thời gian (chấm chấm xanh)
ax.plot([x, x], [0, y], color='blue', ls=':', lw=0.7, alpha=0.4)

# 5. Điểm Exact (E) — chữ "E" đỏ + đường đỏ nét đứt
ax.plot([xe, xe], [0, y], color='red', ls='--', lw=0.8, alpha=0.8)
ax.text(xe, y, 'E', color='red', fontweight='black', fontsize=10)
```

### 10.4 Khoảng cách dòng

```python
ROW_HEIGHT = 0.7       # Khoảng cách dòng thường
EXTRA_HOUSE_GAP = 0.5  # Gap thêm giữa các nhóm nhà
```

---

## 11. THUẬT TOÁN TỐI ƯU VỊ TRÍ HÀNH TINH

### 11.1 Vấn đề

Nhiều hành tinh có thể có kinh độ ecliptic gần nhau → symbol chồng chéo.

### 11.2 Giải pháp: Phân theo nhà, xếp 2 vòng (lane)

```python
def optimize_planet_positions_by_house(planets, cusps, lanes):
    """
    Tham số:
      - planets: [{'name': str, 'lon': float, 'sym': str}, ...]
      - cusps: list 12 giá trị đỉnh nhà
      - lanes: [r_outer, r_inner] — bán kính 2 vòng hiển thị

    Kết quả: Mỗi planet được thêm 'disp_lon' (vị trí hiển thị) và 'disp_r' (bán kính lane)
    """
```

**Thuật toán:**

1. **Phân nhóm theo nhà**: Mỗi hành tinh được gán vào nhà chứa nó
2. **Sắp xếp trong nhà**: Theo khoảng cách từ đỉnh nhà (tăng dần)
3. **Phân lane xen kẽ**: Hành tinh chẵn → lane 0 (ngoài), lẻ → lane 1 (trong)
4. **Dàn đều trong nhà** (2 pass):
   - Forward pass: Đảm bảo khoảng cách tối thiểu `MIN_DIST = 5°`
   - Backward pass: Đảm bảo không vượt biên nhà, buffer = `2°` từ mỗi đỉnh

```python
BUFFER = 2.0     # Khoảng cách tối thiểu từ đỉnh nhà
MIN_DIST = 5.0   # Khoảng cách tối thiểu giữa 2 hành tinh cùng lane

# Forward pass: Đẩy ra xa nếu quá gần
for i in range(len(positions)):
    if i == 0:
        if positions[i] < BUFFER: positions[i] = BUFFER
    else:
        if positions[i] < positions[i-1] + MIN_DIST:
            positions[i] = positions[i-1] + MIN_DIST

# Backward pass: Kéo lại nếu vượt biên nhà
for i in range(len(positions) - 1, -1, -1):
    limit = house_width - BUFFER
    if positions[i] > limit: positions[i] = limit
    if i < len(positions) - 1:
        if positions[i] > positions[i+1] - MIN_DIST:
            positions[i] = positions[i+1] - MIN_DIST
```

### 11.3 Giá trị lane cho từng loại chart

| Chart        | Lane ngoài | Lane trong | Ghi chú                    |
|-------------|-----------|-----------|----------------------------|
| Natal       | 7.3       | 6.2       | Vùng giữa R_MID và R_PLANET |
| Synastry A  | 5.4       | 4.6       | Vòng trong (xanh)          |
| Synastry B  | 7.4       | 6.6       | Vòng ngoài (đỏ)            |
| Transit     | R_TEXT    | —         | Chỉ 1 lane                 |

---

## 12. THUẬT TOÁN VẼ ĐƯỜNG ASPECT (SPINDLE)

### 12.1 Mô tả

Aspect lines không phải đường thẳng đơn giản mà là hình **"thanh kiếm"** (spindle): thuôn nhọn ở 2 đầu, phình ở thân giữa.

### 12.2 Thuật toán

```python
def draw_spindle(ax, theta1, theta2, radius, color, max_width=0.15, alpha=0.6, orb_ratio=1.0):
    """
    Vẽ hình thoi trên polar chart.

    Tham số:
      - theta1, theta2: Góc radian của 2 hành tinh
      - radius: Bán kính vẽ (= R_ASPECT_TIP = 5.25 cho Natal)
      - color: Màu sắc
      - max_width: Độ rộng tối đa ở giữa
      - alpha: Độ trong suốt
      - orb_ratio: 0.0 (orb lớn, mảnh) → 1.0 (orb nhỏ, dày)
    """
    # 1. Chuyển polar → cartesian
    x1 = radius * cos(theta1); y1 = radius * sin(theta1)
    x2 = radius * cos(theta2); y2 = radius * sin(theta2)

    # 2. Tính vector pháp tuyến
    dx, dy = x2 - x1, y2 - y1
    length = sqrt(dx*dx + dy*dy)
    nx, ny = -dy/length, dx/length  # Vuông góc

    # 3. Tính độ rộng dựa trên orb_ratio
    width = max_width * (0.3 + 0.7 * orb_ratio)
    half_w = width / 2.0

    # 4. Tạo 6 đỉnh hình thoi (taper_ratio = 5% ở mỗi đầu)
    taper = 0.05
    #   Đỉnh 1: điểm nhọn đầu 1 (theta1)
    #   Đỉnh 2-3: cạnh rộng gần đầu 1
    #   Đỉnh 4: điểm nhọn đầu 2 (theta2)
    #   Đỉnh 5-6: cạnh rộng gần đầu 2

    # 5. Chuyển cartesian → polar và vẽ Polygon
    poly = patches.Polygon(verts, closed=True,
                          facecolor=color, edgecolor='black',
                          linewidth=0.6, alpha=alpha, zorder=3)
    ax.add_patch(poly)
```

### 12.3 Quy tắc alpha (độ trong suốt) theo orb

```python
# Orb nhỏ → đậm, orb lớn → mờ
orb_ratio = 1.0 - (orb / max_orb)  # 0.0 (xa) → 1.0 (gần exact)
alpha = 0.4 + 0.4 * orb_ratio      # Khoảng 0.4 → 0.8
```

---

## 13. CẤU TRÚC DỮ LIỆU CHART_DATA

### 13.1 Output từ `calculate_chart()`

```json
{
    "jd": 2460000.5,
    "cusps": [30.5, 55.2, 80.1, 110.3, 140.5, 170.2, 210.5, 235.2, 260.1, 290.3, 320.5, 350.2],
    "angles": {
        "Asc": 30.5,
        "MC": 290.3,
        "Vertex": 195.7
    },
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
    "meta": {
        "lat": 21.028511,
        "lon": 105.854161,
        "tz": "Asia/Ho_Chi_Minh",
        "offset_used": 7.0
    }
}
```

### 13.2 Ghi chú quan trọng về cusps

- `swe.houses()` trả về tuple 12 phần tử (index 0-11 = nhà 1-12)
- Một số trường hợp cusps có 13 phần tử (index 0 = padding) → cần cắt: `cusps[1:]`
- Luôn kiểm tra: `if len(cusps) == 13: cusps = cusps[1:]`

---

## 14. LUỒNG HOẠT ĐỘNG END-TO-END

### 14.1 Natal Chart

```
User nhập: Tên, Ngày sinh, Giờ sinh, Địa điểm
         ↓
[API: /api/search-location] → Nominatim geocoding → {lat, lon, tz}
         ↓
[Backend: calculate_chart(dob, tob, lat, lon, tz)]
    → Swiss Ephemeris: swe.houses() + swe.calc_ut()
    → chart_data = {cusps, angles, planets, info, meta}
         ↓
[Drawing: create_natal_chart_image(chart_data, name)]
    → Matplotlib polar chart
    → Base64 PNG
         ↓
[Template: natal.html] → <img src="data:image/png;base64,{chart_img}">
```

### 14.2 Synastry Chart

```
User chọn: Người A + Người B
         ↓
[Backend: calculate_chart() × 2] → cA, cB
         ↓
[Drawing: create_synastry_chart_image(cA, cB, nameA, nameB)]
         ↓
[Drawing: draw_aspect_grid_image(cA, cB, is_synastry=True)]
         ↓
[Template: synastry.html] → Chart tròn + Grid bảng
```

### 14.3 Transit (Vận hạn)

```
User chọn: Profile + Ngày transit
         ↓
[Backend: calculate_chart() cho natal + calculate_chart() cho ngày transit]
         ↓
[Drawing: create_natal_chart_image(natal, name, transit_data=transit, transit_mode='single')]
         ↓
hoặc
         ↓
[Drawing: create_detailed_timeline_image(natal, start_date, end_date, house_list)]
    → Quét: scan_house_transits_in_range()
    → Tính: find_exact_aspect_times()
    → Vẽ timeline tuyến tính
```

### 14.4 API Endpoints tham khảo

| Endpoint                 | Method | Mô tả                              |
|--------------------------|--------|--------------------------------------|
| `/api/search-location`   | GET    | Tìm kiếm địa điểm (Nominatim)      |
| `/api/tra-goc-transit`   | POST   | Tính thời điểm exact aspect          |
| `/api/tra-hoi-vi`        | POST   | Tính Return (hồi vị hành tinh)      |
| `/api/tra-nha-transit`   | POST   | Tính hành tinh transit qua nhà      |
| `/api/planet-data`       | GET    | Dữ liệu hành tinh (Google Sheets)   |
| `/api/planet-images`     | GET    | Ảnh minh họa (Google Drive)          |

---

## PHỤ LỤC: CODE MẪU TỐI THIỂU

```python
"""
Ví dụ tối thiểu: Tính toán + vẽ Natal Chart
"""
import swisseph as swe
import numpy as np
import io, base64
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# 1. SETUP
swe.set_ephe_path('/path/to/ephe/')

# 2. TÍNH TOÁN
dob = "15/03/1990"
tob = "08:30"
lat, lon = 21.028511, 105.854161
tz = "Asia/Ho_Chi_Minh"

dt_local = datetime.strptime(f"{dob} {tob}", "%d/%m/%Y %H:%M")
tz_info = ZoneInfo(tz)
dt_aware = dt_local.replace(tzinfo=tz_info)
offset = dt_aware.utcoffset().total_seconds() / 3600.0
dt_utc = dt_local - timedelta(hours=offset)
jd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, dt_utc.hour + dt_utc.minute / 60.0)

cusps, ascmc = swe.houses(jd, lat, lon, b'P')
asc_deg = ascmc[0]

PLANET_IDS = {"Sun": swe.SUN, "Moon": swe.MOON, "Mercury": swe.MERCURY,
              "Venus": swe.VENUS, "Mars": swe.MARS}
planets = {}
for name, pid in PLANET_IDS.items():
    res = swe.calc_ut(jd, pid, swe.FLG_SWIEPH | swe.FLG_SPEED)
    planets[name] = res[0][0]

# 3. VẼ
fig = Figure(figsize=(12, 12), dpi=100)
ax = fig.add_subplot(111, projection='polar')
ax.set_theta_zero_location('E')
ax.set_theta_direction(1)
ax.set_theta_offset(np.deg2rad(180 - asc_deg))
ax.grid(False); ax.set_yticklabels([]); ax.set_xticklabels([])
ax.spines['polar'].set_visible(False)

# Nền
theta = np.linspace(0, 2 * np.pi, 100)
ax.fill_between(theta, 0, 5.5, color='#fffff0')
ax.fill_between(theta, 5.5, 8.0, color='#ffffff')
ax.fill_between(theta, 8.0, 9.5, color='#fffff0')

# Zodiac
ZODIAC_SYM = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]
ELEM_COLORS = ['#e94031','#65c846','#eeab41','#2341f2']
for i in range(12):
    rad_mid = np.deg2rad(i * 30 + 15)
    ax.bar(rad_mid, 1.2, width=np.deg2rad(30), bottom=8.15, color=ELEM_COLORS[i%4], edgecolor='none')
    ax.text(rad_mid, 8.75, ZODIAC_SYM[i], ha='center', va='center', fontsize=25, fontweight='bold', color='#fffff0')

# Hành tinh
P_SYM = {"Sun":"☉","Moon":"☽","Mercury":"☿","Venus":"♀","Mars":"♂"}
for name, lon_val in planets.items():
    rad = np.deg2rad(lon_val)
    ax.text(rad, 7.0, P_SYM[name], fontsize=20, fontweight='bold', ha='center', va='center')

# Xuất
output = io.BytesIO()
FigureCanvas(fig).print_png(output)
img_b64 = base64.b64encode(output.getvalue()).decode('utf-8')
print(f"<img src='data:image/png;base64,{img_b64}' />")
```

---

> **Tài liệu này được trích xuất ngày 2026-04-09 từ dự án `/root/astro_project`.**
