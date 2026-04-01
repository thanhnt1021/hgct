const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const MODEL = 'anthropic/claude-sonnet-4-6'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const HEADERS = () => ({
  'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://hatgiongchiemtinh.com',
  'X-Title': 'Hat Giong Chiem Tinh',
})

// Non-streaming (kept for compatibility)
export async function generateEssay(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 32000,
      temperature: 0.75,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

class StreamInterruptedError extends Error {
  constructor(charsSoFar: number) {
    super(`Stream ended without [DONE] marker (${charsSoFar} chars received)`)
    this.name = 'StreamInterruptedError'
  }
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof StreamInterruptedError) return true
  // Bug #13 fix: HTTP 429/5xx from OpenRouter throw regular Error, not TypeError
  if (err instanceof Error && /OpenRouter streaming error: (429|500|502|503|504)/.test(err.message)) return true
  if (!(err instanceof TypeError)) return false
  if (err.message === 'terminated' || err.message.includes('terminated')) return true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cause = (err as any).cause
  if (cause?.code === 'ECONNRESET' || cause?.code === 'ECONNREFUSED' || cause?.code === 'ETIMEDOUT') return true
  return false
}

// Streaming with real-time char progress callback
export async function generateEssayStreaming(
  systemPrompt: string,
  userPrompt: string,
  onProgress: (charsReceived: number) => void,
  onRetry?: (attempt: number, reason: string) => void,
  onGenerationId?: (id: string) => void,
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured')

  const MAX_RETRIES = 4
  const RETRY_DELAYS = [5000, 20000, 60000] // 5s, 20s, 60s — exponential backoff
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1] ?? 60000
      const reason = lastError instanceof StreamInterruptedError ? 'stream bị ngắt' : 'lỗi kết nối'
      console.log(`[OpenRouter] Retry attempt ${attempt}/${MAX_RETRIES - 1} after ${delay}ms`)
      onRetry?.(attempt, reason)
      await new Promise(r => setTimeout(r, delay))
    }

    try {
      const abortCtrl = new AbortController()
      const streamTimeout = setTimeout(() => abortCtrl.abort(new Error('Stream timeout (300s)')), 300_000)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: HEADERS(),
        signal: abortCtrl.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 32000,
          temperature: 0.75,
          stream: true,
        }),
      })
      if (!response.ok) {
        clearTimeout(streamTimeout)
        const err = await response.text()
        throw new Error(`OpenRouter streaming error: ${response.status} ${err}`)
      }

      if (!response.body) throw new Error('No response body for streaming')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let finished = false
      let genIdReported = false

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines from buffer
        let newlineIdx: number
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim()
          buffer = buffer.slice(newlineIdx + 1)

          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') { finished = true; break }

          try {
            const parsed = JSON.parse(data)
            if (!genIdReported && parsed.id && onGenerationId) {
              onGenerationId(parsed.id)
              genIdReported = true
            }
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              fullText += delta
              onProgress(fullText.length)
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      // Stream ended without [DONE] — treat as interrupted, retry
      if (!finished) {
        clearTimeout(streamTimeout)
        throw new StreamInterruptedError(fullText.length)
      }

      clearTimeout(streamTimeout)
      return fullText
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.name === 'AbortError' || (err instanceof Error && err.message.includes('Stream timeout'))) {
        lastError = new Error(`Stream timeout after 300s (attempt ${attempt + 1})`)
        console.error(`[OpenRouter] Stream timeout on attempt ${attempt + 1}`)
        continue
      }
      lastError = err
      if (!isRetryableError(err)) throw err
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cause = (err as any).cause
      const code = err instanceof StreamInterruptedError ? 'STREAM_INTERRUPTED' : (cause?.code || String(err))
      console.error(`[OpenRouter] Retryable error on attempt ${attempt + 1}:`, code)
    }
  }

  throw lastError
}
