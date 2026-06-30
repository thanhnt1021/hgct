// Catalog of sections per service. Each section is a coin-unlockable unit.
// Data lives here (not in UI) so anh có thể sửa giá/title/subtitle bất cứ lúc nào
// mà không phải đụng vào JSX.
//
// Pricing source: PRD §3.G (bảng Excel mới nhất). Vận hạn dùng default
// 79/69/69/59/59/49 = 384 — anh có thể điều chỉnh.

export interface CatalogSection {
  /** Stable id (used as part of unlock key). Format: <service>-<index>. */
  id: string
  /** 1-based index — also the visible section number on the page. */
  index: number
  title: string
  subtitle: string
  coinPrice: number
}

export interface CatalogService {
  /** Service type key matching DEFAULT_SERVICES + LLM prompt routing. */
  type: string
  /** Display label shown in the reading view. */
  label: string
  sections: CatalogSection[]
  /** Bundle price — mua trọn cục (rẻ hơn cộng dồn lẻ). Null = không có bundle. */
  bundlePrice?: number
}

const career: CatalogService = {
  type: 'career',
  label: 'Sự nghiệp & Tiền bạc',
  bundlePrice: 600, // cộng dồn lẻ 604 → tròn xuống 600
  sections: [
    { id: 'career-1', index: 1, title: 'Bạn thật sự là ai?',                                        subtitle: 'Khám phá con người thật, năng lượng cốt lõi và điều khiến bạn cảm thấy được là chính mình.',                                       coinPrice: 59  },
    { id: 'career-2', index: 2, title: 'Năng lực bẩm sinh của bạn là gì?',                          subtitle: 'Những điểm mạnh tự nhiên, tài năng bẩm sinh giúp bạn dễ dàng phát triển và tạo ra giá trị lâu dài bền vững.',                  coinPrice: 119 },
    { id: 'career-3', index: 3, title: 'Điều gì đang cản trở bạn phát triển?',                      subtitle: 'Hiểu rõ những điểm yếu, thách thức và bài học cần trưởng thành để phát triển vững vàng hơn.',                                  coinPrice: 89  },
    { id: 'career-4', index: 4, title: 'Đâu là hướng nghề nghiệp giúp bạn phát triển tốt nhất?',    subtitle: 'Định hướng công việc phù hợp với năng lượng, điểm mạnh và tiềm năng tự nhiên của bạn.',                                       coinPrice: 119 },
    { id: 'career-5', index: 5, title: 'Đâu là con đường kiếm tiền phù hợp với bạn?',               subtitle: 'Khám phá cách tạo thu nhập thuận lợi dựa trên thế mạnh cá nhân và những bài học về tài chính cần lưu ý.',                      coinPrice: 119 },
    { id: 'career-6', index: 6, title: 'Chiến lược phát triển sự nghiệp của bạn là gì?',            subtitle: 'Gợi ý lộ trình xây dựng con đường nghề nghiệp bền vững lâu dài dựa trên năng lực và thế mạnh của bản thân.',                  coinPrice: 99  },
  ],
}

const love: CatalogService = {
  type: 'love',
  label: 'Tình duyên cá nhân',
  bundlePrice: 300, // cộng dồn lẻ 356 → tròn xuống 300
  sections: [
    { id: 'love-1', index: 1, title: 'Bạn thật sự cần điều gì trong tình yêu?',                              subtitle: 'Hiểu rõ nhu cầu cảm xúc, cách yêu và điều bạn luôn tìm kiếm trong các mối quan hệ.',                                coinPrice: 69  },
    { id: 'love-2', index: 2, title: 'Điều gì khiến trái tim bạn thật sự rung động?',                        subtitle: 'Khám phá mẫu người phù hợp với tính cách, cảm xúc và nhu cầu sâu bên trong của bạn.',                                coinPrice: 69  },
    { id: 'love-3', index: 3, title: 'Điều gì là "nút thắt" lớn nhất trong chuyện tình cảm của bạn?',         subtitle: 'Hiểu rõ những bài học, tổn thương cảm xúc và cách tháo gỡ để yêu nhẹ nhàng hơn.',                                    coinPrice: 119 },
    { id: 'love-4', index: 4, title: 'Làm sao để bạn không còn lặp lại những tổn thương cũ trong tình yêu?',  subtitle: 'Hiểu rõ con đường cảm xúc và cách xây dựng một mối quan hệ trưởng thành hơn.',                                       coinPrice: 99  },
  ],
}

