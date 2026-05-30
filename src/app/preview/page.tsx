'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import DiscountModal from '@/components/checkout/DiscountModal'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY || ''

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  execute: (widgetId: string) => void
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    onloadTurnstileCallback?: () => void
  }
}

const SERVICE_NAMES: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

const SERVICE_ICONS: Record<string, string> = {
  career: '🎯',
  love: '💝',
  synastry: '💑',
  transit: '🔮',
}

// Locked section titles per service (mirrors preview/route.ts getLockedSections)
const LOCKED_SECTIONS: Record<string, { title: string; subtitle: string }[]> = {
  career: [
    { title: '2. Năng lực bẩm sinh của bạn là gì?', subtitle: 'Những điểm mạnh tự nhiên giúp bạn dễ phát triển và tạo ra giá trị lâu dài' },
    { title: '3. Thách thức nào tiềm ẩn trong bạn?', subtitle: 'Những điểm cần lưu ý, rèn luyện để bạn phát huy tốt hơn tiềm năng' },
    { title: '4. Lĩnh vực công việc nào thực sự phù hợp với bạn?', subtitle: 'Hướng nghề nghiệp giúp bạn phát huy tốt nhất khả năng của mình' },
    { title: '5. Cách nào giúp bạn khơi thông dòng chảy tài chính?', subtitle: 'Con đường tài chính thuận lợi, phù hợp với năng lực tự nhiên của bạn' },
    { title: '6. Chiến lược phát triển sự nghiệp của bạn là gì?', subtitle: 'Cách xây dựng con đường nghề nghiệp bền vững dựa trên năng lực bản thân' },
    { title: '7. Lời nhắn từ các vì sao', subtitle: 'Nhìn lại những điểm cốt lõi và hướng phát triển trong tương lai' },
  ],
  career_young: [
    { title: '2. Năng lực bẩm sinh của bạn', subtitle: 'Những "siêu năng lực" tự nhiên bạn đang sở hữu mà chưa biết' },
    { title: '3. Những "Nút thắt" cần tháo gỡ để bạn bứt phá', subtitle: 'Hiểu mình để tháo gỡ và tiến về phía trước' },
    { title: '4. Định hướng chuyên ngành và lĩnh vực phù hợp', subtitle: 'Vùng đất hứa nơi bạn có thể tỏa sáng' },
    { title: '5. Mở khóa tiềm năng — Tối ưu hóa năng lực của bạn', subtitle: 'Chiến lược học tập và phát triển bản thân phù hợp nhất với bạn' },
  ],
  love: [
    { title: '2. Tiếng gọi trái tim', subtitle: 'Hình mẫu khiến bạn thực sự rung động' },
    { title: '3. Ngôn ngữ tình yêu', subtitle: 'Cách bạn trao đi yêu thương' },
    { title: '4. Nút thắt cần tháo gỡ', subtitle: 'Những thách thức trong tình yêu và cách chuyển hóa' },
    { title: '5. La bàn hạnh phúc', subtitle: 'Bước ngoặt chạm đến tình yêu bền vững' },
    { title: '6. Thông điệp tình yêu từ các vì sao', subtitle: 'Những điều vũ trụ muốn nhắn nhủ cho hành trình tình yêu của bạn' },
  ],
  synastry: [
    { title: '2. Tiếng gọi trái tim', subtitle: 'Vì sao hai bạn gặp và thu hút nhau?' },
    { title: '3. Ngôn ngữ tình yêu', subtitle: 'Cách hai bạn yêu và được yêu' },
    { title: '4. Chuyện đôi mình', subtitle: 'Những điểm hòa hợp và khác biệt cần thấu hiểu' },
    { title: '5. La bàn hạnh phúc', subtitle: 'Chìa khóa để đi cùng nhau bền vững' },
    { title: '6. Thông điệp dành cho mối quan hệ', subtitle: 'Nhìn lại hành trình chung' },
  ],
  transit: [
    { title: '2. Công việc và sự nghiệp', subtitle: 'Cơ hội và thách thức trong sự nghiệp giai đoạn này' },
    { title: '3. Tài chính đầu tư', subtitle: 'Dòng chảy tài chính và hướng đầu tư phù hợp với vận hạn' },
    { title: '4. Tình yêu hôn nhân', subtitle: 'Năng lượng tình cảm và những điều cần lưu ý' },
    { title: '5. Gia đình, nhà cửa', subtitle: 'Những chuyển dịch trong cuộc sống gia đình' },
    { title: '6. Sức Khỏe', subtitle: 'Những lưu ý về thể chất và tinh thần' },
    { title: '7. Thông điệp dành cho bạn trong giai đoạn này', subtitle: 'Lời nhắn từ các vì sao cho hành trình phía trước' },
  ],
}

