import type { BrowserBackend, WorkerRequest, WorkerResponse } from './browserWorker.ts'
import { BROWSER_MODELS, preferredDeveloper } from './catalog.ts'
import type { DeviceProfile } from './selection.ts'
import {
  LlmError,
  type Availability,
  type ChatEvent,
  type ChatRequest,
  type FinishReason,
  type LlmProvider,
  type ModelInfo,
  type ModelLoadProgress
} from './types.ts'

type Json = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
type ModelRequestType = 'inspect' | 'load' | 'remove' | 'generate'

export type BrowserBackendSetting = 'auto' | BrowserBackend

// Working memory exceeds the weights by the context cache and runtime buffers
const MEMORY_OVERHEAD_FACTOR = 1.3

/**
 * Runs models inside the browser: no installation, weights are downloaded once and kept in
 * the browser cache for offline use. Uses the GPU through WebGPU and falls back to the CPU
 * (WebAssembly) where WebGPU is missing or fails.
 */
export class BrowserProvider implements LlmProvider {
  readonly id = 'browser'
  readonly name = 'This browser'
  readonly mode = 'browser'
  readonly location = 'local'
  /** Backend in use; changes to `wasm` if the GPU turns out to be unusable. */
  backend: BrowserBackend
  private readonly backendSetting: BrowserBackendSetting
  private readonly supportsShaderF16: boolean
  private readonly customModelIds: string[]
  private worker: Worker | null = null
  private nextRequestId = 1
  private readonly listeners = new Map<number, (response: WorkerResponse) => void>()

  constructor(
    backendSetting: BrowserBackendSetting,
    device: DeviceProfile,
    customModelIds: string[]
  ) {
    this.backendSetting = backendSetting
    this.supportsShaderF16 = device.supportsShaderF16
    this.customModelIds = customModelIds
    const detectedBackend = device.hasWebGpu ? 'webgpu' : 'wasm'
    this.backend = backendSetting === 'auto' ? detectedBackend : backendSetting
  }