const synastry: CatalogService = {
  type: 'synastry',
  label: 'Mối quan hệ cặp đôi',
  bundlePrice: 800, // cộng dồn lẻ 805 → tròn xuống 800
  sections: [
    { id: 'synastry-1', index: 1, title: 'Vì sao hai bạn lại gặp nhau và có sự kết nối đặc biệt này?', subtitle: 'Khám phá bức tranh tổng thể của mối quan hệ và năng lượng khi hai bạn ở cạnh nhau.',                                coinPrice: 119 },
    { id: 'synastry-2', index: 2, title: 'Vì sao hai bạn lại bị thu hút mạnh mẽ bởi nhau?',            subtitle: 'Khám phá sợi dây kết nối cảm xúc và điều khiến hai bạn tìm thấy nhau giữa rất nhiều người.',                          coinPrice: 159 },
    { id: 'synastry-3', index: 3, title: 'Bạn có đang yêu đúng cách mà đối phương cần không?',         subtitle: 'Hiểu rõ cách mỗi người thể hiện cảm xúc và đón nhận tình yêu trong mối quan hệ.',                                     coinPrice: 229 },
    { id: 'synastry-4', index: 4, title: 'Hai bạn có thật sự phù hợp để đi cùng nhau lâu dài?',        subtitle: 'Phân tích những điểm hòa hợp, khác biệt và cách xây dựng sự kết nối bền vững hơn.',                                   coinPrice: 159 },
    { id: 'synastry-5', index: 5, title: 'Đâu là "la bàn" giúp mối quan hệ này đi đúng hướng?',         subtitle: 'Hiểu rõ chìa khóa giúp cả hai có thể đồng hành, thấu hiểu và phát triển cùng nhau lâu dài.',                          coinPrice: 139 },
  ],
}

// Phase E: each relation type mirrors the Cặp đôi structure (5 mục synastry,
// same price ladder 119/159/229/159/139 → bundle 800). Titles/subtitles are
// adapted from the synastry copy so "đối phương" reads correctly for each
// relationship (bố mẹ / con cái / đồng nghiệp / bạn bè).
interface RelationCopy { type: string; label: string; them: string; theyShort: string }

function makeRelations5(c: RelationCopy): CatalogService {
  const them = c.them          // e.g. "bố mẹ", "con", "đồng nghiệp", "bạn"
  const themShort = c.theyShort // e.g. "bố mẹ", "con", "đồng nghiệp ấy", "bạn ấy"
  return {
    type: c.type,
    label: `Mối quan hệ — ${c.label}`,
    bundlePrice: 800, // 805 → tròn xuống 800 (giống Cặp đôi)
    sections: [
      { id: `${c.type}-1`, index: 1,
        title: `Vì sao bạn và ${them} lại có sự kết nối đặc biệt này?`,
        subtitle: `Khám phá bức tranh tổng thể của mối quan hệ và năng lượng khi hai bên ở cạnh nhau.`,
        coinPrice: 119 },
      { id: `${c.type}-2`, index: 2,
        title: `Vì sao bạn và ${them} lại bị thu hút / gắn bó như vậy?`,
        subtitle: `Khám phá sợi dây kết nối cảm xúc và điều khiến mối quan hệ này có ý nghĩa với cả hai.`,
        coinPrice: 159 },
      { id: `${c.type}-3`, index: 3,
        title: `Bạn có đang thấu hiểu ${themShort} theo cách mà họ thật sự cần không?`,
        subtitle: `Hiểu rõ cách mỗi người thể hiện cảm xúc và đón nhận sự kết nối trong mối quan hệ này.`,
        coinPrice: 229 },
      { id: `${c.type}-4`, index: 4,
        title: `Bạn và ${them} có thật sự phù hợp để đồng hành lâu dài không?`,
        subtitle: `Phân tích những điểm hòa hợp, khác biệt và cách xây dựng sự kết nối bền vững hơn.`,
        coinPrice: 159 },
      { id: `${c.type}-5`, index: 5,
        title: `Đâu là "la bàn" giúp mối quan hệ này đi đúng hướng?`,
        subtitle: `Hiểu rõ chìa khóa giúp cả hai có thể đồng hành, thấu hiểu và phát triển cùng nhau lâu dài.`,
        coinPrice: 139 },
    ],
  }
}