interface PreviewInput {
  service: string
  inputData: Record<string, unknown>
  inputDataB?: Record<string, unknown>
  startDate?: string
  endDate?: string
  email?: string
}

const INTRO_TEXT: Record<string, string> = {
  career: 'Bạn yêu mến!\n\nChào mừng bạn đến với hành trình hiểu chính mình.\n\nCó thể bạn đang đứng trước một ngã rẽ trong công việc và cuộc sống, cũng có thể bạn chỉ đơn giản muốn hiểu bản thân mình rõ hơn. Bởi trong cuộc đời, ai cũng có những giai đoạn phải dừng lại và tự hỏi:\n\nMình thật sự phù hợp với điều gì?\nCon đường nào mới là hướng đi đúng với mình?\n\nMỗi người khi sinh ra đều mang theo một "hạt giống" riêng. Có những hạt giống cần được đặt đúng môi trường để nảy mầm, phát triển và tỏa sáng. Chiêm tinh giống như một tấm bản đồ giúp bạn nhận ra hạt giống đó — những điểm mạnh tự nhiên, cách bạn phát triển tốt nhất và môi trường giúp bạn trưởng thành.\n\nHy vọng bản luận giải này sẽ giúp bạn nhìn rõ hơn những tiềm năng bên trong mình, tìm thấy hướng đi phù hợp và từng bước xây dựng một con đường sự nghiệp vững vàng và bền vững hơn cho tương lai.',
  career_young: 'Bạn yêu mến!\n\nChào mừng bạn đến với hành trình khám phá chính mình.\n\nCó thể bạn đang bắt đầu nghĩ nhiều hơn về tương lai:\n\nMình phù hợp với ngành học nào?\nMình nên theo đuổi điều gì để vừa phát triển tốt vừa cảm thấy thật sự là chính mình?\n\nĐôi khi việc chọn hướng đi không hề dễ dàng, bởi mỗi người trong chúng ta đều có những điểm mạnh và cách phát triển rất khác nhau.\n\nTheo chiêm tinh, khi sinh ra mỗi người đều mang theo một "hạt giống" riêng — những khả năng tự nhiên, cách tư duy và môi trường phù hợp để mình phát triển tốt nhất. Chiêm tinh giống như một tấm bản đồ nhỏ giúp bạn nhận ra những tiềm năng đó, để từ đó hiểu mình rõ hơn và tự tin lựa chọn con đường phù hợp cho tương lai.\n\nHy vọng bản luận giải này sẽ giúp bạn khám phá thêm những điều thú vị về bản thân và tìm thấy hướng đi khiến bạn vừa phát triển tốt vừa cảm thấy hứng thú với hành trình phía trước.',
  love: 'Bạn yêu mến!\n\nTrong hành trình của tình yêu, mỗi người đều có một câu chuyện rất riêng.\n\nCó những người dễ dàng gặp được tình yêu từ rất sớm. Nhưng cũng có những người phải đi qua nhiều trải nghiệm, nhiều lần chờ đợi hoặc những mối quan hệ chưa trọn vẹn trước khi hiểu được mình thật sự cần điều gì trong tình yêu.\n\nNếu bạn từng tự hỏi vì sao chuyện tình cảm của mình lại diễn ra theo cách này, thì chiêm tinh có thể mang đến một góc nhìn sâu sắc hơn.\n\nBản đồ sao giúp bạn hiểu rõ hơn mô thức tình cảm của mình, những bài học mà bạn đang trải qua và cách bạn có thể xây dựng một mối quan hệ phù hợp hơn với chính mình.\n\nHy vọng bản luận giải này sẽ giúp bạn hiểu rõ bản thân trong tình yêu, để từ đó bước vào những mối quan hệ với nhiều sự chủ động, bình an và tự tin hơn.',
  synastry: 'Bạn yêu mến!\n\nChào mừng bạn đến với hành trình khám phá và thấu hiểu mối quan hệ của mình.\n\nTrong tình yêu và các mối quan hệ, có lẽ ai trong chúng ta cũng từng tự hỏi:\n\nTại sao mình lại gặp người này?\nVì sao có những lúc chúng ta rất đồng điệu, nhưng cũng có lúc lại khó hiểu nhau đến vậy?\nLiệu mối quan hệ này đang mang đến cho mình bài học gì trên hành trình cuộc đời?\n\nMỗi cuộc gặp gỡ trong cuộc đời đều có lý do của nó. Có những mối quan hệ đến để đồng hành lâu dài, có những mối quan hệ đến để giúp chúng ta trưởng thành và hiểu chính mình sâu sắc hơn.\n\nChiêm tinh không quyết định tương lai của một mối quan hệ, nhưng nó giống như một tấm bản đồ giúp bạn nhìn rõ hơn sự kết nối giữa hai người, những điểm hòa hợp tự nhiên, những khác biệt cần được thấu hiểu, và những bài học mà hai bạn có thể mang đến cho nhau.\n\nHy vọng bản luận giải này sẽ giúp bạn hiểu rõ hơn về mối quan hệ của mình, để từ đó biết cách trân trọng những điểm đồng điệu, thấu hiểu những khác biệt và xây dựng một mối quan hệ trưởng thành, hạnh phúc hơn.',
  transit: 'Bạn yêu mến!\n\nCuộc sống luôn có những giai đoạn khiến ta bối rối phải dừng lại và tự hỏi:\n\nMình đang đi đúng hướng chưa?\nVì sao mọi chuyện lại xảy ra theo cách như vậy?\n\nBản luận giải vận hạn này được viết để giúp bạn hiểu rõ hơn những năng lượng đang ảnh hưởng đến cuộc sống của mình trong thời gian tới.\n\nViệc nhìn trước những xu hướng năng lượng của một năm không phải để định sẵn tương lai, mà để bạn hiểu rõ hơn những dòng chảy đang diễn ra trong cuộc sống. Khi có sự chuẩn bị và nhận thức sớm, bạn sẽ dễ dàng đón nhận cơ hội, đồng thời bình tĩnh hơn trước những thử thách có thể xuất hiện trên hành trình của mình.',
}