  private dtypes(): string[] {
    if (this.backend === 'wasm') return ['q4', 'q8', 'int8', 'fp32']
    return this.supportsShaderF16 ? ['q4f16', 'q4', 'fp16', 'fp32'] : ['q4', 'fp32']
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./browserWorker.ts', import.meta.url), { type: 'module' })
      this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        this.listeners.get(data.requestId)?.(data)
      }
      this.worker.onerror = (event) => {
        const failure = {
          type: 'error' as const,
          message: event.message || 'The model runtime crashed.',
          isOutOfMemory: false
        }
        for (const [requestId, listener] of this.listeners) listener({ requestId, ...failure })
      }
    }
    return this.worker
  }

  /** Sends a request to the worker; resolves with its result, reporting intermediate messages. */
  private call(
    type: ModelRequestType,
    modelId: string,
    payload: Json,
    onMessage?: (response: WorkerResponse) => void
  ): Promise<Json> {
    const worker = this.getWorker()
    const requestId = this.nextRequestId++
    return new Promise<Json>((resolve, reject) => {
      this.listeners.set(requestId, (response) => {
        if (response.type === 'result') resolve(response.value)
        else if (response.type === 'error') {
          reject(
            new LlmError(
              response.isOutOfMemory ? 'out-of-memory' : 'unavailable',
              response.isOutOfMemory
                ? 'The device ran out of memory for this model. Try a smaller model.'
                : response.message
            )
          )
        } else onMessage?.(response)
      })
      const request: WorkerRequest = {
        type,
        requestId,
        modelId,
        backend: this.backend,
        dtypes: this.dtypes(),
        ...payload
      }
      worker.postMessage(request)
    }).finally(() => this.listeners.delete(requestId))
  }

  async checkAvailability(): Promise<Availability> {
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      return { isAvailable: false, reason: 'This browser cannot run models locally.' }
    }
    return { isAvailable: true }
  }

  async listModels(): Promise<ModelInfo[]> {
    const entries = [
      ...BROWSER_MODELS,
      ...this.customModelIds.map((id) => ({
        id,
        name: id.split('/').pop() ?? id,
        developer: preferredDeveloper(id),
        license: undefined,
        contextWindow: undefined,
        isVerified: false
      }))
    ]
    return Promise.all(
      entries.map(async (entry): Promise<ModelInfo> => {
        const model: ModelInfo = {
          id: entry.id,
          name: entry.name,
          developer: entry.developer,
          isPreferred: Boolean(entry.developer),
          license: entry.license,
          contextWindow: entry.contextWindow,
          isAvailable: false,
          capabilities: { structuredOutput: 'none', toolCalling: false }
        }
        try {
          const details = await this.call('inspect', entry.id, {})
          model.isAvailable = details.isCached
          model.quantization = details.dtype
          if (details.sizeBytes) {
            model.sizeBytes = details.sizeBytes
            model.memoryBytes = Math.round(details.sizeBytes * MEMORY_OVERHEAD_FACTOR)
          }
        } catch (error) {
          const { message } = error as Error
          model.unavailableReason = /fetch|network/i.test(message)
            ? 'Could not reach Hugging Face to look up this model.'
            : message
        }
        return model
      })
    )
  }

  async prepareModel(
    modelId: string,
    onProgress: (progress: ModelLoadProgress) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const cancel = () => this.dispose()
    signal?.addEventListener('abort', cancel)
    try {
      await this.call('load', modelId, {}, (response) => {
        if (response.type !== 'progress') return
        // Weights stored in the browser are read back with the same progress as a download
        const isRead = response.isCached || response.loadedBytes >= response.totalBytes
        onProgress({
          phase: isRead ? 'load' : 'download',
          loadedBytes: response.loadedBytes,
          totalBytes: response.totalBytes
        })
      })
      // Asks the browser not to evict the downloaded weights when storage runs short
      navigator.storage?.persist?.().catch(() => {})
    } catch (error) {
      if (signal?.aborted) throw new LlmError('aborted', 'Loading the model was cancelled.')
      // The GPU path can fail on drivers and devices WebGPU nominally supports
      const isOutOfMemory = error instanceof LlmError && error.code === 'out-of-memory'
      if (this.backend === 'webgpu' && this.backendSetting === 'auto' && !isOutOfMemory) {
        this.dispose()
        this.backend = 'wasm'
        try {
          return await this.prepareModel(modelId, onProgress, signal)
        } catch (fallbackError) {
          if (signal?.aborted) throw fallbackError
          // The graphics card's error names the actual cause, which might be temporary
          this.dispose()
          this.backend = 'webgpu'
        }
      }
      throw error
    } finally {
      signal?.removeEventListener('abort', cancel)
    }
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatEvent, void, void> {
    if (request.tools?.length) {
      throw new LlmError(
        'unsupported',
        'Models running in the browser do not support tool calling.'
      )
    }
    if (request.messages.some((message) => message.role === 'tool')) {
      throw new LlmError(
        'unsupported',
        'Models running in the browser do not support tool results.'
      )
    }
    await this.prepareModel(request.model, () => {}, request.signal)

    // Tokens arrive through worker messages; the queue hands them to the generator
    const queue: string[] = []
    let wake: () => void = () => {}
    let outcome: { value?: Json; error?: unknown } | null = null
    const abort = () => this.worker?.postMessage({ type: 'abort' } satisfies WorkerRequest)
    request.signal?.addEventListener('abort', abort)
    this.call(
      'generate',
      request.model,
      {
        messages: request.messages.map(({ role, content }) => ({ role, content })),
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature,
        topP: request.topP
      },
      (response) => {
        if (response.type === 'token') queue.push(response.text)
        wake()
      }
    )
      .then(
        (value) => (outcome = { value }),
        (error) => (outcome = { error })
      )
      .finally(() => wake())

    try {
      for (;;) {
        while (queue.length) yield { type: 'text', text: queue.shift()! }
        if (outcome) break
        await new Promise<void>((resolve) => (wake = resolve))
      }
    } finally {
      request.signal?.removeEventListener('abort', abort)
    }
    const { value, error } = outcome as { value?: Json; error?: unknown }
    if (request.signal?.aborted) throw new LlmError('aborted', 'The request was cancelled.')
    if (error || !value) throw error
    yield {
      type: 'finish',
      finishReason: value.finishReason as FinishReason,
      usage: { inputTokens: value.inputTokens, outputTokens: value.outputTokens }
    }
  }

  async removeModel(modelId: string): Promise<void> {
    await this.call('remove', modelId, {})
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    const failure = {
      type: 'error' as const,
      message: 'The model was unloaded.',
      isOutOfMemory: false
    }
    for (const [requestId, listener] of this.listeners) listener({ requestId, ...failure })
  }
}
