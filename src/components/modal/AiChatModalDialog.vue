<script setup>
import { computed, nextTick, ref, watch } from 'vue'

import { useAiChat } from '@/composables/useAiChat.js'
import { useModalManager } from '@/composables/useModalManager.js'
import { useLlmStore } from '@/stores/llm.js'
import { useModalStore } from '@/stores/modal.js'
import { useSessionStore } from '@/stores/session.js'

const EXAMPLES = [
  'What are the main themes of my selected publications?',
  'Which suggested publications are literature surveys?',
  'Set keywords that fit my selection.',
  'Show only publications since 2020.'
]

const sessionStore = useSessionStore()
const modalStore = useModalStore()
const llmStore = useLlmStore()
const { openLlmSettingsModal } = useModalManager()
const { sendChatMessage, stopAnswer, undoActions } = useAiChat()

const draft = ref('')
const conversationEnd = ref(null)

const messages = computed(() => sessionStore.aiChatMessages)
const isWriting = computed(() => Boolean(messages.value.at(-1)?.isWriting))

function send(text) {
  if (isWriting.value || llmStore.setupIssue || !text.trim()) return
  draft.value = ''
  sendChatMessage(text.trim())
}

watch(
  () => modalStore.isAiChatModalDialogShown,
  (isShown) => {
    if (isShown) llmStore.warmUp()
  }
)

// Keep the newest message in view while the conversation grows
watch(
  messages,
  async () => {
    await nextTick()
    conversationEnd.value?.scrollIntoView?.({ block: 'end' })
  },
  { deep: true }
)
</script>

<template>
  <ModalDialog
    v-model="modalStore.isAiChatModalDialogShown"
    title="AI chat"
    icon="mdi-forum-outline"
    header-color="info"
  >
    <template #header-menu>
      <CompactButton
        icon="mdi-delete-outline has-text-white"
        :disabled="!messages.length || isWriting"
        v-tippy="'Clear the conversation'"
        @click="sessionStore.aiChatMessages = []"
      />
    </template>
    <div class="content">
      <div v-if="!messages.length">
        <p>
          Ask an AI model about your session. It reads your selected and suggested publications,
          keywords, and filters, and can set keywords and filters for you. Publications it singles
          out are marked as AI recommended and shown first in the lists.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="example in EXAMPLES"
            :key="example"
            label
            role="button"
            tabindex="0"
            :disabled="Boolean(llmStore.setupIssue)"
            @click="send(example)"
            @keydown.enter="send(example)"
          >
            {{ example }}
          </v-chip>
        </div>
      </div>

      <div
        v-for="(message, index) in messages"
        :key="index"
        class="message"
        :class="`is-${message.role}`"
      >
        <v-icon v-if="message.role === 'assistant'" class="mr-2">mdi-robot-outline</v-icon>
        <div class="bubble">
          <div class="text">{{ message.text }}</div>
          <div v-if="message.isWriting && !message.text" class="is-size-7" role="status">
            <v-progress-circular indeterminate size="14" width="2" class="mr-1" />
            Reading your session…
          </div>
          <div v-for="action in message.actions" :key="action.label" class="action">
            <v-icon size="small" class="mr-1">mdi-auto-fix</v-icon>{{ action.label }}
          </div>
          <div v-if="message.papers?.length" class="marked">
            <div class="action">
              <v-icon size="small" class="mr-1">mdi-robot-outline</v-icon>Marked
              {{ message.papers.length }} publication{{ message.papers.length === 1 ? '' : 's' }}
              as AI recommended
            </div>
            <div v-for="paper in message.papers" :key="paper.doi" class="is-size-7">
              <b>{{ paper.title || paper.doi }}</b>
              <span v-if="paper.authorShort">
                ({{ paper.authorShort }}<template v-if="paper.year">, {{ paper.year }}</template
                >)</span
              >
              – <i>{{ paper.explanation }}</i>
            </div>
          </div>
          <v-btn
            v-if="message.undo"
            size="small"
            variant="text"
            class="px-2"
            prepend-icon="mdi-undo"
            @click="undoActions(message)"
          >
            Undo changes
          </v-btn>
          <div v-if="message.isStopped" class="is-size-7">Stopped.</div>
          <div v-if="message.error" class="has-text-danger" role="alert">{{ message.error }}</div>
        </div>
      </div>
      <div ref="conversationEnd"></div>
    </div>
    <template #footer>
      <div class="chat-footer has-background-info-95">
        <p v-if="llmStore.setupIssue" class="is-size-7 mb-2">
          <v-icon size="small" color="warning">mdi-alert-outline</v-icon>
          {{ llmStore.setupIssue }}
        </p>
        <v-text-field
          v-else
          v-model="draft"
          class="dialog-initial-focus mb-2"
          label="Ask about your session, or for keywords and filters"
          density="compact"
          hide-details
          autocomplete="off"
          @keydown.enter="send(draft)"
        >
          <template #append-inner>
            <v-btn v-if="isWriting" size="small" variant="text" class="px-2" @click="stopAnswer()">
              Stop
            </v-btn>
            <v-btn
              v-else
              size="small"
              variant="text"
              class="px-2"
              :disabled="!draft.trim()"
              @click="send(draft)"
            >
              Send
            </v-btn>
          </template>
        </v-text-field>
        <div class="d-flex flex-wrap align-center ga-2">
          <LlmEngineChip v-if="llmStore.settings.mode" />
          <v-btn
            prepend-icon="mdi-cog"
            :class="{ 'dialog-initial-focus': llmStore.setupIssue }"
            @click="openLlmSettingsModal()"
          >
            {{ llmStore.settings.mode ? 'Change model' : 'Choose model' }}
          </v-btn>
        </div>
      </div>
    </template>
  </ModalDialog>
</template>

<style scoped lang="scss">
.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.75rem;

  &.is-user {
    justify-content: flex-end;
  }

  & .bubble {
    max-width: min(85%, 44rem);
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background-color: var(--bulma-info-95);
  }

  &.is-user .bubble {
    background-color: rgba(0, 0, 0, 0.07);
  }

  & .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  & .action {
    margin-top: 0.25rem;
    font-weight: 600;
  }
}

.chat-footer {
  padding: 0.75rem calc(0.5rem + 1%);
}
</style>
