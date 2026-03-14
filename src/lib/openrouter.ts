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
      max_tokens: 16000,
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

function isRetryableError(err: unknown): boolean {
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
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured')

  const MAX_RETRIES = 3
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = attempt * 3000 // 3s, 6s
      console.log(`[OpenRouter] Retry attempt ${attempt}/${MAX_RETRIES - 1} after ${delay}ms`)
      await new Promise(r => setTimeout(r, delay))
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: HEADERS(),
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 16000,
          temperature: 0.75,
          stream: true,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenRouter streaming error: ${response.status} ${err}`)
      }

      if (!response.body) throw new Error('No response body for streaming')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''
      let finished = false

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
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              fullText += delta
              onProgress(fullText.length)
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      return fullText
    } catch (err) {
      lastError = err
      if (!isRetryableError(err)) throw err
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cause = (err as any).cause
      console.error(`[OpenRouter] ECONNRESET/terminated on attempt ${attempt + 1}:`, cause?.code || err)
    }
  }

  throw lastError
}
