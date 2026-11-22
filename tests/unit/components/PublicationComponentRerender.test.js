import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

import PublicationComponent from '@/components/PublicationComponent.vue'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'

vi.mock('@/composables/useAppState.js', () => ({ useAppState: () => ({}) }))

// The tooltip directive of the buttons is updated whenever the publication re-renders
function mountPublication(pinia, doi) {
  const onRerender = vi.fn()
  mount(PublicationComponent, {
    props: {
      publication: { doi, score: 1, boostFactor: 1, wasFetched: true, referenceDois: new Set() }
    },
    global: {
      plugins: [pinia],
      stubs: { PublicationDescription: true, CompactButton: true, InlineIcon: true, tippy: true },
      directives: { tippy: { updated: onRerender } }
    }
  })
  return onRerender
}

describe('PublicationComponent re-rendering', () => {
  it('only re-renders the publication that is hovered or queued', async () => {
    const pinia = createPinia()
    const onRerender = mountPublication(pinia, '10.1234/a')
    const onOtherRerender = mountPublication(pinia, '10.1234/b')

    useInterfaceStore(pinia).setHoveredPublication({ doi: '10.1234/a' })
    await nextTick()
    expect(onRerender).toHaveBeenCalled()

    onRerender.mockClear()
    useQueueStore(pinia).selectedQueue.push('10.1234/a')
    await nextTick()
    expect(onRerender).toHaveBeenCalled()

    expect(onOtherRerender).not.toHaveBeenCalled()
  })
})
