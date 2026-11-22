<script>
import CompactButton from '@/components/basic/CompactButton.vue'
import { useDialogFocusReturn } from '@/composables/useDialogFocusReturn.js'
import { useInterfaceStore } from '@/stores/interface.js'

const FOCUSABLE_SELECTOR = 'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
const TEXT_INPUT_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea'

/**
 * Dialog frame with keyboard support shared by all modal dialogs:
 * - On opening, focuses the element marked with `dialog-initial-focus`, otherwise the first
 *   entry marked with `dialog-item`, otherwise the scrollable content.
 * - Arrow up/down, Home, and End move between `dialog-item` entries; arrow down also leaves
 *   a text field towards the entries, arrow up on the first entry returns to the initial focus.
 * - Other keys are emitted as `dialogKey` (event, index of the focused entry or -1) for
 *   dialog-specific shortcuts. If a handled key removed the focused entry, the entry now at
 *   its position gets the focus.
 */
export default {
  name: 'ModalDialog',
  components: { CompactButton },
  props: {
    modelValue: Boolean,
    headerColor: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'dialogKey', 'scroll'],
  data() {
    return {
      isDialogShown: this.modelValue
    }
  },
  setup: (props) => {
    const interfaceStore = useInterfaceStore()
    useDialogFocusReturn(() => props.modelValue)
    return { interfaceStore }
  },
  watch: {
    modelValue() {
      this.isDialogShown = this.modelValue
      // Focus right away, so that keys typed directly after opening already reach the dialog
      if (this.modelValue) this.$nextTick(() => this.focusInitialElement())
    },
    isDialogShown() {
      this.$emit('update:modelValue', this.isDialogShown)
    }
  },
  methods: {
    hideDialog() {
      this.isDialogShown = false
    },
    items() {
      return [...this.$refs.card.$el.querySelectorAll('.dialog-item')].filter(
        (item) => item.checkVisibility?.() !== false
      )
    },
    initialFocusElement() {
      const card = this.$refs.card.$el
      const marked = card.querySelector('.dialog-initial-focus')
      const markedFocusable = marked?.matches(FOCUSABLE_SELECTOR)
        ? marked
        : marked?.querySelector(FOCUSABLE_SELECTOR)
      return markedFocusable || this.items()[0] || card.querySelector('.v-card-text')
    },
    focusInitialElement() {
      if (this.$refs.card) this.initialFocusElement()?.focus()
    },
    // Fallback in case the content was not rendered yet when the dialog opened
    onAfterEnter() {
      if (!this.$refs.card.$el.contains(document.activeElement)) this.focusInitialElement()
    },
    onKeydown(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return
      const isTextInput = event.target.matches(TEXT_INPUT_SELECTOR)
      const items = this.items()
      const index = items.indexOf(event.target.closest('.dialog-item'))
      const nextElement = this.navigationTarget(event, items, index, isTextInput)
      if (nextElement) {
        event.preventDefault()
        nextElement.focus()
        return
      }
      if (isTextInput || event.defaultPrevented) return
      this.$emit('dialogKey', event, index)
      if (event.defaultPrevented && index >= 0) {
        this.$nextTick(() => {
          if (this.$refs.card.$el.contains(document.activeElement)) return
          const remainingItems = this.items()
          const nextElement =
            remainingItems[Math.min(index, remainingItems.length - 1)] ?? this.initialFocusElement()
          nextElement?.focus()
        })
      }
    },
    navigationTarget(event, items, index, isTextInput) {
      if (!items.length || event.shiftKey) return null
      if (event.key === 'ArrowDown') return index < 0 || isTextInput ? items[0] : items[index + 1]
      if (isTextInput) return null
      if (event.key === 'ArrowUp' && index > 0) return items[index - 1]
      if (event.key === 'ArrowUp' && index === 0) {
        const initialElement = this.initialFocusElement()
        return initialElement !== items[0] ? initialElement : null
      }
      if (event.key === 'Home') return items[0]
      if (event.key === 'End') return items[items.length - 1]
      return null
    }
  }
}
</script>

<template>
  <v-dialog
    v-model="isDialogShown"
    scrollable
    :fullscreen="interfaceStore.isMobile"
    :z-index="9000"
    class="modal-dialog-overlay"
    :aria-label="title"
    @after-enter="onAfterEnter"
  >
    <v-card ref="card" @keydown="onKeydown">
      <v-card-title
        :class="`has-background-${headerColor} ${headerColor.startsWith('light') ? 'has-text-dark' : 'has-text-light'}`"
      >
        <div class="modal-title-bar">
          <v-icon size="24">{{ icon }}</v-icon>
          <span class="modal-title-text">{{ title }}</span>
          <div class="modal-title-actions">
            <slot name="header-menu"></slot>
            <CompactButton icon="mdi-close" aria-label="Close dialog" @click="hideDialog" />
          </div>
        </div>
      </v-card-title>
      <div class="sticky">
        <slot name="sticky"></slot>
      </div>
      <v-card-text tabindex="0" @scroll="$emit('scroll', $event)">
        <slot></slot>
      </v-card-text>
      <slot name="footer"></slot>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
:deep(.dialog-item:focus-visible) {
  outline: 2px solid hsl(0, 0%, 45%);
  outline-offset: 3px;
  border-radius: 2px;
  background-color: hsla(0, 0%, 0%, 0.04);
}

:deep(.v-overlay__content:has(.v-card)) {
  margin-top: 48px !important;
  height: calc(100vh - 48px) !important;

  & .v-card-title {
    margin-bottom: 0;
    padding: 0.5rem;

    & .modal-title-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.25rem;
      font-size: 1rem;

      & .modal-title-text {
        font-size: 1.2rem;
        font-weight: 600;
        flex-grow: 1;
      }

      & .modal-title-actions {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
  }

  & .sticky {
    position: sticky;
    top: 0;
    z-index: 3000;
    background-color: white;
  }

  & .v-card-text {
    padding: calc(0.5rem + 1%) !important;

    & h2 {
      font-size: 1.25rem !important;

      & .v-icon {
        position: relative;
        top: -0.15rem;
      }
    }
  }
}

@media screen and (max-width: 1023px) {
    :deep(.v-overlay__content:has(.v-card)) {
        margin-top: 0 !important;
        height: 100vh !important;
    }
}

@media screen and (min-width: 1024px) {
  :deep(.v-overlay__content) {
    max-width: 1024px !important;
    margin-top: 60px !important;
    margin-bottom: 20px !important;
    max-height: calc(100vh - 80px) !important;
  }
}
</style>
