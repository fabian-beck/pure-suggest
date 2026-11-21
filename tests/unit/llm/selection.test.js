import { describe, it, expect, vi } from 'vitest'

import { preferredDeveloper } from '@/llm/catalog.ts'
import { detectDevice, measurementKey, recommendSetup } from '@/llm/selection.ts'

const device = (overrides) => ({
  hasWebGpu: true,
  supportsShaderF16: true,
  gpuDescription: '',
  cores: 8,
  isMobile: false,
  tier: 'standard',
  ...overrides
})

const model = (id, sizeBytes, isPreferred = true) => ({
  id,
  name: id,
  sizeBytes,
  isPreferred,
  isAvailable: true,
  capabilities: {}
})

const ollama = (models) => ({ kind: 'ollama', baseUrl: 'http://localhost:11434/v1', models })

describe('model preferences', () => {
  it('recognizes the preferred developers and no others', () => {
    expect(preferredDeveloper('gemma4:e4b')).toBe('Google')
    expect(preferredDeveloper('mistralai/Ministral-3-3B-Instruct-2512-ONNX')).toBe('Mistral AI')
    expect(preferredDeveloper('phi4-mini')).toBe('Microsoft')
    expect(preferredDeveloper('gpt-oss:20b')).toBe('OpenAI')
    expect(preferredDeveloper('qwen3:8b')).toBeUndefined()
    expect(preferredDeveloper('deepseek-r1')).toBeUndefined()
  })
})

describe('recommendSetup', () => {
  it('suggests a small browser model on mobile devices, even with a local server', () => {
    const recommendation = recommendSetup(
      device({ tier: 'low', isMobile: true }),
      [ollama([model('gemma4:e4b', 6e9)])],
      {}
    )

    expect(recommendation).toMatchObject({
      mode: 'browser',
      modelId: 'onnx-community/gemma-4-E2B-it-ONNX'
    })
  })

  it('suggests the smallest browser model without GPU acceleration, unless a server runs', () => {
    const withoutGpu = device({ hasWebGpu: false })

    expect(recommendSetup(withoutGpu, [], {}).modelId).toBe('onnx-community/gemma-3-270m-it-ONNX')
    expect(recommendSetup(withoutGpu, [ollama([model('gemma4:e4b', 6e9)])], {}).mode).toBe('native')
  })

  it('suggests a larger browser model on standard laptops without a local server', () => {
    expect(recommendSetup(device(), [], {}).modelId).toBe('onnx-community/gemma-4-E4B-it-ONNX')
  })

  it('prefers a local server with a fitting preferred model on desktops', () => {
    const servers = [
      ollama([model('qwen3:32b', 20e9, false), model('gpt-oss:20b', 14e9), model('gemma4:e4b', 6e9)])
    ]

    expect(recommendSetup(device(), servers, {})).toMatchObject({
      mode: 'native',
      baseUrl: 'http://localhost:11434/v1',
      modelId: 'gemma4:e4b'
    })
    expect(recommendSetup(device({ tier: 'high' }), servers, {}).modelId).toBe('gpt-oss:20b')
  })

  it('ranks measured speed above model size', () => {
    const servers = [ollama([model('gpt-oss:20b', 14e9), model('gemma4:e4b', 6e9)])]
    const tooSlow = { [measurementKey('ollama', 'gpt-oss:20b')]: 2 }
    const fastEnough = { [measurementKey('ollama', 'gpt-oss:20b')]: 30 }

    expect(recommendSetup(device({ tier: 'high' }), servers, tooSlow).modelId).toBe('gemma4:e4b')
    // A proven speed overrules the size limit assumed for the device class
    expect(recommendSetup(device(), servers, fastEnough).modelId).toBe('gpt-oss:20b')
    expect(
      recommendSetup(device(), [], {
        [measurementKey('browser', 'onnx-community/gemma-4-E4B-it-ONNX')]: 1
      }).modelId
    ).toBe('onnx-community/gemma-4-E2B-it-ONNX')
  })

  it('falls back to the browser when a server only offers other models', () => {
    const servers = [ollama([model('qwen3:8b', 5e9, false)])]

    expect(recommendSetup(device(), servers, {}).mode).toBe('browser')
  })
})

describe('detectDevice', () => {
  it('classifies devices from what the browser reveals', async () => {
    const stubNavigator = (properties) =>
      vi.stubGlobal('navigator', { userAgent: 'Desktop', hardwareConcurrency: 16, ...properties })
    const adapter = (vendor) => ({ info: { vendor }, features: new Set(['shader-f16']) })

    stubNavigator({ gpu: { requestAdapter: () => Promise.resolve(adapter('nvidia')) } })
    expect(await detectDevice()).toMatchObject({
      hasWebGpu: true,
      supportsShaderF16: true,
      gpuDescription: 'nvidia',
      tier: 'high'
    })

    stubNavigator({})
    expect(await detectDevice()).toMatchObject({ hasWebGpu: false, tier: 'standard' })

    stubNavigator({ userAgentData: { mobile: true }, gpu: { requestAdapter: () => Promise.resolve(adapter('arm')) } })
    expect(await detectDevice()).toMatchObject({ isMobile: true, tier: 'low' })

    vi.unstubAllGlobals()
  })
})
