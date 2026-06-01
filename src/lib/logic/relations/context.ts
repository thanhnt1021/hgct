// Phase E placeholder — reuse the synastry prompt + prepend a context-shift
// instruction so Claude rewrites the same chart-comparison output in the
// frame of the chosen relationship type (parent–child, colleague, friend, etc.)
// instead of romantic love.
//
// When time allows, anh có thể tách thành 4 file template riêng để giọng văn
// tinh chỉnh sâu hơn. Hiện tại 1 context block là đủ cho MVP.

export type RelationsType =
  | 'relations-parents'
  | 'relations-children'
  | 'relations-colleague'
  | 'relations-friend'

const TYPE_CONTEXT: Record<RelationsType, { label: string; tone: string; replace: string }> = {
  'relations-parents': {
    label: 'mối quan hệ giữa bạn và bố mẹ / người thân lớn tuổi',
    tone: 'tôn kính, biết ơn, thấu hiểu hai chiều — nhìn cả góc của bố mẹ lẫn góc của bạn',
    replace: 'mối quan hệ giữa con cái với bố mẹ',
  },
  'relations-children': {
    label: 'mối quan hệ giữa bạn (vai trò bố/mẹ) và con cái',
    tone: 'ấm áp, đồng hành, không kiểm soát — nhìn con như một bản đồ sao riêng đang lớn lên',
    replace: 'mối quan hệ giữa bố mẹ với con cái',
  },
  'relations-colleague': {
    label: 'mối quan hệ với đồng nghiệp / cộng sự công việc',
    tone: 'chuyên nghiệp, hợp tác, tôn trọng ranh giới công việc — KHÔNG nói về cảm xúc yêu đương',
    replace: 'mối quan hệ giữa hai đồng nghiệp',
  },
  'relations-friend': {
    label: 'mối quan hệ bạn bè / cộng đồng',
    tone: 'thân tình, bình đẳng, tự do — nhìn nhau như những người đồng hành chọn nhau giữa cuộc đời',
    replace: 'tình bạn / mối quan hệ bạn bè',
  },
}

export function relationsContextBlock(type: RelationsType): string {
  const c = TYPE_CONTEXT[type]
  if (!c) return ''
  return `=== BỐI CẢNH MỐI QUAN HỆ — ĐỌC TRƯỚC ===

Đây KHÔNG phải mối quan hệ tình yêu / hôn nhân. Đây là ${c.label}.

NGUYÊN TẮC BẮT BUỘC khi điền nội dung:
- Mỗi khi template gốc nói về "tình yêu", "người yêu", "đôi yêu nhau", "cặp đôi", "lãng mạn", "hôn nhân" — hãy viết lại theo ngữ cảnh ${c.replace}. KHÔNG giữ nguyên các từ này.
- Tone: ${c.tone}.
- Khi nói về "kết nối", "hòa hợp", "khác biệt", "bài học" — diễn giải dưới góc nhìn ${c.label}, KHÔNG dưới góc tình yêu lãng mạn.
- Greeting đầu bài: thay vì nói về "tình yêu và các mối quan hệ", hãy viết về ${c.label} cụ thể.
- KHÔNG đề cập đến "cưới hỏi", "đi cùng nhau suốt đời", "chung sống lâu dài lãng mạn" trong bất kỳ phần nào.

=== KẾT THÚC BỐI CẢNH ===

`
}
