/**
 * Test script: generate a PDF with scalloped border on [KTLUẬN] box.
 * Uses mock essay content (no AI call) for fast testing.
 * Saves to /home/hgct/hgct/docs/patchMD/testBorder.pdf
 */
import { generatePdf } from '../src/lib/pdf/generator'
import fs from 'fs'

const mockEssay = `Chào bạn,

Cuộc sống luôn có những giai đoạn khiến ta bối rối phải dừng lại và tự hỏi:

Mình đang đi đúng hướng chưa?
Vì sao mọi chuyện lại xảy ra theo cách như vậy?

Bản luận giải vận hạn này được viết để giúp bạn hiểu rõ hơn những năng lượng đang ảnh hưởng đến cuộc sống của mình trong thời gian tới.

Việc nhìn trước những xu hướng năng lượng của một năm không phải để định sẵn tương lai, mà để bạn hiểu rõ hơn những dòng chảy đang diễn ra trong cuộc sống. Khi có sự chuẩn bị và nhận thức sớm, bạn sẽ dễ dàng đón nhận cơ hội, đồng thời bình tĩnh hơn trước những thử thách có thể xuất hiện trên hành trình của mình.

Phần tiếp theo của bản luận giải sẽ đi sâu hơn vào từng lĩnh vực trong cuộc sống của bạn, để bạn có thể nhìn mọi thứ rõ ràng hơn nhẹ lòng hơn, tự tin hơn, bình an hơn.

1. Tổng Quan Năng Lượng Của Năm

Nhìn tổng thể, giai đoạn từ tháng 1 đến tháng 12 năm 2026 mang đến cho bạn một năm nghiêng về thuận lợi. Năng lượng chiêm tinh cho thấy nhiều lĩnh vực trong cuộc sống đang nhận được sự hỗ trợ tích cực, tạo điều kiện để bạn phát triển và mở rộng bản thân.

Những lĩnh vực thuận lợi trong giai đoạn này
- Sự nghiệp, danh tiếng, vị thế xã hội
- Tài chính cá nhân, thu nhập, giá trị bản thân
- Sáng tạo, tình yêu, con cái, niềm vui

Những lĩnh vực cần lưu ý
- Gia đình, nhà cửa, nguồn gốc, nền tảng nội tâm

Đây là một giai đoạn để bạn tận dụng cơ hội phát triển bản thân và sự nghiệp, đồng thời lưu ý chăm sóc nền tảng gia đình.

2. Công Việc – Sự Nghiệp

Sự nghiệp – danh tiếng:

Giai đoạn này mang đến nhiều năng lượng tích cực cho lĩnh vực sự nghiệp của bạn. Những cơ hội thăng tiến và mở rộng tầm ảnh hưởng đang dần hiện rõ, đặc biệt trong nửa đầu năm.

Sao Mộc đang Transit qua Nhà 10 trong bản đồ sao của bạn từ 01/01/2026 đến 15/08/2026. Đây là giai đoạn mà năng lượng mở rộng và may mắn đang tập trung vào lĩnh vực sự nghiệp, danh tiếng và vị thế xã hội của bạn.
- Có thể nhận được sự công nhận hoặc thăng tiến trong công việc
- Mối quan hệ với cấp trên và đồng nghiệp trở nên thuận lợi hơn
- Đây là thời điểm tốt để mở rộng mạng lưới chuyên môn

[KTLUẬN] Nhìn chung, lĩnh vực sự nghiệp giai đoạn này mang nhiều tín hiệu tích cực. Cơ hội thăng tiến đang mở ra nhưng đòi hỏi sự chủ động và kiên nhẫn. Hãy tận dụng thời điểm này để đầu tư vào năng lực bản thân và mở rộng mạng lưới chuyên môn.

Hiệu suất công việc:

Về hiệu suất làm việc hàng ngày, bạn sẽ cảm nhận được sự cải thiện rõ rệt trong khả năng tổ chức và quản lý thời gian. Năng lượng chiêm tinh hỗ trợ bạn trong việc tối ưu hóa quy trình làm việc.

Sao Thiên Vương đang Transit qua Nhà 6 trong bản đồ sao của bạn từ 15/03/2026 đến 31/12/2026. Điều này mang đến những thay đổi bất ngờ trong cách bạn làm việc hàng ngày.
- Có thể xuất hiện phương pháp làm việc mới hiệu quả hơn
- Công nghệ và các công cụ số sẽ đóng vai trò quan trọng hơn

[KTLUẬN] Hiệu suất công việc của bạn trong giai đoạn này có nhiều tiềm năng cải thiện. Hãy mở lòng đón nhận những thay đổi và phương pháp mới, chúng sẽ giúp bạn làm việc hiệu quả hơn đáng kể.

Cảm ơn bạn đã tin tưởng Hạt Giống Chiêm Tinh.

Mong rằng bản luận giải này, cũng như những góc nhìn từ chiêm tinh sẽ giúp bạn hiểu mình rõ hơn, nhẹ lòng hơn trước những điều đang diễn ra và tự tin bước tiếp trên con đường của mình.

Chúc bạn luôn tìm thấy sự bình an và đúng hướng trên hành trình cuộc đời.

Trân trọng,

Hạt Giống Chiêm Tinh`

async function main() {
  console.log('Generating test PDF with scalloped border...')

  const pdfBuffer = await generatePdf(mockEssay, {
    coverTitle: 'LUẬN GIẢI VẬN HẠN',
    sectionTitle: 'Luận Giải Vận Hạn Tổng Quan',
    profile: {
      name: 'Diệu Hương',
      dob: { day: '24', month: '09', year: '1998' },
    },
  })

  if (pdfBuffer) {
    const outPath = '/tmp/testBorder.pdf'
    fs.writeFileSync(outPath, pdfBuffer)
    console.log(`PDF saved to ${outPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)
  } else {
    console.error('PDF generation failed!')
    process.exit(1)
  }
}

main()
