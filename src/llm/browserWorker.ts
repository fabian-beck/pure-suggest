/**
 * Web worker running models in the browser with Transformers.js, so that downloading,
 * loading, and generating never block the interface. Protocol: every request carries a
 * `requestId` and is answered by intermediate `progress`/`token` messages followed by one
 * `result` or `error` message; `abort` interrupts the running generation.
 */
import {
  InterruptableStoppingCriteria,
  ModelRegistry,
  pipeline,
  TextStreamer
} from '@huggingface/transformers'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export type BrowserBackend = 'webgpu' | 'wasm'

export type WorkerRequest =
  | { type: 'abort' }
  | {
      type: 'inspect' | 'load' | 'remove' | 'generate'
      requestId: number
      modelId: string
      backend: BrowserBackend
      /** Weight formats to use, most preferred first. */
      dtypes: string[]
      messages?: { role: string; content: string }[]
      maxOutputTokens?: number
      temperature?: number
      topP?: number
    }

export type WorkerResponse = { requestId: number } & (
  | { type: 'progress'; loadedBytes: number; totalBytes: number; isCached: boolean }
  | { type: 'token'; text: string }
  | { type: 'result'; value: Json }
  | { type: 'error'; message: string; isOutOfMemory: boolean }
)

const TASK = 'text-generation'
const DEFAULT_MAX_OUTPUT_TOKENS = 1024

const scope = self as unknown as {
  postMessage(message: WorkerResponse): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

const stoppingCriteria = new InterruptableStoppingCriteria()
// The model in memory or on its way there; concurrent requests share the same loading
let loaded: { key: string; generator: Promise<any> } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any

/** Picks the weight format: an already downloaded one, else the most preferred one offered. */
async function resolveDtype(modelId: string, backend: BrowserBackend, dtypes: string[]) {
  for (const dtype of dtypes) {
    const options = { dtype, device: backend } as Json
    if (await ModelRegistry.is_pipeline_cached(TASK, modelId, options).catch(() => false)) {
      return { dtype, isCached: true }
    }
  }
  const available = await ModelRegistry.get_available_dtypes(modelId)
  const dtype = dtypes.find((candidate) => available.includes(candidate))
  if (!dtype) throw new Error('The model offers no weights this browser can run.')
  return { dtype, isCached: false }
}

async function inspect(modelId: string, backend: BrowserBackend, dtypes: string[]) {
  const { dtype, isCached } = await resolveDtype(modelId, backend, dtypes)
  const files = await ModelRegistry.get_pipeline_files(TASK, modelId, {
    dtype,
    device: backend
  } as Json)
  const sizes = await Promise.all(
    files.map((file) =>
      ModelRegistry.get_file_metadata(modelId, file)
        .then((metadata) => metadata.size ?? 0)
        .catch(() => 0)
    )
  )
  return { dtype, isCached, sizeBytes: sizes.reduce((sum, size) => sum + size, 0) }
}

async function load(request: Extract<WorkerRequest, { requestId: number }>) {
  const { dtype, isCached } = await resolveDtype(request.modelId, request.backend, request.dtypes)
  const key = `${request.modelId}|${request.backend}|${dtype}`
  if (loaded?.key === key) return loaded.generator
  const previous = loaded?.generator
  const generator = (async () => {
    await previous?.then((unused) => unused.dispose()).catch(() => {})
    return pipeline(TASK, request.modelId, {
      device: request.backend,
      dtype,
      progress_callback: (info: Json) => {
        if (info.status !== 'progress_total') return
        scope.postMessage({
          type: 'progress',
          requestId: request.requestId,
          loadedBytes: info.loaded,
          totalBytes: info.total,
          isCached
        })
      }
    } as Json)
  })()
  loaded = { key, generator }
  generator.catch(() => {
    if (loaded?.generator === generator) loaded = null
  })
  return generator
}

async function generate(request: Extract<WorkerRequest, { requestId: number }>) {
  const generator = await load(request)
  stoppingCriteria.reset()
  const inputTokens: number =
    generator.tokenizer
      .apply_chat_template(request.messages, {
        tokenize: true,
        add_generation_prompt: true,
        return_dict: true
      })
      .input_ids.dims.at(-1) ?? 0
  const maxOutputTokens = request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  let outputTokens = 0
  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      scope.postMessage({ type: 'token', requestId: request.requestId, text })
    },
    token_callback_function: () => {
      outputTokens++
    }
  })
  const isSampling = (request.temperature ?? 0) > 0
  await generator(request.messages, {
    max_new_tokens: maxOutputTokens,
    do_sample: isSampling,
    ...(isSampling ? { temperature: request.temperature, top_p: request.topP } : {}),
    streamer,
    stopping_criteria: stoppingCriteria
  })
  return {
    finishReason: outputTokens >= maxOutputTokens ? 'length' : 'stop',
    inputTokens,
    outputTokens
  }
}

scope.onmessage = async ({ data: request }) => {
  if (request.type === 'abort') {
    stoppingCriteria.interrupt()
    return
  }
  const { requestId, modelId, backend, dtypes } = request
  try {
    let value: Json = {}
    if (request.type === 'inspect') value = await inspect(modelId, backend, dtypes)
    else if (request.type === 'load') await load(request)
    else if (request.type === 'generate') value = await generate(request)
    else {
      const { dtype } = await resolveDtype(modelId, backend, dtypes)
      if (loaded?.key.startsWith(`${modelId}|`)) {
        const { generator } = loaded
        loaded = null
        await generator.then((unused) => unused.dispose()).catch(() => {})
      }
      await ModelRegistry.clear_pipeline_cache(TASK, modelId, { dtype, device: backend } as Json)
    }
    scope.postMessage({ type: 'result', requestId, value })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    scope.postMessage({
      type: 'error',
      requestId,
      message,
      isOutOfMemory: /out of memory|allocation failed|device (was )?lost|std::bad_alloc/i.test(
        message
      )
    })
  }
}
