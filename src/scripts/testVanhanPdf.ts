/**
 * Test script: generates a Vận Hạn PDF with section 1 only.
 * Run: DATABASE_URL="..." npx tsx src/scripts/testVanhanPdf.ts
 * Output: /root/hgct/imgs/testCanvaVanhan.pdf
 */
import fs from 'fs'
import path from 'path'
import { generatePdf, cleanForPdf } from '../lib/pdf/generator'

const OUTPUT_PATH = '/root/hgct/imgs/testCanvaVanhan.pdf'

// Sample section 1 essay (Tổng Quan Vận Hạn) with [KTLUẬN] box
const SAMPLE_ESSAY = `Kính gửi Diệu Hương,

1. TỔNG QUAN VẬN HẠN 2026

Năm 2026 mở ra với một làn sóng năng lượng chuyển đổi sâu sắc trong cuộc hành trình của Diệu Hương. Với sự hiện diện của Sao Mộc đang di chuyển qua Cung Ung Phu trong nửa đầu năm, đây là giai đoạn bầu trời chiêm tinh ủng hộ những ai biết mở lòng đón nhận cơ hội mới với tất cả sự kiên nhẫn và trí tuệ. Bản đồ vận hạn năm nay cho thấy sự giao thoa đặc biệt giữa Thổ Tinh và Thiên Vương Tinh, tạo ra những áp lực mang tính định hình lại căn bản các giá trị sống.

Thời kỳ từ tháng 1 đến tháng 6 năm 2026 được đánh dấu bởi năng lượng của sự tái khởi đầu. Diệu Hương sẽ cảm nhận rõ rệt những rung động thay đổi bên trong nội tâm, như thể có một lực kéo vô hình đang nhẹ nhàng mời gọi bạn rũ bỏ những gì không còn phù hợp và bước vào một trang mới. Đây không phải là thay đổi đột ngột hay phá vỡ, mà là một quá trình tinh tế và có chiều sâu.

Tổng Kết Năng Lượng Năm:

Chỉ số thuận lợi tổng thể của năm 2026 nghiêng về phía tích cực, đặc biệt trong các lĩnh vực học tập, mở rộng tầm nhìn và phát triển bản thân. Sao Mộc — hành tinh của sự mở rộng và phúc lành — mang đến những cơ hội không dễ tìm thấy trong các năm thông thường. Tuy nhiên, Thổ Tinh cũng đồng thời kêu gọi sự kỷ luật và trách nhiệm để những cơ hội đó thực sự được hiện thực hóa.

Điều quan trọng cần ghi nhớ trong năm này là: năng lượng vũ trụ chỉ mở cánh cửa, còn việc bước qua ngưỡng cửa đó hay không phụ thuộc hoàn toàn vào sự lựa chọn và hành động có ý thức của bạn. Mỗi quyết định trong năm 2026 đều mang trọng lượng lớn hơn bình thường, bởi vì chúng đang đặt nền móng cho một chu kỳ dài hạn trong cuộc đời.

[KTLUẬN] Năm 2026 là năm của sự CHUYỂN HÓA và ĐỊNH HƯỚNG LẠI. Sao Mộc và Thổ Tinh cùng hoạt động mạnh trong bản đồ của Diệu Hương, tạo ra sự cân bằng giữa mở rộng và kỷ luật. Đây là thời điểm lý tưởng để xác lập lại những ưu tiên sống, đầu tư vào bản thân và xây dựng nền tảng vững chắc cho tương lai. Hãy đón nhận những thay đổi với tâm thế cởi mở và can đảm.

Trân trọng,
Hạt Giống Chiêm Tinh`

async function main() {
  console.log('Generating test Vận Hạn PDF...')

  const options = {
    coverTitle: 'LUẬN GIẢI VẬN HẠN',
    sectionTitle: 'TỔNG HỢP LUẬN GIẢI VẬN HẠN',
    service: 'transit',
    profile: {
      name: 'Diệu Hương',
      dob: { day: '15', month: '9', year: '1990' },
      tob: '06:30',
    },
  }

  const buffer = await generatePdf(SAMPLE_ESSAY, options)
  if (!buffer) {
    console.error('generatePdf returned null')
    process.exit(1)
  }

  fs.writeFileSync(OUTPUT_PATH, buffer)
  console.log(`✓ Saved to ${OUTPUT_PATH} (${(buffer.length / 1024).toFixed(0)} KB)`)
}

main().catch(e => { console.error(e); process.exit(1) })
