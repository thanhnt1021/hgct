# RRI-T

## REVERSE REQUIREMENTS INTERVIEW TESTING

---

Phương pháp Kiểm thử Toàn diện dựa trên Phỏng vấn Ngược

5 Personas × 7 Dimensions × 8 Stress Axes × Code-Path Analysis = Complete Quality

Version 2.3 | 2026
Evolved from RRI Methodology → RRI-T v1.0 → v2.0 → v2.1 → v2.2 → v2.3
Designed for Vietnamese Enterprise Software
Optimized for Vibecode Kit + Claude Code
**Scalable from Solo Dev to Enterprise Team**
**Self-audited: 16-pass persona combo audit (3 rounds)**
**NEW: Code-Path Analysis — bottom-up code tracing to catch ALL runtime bugs**

---

## MỤC LỤC

0. [Quick Start — Đọc gì trước?](#-quick-start--đọc-gì-trước)
0. [Glossary — Thuật ngữ](#-glossary--thuật-ngữ)
1. [Nguồn gốc & Phản biện RRI](#1-nguồn-gốc--phản-biện-rri)
2. [Triết lý RRI-T](#2-triết-lý-rri-t)
3. [Mô hình 5 Testing Personas](#3-mô-hình-5-testing-personas)
4. [Stress Test Framework 8 Chiều](#4-stress-test-framework-8-chiều)
5. [Bảy Testing Dimensions](#5-bảy-testing-dimensions)
6. [Quy trình 5+1 Phases](#6-quy-trình-51-phases) *(incl. Phase 1.5 CODE-PATH ANALYSIS — v2.3)*
7. [Test Case Generation: Q→A→R→P→T](#7-test-case-generation-qarpt)
8. [Coverage Matrix & Weighted Scoring](#8-coverage-matrix--weighted-scoring)
9. [Vietnamese-Specific Testing](#9-vietnamese-specific-testing)
10. [Tích hợp Vibecode Kit & Tooling](#10-tích-hợp-vibecode-kit--tooling)
11. [RRI-T Lite — Cho Solo Dev & Small Team](#11-rri-t-lite--cho-solo-dev--small-team)
12. [Case Study minh hoạ](#12-case-study-minh-hoạ)
13. [Checklist tổng hợp](#13-checklist-tổng-hợp)
14. [Anti-Patterns & Troubleshooting](#14-anti-patterns--troubleshooting)
15. [Khi nào KHÔNG dùng RRI-T](#15-khi-nào-không-dùng-rri-t)
16. [Persona Combo Audit Strategy](#16-persona-combo-audit-strategy)
17. [Peer Review & Evidence](#17-peer-review--evidence)
A. [Appendix: Copy-Paste Templates](#appendix-a-copy-paste-templates)

---

## ⚡ QUICK START — ĐỌC GÌ TRƯỚC?

| Bạn là ai? | Thời gian | Đọc sections |
|---|---|---|
| **Solo dev, cần dùng ngay** | 20 phút | Glossary → 11.2-11.4 (Lite config) → **6.0.1 (Phase 1.5 overview)** → 7.1-7.2 (format + code reference) → Appendix A.1+A.5 (templates) |
| **QA/Test lead, cần hiểu framework** | 1 giờ | Glossary → Section 2 (Triết lý) → 3.1+3.7 (Personas overview) → **6.0.1 (Phase 1.5)** → 5 (7 Dimensions) → 8.1-8.2 (Scoring + Hard Gates) |
| **Đọc toàn bộ lần đầu** | 2.5 giờ | Glossary → Section 1→17 tuần tự |
| **Đã đọc v2.2, chỉ cần xem v2.3 upgrade** | 15 phút | 1.4 (Changelog v2.3) → **6.0.1 (Phase 1.5 CODE-PATH)** → **3.4 (QA Code-Path Destruction)** → **4.4 (Project-Specific Combos)** → **7.2.1 (Code Reference)** → A.5 (template) |
| **Đã đọc v1.0, cần xem all upgrades** | 20 phút | 1.4 (Changelog) → 6.0.1 (Phase 1.5) → 8.1 (Weighted Scoring) → 11 (Lite) → 16 (Persona Combos) → 15 (Khi nào KHÔNG dùng) |

---

## 📖 GLOSSARY — THUẬT NGỮ

| Thuật ngữ | Nghĩa |
|---|---|
| **RRI** | Reverse Requirements Interview — phương pháp phát hiện requirements bằng cách phỏng vấn ngược |
| **RRI-T** | RRI + Testing — mở rộng RRI để kiểm thử, không chỉ phát hiện |
| **Persona** | Vai trò giả định khi test — nhìn hệ thống từ góc nhìn khác nhau |
| **Dimension (D1-D7)** | 7 lĩnh vực kiểm thử: UI/UX, API, Performance, Security, Data, Infrastructure, Edge Cases |
| **Stress Axis** | 8 chiều áp lực: Time, Data, Error, Collab, Emergency, Security, Infra, Locale |
| **Q→A→R→P→T** | Question → Answer → Requirement → Priority → Test case — format viết test case |
| **P0/P1/P2/P3** | Mức ưu tiên: P0 = showstopper, P3 = nice-to-have |
| **Weighted Score** | Điểm coverage có tính trọng số theo priority |
| **Hard Gate** | Điều kiện bắt buộc — vi phạm = block release, không có ngoại lệ |
| **PAINFUL (⚠️)** | Hoạt động nhưng UX kém — nằm giữa PASS và FAIL |
| **MISSING (🔲)** | Feature chưa có — feedback về RRI loop, không phải bug |
| **Idempotency** | Gửi request 2 lần cho kết quả giống nhau, không tạo duplicate |
| **Horizontal access** | User A truy cập data của User B cùng role — lỗi authorization |
| **Optimistic locking** | Cho phép concurrent edit, detect conflict khi save |
| **RTO / RPO** | Recovery Time Objective (thời gian khôi phục) / Recovery Point Objective (mất bao nhiêu data) |

---

## 1. NGUỒN GỐC & PHẢN BIỆN RRI

### 1.1 Những gì RRI làm tốt

RRI (Reverse Requirements Interview) giải quyết được vấn đề cốt lõi: phát hiện requirements ẩn trước khi code. Ba trụ cột mạnh nhất:

- Empathy-first thinking — "Nếu TÔI là user, tôi cần gì" thay vì hỏi user cần gì
- 3 Personas coverage — End User, BA, QA/Tester phủ 3 góc nhìn bổ trợ
- Stress Test Framework — 5 chiều (Time, Data, Error, Collab, Emergency) rất thực chiến

### 1.2 Phản biện — Những gì RRI chưa giải quyết

| # | Điểm thiếu | Hệ quả | RRI-T bổ sung |
|---|---|---|---|
| 1 | Chỉ phát hiện, chưa kiểm chứng | Requirements không được verify | Test Case Generation (Q→A→R→P→T) |
| 2 | Thiếu chiều Infrastructure | Deploy, network, device bị bỏ qua | Testing Dimension #6 |
| 3 | Thiếu chiều Data Integrity | Migration, backup bị bỏ qua | Testing Dimension #5 |
| 4 | Không address Vietnamese UX | Dấu TV, VND, timezone | Vietnamese-Specific Testing |
| 5 | Thiếu Regression awareness | Fix gap A break gap B | Regression Testing Matrix |
| 6 | 3 Personas chưa đủ | Thiếu DevOps + Security | Mở rộng 5 Personas |
| 7 | Stress Test 5 chiều | Thiếu Security, Infra, Locale | Mở rộng 8 chiều |
| 8 | Không đo coverage | Không biết test đủ chưa | Coverage Matrix + Weighted Scoring |

### 1.3 Từ RRI đến RRI-T v2.3

```
RRI (Requirements Discovery)
  → RRI-T v1.0 (Quality Verification)
    → RRI-T v2.0 (Scalable Quality Verification + Tooling + Automation)
      → RRI-T v2.1 (Self-audited + Formula fixes + Cross-persona strategy)
        → RRI-T v2.2 (Vietnamese-first + Persona Combos + Anti-patterns)
          → RRI-T v2.3 (Code-Path Analysis + Bottom-up bug discovery)

"Tìm ra những gì CẦN BUILD"
  → "Chứng minh BUILD là ĐÚNG + cover những gì CHƯA NGHĨ TỚI"
    → "Chứng minh BUILD là ĐÚNG + tự động hoá + scale từ solo đến enterprise"
      → "Tất cả trên + framework tự test chính nó + audit từ nhiều góc nhìn"
        → "Tất cả trên + Vietnamese testing + Persona combo strategy"
          → "Tất cả trên + đọc code TRƯỚC khi test + trace runtime paths"
```

- RRI output → RRI-T input (requirements → test cases)
- RRI-T cũng phát hiện thêm requirements mới (testing reveals missing specs)
- Vòng lặp feedback: RRI-T gaps → quay lại RRI bổ sung

### 1.4 Changelog v1.0 → v2.0 → v2.1 → v2.2 → v2.3

| Thay đổi | v1.0 | v2.0 | v2.1 | v2.2 | v2.3 |
|---|---|---|---|---|---|
| Coverage Scoring | Flat (PASS/Total) | Weighted theo Priority | **4 result types (PAINFUL = 0.5×)** | Giữ nguyên | Giữ nguyên |
| Scale | Enterprise only | RRI-T Lite | **LOCALE bắt buộc trong Lite cho VN** | Giữ nguyên | **+ Phase 1.5 Lite (30-60 min)** |
| Stress Combos | 6 cherry-picked | Heatmap + Top 10 | **+ Full 28-pair flat list** | Giữ nguyên | **+ Project-Specific derivation từ code** |
| Code-Path Analysis | Không có | Không có | Không có | Không có | **Bắt buộc Phase 1.5: 4 loại trace** |
| QA Destroyer | Generic checklist | Generic checklist | Generic checklist | Generic checklist | **+ Code-Path Destruction sub-checklist** |
| BA Tester | Generic checklist | Generic checklist | Generic checklist | Generic checklist | **+ Calculation Trace verification** |
| Test Case Quality | Không có | Không có | Bad/Good examples | Giữ nguyên | **+ Code Reference requirement** |
| Tooling | 1 generic prompt | 4 prompt variants | Giữ nguyên | Giữ nguyên | **+ Code-Path Map template** |
| Case Study | Summary only | Narrative bugs | Giữ nguyên | Giữ nguyên | Giữ nguyên |
| Anti-Patterns | Không có | Section 14 | Giữ nguyên | Giữ nguyên | Giữ nguyên |
| Regression | Not structured | Matrix template | **+ Triage workflow** | Giữ nguyên | Giữ nguyên |
| Quick Start | Không có | Không có | **⚡ Quick Start guide** | Giữ nguyên | **+ Phase 1.5 row** |
| Phase DoD | Không có | Không có | **Definition of Done per Phase** | Giữ nguyên | **+ Phase 1.5 DoD row** |
| Dimension N/A | Không có | Không có | **Rules cho N/A** | Giữ nguyên | Giữ nguyên |
| Suite Versioning | Không có | Không có | **ID scheme + archive** | Giữ nguyên | Giữ nguyên |
| Templates | Inline only | Inline only | **Appendix A consolidated** | Giữ nguyên | **+ A.5 Code-Path Map template** |
| Dashboard | Empty template | Empty template | **+ Filled example** | Giữ nguyên | Giữ nguyên |
| Persona Combos | Không có | Không có | Không có | **16-pass audit strategy** | Giữ nguyên |
| Vietnamese Testing | Không có | Không có | Không có | **Section 9 dedicated** | Giữ nguyên |

---

## 2. TRIẾT LÝ RRI-T

> *Đừng chỉ test xem phần mềm có CHẠY không. Hãy test xem nó có SỐNG ĐƯỢC trong tay người dùng thực tế không.*

### 2.1 Sự khác biệt tư duy

| Traditional Testing | RRI-T |
|---|---|
| Feature X hoạt động đúng spec không? | Người dùng THỰC SỰ dùng feature X như thế nào? |
| Test case từ spec → verify | Test case từ CUỘC SỐNG → discover + verify |
| Pass/Fail binary | Pass / Fail / Usable but Painful / Works but Missing |
| Test sau khi code | Test THINKING trước code, test EXECUTION sau code |
| Tất cả bugs ngang nhau | Bugs weighted theo impact + likelihood |

### 2.2 Bốn kết quả kiểm thử

Thay vì chỉ Pass/Fail, RRI-T dùng 4 levels để capture đầy đủ chất lượng:

| Kết quả | Ký hiệu | Ý nghĩa | Ví dụ | Action Required |
|---|---|---|---|---|
| PASS | ✅ | Đúng spec VÀ tốt cho user | Save → thành công, có feedback | None |
| FAIL | ❌ | Sai spec hoặc không hoạt động | Save → lỗi 500 | Bug ticket, block release nếu P0 |
| PAINFUL | ⚠️ | Hoạt động nhưng UX kém | Save → mất 8 giây, không feedback | Improvement ticket, track debt |
| MISSING | 🔲 | Thiếu feature user cần | Không có auto-save | Backlog → quay lại RRI bổ sung |

### 2.3 Nguyên tắc "Cost of Discovery"

```
Thời điểm phát hiện bug    →    Chi phí sửa (tương đối)
──────────────────────────────────────────────────────
RRI (requirements phase)    →    1×
RRI-T pre-code (test plan)  →    2×
RRI-T during-code (unit)    →    5×
RRI-T post-code (QA)        →    10×
Post-release (production)   →    50-100×
```

RRI-T nhắm vào việc dồn phát hiện về phía trái (shift-left) càng nhiều càng tốt.

---

## 3. MÔ HÌNH 5 TESTING PERSONAS

### 3.1 Tổng quan

RRI dùng 3 personas để phát hiện requirements. RRI-T mở rộng lên 5 personas để kiểm thử toàn diện — vì testing cần cover cả góc nhìn vận hành hạ tầng và an ninh.

| Persona | Tư duy | Testing Focus | Nguồn gốc |
|---|---|---|---|
| 👤 End User | Tôi dùng hàng ngày | Workflow, UX, efficiency, offline | RRI gốc |
| 📋 Business Analyst | Rules phải đúng | Business rules, RBAC, audit, compliance | RRI gốc |
| 🔍 QA Destroyer | Tôi sẽ phá | Edge cases, errors, concurrent, undo | RRI gốc |
| 🔧 DevOps Tester | Hệ thống chịu được? | Deploy, scaling, monitoring, recovery | MỚI - RRI-T |
| 🔒 Security Auditor | Ai có thể lạm dụng? | AuthN/Z, injection, encryption, abuse | MỚI - RRI-T |

### 3.2 Chi tiết: End User Tester

*Tư duy: "Tôi là nhân viên vận hành. Mỗi sáng mở app, tôi làm gì? Tôi cần gì để không phải suy nghĩ nhiều?"*

**Core checklist:**
- Daily workflow hoàn chỉnh (happy path end-to-end)
- First-time user experience (onboarding)
- Repeated task efficiency (bulk operations, shortcuts)
- Context switching (đang làm A, chuyển sang B, quay lại A)
- Offline/poor connectivity behavior
- Mobile vs Desktop experience

**Câu hỏi gợi ý (dùng cho Phase 2 DISCOVER):**
- "Task nào user làm > 10 lần/ngày? Có shortcut không?"
- "Lần đầu mở app, user biết bắt đầu từ đâu?"
- "Đang edit form, mất mạng 30 giây — data có mất?"
- "User dùng điện thoại rẻ, 3G chậm — app load được không?"

### 3.3 Chi tiết: Business Analyst Tester

*Tư duy: "Mọi business rule phải được implement chính xác. Mọi con số phải khớp."*

**Core checklist:**
- Business rules accuracy (công thức tính, validation rules)
- Role-Based Access Control (đúng từng permission)
- Data consistency across modules
- Reporting accuracy (số liệu khớp giữa các báo cáo)
- Audit trail completeness

**Câu hỏi gợi ý:**
- "Công thức tính X — kết quả có khớp khi tính tay trên Excel?"
- "User role A truy cập vào endpoint của role B — server trả gì?"
- "Xoá record ở module A — module B còn reference tới nó không?"

**Calculation Verification (v2.3 — bắt buộc sau Phase 1.5):**

| Bước | Hành động | Output |
|---|---|---|
| 1. Inventory | List TẤT CẢ công thức/tính toán trong code (cost, pricing, scoring, aggregation, token counting) | Danh sách [file:line] + mô tả formula |
| 2. Chain Trace | Với mỗi công thức: trace toàn bộ chain, bao gồm các nhánh retry/partial/error/continuation | Flow diagram hoặc text trace |
| 3. Cross-check | Output có khớp giữa các module? (vd: cost hiển thị cho user vs cost lưu DB vs cost trong log) | Match/mismatch report |
| 4. Edge Values | Tính thử với edge values: 0 tokens, max tokens, partial response, multi-call aggregation | Kết quả có hợp lý? |

**Ví dụ:** Cost calculation trace — `ai_handler.py:69` capture `usage` dict từ stream → nhưng nếu `chat_continue()` gọi thêm 2 lần → `_calc_cost_total` có nhận đủ usage từ tất cả calls không? Trace end-to-end từ API response → accumulation → display → DB save.

### 3.4 Chi tiết: QA Destroyer

*Tư duy: "Mọi thứ có thể sai SẼ sai. Tôi tìm mọi cách phá hệ thống."*

**Core checklist:**
- Edge cases (giá trị biên, null, empty, overflow)
- Error paths & recovery
- Concurrent operations
- Rapid sequential actions (double-click, mash submit)
- Undo/redo chains (undo 5 lần, redo 3 lần, undo 1 lần)

**Câu hỏi gợi ý:**
- "Paste 1MB text vào input field 255 chars — chuyện gì xảy ra?"
- "Click submit 5 lần liên tiếp trong 1 giây?"
- "2 user cùng edit 1 record, cùng save — ai thắng?"

**Code-Path Destruction Checklist (v2.3 — bắt buộc sau Phase 1.5):**

Checklist này PHẢI được thực hiện SAU KHI có Code-Path Map từ Phase 1.5. Mỗi mục trace trực tiếp từ code thực tế, không phải hỏi generic.

| Loại trace | Câu hỏi destruction | Ví dụ cụ thể |
|---|---|---|
| Data Flow | Với mỗi function xử lý user input: trace empty/null/unexpected type → crash? silent fail? wrong output? | `card['key_upright']` là empty string → `_generate_question()` trả về gì? |
| State Mutation | Với mỗi shared state object: trace interleaved handler access → data loss? overwrite? stale read? | `context.user_data` shared giữa 2 ConversationHandler → chạy /reading giữa phiên /practice → session_id bị ghi đè? |
| DB Query | Với mỗi DB query: trace LIMIT/OFFSET → pagination đủ? Large dataset behavior? Missing index? | `LIMIT 15` hardcoded → 100+ clients thì user không thấy hết? |
| Calculation | Với mỗi calculation: trace ALL code paths (happy + retry + partial + continuation) → formula đúng ở mọi nhánh? | `usage` dict chỉ capture partial stream → continuation tokens bị miss → cost hiển thị sai? |
| External Call | Với mỗi external call: trace timeout + error + retry → resource leak? silent failure? orphan process? | AI extraction call không có timeout → treo vĩnh viễn nếu API chết? |
| Callback/Parse | Với mỗi callback data parser: trace malformed input → crash? bypass? | `callback_data.split(':')` không try/except → user craft callback → bot crash? |
| Regex | Với mỗi regex pattern: trace edge cases → match sai? miss match? | `\d*` match empty string → validate nhầm input trống là hợp lệ? |
| Authorization | Với mỗi action thay đổi data (delete, update, create): trace ownership check → user A có thể thao tác data user B? | `delete_reading(id)` chỉ check `reading exists` nhưng KHÔNG check `reading.user_id == current_user` → horizontal access? |
| Resource Cleanup | Với mỗi global/module-level resource (HTTP client, connection pool, file handle): trace lifecycle → có close/cleanup khi shutdown? | Global `_httpx_client` khởi tạo lazy nhưng không có shutdown hook → resource leak? |

**Rule:** Mỗi mục trong checklist này phải reference CODE CỤ THỂ (file:line hoặc function name). Nếu không reference code → checklist bị coi là chưa hoàn thành.

### 3.5 Chi tiết: DevOps Tester (MỚI)

*Tư duy: "App chạy đúng trên máy dev nhưng chết trên production. Tôi test ở điều kiện thực tế."*

**Core checklist:**
- Deployment reliability (zero-downtime deploy)
- Scaling behavior (10 → 100 → 1000 users)
- Resource consumption (CPU, memory, disk)
- Backup/restore procedure
- Database migration safety
- Log aggregation & monitoring alerts

**Câu hỏi gợi ý:**
- "Deploy version mới lúc 100 user đang online — có downtime?"
- "Disk đầy 95% — app xử lý thế nào?"
- "DB migration fail giữa chừng — rollback có clean?"

### 3.6 Chi tiết: Security Auditor (MỚI)

*Tư duy: "Mọi input là hostile. Mọi user có thể là attacker."*

**Core checklist:**
- Authentication & authorization bypass
- Input sanitization (XSS, SQL injection, CSRF)
- Data exposure (API responses leak sensitive data?)
- Rate limiting & abuse prevention
- Sensitive data handling (encryption, masking)
- Dependency vulnerabilities (npm audit, pip audit)

**Câu hỏi gợi ý:**
- "Thay đổi user_id trong API request — có trả data người khác?"
- "Upload file .exe rename thành .jpg — server accept?"
- "Brute-force login 1000 lần — có bị lock?"

### 3.7 Ma trận Persona × Testing Aspect

| Aspect | 👤 User | 📋 BA | 🔍 QA | 🔧 DevOps | 🔒 Security |
|---|---|---|---|---|---|
| UI/UX | ●●● | ● | ●● | — | ● |
| Business Logic | ● | ●●● | ●● | — | ● |
| Edge Cases | ● | ● | ●●● | ● | ●● |
| Performance | ●● | — | ● | ●●● | ● |
| Security | — | ● | ● | ●● | ●●● |
| Data Integrity | ● | ●●● | ●● | ●● | ● |
| Infrastructure | — | — | ● | ●●● | ●● |

**Cách đọc:** ●●● = Primary owner, ●● = Secondary contributor, ● = Awareness, — = Không liên quan.

---

## 4. STRESS TEST FRAMEWORK 8 CHIỀU

### 4.1 Mở rộng từ 5 → 8 chiều

RRI gốc có 5 chiều Stress Test. RRI-T bổ sung 3 chiều quan trọng: Security Stress, Infrastructure Stress, Localization Stress.

| # | Chiều | Câu hỏi gốc | Test Scenarios | SLA Target |
|---|---|---|---|---|
| 1 | ⏱️ TIME | Deadline 5 phút, cần làm gì? | Bulk ops, shortcuts, auto-complete | Critical path < 3 clicks |
| 2 | 📊 DATA | 1000 dòng data, tìm thế nào? | Search, filter, export | Search < 500ms, export 10K < 10s |
| 3 | ❌ ERROR | Save xong phát hiện sai? | Undo/redo, version history, auto-save | Auto-save ≤ 30s, undo ≥ 10 levels |
| 4 | 👥 COLLAB | 5 người cùng edit 1 file? | Conflict warning, no data loss | Conflict detect < 2s |
| 5 | 🚨 EMERGENCY | Supplier đột xuất hủy order? | Emergency workflow, notify | 2 clicks trigger, notify < 30s |
| 6 | 🔐 SECURITY | NV nghỉ việc, revoke access? | Revoke, session kill, audit log | Revoke immediate, log complete |
| 7 | 🏗️ INFRA | Server chết 2AM, sáng đến? | Recovery, failover, backup | RTO < 15m, RPO < 5m |
| 8 | 🌐 LOCALE | Gõ tiếng Việt có dấu? | Diacritic search, VND, date format | See Section 9 |

### 4.2 Stress Combination Heatmap

Với 8 chiều, có 28 cặp kết hợp. Đây là ma trận đánh giá risk level cho từng combo:

```
           TIME  DATA  ERROR  COLLAB  EMERG  SECUR  INFRA  LOCALE
TIME        —    🔴    🟡     🟡      🔴     🟡     🟡     🟢
DATA             —     🟡     🟡      🟡     🟡     🔴     🟡
ERROR                  —      🔴      🟡     🟡     🟡     🟢
COLLAB                        —       🟡     🔴     🟡     🟢
EMERG                                 —      🟡     🔴     🟢
SECUR                                        —      🟡     🟡
INFRA                                               —      🟡
LOCALE                                                      —

🔴 = High Risk (test bắt buộc)    🟡 = Medium Risk (nên test)    🟢 = Low Risk (test nếu có thời gian)
```

**Flat list (sorted by risk, dễ tra cứu hơn heatmap):**

| Combo | Risk | Lý do |
|---|---|---|
| TIME × EMERGENCY | 🔴 | Deadline + sự cố = worst case scenario |
| TIME × DATA | 🔴 | Bulk ops under pressure |
| COLLAB × ERROR | 🔴 | Multi-user conflict + data loss risk |
| COLLAB × SECURITY | 🔴 | Permission bypass qua concurrent access |
| INFRA × DATA | 🔴 | Migration + production traffic |
| INFRA × EMERGENCY | 🔴 | System down + business deadline |
| DATA × ERROR | 🟡 | Large import failure recovery |
| DATA × COLLAB | 🟡 | Large dataset + concurrent edits |
| DATA × SECURITY | 🟡 | Large data export + access control |
| DATA × LOCALE | 🟡 | Sort/filter Vietnamese large dataset |
| COLLAB × INFRA | 🟡 | Deploy during active sessions |
| TIME × COLLAB | 🟡 | Rush + multi-user = conflict |
| TIME × SECURITY | 🟡 | Bypass security under time pressure |
| TIME × ERROR | 🟡 | Rush → mistakes → need undo |
| TIME × INFRA | 🟡 | Deploy under deadline pressure |
| ERROR × SECURITY | 🟡 | Error messages leak sensitive info |
| ERROR × INFRA | 🟡 | App error + infra instability |
| SECURITY × INFRA | 🟡 | Secret rotation + session management |
| SECURITY × LOCALE | 🟡 | Unicode in auth tokens/payloads |
| INFRA × LOCALE | 🟡 | Server encoding vs Vietnamese text |
| EMERGENCY × SECURITY | 🟡 | Emergency bypass normal auth? |
| EMERGENCY × COLLAB | 🟡 | Multi-user emergency workflow |
| EMERGENCY × DATA | 🟡 | Emergency affecting large dataset |
| EMERGENCY × ERROR | 🟡 | Emergency + system in error state |
| TIME × LOCALE | 🟢 | VN text length + tight deadline UI |
| ERROR × LOCALE | 🟢 | Error messages in Vietnamese |
| COLLAB × LOCALE | 🟢 | Multi-user VN text editing |
| EMERGENCY × LOCALE | 🟢 | Emergency notifications in VN |

### 4.3 Top 10 Stress Combos — Ưu tiên test

| Rank | Kết hợp | Scenario | Test Case | Risk |
|---|---|---|---|---|
| 1 | TIME × EMERGENCY | Deadline gấp + sự cố | Close budget deadline + supplier cancel | 🔴 |
| 2 | INFRA × DATA | Server stress + data lớn | Migration 1M records + concurrent users | 🔴 |
| 3 | COLLAB × ERROR | Nhiều người + conflict | 3 users edit, 1 save fail, dữ liệu others? | 🔴 |
| 4 | INFRA × EMERGENCY | Server sự cố + deadline | Prod down lúc close budget | 🔴 |
| 5 | COLLAB × SECURITY | Nhiều người + phân quyền | Admin và Viewer cùng mở record — Viewer sửa được? | 🔴 |
| 6 | TIME × DATA | Deadline gấp + data lớn | Bulk approve 500 records trong 3 phút | 🔴 |
| 7 | SECURITY × LOCALE | Auth + tiếng Việt | Username "Nguyễn Văn A" trong JWT — token parse đúng? | 🟡 |
| 8 | DATA × ERROR | Data lớn + lỗi giữa chừng | Import 10K rows, row 5001 lỗi — rollback hay skip? | 🟡 |
| 9 | COLLAB × INFRA | Nhiều user + server restart | 50 user online, deploy new version — sessions sống? | 🟡 |
| 10 | SECURITY × INFRA | Auth + server restart | JWT secret rotate — existing sessions invalidate đúng? | 🟡 |

### 4.4 Project-Specific Stress Combos (v2.3 — bắt buộc)

Ngoài generic combos ở trên, **phải derive stress combos TỪ CODE của project**. Generic combos cover tình huống phổ biến, nhưng nhiều bugs chỉ xuất hiện khi test đúng cross-module dependencies cụ thể của project.

**Quy trình:**

| Bước | Hành động | Output |
|---|---|---|
| 1 | Đọc Code-Path Map (Phase 1.5 output) | Danh sách risks cụ thể |
| 2 | Xác định cross-module dependencies | Pairs/groups of modules chia sẻ state, data, hoặc resources |
| 3 | Tạo stress combos cụ thể cho từng dependency | Scenario test cho interleaved/concurrent operations |
| 4 | Ưu tiên test project-specific combos TRƯỚC generic combos | Project-specific bugs > generic coverage |

**Ví dụ project-specific combos cho Telegram bot:**

| # | Combo | Scenario | Trace từ code |
|---|---|---|---|
| 1 | /practice + /reading interleave | User đang /practice → giữa phiên gõ /reading → context.user_data bị ghi đè → quay lại /practice mất session | practice.py + handlers.py share `context.user_data` |
| 2 | AI streaming + continuation + cost | Response bị cắt → continuation 2 lần → cost calculation chỉ dùng partial usage → hiển thị sai | ai_handler.py `chat_stream` → `chat_continue` → handlers.py `_calc_cost_total` |
| 3 | Memory extraction + bot restart | Background extraction đang chạy → bot restart → extraction task orphaned → memory không save | memory_extractor.py background task + systemd restart |
| 4 | Delete reading + concurrent /client view | User A xóa reading → User B đang xem cùng client → buttons reference reading đã xóa → callback fail | handlers.py delete_reading + _show_client_readings |

**Rule:** Project-specific combos > Generic combos. Mục tiêu là tìm bugs THẬT từ code, không phải check-the-box.

---

## 5. BẢY TESTING DIMENSIONS

Mỗi feature/module phải được test qua 7 dimensions. Đây là các lens khác nhau nhìn vào cùng một functionality.

| Dimension | Mục tiêu | Key Metrics | Recommended Tools |
|---|---|---|---|
| D1: UI/UX | Giao diện trực quan, responsive, accessible | 0 visual deviation, WCAG 2.1 AA | Playwright, Chromatic, Axe |
| D2: API | Mọi endpoint đúng contract, error graceful | 100% match OpenAPI spec | Bruno, Hoppscotch, Dredd |
| D3: Performance | Nhanh và ổn định dưới tải thực tế | p95 < 500ms, 0 errors under load | k6, Artillery, Lighthouse |
| D4: Security | Dữ liệu an toàn, access đúng quyền | 0 unauthorized access, TLS 1.2+ | OWASP ZAP, Burp Suite, npm audit |
| D5: Data Integrity | Dữ liệu đúng, đầy đủ, nhất quán | 100% roundtrip accuracy | pgTAP, custom scripts, diff tools |
| D6: Infrastructure | Hệ thống ổn định, recoverable | RTO < 15m, 0 downtime deploy | Docker healthcheck, Grafana, UptimeRobot |
| D7: Edge Cases | Xử lý mọi tình huống bất thường | Graceful handling, no crash | Fuzzing tools, Playwright edge scripts |

### 5.1 D1: UI/UX Testing

| Area | Kiểm tra | Tiêu chí Pass |
|---|---|---|
| Visual Consistency | Font, color, spacing theo design system | 0 deviation từ design tokens |
| Responsive | Mobile 375px, Tablet 768px, Desktop 1440px, 4K | Layout không vỡ, content không mất |
| Interactive States | Hover, focus, active, disabled, loading, error | Mỗi state có visual feedback rõ |
| Form Behavior | Validation timing, error messages, tab order | Real-time validation, lỗi inline |
| Navigation | Breadcrumb, back/forward, deep linking | Mọi page reachable, back hoạt động |
| Loading States | Skeleton, spinner, progress bar | Feedback < 100ms, spinner sau 300ms |
| Empty States | No data, first use, search no results | Có message hướng dẫn |
| VN Text Overflow | Tiếng Việt dài hơn EN ~30% | UI không bị vỡ layout |

### 5.2 D2: API Testing

| Area | Kiểm tra | Tiêu chí Pass |
|---|---|---|
| Contract | Request/Response schema validation | 100% match OpenAPI spec |
| Status Codes | 200, 201, 400, 401, 403, 404, 409, 422, 500 | Đúng code cho đúng scenario |
| Validation | Required fields, types, ranges, formats | 400 với message rõ cho mỗi vi phạm |
| Pagination | Cursor-based, offset, limit, sorting | Consistent, no duplicates |
| Error Responses | Format consistency, error codes | JSON chuẩn: {code, message, details} |
| Idempotency | POST/PUT retry safety | Duplicate request không tạo duplicate data |

### 5.3 D3: Performance Testing

**Performance Budget:**

| Metric | Target | Degraded | Failed |
|---|---|---|---|
| First Contentful Paint | < 1.5s | < 3s | > 3s |
| Time to Interactive | < 3s | < 5s | > 5s |
| API Response (p50) | < 200ms | < 500ms | > 500ms |
| API Response (p95) | < 500ms | < 1s | > 1s |
| Bundle Size | < 500KB | < 1MB | > 1MB |
| Database Query | < 50ms | < 200ms | > 200ms |

**Load Test Scenarios:**

| Scenario | Users | Duration | Success Criteria |
|---|---|---|---|
| Normal Load | 50 concurrent | 30 min | p95 < 500ms, 0 errors |
| Peak Load | 200 concurrent | 15 min | p95 < 1s, error < 0.1% |
| Stress Test | 500 concurrent | 10 min | Graceful degradation, no crash |
| Endurance | 100 concurrent | 4 hours | No memory leak, consistent p95 |
| Spike Test | 0→300→0 in 1m | 5 min | Recovery < 30s, no data loss |

### 5.4 D4: Security Testing

| Area | Kiểm tra | Tiêu chí Pass |
|---|---|---|
| AuthN | Login, logout, token refresh, session timeout | Token secure, timeout đúng |
| AuthZ | RBAC per endpoint, horizontal access | User A KHÔNG access data User B |
| Input Sanitization | XSS, SQL Injection, Command Injection | Mọi input được escape/sanitize |
| Data Exposure | API response chỉ allowed fields | Không leak password, PII |
| File Upload | Type check, size limit | Reject executable, limit 10MB |
| Headers | CSP, HSTS, X-Frame-Options | Tất cả security headers present |
| Encryption | HTTPS only, data at rest | TLS 1.2+, AES-256 sensitive data |
| Dependencies | Known vulnerabilities in packages | 0 critical/high CVE in production |

### 5.5 D5: Data Integrity Testing

| Area | Kiểm tra | Tiêu chí Pass |
|---|---|---|
| CRUD Consistency | Create→Read→Update→Delete lifecycle | Data roundtrip 100% chính xác |
| Cross-Module | Data shared giữa modules | Thay đổi module A reflect ở B |
| Calculation | Công thức, aggregation, rounding | Khớp 100% với Excel reference |
| Migration | Schema change, data migration | Zero data loss, rollback safe |
| Backup/Restore | Backup procedure, restore verify | Restore khớp 100% backup point |
| Concurrent Write | Optimistic/pessimistic locking | No lost updates, conflict detected |
| Temporal | Timestamps, timezone, date ranges | UTC storage, GMT+7 display đúng |

### 5.6 D6: Infrastructure Testing

| Area | Kiểm tra | Tiêu chí Pass |
|---|---|---|
| Deploy | Zero-downtime deployment, rollback | 0 downtime, rollback < 5 min |
| Env Parity | Dev ≈ Staging ≈ Prod | Config drift < 5% |
| Health Checks | Liveness, readiness, startup probes | Correct status within 10s |
| Monitoring | Metrics, dashboards, alert rules | Alert fires within 60s |
| Scaling | Horizontal scale up/down | Scale < 2 min, no request drops |
| Resource Limits | CPU/Memory limits, disk usage | Graceful at 90% capacity |

### 5.7 D7: Edge Case & Error Recovery

| Category | Test Cases | Expected |
|---|---|---|
| Boundary Values | 0, 1, max-1, max, max+1, negative | Accept valid, reject with message |
| Empty/Null | Null, undefined, empty string, whitespace | Không crash, appropriate state |
| Special Characters | Unicode, emoji, HTML tags, SQL chars | Escape/render correctly |
| Large Input | 10MB paste, 100K characters | Truncate hoặc reject with limit |
| Rapid Actions | Double-click, rapid submit, tab-mash | Debounce, no duplicate ops |
| State Transitions | Offline→Online, sleep→wake | State recovery, no data loss |
| Network | Slow 3G, packet loss, timeout | Retry logic, offline indicator |
| Time-based | Midnight, DST, leap year, timezone | Correct calculations |

---

## 6. QUY TRÌNH 5+1 PHASES

| Phase | Tên | Mô tả | Thời gian (Full) | Thời gian (Lite) | Output |
|---|---|---|---|---|---|
| 1 | PREPARE | Gather context, setup framework | 1-2 giờ | 30 phút | Test Plan |
| **1.5** | **CODE-PATH** | **Đọc code, trace data/state/calc/external** | **1-3 giờ** | **30-60 phút** | **Code-Path Map** |
| 2 | DISCOVER | Persona interview sinh test cases | 3-5 giờ | 1-2 giờ | Raw Test Cases |
| 3 | STRUCTURE | Phân loại, ưu tiên, viết formal | 2-4 giờ | 1 giờ | Structured Test Suite |
| 4 | EXECUTE | Chạy tests, ghi kết quả 4 levels | 2-8 giờ | 1-3 giờ | Test Results |
| 5 | ANALYZE | Phân tích gaps, regression, feedback | 1-2 giờ | 30 phút | Gap Report |

### 6.0.1 Phase 1.5: CODE-PATH ANALYSIS (v2.3 — MỚI)

> **Tại sao cần Phase 1.5?**
>
> v2.2 và các phiên bản trước tiếp cận TOP-DOWN: template/checklist → generic questions → surface-level coverage. Kết quả: tìm được nhiều issues, nhưng MISS những bugs chỉ phát hiện khi đọc code thực tế.
>
> Phase 1.5 bổ sung tiếp cận BOTTOM-UP: đọc code → trace paths → specific questions. Kết hợp cả hai = tìm được MỌI bug.

**Bắt buộc** đọc code (hoặc có AI đọc) TRƯỚC KHI generate test cases ở Phase 2 DISCOVER.

**4 loại trace:**

#### Trace 1: Data Flow

*Mục tiêu: Tìm nơi data có thể null/empty/unexpected type gây crash hoặc sai logic.*

```
Với mỗi function xử lý user input hoặc external data:
  1. Input đến từ đâu? (user, DB, API, file, callback)
  2. Input có thể null/empty/unexpected type không?
  3. Function xử lý null/empty như thế nào? Crash? Silent fail? Default value?
  4. Output truyền đi đâu? Downstream function handle null output không?

Output: Danh sách [file:line] + risk assessment
```

**Ví dụ thực tế:**
```
practice.py:186 — _generate_question()
  Input: card['key_upright'] từ DB
  Risk: DB cho phép empty string → key_upright = ""
  Trace: "" → dùng làm đáp án → user thấy đáp án trống → P1 bug
  Action: Ghi vào Code-Path Map → Phase 2 tạo test case cụ thể
```

#### Trace 2: State Mutation

*Mục tiêu: Tìm shared state bị ghi đè/xung đột giữa các handlers hoặc concurrent operations.*

```
Với mỗi shared state (context, globals, session, in-memory dict):
  1. Ai đọc state này? (list tất cả readers)
  2. Ai ghi state này? (list tất cả writers)
  3. Có thể xảy ra interleaved read/write không? (concurrent users, multiple handlers)
  4. Nếu ghi đè xảy ra → data loss? stale read? wrong behavior?

Output: Danh sách shared state objects + read/write map + conflict risk
```

**Ví dụ thực tế:**
```
context.user_data — shared giữa handlers.py và practice.py
  Writers: handlers.py sets 'practice_session_id', 'current_client_id', ...
           practice.py sets 'practice_session_id', 'practice_deck', ...
  Conflict: User chạy /practice → giữa phiên go /reading → context.user_data['practice_session_id']
            bị handlers.py ghi đè → quay lại /practice → session_id sai → P2 bug
```

#### Trace 3: Calculation Chain

*Mục tiêu: Tìm calculation sai do miss code path (retry, partial, continuation, error).*

```
Với mỗi calculation/formula trong code (cost, scoring, aggregation, counting):
  1. Formula ở đâu? (file:line)
  2. Input values đến từ đâu? Qua bao nhiêu bước?
  3. Có code path nào bypass hoặc partial update input? (retry, continuation, error recovery)
  4. Output khớp nhau giữa display/DB/log?

Output: Danh sách calculations + chain diagram + potential discrepancies
```

**Ví dụ thực tế:**
```
ai_handler.py:69 — usage dict capture
  Chain: chat_stream() → usage = {prompt_tokens, completion_tokens}
  Miss: Nếu chat_continue() gọi thêm 1-2 lần → mỗi lần có usage riêng
        → _calc_cost_total nhận list usages → nhưng initial stream usage
        chỉ có partial completion → cost hiển thị cho stream call đầu tiên bị thiếu
  Risk: P2 — cost estimation sai khi response cần continuation
```

#### Trace 4: External Dependency & DB Query

*Mục tiêu: Tìm external calls thiếu timeout/error/cleanup VÀ DB queries có vấn đề scalability.*

```
Với mỗi external call (API, network, file I/O):
  1. Timeout cấu hình? Nếu không → có thể treo vĩnh viễn
  2. Error handling? try/except đủ specific? Catch-all nuốt lỗi?
  3. Retry logic? Idempotent? Retry có gây duplicate?
  4. Resource cleanup? HTTP client close? Connection pool drain?

Với mỗi DB query:
  5. LIMIT/OFFSET hardcoded? Large dataset behavior? Pagination đủ?
  6. Missing index trên cột WHERE/ORDER BY?
  7. N+1 query? (loop gọi query cho mỗi item)

Output: Danh sách external calls + DB queries + risk assessment
```

**Ví dụ thực tế (external call):**
```
memory_extractor.py:143-151 — AI extraction call
  Call: AIHandler.chat() (non-streaming, background)
  Timeout: Kế thừa từ httpx client (180s) — nhưng không có task-level timeout
  Risk: Nếu API treo → background task treo vĩnh viễn → resource leak
  Action: Ghi vào Code-Path Map → cần asyncio.wait_for() wrapper
```

**Ví dụ thực tế (DB query):**
```
handlers.py:1290 — list_clients(limit=15)
  Query: SELECT ... FROM clients ORDER BY ... LIMIT 15
  Risk: 100+ clients → user chỉ thấy 15, không có pagination/scroll
  Impact: P3 — UX kém, nhưng không mất data
  Action: Cần pagination hoặc tăng limit, hoặc thêm search
```

#### Output: Code-Path Map

Kết quả Phase 1.5 là **Code-Path Map** — danh sách các điểm rủi ro cụ thể (file:line) kèm risk level:

```
CODE-PATH MAP — [Project Name]
Date: _______________

DATA FLOW RISKS:
  [P?] [file:line] — [description] — [impact]
  [P?] [file:line] — [description] — [impact]

STATE MUTATION RISKS:
  [P?] [file:line] — [description] — [impact]
  [P?] [file:line] — [description] — [impact]

CALCULATION CHAIN RISKS:
  [P?] [file:line] — [description] — [impact]

EXTERNAL DEPENDENCY RISKS:
  [P?] [file:line] — [description] — [impact]
  [P?] [file:line] — [description] — [impact]

TOTAL: ___ risks identified
  P1: ___ | P2: ___ | P3: ___
```

**Code-Path Map này là INPUT cho Phase 2 DISCOVER** — khi persona interview, ưu tiên hỏi về các risks đã identify. Điều này chuyển questions từ "generic checklist" sang "targeted code-specific questions".

### 6.1 Definition of Done — Mỗi Phase xong khi nào?

| Phase | ✅ DONE khi | ❌ CHƯA DONE nếu |
|---|---|---|
| 1. PREPARE | Scope document written + mode (Full/Lite) chosen + N/A dimensions justified + test environment ready | Chưa list user roles, chưa identify critical paths |
| **1.5 CODE-PATH** | **Code-Path Map hoàn thành: data flows, state mutations, calculations, external deps documented với file:line references** | **Chưa đọc code, hoặc chỉ đọc superficially (không có file:line references)** |
| 2. DISCOVER | Mỗi persona đạt min test case count (Section 6.2) + Vietnamese checklist cross-referenced + **Code-Path Map risks addressed** | Có persona chưa interview, hoặc < 50% min count, **hoặc Code-Path risks không có test case** |
| 3. STRUCTURE | Tất cả P0 có Q→A→R→P→T đầy đủ + Impact×Likelihood matrix filled + regression dependencies mapped | Còn P0 test case chưa viết formal, hoặc chưa assign dimension |
| 4. EXECUTE | Tất cả P0 đã chạy + kết quả ghi 4-level + FAIL/PAINFUL logged as tickets | Còn P0 chưa chạy, hoặc kết quả chưa ghi |
| 5. ANALYZE | Weighted coverage calculated + hard gates checked + verdict documented | Chưa tính coverage, hoặc chưa check hard gates |

### 6.2 Phase 2: DISCOVER — Phân bổ

| Round | Persona | Full Mode | Lite Mode | Focus |
|---|---|---|---|---|
| 1 | 👤 End User | 25-35 | 10-15 | Workflow, UX, daily tasks |
| 2 | 📋 Business Analyst | 20-30 | 8-12 | Rules, data, compliance |
| 3 | 🔍 QA Destroyer | 25-35 | 10-15 | Edge cases, error paths |
| 4 | 🔧 DevOps | 15-20 | 5-8 (hoặc skip) | Infrastructure, performance |
| 5 | 🔒 Security Auditor | 15-20 | 5-8 (hoặc skip) | Security, access control |
| | TỔNG | 100-140 | 30-50 | Focused coverage |

### 6.3 Phase 3: STRUCTURE — Ưu tiên hóa

**Ma trận Impact × Likelihood:**

|  | Unlikely | Possible | Likely |
|---|---|---|---|
| Critical Impact | P1 | P0 | P0 |
| Major Impact | P2 | P1 | P0 |
| Minor Impact | P3 | P2 | P1 |

**Priority definitions:**

| Priority | Meaning | Release Gate | Response Time |
|---|---|---|---|
| P0 | Showstopper — user không thể dùng | MUST fix before release | Ngay lập tức |
| P1 | Major — workaround khó chấp nhận | SHOULD fix before release | Trong sprint |
| P2 | Minor — có workaround dễ | CAN release, fix next sprint | Backlog ưu tiên |
| P3 | Nice-to-have — cosmetic/polish | Release, fix when convenient | Backlog thường |

### 6.4 Phase 5: ANALYZE — Release Gate

| Coverage | Status | Action |
|---|---|---|
| ≥ 85% | 🟢 Green | Release approved |
| 70-84% | 🟡 Yellow | Release with known issues documented |
| < 70% | 🔴 Red | Block release, fix critical first |

**Release criteria (ALL phải đạt):**

1. Tất cả **applicable** dimensions ≥ 70%
2. Ít nhất **70% applicable dimensions** ≥ 85% (ví dụ: 7 applicable → cần 5; 5 applicable → cần 4; 4 applicable → cần 3)
3. **0 items P0 ở trạng thái FAIL** (hard gate — không có ngoại lệ, xem anti-loophole rule bên dưới)
4. 0 items P0 ở trạng thái MISSING
5. Weighted Coverage Score ≥ 80% (xem Section 8)

**Dimension N/A Rule:** Nếu dimension không applicable cho project (ví dụ D6 Infrastructure cho static site, hoặc D3 Performance cho internal tool 5 users), có thể đánh dấu N/A. Điều kiện:

| Rule | Yêu cầu |
|---|---|
| Ai quyết N/A? | Tech lead hoặc architect, không phải tester |
| Ghi lại ở đâu? | Test Plan (Phase 1 PREPARE), lý do phải viết rõ |
| N/A count tối đa? | Full mode: ≤ 2 dimensions. Lite mode: ≤ 3 dimensions |
| Không bao giờ N/A? | D4 Security — nếu app có user login, D4 luôn applicable |

### 6.5 Phase 5+: REGRESSION — Ma trận hồi quy

Mỗi khi fix bug, cần kiểm tra regression. Template:

```
┌─────────────────────────────────────────────────────┐
│ BUG FIX: [Bug ID] [Mô tả ngắn]                     │
│ MODULE CHANGED: [Module bị sửa]                     │
├─────────────────────────────────────────────────────┤
│ DIRECT REGRESSION:                                  │
│  □ Re-run test case gốc phát hiện bug               │
│  □ Re-run P0 tests cùng module                      │
│                                                     │
│ CROSS-MODULE REGRESSION:                            │
│  □ List modules có shared data/dependency            │
│  □ Re-run P0+P1 tests của modules liên quan          │
│                                                     │
│ SIDE-EFFECT CHECK:                                  │
│  □ Performance regression (response time tăng?)     │
│  □ UI regression (layout shift, broken styles?)     │
│  □ Data regression (calculation thay đổi?)          │
└─────────────────────────────────────────────────────┘
```

### 6.6 Triage Workflow — Khi phát hiện quá nhiều P0 FAIL

Scenario thực tế: chạy RRI-T xong, phát hiện 8+ P0 FAIL. Release bị block. Làm gì tiếp?

```
Step 1: STOP & CLASSIFY (30 phút)
  ├── Group P0 FAILs theo dimension (D1? D2? D4?)
  ├── Group theo root cause (cùng 1 bug gây nhiều FAIL?)
  └── Identify dependency chains (FAIL A block test B?)

Step 2: PRIORITIZE FIXES (1 giờ)
  ├── Fix "root cause" trước — 1 fix có thể resolve nhiều FAILs
  ├── Fix dependency blockers trước — unblock downstream tests
  ├── Fix D4 Security trước D1 UI/UX — security > cosmetics
  └── Estimate effort per fix: Quick Win (< 2h) vs Heavy (> 1 day)

Step 3: FIX IN BATCHES (iterative)
  ├── Batch 1: All Quick Wins → re-run affected tests
  ├── Batch 2: Heavy fixes theo priority → re-run
  ├── Mỗi batch: run Regression Matrix (Section 6.5)
  └── STOP khi: 0 P0 FAIL + weighted score ≥ 80%

Step 4: RE-ASSESS (30 phút)
  ├── Remaining P0 FAILs that can't be fixed this sprint?
  ├── Can they be downgraded to P1 with documented workaround?
  │   (Requires tech lead approval + written justification)
  │   ⚠️ ANTI-LOOPHOLE RULE: Downgraded items tracked in a
  │   "Downgraded P0" list. Max 2 per release. List reviewed
  │   every sprint — if not fixed within 2 sprints, auto-escalate
  │   back to P0 and block next release.
  └── If still P0 FAIL remains → delay release, no exception
```

**Rule of thumb:** Nếu > 20% test cases là P0 FAIL, đó không phải testing problem — đó là architecture/design problem. Quay lại RRI, không phải fix từng bug.

---

## 7. TEST CASE GENERATION: Q→A→R→P→T

### 7.1 Mở rộng từ RRI format

RRI dùng Q→A→R→P (Question → Answer → Requirement → Priority). RRI-T thêm T = Test Case để khép kín vòng lặp.

```
ID:          [MODULE]-[DIMENSION]-[NUMBER]
Persona:     [👤|📋|🔍|🔧|🔒]

Q: QUESTION  — [Câu hỏi từ góc nhìn persona]
A: ANSWER    — [Expected behavior]
R: REQUIREMENT — [Requirement rút ra]
P: PRIORITY  — [P0|P1|P2|P3]

T: TEST CASE
   Precondition: [Setup]
   Steps: 1... 2... 3...
   Expected: [Kết quả chi tiết]
   Dimension: [D1-D7]
   Stress: [Chiều stress, nếu có]

Result: [✅|⚠️|❌|🔲] [Notes]
Regression: [Test IDs bị ảnh hưởng nếu fix]
```

### 7.2 Bad vs Good Test Case — Cách viết đúng

**❌ Bad test case — quá vague:**

| Field | Content |
|---|---|
| ID | LOGIN-D1-001 |
| Persona | 👤 End User |
| Q | Login có hoạt động không? |
| A | Login phải hoạt động |
| R | REQ-001: Login works |
| P | P0 |
| Steps | 1. Login |
| Expected | Login thành công |

**Vấn đề:** Mọi thứ đều vague. "Login" bằng gì? Email? Google OAuth? "Hoạt động" nghĩa là gì cụ thể? Test case này pass luôn nếu login bằng 1 cách thành công, nhưng miss 10 edge cases khác.

**✅ Good test case — cụ thể, measurable:**

| Field | Content |
|---|---|
| ID | LOGIN-D1-001 |
| Persona | 👤 End User |
| Q | User quay lại sau 2 tuần, token hết hạn. Mở app thấy gì? |
| A | Redirect về login page, pre-fill email, hiện "Phiên đăng nhập đã hết hạn" |
| R | REQ-001: Expired session redirects to login with pre-filled email and Vietnamese message |
| P | P1 |
| Steps | 1. Login thành công  2. Clear session cookie  3. Truy cập /dashboard  4. Quan sát behavior |
| Expected | 1. Redirect → /login trong < 500ms  2. Email field pre-filled  3. Message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"  4. Sau login → quay về /dashboard (không về homepage) |
| Dimension | D1 (UI/UX) + D4 (Security) |
| Stress | ERROR (session expiry recovery) |
| Regression | LOGIN-D4-003 (token refresh), LOGIN-D1-005 (redirect logic) |

**Sự khác biệt:** Scenario cụ thể (quay lại sau 2 tuần), steps reproducible (clear cookie), expected results measurable (< 500ms, pre-filled, exact message text), dimension + stress tagged, regression mapped.

### 7.2.1 Code Reference Requirement (v2.3 — MỚI)

Khi test case liên quan đến logic cụ thể trong code, **Q phải reference code location** (file:line hoặc function name) và **Steps phải trace từ actual code path**, không chỉ abstract scenario.

**❌ Bad — không reference code:**

| Field | Content |
|---|---|
| Q | Flashcard hiển thị đáp án đúng không? |
| Steps | 1. Bắt đầu practice  2. Xem flashcard  3. Kiểm tra đáp án |

**✅ Good — reference code, trace từ code path:**

| Field | Content |
|---|---|
| ID | PRACTICE-D7-001 |
| Persona | 🔍 QA Destroyer |
| Q | `_generate_question()` (practice.py:186) dùng `card['key_upright']` làm đáp án. Nếu DB card có `key_upright = ''` (empty string) — flashcard hiển thị gì? |
| A | Phải skip card hoặc hiện fallback text, KHÔNG hiển thị đáp án trống |
| R | REQ-PRACTICE-001: Flashcard cards with empty key_upright must be filtered out |
| P | P1 |
| Steps | 1. Seed DB card với `key_upright = ''`  2. Chạy /practice → Flashcard → chọn deck chứa card đó  3. Lặp cho đến khi card empty key xuất hiện  4. Quan sát question display |
| Expected | Card bị skip (không xuất hiện trong pool) HOẶC hiện fallback "Khong co du lieu" |
| Dimension | D7 (Edge Cases) |
| Stress | DATA (empty/null values) |
| Code-Path | `practice.py:186` → `_generate_question()` → `card['key_upright']` → nếu `""` → bug |
| Regression | PRACTICE-D7-002 (quiz mode cùng field), PRACTICE-D5-001 (card data integrity) |

**Rule:** Test cases được derive từ Code-Path Map (Phase 1.5) PHẢI có field `Code-Path` chỉ rõ file:line và trace path. Test cases từ persona interview generic thì không bắt buộc.

### 7.3 Ví dụ: End User Persona

| Field | Content |
|---|---|
| ID | OTB-D1-007 |
| Persona | 👤 End User |
| Q | Đang edit budget, sếp gọi 15 phút. Quay lại, data có còn? |
| A | Auto-save mỗi 30 giây, data phải còn nguyên |
| R | REQ-045: Implement auto-save every 30s during editing |
| P | P0 |
| Steps | 1. Edit 3 fields  2. Đợi 35s  3. Close tab  4. Re-open |
| Expected | 3 thay đổi giữ lại + "Draft auto-saved at [time]" |
| Dimension | D1 (UI/UX) + D5 (Data Integrity) |
| Stress | ERROR (recovery from interruption) |
| Regression | OTB-D5-001 (CRUD), OTB-D1-012 (form state) |

### 7.4 Ví dụ: Security Auditor Persona

| Field | Content |
|---|---|
| ID | OTB-D4-003 |
| Persona | 🔒 Security Auditor |
| Q | User A có thể sửa API request để xem budget department khác? |
| A | KHÔNG — API phải check department-level authorization |
| R | REQ-180: Enforce department-level access control |
| P | P0 |
| Steps | 1. User A GET budget Marketing  2. User A PUT  3. User A list |
| Expected | Step 1-2: 403 Forbidden. Step 3: empty. Audit log ghi nhận |
| Dimension | D4 (Security) |
| Stress | SECURITY (authorization bypass) |
| Regression | OTB-D4-001 (AuthN), OTB-D2-005 (API contract) |

### 7.5 Ví dụ: Stress Combo (TIME × DATA)

| Field | Content |
|---|---|
| ID | OTB-D3-015 |
| Persona | 🔍 QA Destroyer + 👤 End User |
| Q | Deadline 5 phút, cần approve 500 records — bulk action kịp không? |
| A | Bulk approve phải xử lý 500 records < 3 phút, progress feedback |
| R | REQ-201: Bulk actions with progress indicator, < 1ms per record |
| P | P0 |
| Steps | 1. Filter 500 pending records  2. Select All  3. Bulk Approve  4. Measure time |
| Expected | Complete < 180s, progress bar cập nhật, success count hiển thị |
| Dimension | D3 (Performance) |
| Stress | TIME × DATA |
| Regression | OTB-D2-010 (bulk API), OTB-D1-020 (progress UI) |

---

## 8. COVERAGE MATRIX & WEIGHTED SCORING

### 8.1 Weighted Coverage Formula

v1.0 dùng flat scoring: `PASS / Total × 100%` — coi mọi test case ngang nhau. v2.0 dùng weighted scoring theo priority, với 4 result types tính khác nhau:

```
Priority Weight:  P0 = 4    P1 = 2    P2 = 1    P3 = 0.5

Result Scoring:
  ✅ PASS     = 1.0   (full credit)
  ⚠️ PAINFUL  = 0.5   (half credit — hoạt động nhưng chưa tốt)
  ❌ FAIL     = 0.0   (zero credit)
  🔲 MISSING  = 0.0   (zero credit — nhưng tracked riêng, xem bên dưới)

Calculation per priority level:
  level_score = (count_PASS × 1.0 + count_PAINFUL × 0.5 + count_FAIL × 0.0 + count_MISSING × 0.0)
  level_weighted = level_score × weight
  level_max = total_count × weight

Weighted Score = Σ(level_weighted) / Σ(level_max) × 100%
```

**Tại sao PAINFUL = 0.5?** Vì nó hoạt động (user không bị block) nhưng tạo UX debt. Nếu tính = 0 như FAIL thì quá khắt khe, tính = 1 như PASS thì bỏ qua pain.

**Ranh giới FAIL vs PAINFUL (objective criteria):**

| Tiêu chí | ❌ FAIL | ⚠️ PAINFUL |
|---|---|---|
| User có thể hoàn thành task? | KHÔNG — blocked hoàn toàn | CÓ — nhưng khó chịu/chậm/confusing |
| Data bị mất hoặc sai? | CÓ — data loss hoặc corruption | KHÔNG — data đúng nhưng process chậm/xấu |
| Cần workaround? | Không có workaround, hoặc workaround phức tạp > 5 bước | Có workaround đơn giản ≤ 3 bước |
| Ảnh hưởng bao nhiêu user? | > 50% users gặp | < 50% users gặp, hoặc chỉ edge case |
| Ví dụ | Submit → 500 error, form mất data | Submit → thành công nhưng mất 8s, không loading indicator |

**Rule:** Nếu nghi ngờ giữa FAIL vs PAINFUL, đánh FAIL. Downgrade sau dễ hơn upgrade.

**Tại sao MISSING tracked riêng?** FAIL = code viết sai → fix code. MISSING = chưa viết code → scope decision. Hai thứ này cần action khác nhau. MISSING items phải feedback về RRI loop, không phải bug ticket.

**Ví dụ chi tiết:**

| Priority | Total | ✅ | ⚠️ | ❌ | 🔲 | Weight | level_score | level_weighted | level_max |
|---|---|---|---|---|---|---|---|---|---|
| P0 | 10 | 8 | 1 | 1 | 0 | 4 | 8×1.0+1×0.5 = 8.5 | 8.5×4 = 34 | 10×4 = 40 |
| P1 | 20 | 16 | 2 | 1 | 1 | 2 | 16+1 = 17 | 17×2 = 34 | 20×2 = 40 |
| P2 | 15 | 12 | 1 | 2 | 0 | 1 | 12+0.5 = 12.5 | 12.5×1 = 12.5 | 15×1 = 15 |
| P3 | 5 | 4 | 0 | 1 | 0 | 0.5 | 4 | 4×0.5 = 2 | 5×0.5 = 2.5 |
| **Tổng** | **50** | **40** | **4** | **5** | **1** | | | **82.5** | **97.5** |

```
Weighted Score: 82.5 / 97.5 = 84.6%  → 🟡 (Conditional)
MISSING count: 1 (P1) → Feedback to RRI, not a bug
PAINFUL count: 4 → Track as UX debt backlog
```

### 8.2 Hard Gates (Không có ngoại lệ)

Ngoài weighted score, các hard gates sau KHÔNG phụ thuộc vào tổng score:

| Gate | Condition | Effect |
|---|---|---|
| P0 Zero-FAIL | Bất kỳ P0 nào FAIL | 🔴 Block release — score bao nhiêu cũng không matter |
| P0 Zero-MISSING | Bất kỳ P0 nào MISSING | 🔴 Block release — phải implement trước |
| Dimension Floor | Bất kỳ dimension nào < 70% | 🔴 Block release cho dimension đó |
| Security Gate | D4 score < 80% | 🔴 Block release — security không thể compromise |
| Security Breadth | D4 có area chưa test (xem 5.4) | 🔴 Block — D4 phải cover ≥ 6/8 areas (AuthN, AuthZ, Input, Data Exposure, File Upload, Headers, Encryption, Dependencies) |

### 8.3 Multi-Dimension Test Cases — Scoring Rule

Nhiều test cases span 2+ dimensions (ví dụ D1+D4: CSRF token trong form, D3+D5: N+1 query). Cách tính:

| Scenario | Rule |
|---|---|
| Test case tagged D1 + D4 | Count vào BOTH dimensions. 1 test case PASS = +1 PASS cho D1 VÀ +1 PASS cho D4 |
| Test case tagged D1 + D4, result FAIL | FAIL count vào dimension **chính** (dimension đầu tiên được tag). PAINFUL cho dimension phụ — vì dimension phụ technically không broken, chỉ exposed qua cross-cutting |
| Không biết dimension nào chính? | Dimension nào bị ảnh hưởng trực tiếp hơn = chính. Ví dụ: CSRF token missing → D4 là chính (security flaw), D1 là phụ (form UX impact) |

### 8.4 Module × Dimension Scoring Dashboard

```
MODULE: [Tên Module]
DATE: [Ngày test]
TESTER: [Tên/Persona]

┌──────────────────┬───────┬────┬────┬────┬────┬──────────┬────────┐
│ Dimension        │ Tests │ ✅  │ ⚠️  │ ❌  │ 🔲  │ Weighted │ Status │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ D1: UI/UX        │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D2: API          │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D3: Performance  │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D4: Security     │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D5: Data         │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D6: Infra        │       │    │    │    │    │      %   │ 🟢🟡🔴 │
│ D7: Edge Cases   │       │    │    │    │    │      %   │ 🟢🟡🔴 │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ TOTAL            │       │    │    │    │    │      %   │ 🟢🟡🔴 │
└──────────────────┴───────┴────┴────┴────┴────┴──────────┴────────┘

HARD GATES:
  P0 FAIL count:    [n] → [PASS/BLOCK]
  P0 MISSING count: [n] → [PASS/BLOCK]
  D4 Security:      [n%] → [PASS/BLOCK]
  Min Dimension:    [n%] → [PASS/BLOCK]

VERDICT: [🟢 RELEASE | 🟡 CONDITIONAL | 🔴 BLOCKED]
```

**Filled Example (from Case Study Section 12):**

```
MODULE: DAFC OTB Budget
DATE: 2025-03-15
TESTER: Full team (5 personas)

┌──────────────────┬───────┬────┬────┬────┬────┬──────────┬────────┐
│ Dimension        │ Tests │ ✅  │ ⚠️  │ ❌  │ 🔲  │ Weighted │ Status │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ D1: UI/UX        │  35   │ 28 │  4 │  3 │  0 │   82%    │  🟡    │
│ D2: API          │  30   │ 27 │  1 │  2 │  0 │   91%    │  🟢    │
│ D3: Performance  │  20   │ 18 │  1 │  1 │  0 │   89%    │  🟢    │
│ D4: Security     │  18   │ 15 │  0 │  2 │  1 │   84%    │  🟡    │
│ D5: Data         │  25   │ 22 │  0 │  1 │  2 │   90%    │  🟢    │
│ D6: Infra        │  15   │ 13 │  1 │  1 │  0 │   87%    │  🟢    │
│ D7: Edge Cases   │  30   │ 24 │  2 │  3 │  1 │   81%    │  🟡    │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ TOTAL            │ 173   │147 │  9 │ 13 │  4 │   86%    │  🟢    │
└──────────────────┴───────┴────┴────┴────┴────┴──────────┴────────┘

HARD GATES:
  P0 FAIL count:    0 → PASS ✅
  P0 MISSING count: 0 → PASS ✅
  D4 Security:      84% → PASS ✅ (≥ 80%)
  Min Dimension:    81% → PASS ✅ (≥ 70%)

VERDICT: 🟢 RELEASE (with 🟡 dimensions tracked as improvement backlog)
```

### 8.4 Persona Coverage Check

| Persona | Min Tests (Full) | Min Tests (Lite) | Primary Dimensions |
|---|---|---|---|
| 👤 End User | 25 | 10 | D1: UI/UX, D7: Edge Cases |
| 📋 Business Analyst | 20 | 8 | D2: API, D5: Data Integrity |
| 🔍 QA Destroyer | 25 | 10 | D7: Edge Cases (primary), D2: API (secondary) |
| 🔧 DevOps | 15 | 5 | D3: Performance, D6: Infrastructure |
| 🔒 Security Auditor | 15 | 5 | D4: Security |

### 8.5 Test Suite Versioning — Khi module evolve

Khi module thêm features, test suite phải evolve theo. Rules:

**ID Scheme scalable:**
```
[MODULE]-[DIMENSION]-[NUMBER]
Ví dụ: OTB-D1-007

Khi thêm test cases mới: increment number, KHÔNG reuse ID đã xoá
OTB-D1-001 → OTB-D1-050 (v1.0)
OTB-D1-051 → OTB-D1-080 (v1.1 — thêm feature)
OTB-D1-081 → ... (v2.0)

Nếu xoá OTB-D1-007: mark DEPRECATED, không reuse số 007
```

**Khi nào tạo suite mới vs update suite cũ?**

| Scenario | Action |
|---|---|
| Thêm feature nhỏ vào module | Append test cases vào suite hiện tại |
| Major refactor / rewrite module | Tạo suite mới, keep suite cũ làm regression baseline |
| Fix bug | KHÔNG thêm test case mới. Bug fix → re-run existing test + regression |
| Thêm module mới | Tạo suite mới với module prefix khác |

**Archiving:**
```
/tests/
  /OTB/
    /v1.0/  ← archived, dùng cho regression comparison
    /v1.1/  ← current active suite
    CHANGELOG.md  ← track additions/removals per version
```

**File formats:**

| Artifact | Format | Lý do |
|---|---|---|
| Test cases (Q→A→R→P→T) | .md hoặc .yaml | Human-readable + version control friendly |
| Test results | .csv hoặc .json | Machine-readable, dễ tính score tự động |
| Scoring dashboard | .md (filled template) | Quick glance, commit vào repo |
| Regression matrix | .md | Per-fix, commit alongside code change |

**Decision Maker Roles:**

| Quyết định | Solo Dev | Small Team | Enterprise |
|---|---|---|---|
| Chọn Full vs Lite | Tự quyết | Tech lead | QA lead + Tech lead |
| Mark dimension N/A | Tự quyết (justify in writing) | Tech lead | Architect |
| P0 downgrade → P1 | Không được (solo = no peer check) | Tech lead + 1 reviewer | Tech lead + QA lead + PM sign-off |
| Release verdict | Tự quyết (framework decides) | Tech lead | QA lead presents, PM approves |
| Override hard gate | KHÔNG BAO GIỜ | KHÔNG BAO GIỜ | KHÔNG BAO GIỜ |

---

## 9. VIETNAMESE-SPECIFIC TESTING

Hầu hết testing frameworks thiết kế cho English-first. Khi build cho VN, có edge cases đặc thù cần test riêng.

### 9.1 Text & Encoding

| # | Area | Test Case | Expected |
|---|---|---|---|
| 1 | Dấu tiếng Việt | Search "nguyen" tìm "Nguyễn"? | Yes — diacritic-insensitive search |
| 2 | Unicode sorting | Sort: Ân, Bình, Cường, Đức | Đúng thứ tự TV (Đ sau D) |
| 3 | Text overflow | VN text ~30% longer than EN | UI không vỡ layout |
| 4 | Font rendering | Diacritics ở small font 10px | Dấu rõ ràng, không bị cắt |
| 5 | Input methods | Telex, VNI, VIQR | Tất cả gõ smooth, không conflict với shortcuts |
| 6 | PDF export | Export với Vietnamese content | Dấu đúng trong PDF, font embedded |
| 7 | Copy-paste | Copy từ Word/Excel có dấu | Dán vào app giữ đúng dấu |

### 9.2 Numbers, Currency & Dates

| # | Area | Test Case | Expected |
|---|---|---|---|
| 8 | VND Currency | Hiển thị 1234567 VND | 1.234.567 ₫ (chấm phân cách ngàn) |
| 9 | VND Input | User gõ "1.234.567" hoặc "1234567" | Accept cả hai, normalize |
| 10 | Phone format | +84 912 345 678 hoặc 0912345678 | Accept cả hai, normalize |
| 11 | Date format | Hiển thị date | 23/02/2025 (DD/MM/YYYY) |
| 12 | Timezone | Server UTC, display local | GMT+7 consistently |

### 9.3 Vietnamese Identity & Address

| # | Area | Test Case | Expected |
|---|---|---|---|
| 13 | Địa chỉ VN | Vietnamese address structure | Số nhà/Đường/Phường/Quận/TP |
| 14 | CCCD/CMND | 12 digits (CCCD), 9 digits (CMND) | Accept cả hai formats |
| 15 | Mã số thuế | MST 10 or 13 digits | Validate đúng format |
| 16 | Họ tên VN | Nguyễn Thị Ánh Tuyết (4 từ) | Name fields đủ dài, split đúng |

### 9.4 Cross-cutting VN concerns

| Concern | Test | Dimension |
|---|---|---|
| JWT với tên VN có dấu | Token encode/decode "Nguyễn" | D4 Security |
| Email với tên VN | "Nguyễn Văn A" trong email template | D5 Data |
| Sort + filter VN | Sort 1000 tên VN, filter by dấu | D3 Performance |
| Error messages VN | Lỗi hiển thị tiếng Việt đúng ngữ pháp | D1 UI/UX |
| VN in URL slugs | /bao-cao/nguyen-van-a vs /báo-cáo/nguyễn-văn-a | D2 API |

---

## 10. TÍCH HỢP VIBECODE KIT & TOOLING

### 10.1 Workflow: RRI → Code → RRI-T

```
┌─────────┐    ┌──────────────┐    ┌─────────┐    ┌───────────┐
│  RRI    │───►│ Thầu (Arch)  │───►│  Thợ    │───►│   RRI-T   │
│  Disc.  │    │ + RRI-T Plan │    │(Builder)│    │ Execution │
└─────────┘    └──────────────┘    └─────────┘    └───────────┘
      ▲                                                 │
      └────────── 🔲 MISSING items ◄────────────────────┘
```

### 10.2 Khi nào chạy RRI-T?

| Timing | Scope | Trigger |
|---|---|---|
| Pre-code (Phase 1-3) | Test plan + test cases | Sau khi Thầu design xong |
| During-code | Unit + integration tests | Thợ viết code kèm tests |
| Post-code (Phase 4-5) | Full 7-dimension execution | Trước merge/deploy |
| Post-deploy | Smoke + regression | Sau mỗi deployment |
| Monthly | Full regression suite | Scheduled maintenance |

### 10.3 Recommended Tools per Dimension

| Dimension | Tool | Use Case | Install / Link |
|---|---|---|---|
| D1: UI/UX | **Playwright** | E2E browser testing | `npm init playwright@latest` |
| D1: UI/UX | **Axe-core** | Accessibility audit | `npm i @axe-core/cli` |
| D2: API | **Bruno** | API testing, collections | bruno.usebruno.com |
| D2: API | **Dredd** | OpenAPI spec validation | `npm i -g dredd` |
| D3: Performance | **k6** | Load testing (scriptable) | `brew install k6` or k6.io/docs |
| D3: Performance | **Lighthouse CI** | Web vitals | `npm i -g @lhci/cli` |
| D4: Security | **OWASP ZAP** | Automated security scan | zaproxy.org |
| D4: Security | **npm audit** | Dependency vulnerabilities | Built-in: `npm audit` |
| D5: Data | **pgTAP** | PostgreSQL unit tests | `apt install pgtap` or pgtap.org |
| D6: Infra | **UptimeRobot** | Uptime monitoring (free) | uptimerobot.com |
| D6: Infra | **Grafana** | Metrics dashboard | grafana.com (🟡 setup effort) |
| D7: Edge | **Playwright** | Edge case automation | Same as D1 |

### 10.4 Prompt Templates cho Claude Code

**Template 1: Full Persona Interview (Discovery)**

```
ROLE: RRI-T Test Engineer
MODULE: [module name]
PERSONA: [chọn 1 trong 5 personas]
DIMENSION: [chọn 1 trong 7 dimensions]

Hãy đặt ra 20 câu hỏi từ góc nhìn [persona] về [module],
tập trung vào dimension [dimension].
Format output: Q→A→R→P→T cho mỗi câu hỏi.
Include Vietnamese-specific test cases nếu relevant.
Mỗi test case phải có Regression field liệt kê test IDs liên quan.
```

**Template 2: Security Audit Sprint**

```
ROLE: RRI-T Security Auditor
MODULE: [module name]
TECH STACK: [e.g., Next.js 15, Prisma, PostgreSQL]

Phân tích [module] từ góc nhìn Security Auditor:
1. Liệt kê tất cả endpoints/routes
2. Cho mỗi endpoint: test AuthN, AuthZ, input sanitization
3. Check data exposure trong API responses
4. Test rate limiting scenarios
5. Check dependency vulnerabilities

Format: Q→A→R→P→T. Focus P0/P1 chỉ.
Include OWASP Top 10 mapping cho mỗi test case.
```

**Template 3: Regression Impact Analysis**

```
ROLE: RRI-T Regression Analyst
BUG FIX: [mô tả bug đã fix]
FILES CHANGED: [list files]
MODULE: [module name]

Phân tích impact:
1. Direct regression — test cases nào cần re-run?
2. Cross-module regression — modules nào bị ảnh hưởng?
3. Side-effect risks — performance, UI, data calculation?

Output: Danh sách test case IDs cần re-run, xếp theo priority.
```

**Template 4: Vietnamese Edge Cases**

```
ROLE: RRI-T Localization Tester
MODULE: [module name]
LOCALE: vi-VN

Test toàn bộ Vietnamese-specific concerns:
1. Text input: dấu tiếng Việt, input methods (Telex/VNI)
2. Display: VND formatting, date DD/MM/YYYY, timezone GMT+7
3. Search: diacritic-insensitive, Unicode sorting
4. Identity: CCCD/CMND, phone +84, MST, address format
5. Export: PDF/Excel với Vietnamese content

Format: Q→A→R→P→T. Test trên cả mobile và desktop.
```

---

## 11. RRI-T LITE — CHO SOLO DEV & SMALL TEAM

### 11.1 Khi nào dùng Lite?

| Yếu tố | Full Mode | Lite Mode |
|---|---|---|
| Team size | ≥ 3 developers | 1-2 developers |
| Module complexity | Enterprise, multi-role | Simple CRUD, public-facing |
| Timeline | Sprint 2+ tuần | Deploy trong 1-3 ngày |
| User base | > 100 users, multi-department | < 100 users hoặc B2C |
| Compliance | Audit required | Không audit |

### 11.2 Lite Configuration

**Personas: Chọn 3/5 (bắt buộc 👤 + 🔍, chọn thêm 1)**

| Situation | Chọn thêm persona | Lý do |
|---|---|---|
| App có payment/money | 📋 Business Analyst | Business rules phải đúng |
| App public-facing | 🔒 Security Auditor | Exposed to internet = exposed to attack |
| App self-hosted VPS | 🔧 DevOps | Infrastructure risk cao |

**Dimensions: Focus 4/7 (bắt buộc D1 + D2 + D7, chọn thêm 1)**

| Situation | Chọn thêm dimension | Lý do |
|---|---|---|
| Xử lý tiền/data quan trọng | D5: Data Integrity | Mất data = mất tiền |
| Public-facing | D4: Security | Attack surface lớn |
| High traffic expected | D3: Performance | Slow = user bỏ |

**Stress axes: Focus 4/8 (bắt buộc TIME + ERROR + DATA + LOCALE, chọn thêm 0-1)**

> ⚠️ **LOCALE là bắt buộc** cho Vietnamese software. Document này designed for Vietnamese Enterprise Software — nếu skip LOCALE, miss hết Vietnamese edge cases ở Section 9. Chỉ skip LOCALE nếu app target 100% non-Vietnamese users.

### 11.3 Lite Workflow

```
Phase 1:   PREPARE     (30 min)     — Scope + critical paths only
Phase 1.5: CODE-PATH   (30-60 min)  — Focus critical paths only (không cần trace toàn bộ codebase)
Phase 2:   DISCOVER    (1-2 hrs)    — 3 personas × 10-15 questions each = 30-45 test cases
Phase 3:   STRUCTURE   (1 hr)       — Prioritize, write P0+P1 formal only
Phase 4:   EXECUTE     (1-3 hrs)    — P0 first, then P1. Skip P2/P3 if time-pressured
Phase 5:   ANALYZE     (30 min)     — Coverage check, release gate

Total: 4.5-8 giờ (vs 11-24 giờ Full Mode)
```

**Phase 1.5 CODE-PATH (Lite) — chi tiết:**

```
Thời gian: 30-60 phút (vs 1-3 giờ Full Mode)
Focus: CHỈ critical paths — không cần trace toàn bộ codebase

Bắt buộc trace:
  ✅ User input functions — trace empty/null/unexpected → crash?
  ✅ Shared state objects — trace interleaved handler access → data loss?
  ✅ Calculations (nếu có) — trace ALL code paths → formula đúng?

Có thể skip:
  ⬜ Non-critical external calls (logging, analytics)
  ⬜ Internal utility functions không nhận user input
  ⬜ DB queries không liên quan đến critical paths

Output: Mini Code-Path Map (chỉ critical risks, ~5-15 items)
```

### 11.4 Lite Example: E-commerce Astrology Report Site

```
Context: Solo dev, Next.js + Prisma + PostgreSQL, self-hosted VPS
Personas: 👤 End User + 🔍 QA Destroyer + 🔒 Security Auditor
Dimensions: D1 (UI/UX) + D2 (API) + D4 (Security) + D7 (Edge Cases)
Stress: TIME + ERROR + DATA + LOCALE

Test Cases (38 total):
├── 👤 End User (12)
│   ├── D1: Guest checkout flow (3)
│   ├── D1: Payment page UX (3)
│   ├── D2: Order creation API (3)
│   └── D7: Network interruption during payment (3)
├── 🔍 QA Destroyer (14)
│   ├── D2: Duplicate payment submission (3)
│   ├── D7: Concurrent orders same email (3)
│   ├── D7: Invalid input edge cases (4)
│   ├── D2: Webhook retry/failure (3)
│   └── D7: Vietnamese diacritics in name/email fields (1)
├── 🔒 Security (8)
│   ├── D4: Payment API auth (3)
│   ├── D4: Order data exposure (3)
│   └── D4: Rate limiting on checkout (2)
└── 🌐 LOCALE cross-cutting (4)
    ├── D1: VND display formatting (1)
    ├── D2: Diacritic-insensitive search API (1)
    ├── D7: Vietnamese name in PDF report export (1)
    └── D4: Vietnamese characters in JWT/session (1)
```

---

## 12. CASE STUDY MINH HOẠ

### 12.1 Áp dụng RRI-T cho DAFC OTB Budget Module

Sau RRI phát hiện 212 requirements, RRI-T chạy để tạo test suite toàn diện.

**Priority distribution:** 30 P0 (17%) | 55 P1 (32%) | 58 P2 (34%) | 30 P3 (17%)

| Dimension | Tests | ✅ | ⚠️ | ❌ | 🔲 | Weighted | Status |
|---|---|---|---|---|---|---|---|
| D1: UI/UX | 35 | 28 | 3 | 4 | 0 | 82% | 🟡 |
| D2: API | 30 | 27 | 2 | 1 | 0 | 91% | 🟢 |
| D3: Performance | 20 | 18 | 1 | 1 | 0 | 89% | 🟢 |
| D4: Security | 18 | 15 | 2 | 0 | 1 | 84% | 🟡 |
| D5: Data | 25 | 22 | 1 | 0 | 2 | 90% | 🟢 |
| D6: Infrastructure | 15 | 13 | 1 | 1 | 0 | 87% | 🟢 |
| D7: Edge Cases | 30 | 24 | 3 | 2 | 1 | 81% | 🟡 |
| **TỔNG** | **173** | **147** | **13** | **9** | **4** | **86%** | **🟢** |

### 12.2 Specific Bug Discoveries (narrative)

**Bug 1 — Phát hiện bởi 🔍 QA Destroyer, Stress Combo COLLAB × ERROR:**
Scenario: 2 users cùng edit OTB budget line. User A save thành công. User B save sau 3 giây — server trả 200 OK nhưng silently overwrite data của User A. Không có conflict detection. Nếu không có RRI-T persona QA Destroyer hỏi câu "2 người cùng edit, ai thắng?", bug này sẽ lọt production.

**Bug 2 — Phát hiện bởi 🔒 Security Auditor, Dimension D4:**
Scenario: API endpoint GET /api/otb/budgets/{id} không check department-level authorization. User ở department Marketing có thể đoán budget ID của department Finance và xem toàn bộ data. RRI-T Security Auditor persona hỏi câu "sửa ID trong request có leak data?" → phát hiện horizontal access vulnerability.

**Bug 3 — Phát hiện bởi 👤 End User, Vietnamese-Specific:**
Scenario: Search box tìm supplier "Nguyễn" nhưng user gõ "nguyen" (không dấu, do dùng bàn phím EN). Search trả 0 results. RRI-T Vietnamese Testing checklist item #1 (diacritic-insensitive search) bắt được.

**Bug 4 — Phát hiện bởi 🔧 DevOps, Stress Combo INFRA × DATA:**
Scenario: Database migration thêm column mới, bảng OTB có 500K rows. Migration chạy 45 phút, lock table toàn bộ thời gian. Users bị timeout. DevOps Tester hỏi "migration 1M records + concurrent users?" → phát hiện cần online migration strategy.

### 12.3 ROI của RRI-T

| Metric | Không RRI-T | Có RRI-T |
|---|---|---|
| Bugs found pre-release | ~10 | 22 (13 FAIL + 9 PAINFUL) |
| Bugs found post-release | ~15-20 | ~2-3 (estimated) |
| Cost per pre-release bug | $100 | $100 |
| Cost per post-release bug | $1,000-5,000 | $1,000-5,000 |
| **Estimated savings** | — | **$12,000-85,000 per module** |
| Time invested | 0 | ~15 giờ |
| Confidence at release | Low | High |

---

## 13. CHECKLIST TỔNG HỢP

### Phase 1 — PREPARE

- [ ] Thu thập RRI output / requirements / specs
- [ ] Setup test environment + test data
- [ ] Define scope boundaries
- [ ] List all user roles
- [ ] Identify critical paths
- [ ] **Chọn mode: Full hoặc Lite** (xem Section 11)
- [ ] **Nếu Lite: chọn personas, dimensions, stress axes**

### Phase 1.5 — CODE-PATH (v2.3)

- [ ] **Đọc code (hoặc có AI đọc) tất cả critical modules**
- [ ] **Data Flow Trace**: List functions xử lý user input, trace null/empty/unexpected
- [ ] **State Mutation Trace**: List shared state objects, map readers/writers, identify conflicts
- [ ] **Calculation Chain Trace**: List all calculations, trace end-to-end qua mọi code path
- [ ] **External Dependency & DB Query Trace**: List external calls (timeout/error/retry/cleanup) + DB queries (LIMIT/pagination/index)
- [ ] **Output Code-Path Map** (dùng template A.5)
- [ ] **Nếu Lite: chỉ trace critical paths, skip non-critical**

### Phase 2 — DISCOVER

- [ ] End User interview: 25-35 test ideas (Lite: 10-15)
- [ ] BA interview: 20-30 test ideas (Lite: 8-12 hoặc skip)
- [ ] QA Destroyer interview: 25-35 test ideas (Lite: 10-15)
- [ ] DevOps interview: 15-20 test ideas (Lite: 5-8 hoặc skip)
- [ ] Security interview: 15-20 test ideas (Lite: 5-8 hoặc skip)
- [ ] **Cross-reference Vietnamese-specific checklist (Section 9)**
- [ ] **Cross-reference Code-Path Map — mỗi risk phải có ít nhất 1 test case** (v2.3)

### Phase 3 — STRUCTURE

- [ ] Classify test cases vào 7 (hoặc 4 nếu Lite) Dimensions
- [ ] Prioritize Impact × Likelihood matrix
- [ ] Viết Q→A→R→P→T cho P0 và P1
- [ ] **Assign weights cho coverage scoring**
- [ ] **Map regression dependencies giữa test cases**
- [ ] Review Vietnamese-specific checklist

### Phase 4 — EXECUTE

- [ ] Chạy tất cả P0 test cases trước
- [ ] Ghi kết quả 4-level (✅⚠️❌🔲)
- [ ] Log FAIL làm bug tickets
- [ ] Log PAINFUL làm improvement tickets
- [ ] Feedback MISSING về requirements (→ RRI loop)
- [ ] **Chạy automated tools nếu applicable** (Section 10.3)

### Phase 5 — ANALYZE

- [ ] Tính **weighted** coverage per dimension
- [ ] Check **hard gates** (P0 zero-FAIL, D4 ≥ 80%, dimension floor ≥ 70%)
- [ ] Check release gate criteria
- [ ] **Regression trên tất cả fixes** (dùng Regression Matrix template)
- [ ] Generate Coverage Matrix report (dùng dashboard template Section 8.3)
- [ ] **Archive test results cho future regression baseline**

---

## 14. ANTI-PATTERNS & TROUBLESHOOTING

### 14.1 Anti-Patterns — Những sai lầm phổ biến

| # | Anti-Pattern | Hệ quả | Cách fix |
|---|---|---|---|
| 1 | **"Test mọi thứ"** — viết 300 test cases không prioritize | Chạy không hết, mệt mỏi, bỏ cuộc | Dùng Impact × Likelihood matrix. Chạy P0 trước, luôn luôn. |
| 2 | **"Copy-paste personas"** — hỏi cùng 1 câu cho 5 personas | 5 lần duplicate, 0 insight mới | Mỗi persona có câu hỏi gợi ý riêng (Section 3.2-3.6). Persona phải thay đổi GÓC NHÌN, không chỉ thay label. |
| 3 | **"Pass/Fail binary"** — bỏ qua ⚠️ PAINFUL | UX debt tích luỹ, user chịu đựng → rồi bỏ | Log PAINFUL thành improvement tickets. Track debt. |
| 4 | **"Test xong quên"** — không archive results | Fix bug → không biết test gì lại | Archive results. Dùng Regression Matrix. |
| 5 | **"100% coverage = quality"** — chase số đẹp | Toàn test cases dễ cho đẹp, bỏ qua hard cases | Weighted scoring phạt nặng P0 FAIL. Hard gates không thể hack. |
| 6 | **"Skip Lite, jump Full"** — solo dev cố chạy 140 test cases | Burn out, làm nửa chừng bỏ | Solo dev PHẢI dùng Lite. 35 test cases tốt hơn 70 test cases nửa vời. |
| 7 | **"Security last"** — để D4 cuối cùng, hết thời gian skip | Lỗ hổng bảo mật lọt production | D4 Security là hard gate (≥ 80%). Chạy sớm, không skip. |
| 8 | **"Single-persona tunnel vision"** — chỉ audit từ 1 góc nhìn | Miss cross-persona tensions (UX vs Security, Business rules vs Edge cases) | Chạy persona combos Tier 1 (Section 16) |

### 14.2 Troubleshooting

| Vấn đề | Nguyên nhân có thể | Giải pháp |
|---|---|---|
| Weighted score cao nhưng user vẫn phàn nàn | Thiếu ⚠️ PAINFUL tracking | Review tất cả PAINFUL items — chúng là UX debt |
| Test cases quá abstract, không biết test cụ thể gì | Phase 2 DISCOVER bị rushed | Quay lại DISCOVER, dùng câu hỏi gợi ý cụ thể cho từng persona |
| Regression bugs xuất hiện liên tục | Không có Regression Matrix | Implement Section 6.5 template, re-run sau mỗi fix |
| Coverage tăng mãi nhưng chất lượng thấp | Toàn P3 test cases cho đẹp số | Kiểm tra phân bố priority. P0+P1 phải ≥ 40% tổng test cases |
| Vietnamese edge cases bị miss | Không review Section 9 checklist | Bắt buộc cross-reference Section 9 trong Phase 2 |
| P0 FAIL vs PAINFUL tranh cãi | Ranh giới không rõ | Dùng bảng criteria Section 8.1. Rule: nghi ngờ → đánh FAIL |

---

## 15. KHI NÀO KHÔNG DÙNG RRI-T

RRI-T không phải silver bullet. Có tình huống nó là overkill:

| Scenario | Dùng RRI-T? | Thay thế |
|---|---|---|
| Hotfix 1-3 dòng CSS/copy | ❌ Không | Visual check + deploy |
| Landing page tĩnh, không backend | ❌ Không | Lighthouse audit + browser test |
| Prototype throwaway (< 1 tuần lifespan) | ❌ Không | Manual smoke test |
| Internal script chạy 1 lần | ❌ Không | Unit test cho logic chính |
| Bug fix nhỏ, scope rõ ràng | 🟡 Chỉ Regression Matrix (Section 6.5) | Skip full RRI-T, chỉ regression |
| Feature mới cho existing module | ✅ Lite | Focus personas + dimensions relevant |
| Module mới, sẽ có users thực | ✅ Lite hoặc Full | Tuỳ scale (Section 11.1) |
| Enterprise release, multi-team | ✅ Full | Bắt buộc Full + persona combos |

**Rule of thumb:** Nếu code sẽ được dùng bởi > 1 người và tồn tại > 1 tháng → ít nhất chạy RRI-T Lite.

---

## 16. PERSONA COMBO AUDIT STRATEGY

### 16.1 Tại sao cần persona combos?

Single-persona audit tìm issues từ 1 góc nhìn. Nhưng nhiều bugs chỉ xuất hiện khi 2+ personas **conflict** — khi yêu cầu của persona A mâu thuẫn với persona B.

### 16.2 Audit Plan — 15 passes tối ưu

```
VÒNG 1 — Singles (5 passes, tìm issues từng góc nhìn)
  👤 End User       → Focus D1, D7
  📋 BA             → Focus D2, D5
  🔍 QA Destroyer   → Focus D7, D2
  🔧 DevOps         → Focus D3, D6
  🔒 Security       → Focus D4

VÒNG 2 — Tier 1 Pairs (4 passes, high tension)
  👤 × 🔒  UX vs Security       "User muốn đơn giản ↔ Security muốn thêm bước"
  👤 × 🔍  Happy path vs Break  "User flow A→B→C ↔ QA: giữa B→C mất mạng?"
  📋 × 🔍  Rules vs Edge cases  "Field bắt buộc ↔ Paste emoji vào thì sao?"
  🔧 × 🔒  Infra vs Security    "Open debug port ↔ Lock hết"

VÒNG 3 — Tier 2 Pairs (4 passes, medium tension)
  👤 × 🔧  UX vs Infra          "Real-time ↔ Server chịu không nổi"
  📋 × 🔒  Rules vs Security    "Audit trail chi tiết ↔ Log chứa PII"
  🔍 × 🔒  Break vs Security    "Tìm XSS ↔ Còn chỗ nào tương tự?"
  🔍 × 🔧  Edge vs Infra        "Spam 1000 requests ↔ Rate limit?"

VÒNG 4 — Critical Trios (2 passes, only if relevant)
  👤 × 🔒 × 🔧  "Fast upload ↔ Virus scan ↔ Scan latency"
  📋 × 🔍 × 🔒  "Log mọi thứ ↔ 1M records ↔ Log chứa PII"
```

**Tổng: 15 passes → ~95% discoverable issues**

### 16.3 Known Cross-Persona Tensions

Dưới đây là các tensions đã phát hiện. Khi audit persona combo, ưu tiên kiểm tra những tensions này:

| Combo | Tension | Câu hỏi để test |
|---|---|---|
| 👤 × 🔒 | Session timeout vs unsaved work | "User đang edit, session hết hạn → auto-save đã chạy chưa?" |
| 👤 × 🔒 | Offline cache vs data security | "App cache data offline → sensitive data nằm trên device, encrypt?" |
| 👤 × 🔍 | Happy path + edge case cùng lúc | "Giữa checkout, double-click submit + mất mạng — chuyện gì xảy ra?" |
| 📋 × 🔍 | Business rule at boundary | "Giảm 5% khi mua > 10M. Mua đúng 10.000.000 → giảm hay không?" |
| 🔧 × 🔒 | Backup encryption cross-env | "Restore backup lên env khác → encryption keys khác → fail?" |
| 🔧 × 🔒 | Server compromise scope | "Attacker có DB access → encrypted data at rest → key ở đâu?" |
| 📋 × 🔒 | Audit trail PII | "Log user actions chi tiết → log chứa credit card/password?" |
| 🔍 × 🔒 | Error message data leak | "XSS blocked → error message phản hồi input gốc = reflected XSS?" |
| 🔍 × 🔧 | Legitimate rapid use vs rate limit | "User click nhanh (legitimate) bị rate limiter block?" |
| 👤 × 🔧 | Client device + server load | "User 3G chậm + server under load = compound latency?" |
| 👤 × 🔒 × 🔧 | File upload tradeoff | "10MB upload → virus scan 5s → UX degraded → accept risk hay show progress?" |
| 📋 × 🔍 × 🔒 | Log volume tradeoff | "Log everything (audit) × millions of records (stress) × PII in logs (security) → retention policy?" |

### 16.4 Tier Skip Rules

| Combo tier | Bỏ qua khi | Lý do |
|---|---|---|
| Tier 2 | Timeline < 2 ngày | Tier 1 đã cover high-risk |
| Tier 2: 📋 × 🔧 | App không có business rules phức tạp | BA và DevOps gần như independent |
| Trios | App đơn giản, 1 module | Three-way tension hiếm xảy ra |
| Trios | Đã chạy Tier 1+2 và 0 cross-findings | Nếu pairs không tìm thấy gì, trios cũng sẽ ít |

---

## 17. PEER REVIEW & EVIDENCE

### 17.1 Tại sao cần peer review?

Scoring framework chỉ tốt khi data input chính xác. Nếu tester rubber-stamp PASS → score cao giả → release buggy software.

### 17.2 Evidence Requirements

| Priority | Evidence cần thiết | Solo Dev | Team |
|---|---|---|---|
| P0 | Screenshot/video + log excerpt | Tự ghi (commit vào repo) | Reviewer verify |
| P1 | Screenshot hoặc test output | Tự ghi | Spot-check 30% |
| P2-P3 | Result ghi chú đủ | Tự ghi | Trust but verify |

### 17.3 Review Process

| Mode | Process |
|---|---|
| Solo Dev | Self-review: chạy P0 tests 2 lần vào 2 ngày khác nhau. Nếu result khác → investigate. Commit evidence vào `/tests/evidence/` |
| Small Team (2-3) | Pair review: dev A test, dev B verify P0 results. Swap roles mỗi sprint |
| Enterprise | QA team test. Tech lead review P0+P1 results with evidence. Sign-off required before release gate |

**Rule:** P0 results KHÔNG BAO GIỜ trust without evidence. Nếu không có evidence → treat as UNTESTED (worse than FAIL).

---

## CÔNG THỨC THÀNH CÔNG RRI-T

### **EMPATHY × STRUCTURE × CODE-TRACING × EXHAUSTIVENESS × MEASUREMENT × SCALE**

(5 Personas) · (7 Dimensions) · (8 Stress Axes) · (Code-Path Analysis) · (Weighted Coverage) · (Full hoặc Lite)

= **COMPLETE QUALITY ASSURANCE — Ở MỌI QUY MÔ, TỪ CODE ĐẾN USER**

---

> *RRI tìm ra requirements TRƯỚC KHI code.*
> *RRI-T chứng minh code ĐÁP ỨNG requirements — và phát hiện những gì requirements CHƯA COVER.*
> *RRI-T v2.3 làm điều đó ở mọi quy mô — kết hợp top-down framework VÀ bottom-up code tracing — tìm mọi bug từ code đến user.*

---

*RRI-T Methodology v2.3*
*Built on: RRI → v1.0 → v2.0 → v2.1 → v2.2 → v2.3*
*v2.3: Code-Path Analysis — bottom-up code tracing catches ALL runtime bugs*
*Self-tested: 3 audit rounds, 16 persona-combo passes, 36 findings resolved*
*Designed for Vietnamese Enterprise Software*
*Optimized for Vibecode Kit + Claude Code*
*Scalable: Full Mode (Enterprise) + Lite Mode (Solo/Small Team)*

---

## APPENDIX A: COPY-PASTE TEMPLATES

Tất cả templates tập trung ở đây để dễ copy. Chi tiết cách dùng xem sections tương ứng.

### A.1 Test Case Template (Section 7.1)

```
ID:          [MODULE]-[DIMENSION]-[NUMBER]
Persona:     [👤|📋|🔍|🔧|🔒]

Q: [Câu hỏi từ góc nhìn persona — phải CỤ THỂ, không generic]
A: [Expected behavior — measurable, testable]
R: [REQ-XXX: Requirement rút ra]
P: [P0|P1|P2|P3]

T: TEST CASE
   Precondition: [Setup cần thiết trước khi test]
   Steps:
     1. [Action cụ thể]
     2. [Action cụ thể]
     3. [Observe/measure]
   Expected: [Kết quả chi tiết — số liệu, text exact, timing]
   Dimension: [D1-D7]
   Stress: [Chiều stress, nếu có]

Result: [✅|⚠️|❌|🔲] [Notes]
Regression: [Test IDs bị ảnh hưởng nếu fix]
```

### A.2 Regression Matrix Template (Section 6.5)

```
BUG FIX: [Bug ID] [Mô tả ngắn]
MODULE CHANGED: [Module bị sửa]
FILES CHANGED: [List files]

DIRECT REGRESSION:
  □ Re-run test case gốc: [ID]
  □ Re-run P0 tests cùng module: [IDs]

CROSS-MODULE REGRESSION:
  □ Modules liên quan: [list]
  □ Re-run P0+P1 tests: [IDs]

SIDE-EFFECT CHECK:
  □ Performance regression? [Y/N] — response time before/after
  □ UI regression? [Y/N] — layout shift, broken styles
  □ Data regression? [Y/N] — calculation changes

RE-RUN RESULT: [✅ All pass | ❌ New failures found: ___]
```

### A.3 Scoring Dashboard Template (Section 8.4)

```
MODULE: _______________
DATE: _______________
MODE: [Full | Lite]
TESTER: _______________

┌──────────────────┬───────┬────┬────┬────┬────┬──────────┬────────┐
│ Dimension        │ Tests │ ✅  │ ⚠️  │ ❌  │ 🔲  │ Weighted │ Status │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ D1: UI/UX        │       │    │    │    │    │      %   │        │
│ D2: API          │       │    │    │    │    │      %   │        │
│ D3: Performance  │       │    │    │    │    │      %   │        │
│ D4: Security     │       │    │    │    │    │      %   │        │
│ D5: Data         │       │    │    │    │    │      %   │        │
│ D6: Infra        │       │    │    │    │    │      %   │        │
│ D7: Edge Cases   │       │    │    │    │    │      %   │        │
├──────────────────┼───────┼────┼────┼────┼────┼──────────┼────────┤
│ TOTAL            │       │    │    │    │    │      %   │        │
└──────────────────┴───────┴────┴────┴────┴────┴──────────┴────────┘

HARD GATES:
  P0 FAIL count:    ___ → [PASS/BLOCK]
  P0 MISSING count: ___ → [PASS/BLOCK]
  D4 Security:      ___% → [PASS/BLOCK] (gate: ≥ 80%)
  Min Dimension:    ___% → [PASS/BLOCK] (gate: ≥ 70%)

VERDICT: [🟢 RELEASE | 🟡 CONDITIONAL | 🔴 BLOCKED]
NOTES: _______________
```

### A.4 Triage Template (Section 6.5)

```
DATE: _______________
P0 FAIL COUNT: ___
RELEASE BLOCKED: [Y/N]

CLASSIFICATION:
  By dimension: D1:___ D2:___ D3:___ D4:___ D5:___ D6:___ D7:___
  Root cause groups: [list common root causes]
  Dependency chains: [FAIL X blocks test Y, Z]

FIX PLAN:
  Batch 1 (Quick Wins < 2h):
    □ [Bug ID] — [description] — est: ___h
    □ [Bug ID] — [description] — est: ___h
  Batch 2 (Heavy > 1 day):
    □ [Bug ID] — [description] — est: ___d
  
  Re-run after each batch: [test IDs]

POST-FIX STATUS:
  Remaining P0 FAILs: ___
  Weighted score: ___%
  Release decision: [🟢|🟡|🔴]
```

### A.5 Code-Path Map Template (Section 6.0.1 — v2.3)

```
CODE-PATH MAP — [Project Name]
Date: _______________
Mode: [Full | Lite]
Analyst: _______________

═══════════════════════════════════════════════════
DATA FLOW RISKS
═══════════════════════════════════════════════════

[P?] [file:line] — [function_name]
  Input: [source of input]
  Risk: [what can go wrong — null/empty/unexpected]
  Impact: [what happens if risk materializes]
  Test: → [DISCOVER Phase test case ID, filled later]

[P?] [file:line] — [function_name]
  Input: ...
  Risk: ...
  Impact: ...
  Test: →

═══════════════════════════════════════════════════
STATE MUTATION RISKS
═══════════════════════════════════════════════════

[P?] [shared_state_name] — [file:line]
  Readers: [list files/functions that READ this state]
  Writers: [list files/functions that WRITE this state]
  Conflict scenario: [describe interleaved access]
  Impact: [data loss? stale read? wrong behavior?]
  Test: →

═══════════════════════════════════════════════════
CALCULATION CHAIN RISKS
═══════════════════════════════════════════════════

[P?] [file:line] — [formula description]
  Chain: [step1] → [step2] → [step3] → [output]
  Miss path: [retry/partial/continuation path that bypasses a step]
  Impact: [wrong calculation result]
  Test: →

═══════════════════════════════════════════════════
EXTERNAL DEPENDENCY RISKS
═══════════════════════════════════════════════════

[P?] [file:line] — [external service/API]
  Timeout: [configured? value?]
  Error handling: [try/except? specific? catch-all?]
  Retry: [yes/no, idempotent?]
  Cleanup: [resource release on error?]
  Test: →

═══════════════════════════════════════════════════
DB QUERY RISKS
═══════════════════════════════════════════════════

[P?] [file:line] — [query description]
  LIMIT/pagination: [hardcoded? scalable?]
  Index: [covered? missing?]
  N+1: [yes/no]
  Test: →

═══════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════

Total risks: ___
  P1: ___ | P2: ___ | P3: ___

Top 3 risks to address in DISCOVER:
  1. [file:line] — [short description]
  2. [file:line] — [short description]
  3. [file:line] — [short description]
```
