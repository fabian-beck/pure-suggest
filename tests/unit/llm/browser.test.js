import { describe, it, expect, beforeEach, vi } from 'vitest'

import { collectEvents } from '../../helpers/llmTestUtils.js'

import { BrowserProvider } from '@/llm/browser.ts'

const DEVICE = { hasWebGpu: true, supportsShaderF16: true }
const MODEL_ID = 'onnx-community/gemma-4-E2B-it-ONNX'

// Stand-in for the Transformers.js worker, answering requests through `respond`
let respond
let requests
class FakeWorker {
  postMessage(request) {
    requests.push(request)
    const reply = (message) =>
      Promise.resolve().then(() => this.onmessage({ data: { requestId: request.requestId, ...message } }))
    respond(request, reply)
  }
  terminate() {}
}

describe('BrowserProvider', () => {
  beforeEach(() => {
    requests = []
    vi.stubGlobal('Worker', FakeWorker)
  })

  it('describes models with their download state and size', async () => {
    respond = (request, reply) => {
      if (request.modelId === MODEL_ID) {
        reply({ type: 'result', value: { dtype: 'q4f16', isCached: true, sizeBytes: 2e9 } })
      } else reply({ type: 'error', message: 'Repository not found', isOutOfMemory: false })
    }
    const provider = new BrowserProvider('auto', DEVICE, ['someone/custom-ONNX'])

    const models = await provider.listModels()

    const cached = models.find((model) => model.id === MODEL_ID)
    expect(cached).toMatchObject({
      name: 'Gemma 4 E2B',
      isAvailable: true,
      sizeBytes: 2e9,
      quantization: 'q4f16',
      license: 'Apache 2.0',
      capabilities: { structuredOutput: 'none', toolCalling: false }
    })
    expect(cached.memoryBytes).toBeGreaterThan(2e9)
    expect(models.at(-1)).toMatchObject({
      id: 'someone/custom-ONNX',
      isAvailable: false,
      unavailableReason: 'Repository not found'
    })
    expect(requests[0]).toMatchObject({ type: 'inspect', backend: 'webgpu' })
    expect(requests[0].dtypes[0]).toBe('q4f16')
  })

  it('loads the model, reports download progress, and streams the answer', async () => {
    respond = (request, reply) => {
      if (request.type === 'load') {
        reply({ type: 'progress', loadedBytes: 1e9, totalBytes: 2e9 })
        reply({ type: 'result', value: {} })
      } else {
        reply({ type: 'token', text: 'Hello' })
        reply({ type: 'token', text: ' there' })
        reply({ type: 'result', value: { finishReason: 'stop', inputTokens: 9, outputTokens: 2 } })
      }
    }
    const provider = new BrowserProvider('auto', DEVICE, [])
    const onProgress = vi.fn()

    await provider.prepareModel(MODEL_ID, onProgress)
    const events = await collectEvents(
      provider.streamChat({
        model: MODEL_ID,
        messages: [{ role: 'user', content: 'Hi' }],
        maxOutputTokens: 64
      })
    )

    expect(onProgress).toHaveBeenCalledWith({ phase: 'download', loadedBytes: 1e9, totalBytes: 2e9 })
    expect(requests.at(-1)).toMatchObject({
      type: 'generate',
      messages: [{ role: 'user', content: 'Hi' }],
      maxOutputTokens: 64
    })
    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' there' },
      { type: 'finish', finishReason: 'stop', usage: { inputTokens: 9, outputTokens: 2 } }
    ])
  })

  it('falls back to the processor when the graphics card fails', async () => {
    respond = (request, reply) => {
      if (request.backend === 'webgpu') {
        reply({ type: 'error', message: 'No available adapters', isOutOfMemory: false })
      } else reply({ type: 'result', value: {} })
    }
    const provider = new BrowserProvider('auto', DEVICE, [])

    await provider.prepareModel(MODEL_ID, () => {})

    expect(provider.backend).toBe('wasm')
    expect(requests.at(-1)).toMatchObject({ type: 'load', backend: 'wasm', dtypes: ['q4', 'q8', 'int8', 'fp32'] })
  })

  it('reports the graphics card error and retries it next time when the processor fails too', async () => {
    respond = (request, reply) =>
      reply({
        type: 'error',
        message: request.backend === 'webgpu' ? 'network error' : 'Could not find an implementation',
        isOutOfMemory: false
      })
    const provider = new BrowserProvider('auto', DEVICE, [])

    await expect(provider.prepareModel(MODEL_ID, () => {})).rejects.toThrow('network error')
    expect(provider.backend).toBe('webgpu')
  })

  it('reports missing memory instead of retrying, and rejects unsupported tool use', async () => {
    respond = (request, reply) => reply({ type: 'error', message: 'Out of memory', isOutOfMemory: true })
    const provider = new BrowserProvider('auto', DEVICE, [])

    await expect(provider.prepareModel(MODEL_ID, () => {})).rejects.toMatchObject({
      code: 'out-of-memory'
    })
    expect(provider.backend).toBe('webgpu')

    await expect(
      collectEvents(
        provider.streamChat({
          model: MODEL_ID,
          messages: [],
          tools: [{ name: 'find', description: '', parameters: {} }]
        })
      )
    ).rejects.toMatchObject({ code: 'unsupported' })
  })
})