const relationsParents   = makeRelations5({ type: 'relations-parents',   label: 'Bố mẹ / người thân', them: 'bố mẹ',         theyShort: 'bố mẹ' })
const relationsChildren  = makeRelations5({ type: 'relations-children',  label: 'Con cái',            them: 'con',            theyShort: 'con' })
const relationsColleague = makeRelations5({ type: 'relations-colleague', label: 'Đồng nghiệp',        them: 'đồng nghiệp ấy', theyShort: 'đồng nghiệp ấy' })
const relationsFriend    = makeRelations5({ type: 'relations-friend',    label: 'Bạn bè / cộng đồng', them: 'người bạn này',  theyShort: 'người bạn ấy' })

const transit: CatalogService = {
  type: 'transit',
  label: 'Vận hạn',
  bundlePrice: 400, // cộng dồn lẻ 424 → tròn xuống 400
  sections: [
    { id: 'transit-1', index: 1, title: 'Năm nay sẽ là một năm thuận lợi hay nhiều thử thách với bạn?',                          subtitle: 'Khám phá tổng quan vận hạn, những cơ hội cần nắm bắt và điều bạn cần lưu ý trong năm nay.',                  coinPrice: 59 },
    { id: 'transit-2', index: 2, title: 'Điều gì là trọng tâm lớn nhất trong công việc của bạn giai đoạn này?',                  subtitle: 'Hiểu rõ những cơ hội phát triển, áp lực và bài học sự nghiệp bạn đang đi qua.',                              coinPrice: 79 },
    { id: 'transit-3', index: 3, title: 'Đây có phải là năm tài chính khởi sắc của bạn không?',                                  subtitle: 'Hiểu rõ vận may tiền bạc, cơ hội phát triển thu nhập và các giai đoạn cần cẩn trọng hơn.',                    coinPrice: 79 },
    { id: 'transit-4', index: 4, title: 'Bạn cần lưu ý điều gì trong chuyện tình cảm và hôn nhân năm nay?',                       subtitle: 'Khám phá những thay đổi, cơ hội và thử thách trong tình yêu và hôn nhân giai đoạn này.',                       coinPrice: 69 },
    { id: 'transit-5', index: 5, title: 'Năm nay có phải là thời điểm phù hợp để chuyển nhà, sửa nhà hoặc thay đổi không gian sống?', subtitle: 'Hiểu rõ vận hạn liên quan đến nhà cửa và những điều bạn cần lưu ý trước các quyết định quan trọng.',     coinPrice: 69 },
    { id: 'transit-6', index: 6, title: 'Sức khỏe của bạn năm nay cần lưu ý điều gì?',                                            subtitle: 'Khám phá những vấn đề sức khỏe cần lưu tâm và hướng cân bằng phù hợp cho bản thân.',                            coinPrice: 69 },
  ],
}

export const CATALOG: Record<string, CatalogService> = {
  career: career,
  love: love,
  synastry: synastry,
  transit: transit,
  'relations-parents':   relationsParents,
  'relations-children':  relationsChildren,
  'relations-colleague': relationsColleague,
  'relations-friend':    relationsFriend,
}

export function getCatalog(serviceType: string): CatalogService | null {
  return CATALOG[serviceType] ?? null
}

export function getSection(serviceType: string, sectionId: string): CatalogSection | null {
  const svc = getCatalog(serviceType)
  return svc?.sections.find(s => s.id === sectionId) ?? null
}
