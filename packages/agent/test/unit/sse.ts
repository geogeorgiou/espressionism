import type { UIMessageChunk } from 'ai'

/** Every chunk of a UI message stream response, in order. */
export async function readChunks(
  response: Response,
): Promise<UIMessageChunk[]> {
  const body = await response.text()
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length))
    .filter((data) => data !== '[DONE]')
    .map((data) => JSON.parse(data) as UIMessageChunk)
}

/** Every chunk of a reply stream, in order. */
export async function collect(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const chunks: UIMessageChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

/** The text the visitor reads: every text delta joined. */
export function textOf(chunks: UIMessageChunk[]): string {
  return chunks
    .map((chunk) => (chunk.type === 'text-delta' ? chunk.delta : ''))
    .join('')
}