// Parse [bold]...[/] and [#rrggbb+bold]...[/] markers → JSX. Strips other [TAG] notes.
// Hides incomplete marker at end of string (prevents flickering "[bold" mid-stream).
function renderText(text: string): React.ReactNode {
  // Hide unclosed bracket at tail
  const lastOpen = text.lastIndexOf('[')
  const lastClose = text.lastIndexOf(']')
  const safe = lastOpen > lastClose ? text.slice(0, lastOpen) : text

  const parts: React.ReactNode[] = []
  const re = /\[bold\]([\s\S]*?)\[\/\]|\[#([0-9a-fA-F]+)\+bold\]([\s\S]*?)\[\/\]|\[[^\]]*\]/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(safe)) !== null) {
    if (match.index > last) parts.push(safe.slice(last, match.index))
    if (match[1] !== undefined) {
      // [bold]...[/]
      parts.push(<strong key={match.index}>{match[1]}</strong>)
    } else if (match[3] !== undefined) {
      // [#rrggbb+bold]...[/]
      parts.push(<strong key={match.index} style={{ color: `#${match[2]}` }}>{match[3]}</strong>)
    }
    // else: standalone [TAG] → strip
    last = match.index + match[0].length
  }
  if (last < safe.length) parts.push(safe.slice(last))
  return parts.length ? parts : safe
}

const CACHE_KEY = 'previewStreamCache'

