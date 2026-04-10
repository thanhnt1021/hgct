# Thuật Toán Sắp Xếp Ký Hiệu Hành Tinh Trong Vòng Tròn Chart

> File này mô tả **chi tiết toàn bộ cơ chế** đảm bảo các symbol hành tinh (☉☽☿♀♂♃♄♅♆♇☊⚷) **KHÔNG BAO GIỜ bị đè chồng lên nhau** trong mọi loại biểu đồ tròn (Natal, Synastry, Transit, Transit Đại Hạn Tương Lai).

---

## MỤC LỤC

1. [Tổng Quan Vấn Đề](#1-tổng-quan-vấn-đề)
2. [Hàm Lõi: `optimize_planet_positions_by_house()`](#2-hàm-lõi-optimize_planet_positions_by_house)
3. [Hệ Thống 2-Lane (Vòng Trong / Vòng Ngoài)](#3-hệ-thống-2-lane-vòng-trong--vòng-ngoài)
4. [Thuật Toán Forward-Backward Pass](#4-thuật-toán-forward-backward-pass)
5. [Áp Dụng Cho Natal Chart](#5-áp-dụng-cho-natal-chart)
6. [Áp Dụng Cho Synastry Chart](#6-áp-dụng-cho-synastry-chart)
7. [Áp Dụng Cho Transit Single](#7-áp-dụng-cho-transit-single)
8. [Transit Đại Hạn Tương Lai (Outer Cycle) — PHẦN QUAN TRỌNG NHẤT](#8-transit-đại-hạn-tương-lai-outer-cycle)
9. [Vạch Nối (Tick Lines) — Liên Kết Vị Trí Thật ↔ Vị Trí Hiển Thị](#9-vạch-nối-tick-lines)
10. [Tham Số Cấu Hình](#10-tham-số-cấu-hình)

---

## 1. Tổng Quan Vấn Đề

Trong biểu đồ chiêm tinh tròn (polar chart), mỗi hành tinh được đặt tại **vị trí kinh độ ecliptic thật** (0°–360°) trên vòng tròn. Vấn đề xảy ra khi:

- **Nhiều hành tinh tụ gần nhau** (ví dụ: Mercury ☿ ở 15° Aries, Venus ♀ ở 17° Aries, Sun ☉ ở 18° Aries) → 3 symbol chồng lên nhau thành 1 cục không đọc được
- **Conjunction chặt** (orb < 3°) → 2 hành tinh gần như cùng vị trí
- **Stellium** (4+ hành tinh trong 1 cung) → cả nhóm đều bị chèn

**Giải pháp của hệ thống:** Kết hợp 3 kỹ thuật:
1. **Phân nhóm theo Nhà (House Grouping)** — giới hạn phạm vi dịch chuyển
2. **Hệ thống 2-Lane** — xen kẽ vòng trong/ngoài
3. **Forward-Backward Pass** — đẩy ra rồi kéo lại để phân bố đều

---

## 2. Hàm Lõi: `optimize_planet_positions_by_house()`

**File:** `app/utils/drawing/helpers.py:13`

```python
def optimize_planet_positions_by_house(planets, cusps, lanes):
```

### Tham số đầu vào

| Tham số | Kiểu | Ý nghĩa |
|---|---|---|
| `planets` | `list[dict]` | Danh sách hành tinh, mỗi item có `{'name': str, 'lon': float, 'sym': str}` |
| `cusps` | `list[float]` | 12 đỉnh nhà (House cusps) — kinh độ ecliptic, hoặc cusps giả `[0, 30, 60, ...]` |
| `lanes` | `list[float]` | Bán kính của các vòng hiển thị, ví dụ `[7.3, 6.2]` nghĩa là lane ngoài ở R=7.3, lane trong ở R=6.2 |

### Kết quả đầu ra

Mỗi hành tinh trong `planets` được bổ sung 2 thuộc tính mới:
- **`disp_lon`** (float): Vị trí hiển thị trên vòng tròn (có thể khác `lon` thật nếu bị dịch chuyển)
- **`disp_r`** (float): Bán kính hiển thị (lane nào: trong hay ngoài)

---

## 3. Hệ Thống 2-Lane (Vòng Trong / Vòng Ngoài)

### Ý tưởng

Thay vì đặt tất cả hành tinh trên **1 vòng tròn**, chia thành **2 vòng tròn đồng tâm** (2 lane). Hành tinh xen kẽ giữa lane ngoài và lane trong:

```
     Zodiac Ring (R=8.0–9.5)
     ─────────────────────────
     ☉ ← Lane ngoài (R=7.3)     ← hành tinh thứ 1
       ☽ ← Lane trong (R=6.2)   ← hành tinh thứ 2
     ☿ ← Lane ngoài (R=7.3)     ← hành tinh thứ 3
       ♀ ← Lane trong (R=6.2)   ← hành tinh thứ 4
     ─────────────────────────
     House Cusps (R=5.5)
```

### Cách phân lane

Trong mỗi nhà (house), hành tinh được sắp theo thứ tự khoảng cách từ đỉnh nhà:

```python
# Hành tinh có index chẵn → Lane ngoài (lanes[0])
# Hành tinh có index lẻ  → Lane trong (lanes[1])
for idx, p in enumerate(group):
    target_lane = 0 if (idx % 2 == 0) else 1
    p['disp_r'] = lanes[target_lane]
```

**Kết quả:** Ngay cả khi 2 hành tinh ở cùng kinh độ (ví dụ conjunction 0°), chúng sẽ nằm trên **2 vòng tròn khác bán kính**, nên không thể chồng lên nhau theo hướng bán kính.

### Giá trị lane theo từng loại chart

| Loại Chart | Lane ngoài | Lane trong | Ghi chú |
|---|---|---|---|
| **Natal** | R=7.3 | R=6.2 | Giữa vùng House Cusps và Zodiac |
| **Synastry A** | R=5.4 | R=4.6 | Vòng bên trong (xanh) |
| **Synastry B** | R=7.4 | R=6.6 | Vòng bên ngoài (đỏ) |
| **Transit Single** | R_TEXT | — | Chỉ 1 lane (ngoài Zodiac) |
| **Transit Đại Hạn** | R_TRANSIT_TEXT | — | Chỉ 1 lane (symbol hành tinh) |

---

## 4. Thuật Toán Forward-Backward Pass

Sau khi phân lane, trong cùng 1 lane vẫn có thể xảy ra chồng chéo theo **chiều dọc vòng tròn** (cùng góc). Thuật toán 2-pass giải quyết vấn đề này:

### Bước 1: Phân nhóm theo Nhà

```python
house_groups = {i: [] for i in range(12)}
for p in planets:
    # Xác định nhà chứa hành tinh
    for i in range(12):
        c_curr = real_cusps[i]
        c_next = real_cusps[(i + 1) % 12]
        dist_p = (p['lon'] - c_curr) % 360
        size_h = (c_next - c_curr) % 360
        if dist_p < size_h:
            house_groups[i].append(p)
            break
```

**Ý nghĩa:** Hành tinh chỉ được dịch chuyển **bên trong giới hạn nhà** chứa nó. Không bao giờ "nhảy" sang nhà khác.

### Bước 2: Sắp xếp trong nhà

```python
group.sort(key=lambda x: get_rel_pos(x['lon']))
```

Sắp theo khoảng cách tương đối từ đỉnh nhà (tăng dần).

### Bước 3: Forward Pass — Đẩy ra xa

Duyệt từ hành tinh đầu tiên đến cuối cùng (trong cùng lane, cùng nhà). Nếu hành tinh hiện tại quá gần hành tinh trước đó → **đẩy ra xa hơn**:

```python
BUFFER = 2.0       # Khoảng cách tối thiểu từ đỉnh nhà
MIN_DIST = 5.0     # Khoảng cách tối thiểu giữa 2 hành tinh (tính bằng độ)

for i in range(len(rel_positions)):
    if i == 0:
        # Hành tinh đầu tiên: đảm bảo cách đỉnh nhà ít nhất BUFFER
        if rel_positions[i] < BUFFER:
            rel_positions[i] = BUFFER
    else:
        # Các hành tinh sau: đảm bảo cách hành tinh trước ít nhất MIN_DIST
        prev = rel_positions[i - 1]
        if rel_positions[i] < prev + MIN_DIST:
            rel_positions[i] = prev + MIN_DIST
```

**Minh họa Forward Pass:**

```
Trước Forward Pass:         Sau Forward Pass:
  Đỉnh nhà ─── 0°            Đỉnh nhà ─── 0°
  ☉ ────────── 2°  (gần)      ☉ ────────── 2° (giữ nguyên, ≥ BUFFER=2°)
  ☽ ────────── 3°  (gần ☉)    ☽ ────────── 7° (đẩy: 2°+5°=7°)
  ☿ ────────── 4°  (gần ☽)    ☿ ───────── 12° (đẩy: 7°+5°=12°)
  ♀ ────────── 5°  (gần ☿)    ♀ ───────── 17° (đẩy: 12°+5°=17°)
```

### Bước 4: Backward Pass — Kéo lại

Nếu Forward Pass đẩy hành tinh vượt quá giới hạn nhà, Backward Pass kéo ngược lại:

```python
for i in range(len(rel_positions) - 1, -1, -1):
    # Không được vượt quá biên nhà
    limit = house_width - BUFFER
    if rel_positions[i] > limit:
        rel_positions[i] = limit

    # Nếu quá gần hành tinh phía sau → kéo lại
    if i < len(rel_positions) - 1:
        next_p = rel_positions[i + 1]
        if rel_positions[i] > next_p - MIN_DIST:
            rel_positions[i] = next_p - MIN_DIST
```

**Minh họa Backward Pass (nhà rộng 25°):**

```
Sau Forward Pass:           Sau Backward Pass:
  ☉ ────────── 2°             ☉ ────────── 2° (OK, trong giới hạn)
  ☽ ────────── 7°             ☽ ────────── 7° (OK)
  ☿ ───────── 12°             ☿ ───────── 12° (OK)
  ♀ ───────── 17°             ♀ ───────── 17° (OK, < 25°-2°=23°)
                             → Tất cả đều trong giới hạn ✓
```

**Trường hợp nhà hẹp (ví dụ nhà rộng 15°):**

```
Sau Forward Pass:           Sau Backward Pass:
  ☉ ────────── 2°             ☉ ────────── 0° (kéo lại)
  ☽ ────────── 7°             ☽ ────────── 5° (kéo lại)
  ☿ ───────── 12°             ☿ ───────── 10° (kéo lại < 13°-5°)
  ♀ ───────── 17° (>13°!)     ♀ ───────── 13° (kéo lại = 15°-2°)
```

### Bước 5: Chuyển đổi về kinh độ tuyệt đối

```python
final_abs = (c_start + final_rel) % 360
item['p']['disp_lon'] = final_abs
```

---

## 5. Áp Dụng Cho Natal Chart

**File:** `app/utils/drawing/natal.py:158-184`

```python
# 1. Chuẩn bị danh sách hành tinh (loại bỏ Lilith, Asc, MC)
p_list = []
for p_name, info in chart_data["planets"].items():
    if p_name not in lib.PLANET_SYMBOLS or p_name == "Lilith": continue
    if p_name in ['Asc', 'MC']: continue
    p_list.append({'name': p_name, 'lon': info['lon'], 'sym': lib.PLANET_SYMBOLS[p_name]})

# 2. Gọi optimize với 2 lane
lanes_natal = [7.3, 6.2]
optimized_planets = optimize_planet_positions_by_house(p_list, cusps, lanes=lanes_natal)

# 3. Vẽ: dùng disp_lon cho vị trí text, lon cho vạch nối
for p in optimized_planets:
    true_rad = np.deg2rad(p['lon'])       # Vị trí thật → vạch tick
    disp_rad = np.deg2rad(p['disp_lon'])  # Vị trí hiển thị → symbol text
    r_pos = p['disp_r']                   # Lane nào → bán kính

    # Vạch tick ở vị trí thật
    ax.plot([true_rad, true_rad], [R_MID, R_MID - 0.2], color='blue', linewidth=1.5)
    ax.plot([true_rad, true_rad], [R_PLANET, R_PLANET - 0.2], color='blue', linewidth=1.5)

    # Symbol ở vị trí hiển thị
    ax.text(disp_rad, r_pos, p['sym'], fontsize=20, ...)
```

### Sơ đồ minh họa Natal

```
                    ┌─── Zodiac Ring (R=8.0-9.5) ───┐
                    │  ♈  ♉  ♊  ♋  ♌  ♍  ♎  ...  │
                    └────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │     Lane Ngoài (R=7.3)            │
            │  ☉(15°)    ☿(45°)    ♂(120°)      │
            │                                    │
            │     Lane Trong (R=6.2)             │
            │     ☽(18°)    ♀(48°)    ♃(125°)    │
            └─────────────────┼─────────────────┘
                              │
                    ┌─── House Cusps (R=5.5) ────┐
                    │  Nhà 1 │ Nhà 2 │ Nhà 3 ... │
                    └────────────────────────────┘
                              │
                    ┌─── Aspect Lines (R=5.25) ──┐
                    │  Spindle shapes             │
                    └────────────────────────────┘
```

---

## 6. Áp Dụng Cho Synastry Chart

**File:** `app/utils/drawing/synastry.py:84-118`

Synastry có **2 bộ hành tinh riêng biệt** (A và B), mỗi bộ chạy `optimize_planet_positions_by_house()` **độc lập**:

```python
# NGƯỜI A (vòng trong - xanh)
lanes_A = [5.4, 4.6]
opt_A = optimize_planet_positions_by_house(p_list_A, cA["cusps"], lanes=lanes_A)

# NGƯỜI B (vòng ngoài - đỏ)
lanes_B = [7.4, 6.6]
opt_B = optimize_planet_positions_by_house(p_list_B, cB["cusps"], lanes=lanes_B)
```

### Sơ đồ Synastry

```
    Zodiac (R=8.0-9.5)
    ┌──────────────────────┐
    │                      │
    │  Người B (R=6.0-8.0) │  ← Lane ngoài B: R=7.4
    │  ♂ ♃ ♄ ♇            │  ← Lane trong B: R=6.6
    │──────────────────────│
    │  Người A (R=4.0-6.0) │  ← Lane ngoài A: R=5.4
    │  ☉ ☽ ☿ ♀            │  ← Lane trong A: R=4.6
    │──────────────────────│
    │  Aspect Lines (R<4.0)│
    └──────────────────────┘
```

**2 bộ hành tinh KHÔNG THỂ chồng nhau** vì chúng nằm ở **dải bán kính hoàn toàn khác nhau** (A: 4.6–5.4, B: 6.6–7.4).

---

## 7. Áp Dụng Cho Transit Single

**File:** `app/utils/drawing/natal.py:222-239` (trong `create_natal_chart_image`, phần `transit_mode='single'`)

Transit Single vẽ hành tinh transit **bên ngoài vòng Zodiac**:

```python
# Vị trí: ngoài Zodiac
R_ROOT_BASE = R_ZODIAC_OUTER          # 9.5
R_ROOT_TIP  = R_ZODIAC_OUTER + 0.5    # 10.0
R_TEXT_POS  = R_ZODIAC_OUTER + 0.5 + 1.5  # 11.5

# Danh sách transit planets
t_planets = [...]

# Chỉ dùng 1 LANE duy nhất (vì vùng ngoài Zodiac rộng)
dummy_cusps = [i * 30 for i in range(12)]  # Cusps giả đều 30°
opt_trans = optimize_planet_positions_by_house(t_planets, dummy_cusps, lanes=[R_TEXT_POS])
```

### Tại sao dùng cusps giả?

Transit planet không thuộc nhà nào (chúng là vị trí bầu trời hiện tại, không phải natal). Dùng cusps giả đều 30° (`[0, 30, 60, ...]`) để thuật toán phân bố hành tinh đều quanh vòng tròn, mỗi "nhà giả" rộng đúng 30° → đủ chỗ cho 1–2 hành tinh.

### Sơ đồ Transit Single

```
    Viền ngoài (R=11.5)
    ┌────────────────────────────┐
    │                            │
    │  Transit Symbols (R=11.5)  │  ← ♃(transit) ♄(transit)
    │  · · · · · · · · · · ·     │  ← Đường chấm nối symbol → tick
    │  Transit Ticks (R=10.0)    │  ← Vạch tick từ Zodiac ra ngoài
    │                            │
    │──── Zodiac Ring (R=9.5) ───│
    │     ♈ ♉ ♊ ♋ ♌ ♍ ...      │
    │──────────────────────────  │
    │  Natal Planets (R=6.2-7.3) │
    │  ☉ ☽ ☿ ♀ ♂ ...           │
    └────────────────────────────┘
```

---

## 8. Transit Đại Hạn Tương Lai (Outer Cycle) — PHẦN QUAN TRỌNG NHẤT

**File:** `app/utils/drawing/natal.py:36-78` (precalculation) + `app/utils/drawing/natal.py:241-269` (drawing)

### 8.1 Mô Tả

Transit Đại Hạn vẽ **vòng cung (arc)** cho mỗi hành tinh ngoài (Jupiter, Saturn, Uranus, Neptune, Pluto) trong khoảng thời gian dài (thường 1–10 năm). Mỗi arc thể hiện **phạm vi di chuyển** của hành tinh trong giai đoạn đó.

**Vấn đề chồng chéo ở đây phức tạp hơn:**
- Không chỉ có **symbol** mà còn có **arc** (cung tròn)
- Các arc có thể **chồng lên nhau** nếu 2 hành tinh di chuyển trong cùng vùng zodiac
- Cần phân lane cho **cả arc lẫn symbol**

### 8.2 Dữ Liệu Đầu Vào (Outer Cycle Data)

Hàm `get_outer_planet_cycle_data()` trong `app/routes/transits.py:55-76` tính toán:

```python
transit_data = {
    "Jupiter": {
        "A": 45.0,          # Vị trí hành tinh tại NGÀY BẮT ĐẦU (kinh độ ecliptic)
        "B": 65.0,          # Vị trí hành tinh tại NGÀY KẾT THÚC
        "start": 40.0,      # Biên trái cung (vị trí nhỏ nhất trong giai đoạn)
        "end": 68.0,        # Biên phải cung (vị trí lớn nhất)
        "len": 28.0          # Chiều dài cung (tính bằng độ ecliptic)
    },
    "Saturn": { ... },
    "Uranus": { ... },
    "Neptune": { ... },
    "Pluto": { ... }
}
```

**Giải thích:**
- `A` và `B` là vị trí tại 2 thời điểm biên (ngày bắt đầu và kết thúc)
- `start` và `end` là **biên cực trị** (bao gồm cả nghịch hành) → cung tròn rộng hơn A–B
- `len` = phạm vi di chuyển tổng cộng

### 8.3 Collision Detection Giữa Các Arc

**File:** `app/utils/drawing/natal.py:15-33`

Trước khi vẽ, hệ thống kiểm tra xem 2 cung tròn có **chồng lên nhau** không:

```python
def check_arc_collision(arc1, arc2, buffer=2.0):
    """
    Kiểm tra 2 arc có collision (chồng chéo) trên vòng tròn.

    Tham số:
        arc1, arc2: dict có 'start' và 'end' (kinh độ ecliptic)
        buffer: vùng đệm thêm 2° mỗi bên (tránh sát mép)

    Trả về: True nếu collision, False nếu OK
    """
    s1, e1 = arc1['start'], arc1['end']
    s2, e2 = arc2['start'], arc2['end']

    # Mở rộng arc1 thêm buffer
    s1_buf = (s1 - buffer) % 360
    e1_buf = (e1 + buffer) % 360

    # Kiểm tra: đầu/cuối arc2 có nằm trong arc1+buffer?
    if is_in_arc(s2, s1_buf, e1_buf) or is_in_arc(e2, s1_buf, e1_buf):
        return True
    # Kiểm tra ngược: đầu/cuối arc1+buffer có nằm trong arc2?
    if is_in_arc(s1_buf, s2, e2) or is_in_arc(e1_buf, s2, e2):
        return True
    return False
```

**Xử lý arc vượt 0° (wrap-around):** Hàm `is_in_arc()` xử lý trường hợp arc đi qua 0° Aries (ví dụ: start=350°, end=10°).

### 8.4 Thuật Toán Phân Lane Cho Arc — GREEDY ALGORITHM

**File:** `app/utils/drawing/natal.py:45-77`

Đây là phần **quan trọng nhất** để tránh chồng chéo trong Transit Đại Hạn:

```python
# BƯỚC 1: Sắp xếp hành tinh theo chiều dài cung (DÀI NHẤT TRƯỚC)
sorted_planets = sorted(transit_data, key=lambda x: x['len'], reverse=True)

# BƯỚC 2: Greedy lane assignment
lanes = []  # Mỗi lane là 1 list các arc đã được đặt

for p in sorted_planets:
    assigned_idx = -1

    # Thử từng lane hiện có
    for idx, lane_objs in enumerate(lanes):
        collision = False
        for existing in lane_objs:
            if check_arc_collision(p, existing):
                collision = True
                break

        if not collision:
            # Tìm được lane không collision → đặt vào
            assigned_idx = idx
            break

    if assigned_idx == -1:
        # TẤT CẢ lane đều collision → TẠO LANE MỚI
        lanes.append([])
        assigned_idx = len(lanes) - 1

    lanes[assigned_idx].append(p)
    p['lane_idx'] = assigned_idx   # Ghi lại lane cho hành tinh này
```

### 8.5 Minh Họa Greedy Lane Assignment

**Ví dụ thực tế:** Transit 2024–2026, 5 hành tinh ngoài:

```
Hành tinh  | start | end  | len  | Xử lý
──────────────────────────────────────────────
Pluto      | 298°  | 305° |  7°  | Dài nhất → xếp trước
Neptune    | 355°  |   2° |  7°  | Kiểm tra collision với Pluto
Uranus     |  20°  |  28° |  8°  | ...
Saturn     |  10°  |  25° | 15°  | ...
Jupiter    |  45°  |  90° | 45°  | Dài nhất thực tế → xếp đầu
```

**Sau khi sắp theo len giảm dần:** Jupiter(45°) → Saturn(15°) → Uranus(8°) → Pluto(7°) → Neptune(7°)

```
Bước 1: Jupiter (45°–90°) → Lane 0 (trống, đặt luôn)
  Lane 0: [Jupiter(45°–90°)]

Bước 2: Saturn (10°–25°) → Thử Lane 0:
  - check_arc_collision(Saturn, Jupiter)?
  - Saturn(10°–25°) vs Jupiter(45°–90°)? → KHÔNG collision
  → Đặt vào Lane 0
  Lane 0: [Jupiter(45°–90°), Saturn(10°–25°)]

Bước 3: Uranus (20°–28°) → Thử Lane 0:
  - check_arc_collision(Uranus, Jupiter)? Uranus(20°–28°) vs Jupiter(45°–90°)? → OK
  - check_arc_collision(Uranus, Saturn)? Uranus(20°–28°) vs Saturn(10°–25°)? → COLLISION! (chồng 20°–25°)
  → Tạo Lane 1 mới
  Lane 0: [Jupiter(45°–90°), Saturn(10°–25°)]
  Lane 1: [Uranus(20°–28°)]

Bước 4: Pluto (298°–305°) → Thử Lane 0:
  - vs Jupiter? OK. vs Saturn? OK.
  → Đặt vào Lane 0
  Lane 0: [Jupiter(45°–90°), Saturn(10°–25°), Pluto(298°–305°)]
  Lane 1: [Uranus(20°–28°)]

Bước 5: Neptune (355°–2°) → Thử Lane 0:
  - vs Jupiter? OK. vs Saturn? OK. vs Pluto?
  - Neptune(355°–2°) vs Pluto(298°–305°)?
  - Khoảng cách 355°–305° = 50° → KHÔNG collision
  → Đặt vào Lane 0
  Lane 0: [Jupiter, Saturn, Pluto, Neptune]
  Lane 1: [Uranus]
```

**Kết quả: Chỉ cần 2 lane** → R_OUTER mở rộng vừa đủ.

### 8.6 Tính R_OUTER Động

```python
LANE_BASE_R = R_ZODIAC_OUTER + 0.5    # 10.0 (bắt đầu sau Zodiac)
LANE_HEIGHT = 0.5                       # Mỗi lane cao 0.5 đơn vị bán kính

# R_OUTER = base + (số lane × chiều cao lane) + padding
calculated_outer = LANE_BASE_R + (len(lanes) * LANE_HEIGHT) + 0.5
R_OUTER = max(11.5, calculated_outer)
```

**Ví dụ:**
- 2 lane → R_OUTER = 10.0 + (2 × 0.5) + 0.5 = 11.5 (giữ nguyên mặc định)
- 3 lane → R_OUTER = 10.0 + (3 × 0.5) + 0.5 = 12.0 (mở rộng)
- 5 lane → R_OUTER = 10.0 + (5 × 0.5) + 0.5 = 13.0 (mở rộng nhiều)

### 8.7 Vẽ Symbol Hành Tinh (Tránh Chồng Symbol)

Symbol hành tinh được đặt **ở vị trí A** (ngày bắt đầu) và cũng chạy qua `optimize_planet_positions_by_house()`:

```python
# Tạo list hành tinh tại vị trí A (ngày bắt đầu)
p_base_list = [{'name': p['name'], 'lon': p['A'], 'sym': p['sym']}
               for p in precalc_sorted_planets]

# Optimize với cusps giả và 1 lane ở R=R_TRANSIT_TEXT
R_TRANSIT_TEXT = R_ZODIAC_OUTER + 1.5  # ≈ 11.0
opt_base = optimize_planet_positions_by_house(
    p_base_list,
    [i * 30 for i in range(12)],   # Cusps giả đều 30°
    lanes=[R_TRANSIT_TEXT]          # 1 lane duy nhất
)
```

→ Nhờ `optimize_planet_positions_by_house()`, các **symbol hành tinh** ở vòng ngoài cũng **không bị chồng lên nhau**, dù chúng nằm trên cùng 1 lane.

### 8.8 Vẽ Arc (Cung Tròn) Trên Lane

```python
LANE_BASE_R = 11.5 + 0.5    # Bắt đầu vẽ arc sau vùng symbol
LANE_HEIGHT = 0.5
TICK_LEN = 0.2

for p in precalc_sorted_planets:
    # Bán kính arc = base + (lane_index × chiều cao lane)
    r_lane = LANE_BASE_R + (p['lane_idx'] * LANE_HEIGHT)

    start_rad = np.deg2rad(p['start'])
    end_rad = np.deg2rad(p['end'])

    # Xử lý arc vượt 0° (wrap-around)
    if p['end'] < p['start']:
        # Chia thành 2 phần: start→360° và 0°→end
        w1 = np.deg2rad(360 - p['start'])
        w2 = np.deg2rad(p['end'])
        ax.bar(start_rad + w1/2, 0.05, width=w1, bottom=r_lane, ...)
        ax.bar(0 + w2/2, 0.05, width=w2, bottom=r_lane, ...)
    else:
        # Arc bình thường
        ax.bar(start_rad + (end_rad - start_rad)/2, 0.05,
               width=end_rad - start_rad, bottom=r_lane, ...)

    # Tick marks tại vị trí A và B
    ax.plot([rad_A, rad_A], [r_lane, r_lane - TICK_LEN], ...)
    ax.plot([rad_B, rad_B], [r_lane, r_lane - TICK_LEN], ...)
```

### 8.9 Sơ Đồ Tổng Thể Transit Đại Hạn

```
R_OUTER (dynamic) ─────────────────────────────────────────────
                   │                                          │
  Lane 1 (R=12.5)  │  ───────♅────────                       │ ← Arc Uranus
                   │         ↑tick                            │
  Lane 0 (R=12.0)  │  ♃════════════════  ♄════  ♇══  ♆══    │ ← Arc Jupiter, Saturn, Pluto, Neptune
                   │  ↑tick        ↑tick  ↑   ↑  ↑   ↑      │
                   │                                          │
  Symbol (R=11.0)  │  ♃     ♄     ♅     ♆    ♇              │ ← Symbol hành tinh (optimized)
                   │  ↑     ↑     ↑     ↑    ↑              │
  Tick (R=10.0)    │  │     │     │     │    │               │ ← Vạch nối từ Zodiac
                   │                                          │
  Zodiac (R=9.5)  ─────────────────────────────────────────────
                   │  ♈  ♉  ♊  ♋  ♌  ♍  ♎  ♏  ♐  ♑  ♒  ♓  │
  Zodiac (R=8.0)  ─────────────────────────────────────────────
                   │                                          │
  Natal (R=6.2-7.3)│  ☉  ☽  ☿  ♀  ♂  ♃  ♄  ♅  ♆  ♇       │ ← Natal planets
                   │                                          │
  Cusps (R=5.5)   ─────────────────────────────────────────────
                   │  Aspect Spindles                         │
  Center (R=0)    ─────────────────────────────────────────────
```

### 8.10 Tại Sao Không Bao Giờ Chồng Chéo?

Transit Đại Hạn có **4 lớp bảo vệ** chống chồng chéo:

| Lớp | Cơ chế | Chống chồng gì |
|-----|--------|----------------|
| **Lớp 1: Natal vs Transit** | Natal ở R=5.5–8.0, Transit ở R=9.5+ | Symbol Natal không bao giờ chạm Transit |
| **Lớp 2: Symbol Transit** | `optimize_planet_positions_by_house()` với `MIN_DIST=5°` | Symbol hành tinh transit không chồng nhau |
| **Lớp 3: Arc Transit** | `check_arc_collision()` + Greedy Lane Assignment | Arc (cung tròn) không chồng nhau |
| **Lớp 4: R_OUTER động** | Tự mở rộng bán kính theo số lane | Luôn có đủ chỗ cho mọi arc |

---

## 9. Vạch Nối (Tick Lines) — Liên Kết Vị Trí Thật ↔ Vị Trí Hiển Thị

Khi hành tinh bị dịch chuyển (disp_lon ≠ lon), hệ thống vẽ **vạch nối** để người dùng biết symbol đang "trỏ" về vị trí thật nào:

### Natal Chart

```python
# 2 vạch tick tại vị trí THẬT (true_rad):
ax.plot([true_rad, true_rad], [R_MID, R_MID - 0.2], ...)       # Tick dưới
ax.plot([true_rad, true_rad], [R_PLANET, R_PLANET - 0.2], ...)  # Tick trên
# Symbol text tại vị trí HIỂN THỊ (disp_rad)
```

### Transit Chart

```python
# Tick tại vị trí thật (thò ra từ Zodiac)
ax.plot([true_rad, true_rad], [R_TRANS_TICK_START, R_TRANS_TICK_END], ...)

# Đường chấm chấm nối tick → symbol (nếu bị dịch chuyển)
if abs(true_rad - disp_rad) > 0.01:
    ax.plot([true_rad, disp_rad], [R_TRANS_TICK_END, r_pos - 0.3],
            linestyle=':', ...)
```

**Minh họa:**

```
                 Symbol (vị trí hiển thị)
                    ♃
                   ╱
                  ╱  đường chấm chấm (nối symbol → tick)
                 ╱
                │    ← Tick (vị trí thật trên Zodiac)
    ────────────┼────────────
         Zodiac Ring
```

---

## 10. Tham Số Cấu Hình

### Tham số có thể điều chỉnh

| Tham số | Giá trị hiện tại | File:Line | Ý nghĩa |
|---|---|---|---|
| `BUFFER` | 2.0° | `helpers.py:38` | Khoảng cách tối thiểu từ hành tinh đến đỉnh nhà |
| `MIN_DIST` | 5.0° | `helpers.py:39` | Khoảng cách tối thiểu giữa 2 symbol hành tinh (cùng lane) |
| `lanes_natal` | `[7.3, 6.2]` | `natal.py:173` | Bán kính 2 lane cho Natal |
| `lanes_A` | `[5.4, 4.6]` | `synastry.py:90` | Bán kính 2 lane cho Synastry A |
| `lanes_B` | `[7.4, 6.6]` | `synastry.py:108` | Bán kính 2 lane cho Synastry B |
| `LANE_HEIGHT` | 0.5 | `natal.py:255` | Chiều cao mỗi lane arc trong Outer Cycle |
| `TICK_LEN` | 0.2 | `natal.py:255` | Chiều dài tick mark trên arc |
| `buffer` (collision) | 2.0° | `natal.py:15` | Vùng đệm khi kiểm tra collision arc |

### Điều chỉnh nếu vẫn bị chồng

1. **Tăng `MIN_DIST`** (ví dụ 5.0 → 7.0): Symbol cách xa nhau hơn, nhưng hành tinh sẽ bị dịch xa khỏi vị trí thật hơn
2. **Tăng khoảng cách giữa 2 lane** (ví dụ `[7.3, 5.8]` thay vì `[7.3, 6.2]`): 2 vòng tách xa hơn
3. **Giảm font size** (ví dụ `fontsize=18` thay vì `20`): Symbol nhỏ hơn, ít chiếm chỗ hơn
4. **Tăng `LANE_HEIGHT`** cho Outer Cycle (ví dụ 0.5 → 0.8): Arc cách xa nhau hơn

---

## Tóm Tắt

| Loại Chart | Cơ chế chống chồng Symbol | Cơ chế chống chồng Arc |
|---|---|---|
| **Natal** | 2-lane + Forward-Backward Pass | N/A |
| **Synastry** | 2-lane × 2 bộ (A+B riêng biệt) | N/A |
| **Transit Single** | 1-lane + Forward-Backward Pass (cusps giả) | N/A |
| **Transit Đại Hạn** | 1-lane + Forward-Backward Pass (cusps giả) | Greedy Lane + Arc Collision Detection |
| **Transit Chart** | 1-lane + Forward-Backward Pass | N/A |

**Tất cả đều chạy qua cùng 1 hàm `optimize_planet_positions_by_house()`**, chỉ khác nhau ở tham số `lanes` và `cusps`.
