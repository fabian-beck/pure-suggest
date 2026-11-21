import { BROWSER_MODELS, type DeviceTier } from './catalog.ts'
import type { NativeServer } from './native.ts'

export interface DeviceProfile {
  hasWebGpu: boolean
  /** Required for the half-precision weights that make models fit GPU memory. */
  supportsShaderF16: boolean
  gpuDescription: string
  /** Device memory in GB as reported by Chromium browsers (capped at 8 by the browser). */
  memoryGb?: number
  cores: number
  isMobile: boolean
  tier: DeviceTier
}

/** Detects what the browser reveals about the device; the tier is a heuristic starting point. */
export async function detectDevice(): Promise<DeviceProfile> {
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency || 4
  const isMobile =
    (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile ??
    /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)

  let adapter: GPUAdapter | null = null
  try {
    adapter = (await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' })) ?? null
  } catch {
    // WebGPU present but unusable
  }
  const info = adapter?.info
  const gpuDescription = [info?.vendor, info?.architecture, info?.description]
    .filter(Boolean)
    .join(' ')

  let tier: DeviceTier = 'standard'
  if (isMobile || (memoryGb !== undefined && memoryGb <= 4)) tier = 'low'
  else if (/nvidia|amd/i.test(gpuDescription) || (/apple/i.test(gpuDescription) && cores >= 10)) {
    tier = 'high'
  }

  return {
    hasWebGpu: Boolean(adapter),
    supportsShaderF16: adapter?.features.has('shader-f16') ?? false,
    gpuDescription,
    memoryGb,
    cores,
    isMobile,
    tier
  }
}

const TIER_RANK: Record<DeviceTier, number> = { low: 0, standard: 1, high: 2 }

// Largest native model (in bytes) suggested per device class without a speed measurement
const NATIVE_SIZE_LIMIT: Record<DeviceTier, number> = { low: 3e9, standard: 7e9, high: 16e9 }

/** Below this measured speed (tokens per second), a model counts as too slow for the device. */
export const MIN_USABLE_SPEED = 5

export interface Recommendation {
  mode: 'browser' | 'native'
  /** Endpoint of the recommended local server (native mode only). */
  baseUrl?: string
  modelId: string
  reason: string
}

/** Key under which the measured speed of a model on a backend is stored. */
export function measurementKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`
}

/**
 * Suggests the local setup for this device (cloud use is never suggested, only chosen):
 * a detected local server on capable desktops, otherwise a model running in the browser.
 * Measured speeds outrank model size: models that proved too slow are skipped.
 */
export function recommendSetup(
  device: DeviceProfile,
  servers: NativeServer[],
  measurements: Record<string, number>
): Recommendation {
  const isTooSlow = (providerId: string, modelId: string) =>
    (measurements[measurementKey(providerId, modelId)] ?? Infinity) < MIN_USABLE_SPEED

  if (device.tier !== 'low') {
    for (const server of servers) {
      const candidates = server.models
        .filter((model) => model.isPreferred && !isTooSlow(server.kind, model.id))
        .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0))
      // Largest model with a proven speed, else the largest one expected to fit the device
      const model =
        candidates.find((model) => measurementKey(server.kind, model.id) in measurements) ??
        candidates.find((model) => (model.sizeBytes ?? 0) <= NATIVE_SIZE_LIMIT[device.tier]) ??
        candidates.at(-1)
      if (model) {
        return {
          mode: 'native',
          baseUrl: server.baseUrl,
          modelId: model.id,
          reason: 'A local inference server with a suitable model is running on this device.'
        }
      }
    }
  }

  const eligible = BROWSER_MODELS.filter(
    (model) =>
      model.isVerified &&
      TIER_RANK[model.tier] <= TIER_RANK[device.tier] &&
      !isTooSlow('browser', model.id)
  )
  // Without GPU acceleration only the smallest model stays responsive
  const model = (device.hasWebGpu ? eligible.at(-1) : eligible[0]) ?? BROWSER_MODELS[0]!
  return {
    mode: 'browser',
    modelId: model.id,
    reason: device.hasWebGpu
      ? 'Runs in this browser with GPU acceleration; no installation needed.'
      : 'This browser offers no GPU acceleration (WebGPU), so only a very small model is practical.'
  }
}