export default function PreviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewInput, setPreviewInput] = useState<PreviewInput | null>(null)
  const [streamText, setStreamText] = useState('')
  const [streamDone, setStreamDone] = useState(false)
  const [isYoungCareer, setIsYoungCareer] = useState(false)
  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [displayedLength, setDisplayedLength] = useState(0)
  const hasStarted = useRef(false)
  const streamTextRef = useRef('')  // mirror for sessionStorage writes
  const textEndRef = useRef<HTMLDivElement>(null)

  // ── Cloudflare Turnstile (invisible widget) ────────────────────────
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string>('')
  const cfTokenRef = useRef<string>('')

  // Mount widget once Turnstile API is ready
  const mountTurnstile = () => {
    if (turnstileWidgetIdRef.current) return
    const tw = typeof window !== 'undefined' ? window.turnstile : undefined
    if (!tw || !turnstileContainerRef.current || !TURNSTILE_SITE_KEY) return
    turnstileWidgetIdRef.current = tw.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      size: 'invisible',
      callback: (token: string) => {
        cfTokenRef.current = token
      },
      'error-callback': () => {
        cfTokenRef.current = ''
      },
      'expired-callback': () => {
        cfTokenRef.current = ''
        if (turnstileWidgetIdRef.current && window.turnstile) {
          window.turnstile.execute(turnstileWidgetIdRef.current)
        }
      },
    })
  }

  // Wait up to 8s for a fresh Turnstile token
  const getFreshTurnstileToken = async (): Promise<string> => {
    if (cfTokenRef.current) return cfTokenRef.current
    // Re-execute to ask Cloudflare for a token
    const tw = typeof window !== 'undefined' ? window.turnstile : undefined
    if (tw && turnstileWidgetIdRef.current) {
      tw.execute(turnstileWidgetIdRef.current)
    }
    for (let i = 0; i < 32; i++) {
      await new Promise(r => setTimeout(r, 250))
      if (cfTokenRef.current) return cfTokenRef.current
    }
    throw new Error('Không lấy được mã xác thực bảo mật — vui lòng tải lại trang')
  }

  // Read service from localStorage immediately (for intro text before previewInput state is set)
  const [earlyService] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try { return JSON.parse(localStorage.getItem('previewInput') || '{}').service || '' } catch { return '' }
  })

  const activeService = previewInput?.service || earlyService

  // Compute age from DOB to pick career_young vs career (same logic as preview-stream route)
  const isYoungFromDob = (() => {
    const dob = (previewInput?.inputData?.dob ?? (() => {
      try { return JSON.parse(localStorage.getItem('previewInput') || '{}').inputData?.dob } catch { return null }
    })()) as { day: number; month: number; year: number } | null
    if (!dob) return false
    const now = new Date()
    const birth = new Date(dob.year, dob.month - 1, dob.day)
    const age = now.getFullYear() - birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
    return age < 22
  })()

  const introKey = activeService === 'career' && isYoungFromDob ? 'career_young' : activeService
  const introFull = INTRO_TEXT[introKey] || ''

  // Single combined text: intro + stream. One cursor advances continuously — no pause, no reset.
  const combinedText = introFull + (streamText ? '\n\n' + streamText : '')

  // Single typewriter cursor
  useEffect(() => {
    if (displayedLength >= combinedText.length) return
    const id = setTimeout(() => {
      setDisplayedLength(prev => Math.min(prev + 1, combinedText.length))
    }, 35)
    return () => clearTimeout(id)
  }, [displayedLength, combinedText.length])

  const displayedText = combinedText.slice(0, displayedLength)
  // Show spinner only when intro is fully typed but AI hasn't responded yet
  const showSpinner = loading && displayedLength >= introFull.length
  const typingDone = streamDone && displayedLength >= combinedText.length

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const raw = typeof window !== 'undefined' ? localStorage.getItem('previewInput') : null
    if (!raw) {
      setError('Không tìm thấy dữ liệu. Vui lòng quay lại và chọn dịch vụ.')
      setLoading(false)
      return
    }

    let parsed: PreviewInput
    try {
      parsed = JSON.parse(raw)
    } catch {
      setError('Dữ liệu không hợp lệ.')
      setLoading(false)
      return
    }

    setPreviewInput(parsed)

    // Restore from cache if same service (user switched apps mid-stream)
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')
      if (cached && cached.service === parsed.service && cached.streamText) {
        streamTextRef.current = cached.streamText
        setStreamText(cached.streamText)
        setIsYoungCareer(Boolean(cached.isYoungCareer))
        if (cached.done) {
          setStreamDone(true)
          setLoading(false)
          return
        }
        // Partial cache: got some text but stream was interrupted — re-fetch from scratch
        sessionStorage.removeItem(CACHE_KEY)
        streamTextRef.current = ''
        setStreamText('')
      }
    } catch { /* ignore */ }

    // Wait for Turnstile token, then fetch
    getFreshTurnstileToken().then((cfTurnstileToken) => fetch('/api/astrology/preview-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed, cfTurnstileToken }),
    })).then(async (res) => {
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as Record<string, string>).error || 'Preview thất bại')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      setLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        const parts = buf.split('\n\n')
        buf = parts.pop() || ''
        for (const part of parts) {
          const lines = part.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const eventType = eventLine.replace('event: ', '').trim()
          let data: Record<string, unknown> = {}
          try { data = JSON.parse(dataLine.replace('data: ', '')) } catch {}

          if (eventType === 'chunk') {
            const text = String(data.text || '')
            streamTextRef.current += text
            setStreamText(prev => prev + text)
            // Persist partial result so user can resume if they switch apps
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({ service: parsed.service, streamText: streamTextRef.current, done: false }))
            } catch { /* storage full — ignore */ }
          } else if (eventType === 'done') {
            const youngCareer = Boolean(data.isYoungCareer)
            setIsYoungCareer(youngCareer)
            setStreamDone(true)
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({ service: parsed.service, streamText: streamTextRef.current, isYoungCareer: youngCareer, done: true }))
            } catch { /* ignore */ }
          } else if (eventType === 'error') {
            throw new Error(String(data.message || 'Lỗi không xác định'))
          }
        }
      }
    }).catch((err: unknown) => {
      setError((err as Error).message || 'Không thể tạo bản xem trước')
      setLoading(false)
    })
  }, [])

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (!streamDone && streamText) {
      textEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [streamText, streamDone])

  const service = previewInput?.service || ''
  const serviceName = SERVICE_NAMES[service] || 'Chiêm Tinh'
  const serviceIcon = SERVICE_ICONS[service] || '✦'

  const lockedSections = service === 'career'
    ? (isYoungCareer ? LOCKED_SECTIONS.career_young : LOCKED_SECTIONS.career)
    : LOCKED_SECTIONS[service] || []

  const handleGetFullReport = () => {
    if (!previewInput) return
    sessionStorage.removeItem(CACHE_KEY)
    const { service: svc, inputData, inputDataB, startDate, endDate, email: em,
      _guestFormA, _guestFormB } = previewInput as PreviewInput & { _guestFormA?: unknown; _guestFormB?: unknown }
    sessionStorage.setItem('selectedService', svc)
    sessionStorage.setItem('inputData', JSON.stringify(inputData))
    if (inputDataB) sessionStorage.setItem('inputDataB', JSON.stringify(inputDataB))
    else sessionStorage.removeItem('inputDataB')
    if (svc === 'transit' && startDate) sessionStorage.setItem('transitStartDate', startDate)
    if (svc === 'transit' && endDate) sessionStorage.setItem('transitEndDate', endDate)
    if (em) sessionStorage.setItem('checkoutEmail', em)
    // Restore guest form data so "← Sửa thông tin" in checkout can repopulate the modal
    if (_guestFormA) sessionStorage.setItem('guestFormDataA', JSON.stringify(_guestFormA))
    if (_guestFormB) sessionStorage.setItem('guestFormDataB', JSON.stringify(_guestFormB))
    else sessionStorage.removeItem('guestFormDataB')
    setDiscountModalOpen(true)
  }

  const proceedToCheckout = (discount: { referralCode?: string; wheelDiscountPct?: number }) => {
    if (discount.referralCode) sessionStorage.setItem('referralCode', discount.referralCode)
    else sessionStorage.removeItem('referralCode')
    if (discount.wheelDiscountPct !== undefined) sessionStorage.setItem('wheelDiscountPct', String(discount.wheelDiscountPct))
    else sessionStorage.removeItem('wheelDiscountPct')
    sessionStorage.setItem('autoCheckout', '1')
    router.push('/checkout')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#06060f',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-vietnam, sans-serif)',
      }}
    >
      {/* Cloudflare Turnstile (invisible) — must load before fetch */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback"
        strategy="afterInteractive"
        onLoad={() => {
          // The onloadTurnstileCallback hook gives us a chance to mount when API ready.
          if (typeof window !== 'undefined') {
            window.onloadTurnstileCallback = mountTurnstile
            // Edge case: script may already have called onload before we set the handler
            if (window.turnstile) mountTurnstile()
          }
        }}
      />
      <div
        ref={turnstileContainerRef}
        style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}
        aria-hidden="true"
      />

      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'rgba(6,6,15,0.97)',
          borderBottom: '1px solid rgba(200,148,63,0.15)',
          flexShrink: 0,
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{serviceIcon}</span>
          <span style={{ color: '#f4efe6', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Xem trước — {serviceName}
          </span>
          <span
            style={{
              background: 'rgba(200,148,63,0.15)',
              color: '#d9ab55',
              border: '1px solid rgba(200,148,63,0.3)',
              borderRadius: '4px',
              padding: '1px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              flexShrink: 0,
            }}
          >
            MIỄN PHÍ
          </span>
        </div>
        <button
          onClick={handleGetFullReport}
          style={{
            background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
            color: '#06060f',
            borderRadius: '4px',
            padding: '0.45rem 1rem',
            fontWeight: 700,
            fontSize: '0.82rem',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Nhận báo cáo đầy đủ →
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
          <p style={{ color: '#f87171', fontSize: '1rem', textAlign: 'center' }}>⚠ {error}</p>
          <a href="/services" style={{ color: '#d9ab55', fontSize: '0.9rem', textDecoration: 'underline' }}>
            ← Quay lại trang dịch vụ
          </a>
        </div>
      )}

      {/* Unified text area — intro typewriters first, AI stream appends seamlessly after */}
      {!error && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', maxWidth: 720, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <p style={{ color: '#6b6585', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 600 }}>
            PHẦN 1 — TỔNG QUAN
          </p>
          <div
            style={{
              background: 'rgba(10,8,28,0.6)',
              border: '1px solid rgba(201,168,76,0.12)',
              borderRadius: 12,
              padding: 'clamp(1.25rem, 4vw, 2rem)',
              color: '#e8e0f0',
              lineHeight: 1.9,
              whiteSpace: 'pre-wrap',
              fontSize: 'clamp(0.88rem, 2.5vw, 0.97rem)',
              wordBreak: 'break-word',
              minHeight: '4rem',
            }}
          >
            {renderText(displayedText)}
            {!typingDone && (
              <span
                style={{
                  display: 'inline-block',
                  width: '0.55em',
                  height: '1.1em',
                  background: '#d9ab55',
                  verticalAlign: 'text-bottom',
                  borderRadius: '1px',
                  animation: 'blink 1s step-end infinite',
                  marginLeft: '1px',
                }}
              />
            )}
          </div>
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* No spinner — cursor blinks in text box while waiting for AI */}

          {/* Locked sections — show after typewriter finishes */}
          {typingDone && lockedSections.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#6b6585', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 600 }}>
                CÁC PHẦN CÒN LẠI
              </p>
              <div
                style={{
                  background: 'rgba(10,8,28,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {lockedSections.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderBottom: i < lockedSections.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#4a3f6b', fontSize: '0.9rem', flexShrink: 0, marginTop: '0.1rem' }}>🔒</span>
                    <div>
                      <p style={{ color: '#6b6585', fontSize: '0.85rem', fontWeight: 600, margin: 0, marginBottom: '0.2rem' }}>{s.title}</p>
                      <p style={{ color: '#4a3f6b', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>{s.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA block */}
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'rgba(200,148,63,0.06)',
                  border: '1px solid rgba(200,148,63,0.2)',
                  borderRadius: 12,
                  padding: 'clamp(1.25rem, 4vw, 2rem)',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#f4efe6', fontWeight: 700, fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)', marginBottom: '0.6rem' }}>
                  Nhận báo cáo đầy đủ {lockedSections.length + 1} phần
                </p>
                <p style={{ color: '#8a8399', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Bản luận giải chi tiết, cá nhân hoá gửi thẳng vào email của bạn.
                </p>
                <button
                  onClick={handleGetFullReport}
                  style={{
                    background: 'linear-gradient(135deg, #c8943f, #f0cc78)',
                    color: '#06060f',
                    borderRadius: '6px',
                    padding: '0.75rem 2rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    width: '100%',
                    maxWidth: 320,
                  }}
                >
                  Nhận báo cáo đầy đủ →
                </button>
              </div>
            </div>
          )}

          <div ref={textEndRef} style={{ height: '2rem' }} />
        </div>
      )}

      <DiscountModal
        open={discountModalOpen}
        service={previewInput?.service || ''}
        onClose={() => setDiscountModalOpen(false)}
        onProceed={proceedToCheckout}
      />
    </div>
  )
}
