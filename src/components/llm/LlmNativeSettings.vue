<script setup>
import { computed } from 'vue'

import { NATIVE_MODEL_SUGGESTIONS } from '@/llm/catalog.ts'
import { NATIVE_SERVER_NAMES } from '@/llm/native.ts'
import { useLlmStore } from '@/stores/llm.js'

const llmStore = useLlmStore()

const pageOrigin = window.location.origin
const isSecurePage = window.location.protocol === 'https:'
const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)

// Browsers block secure pages from loading insecure content of other machines
const isBlockedAsMixedContent = computed(
  () =>
    isSecurePage &&
    llmStore.location === 'remote' &&
    llmStore.settings.nativeBaseUrl.startsWith('http:')
)

const hasPreferredModel = computed(() => llmStore.models.some((model) => model.isPreferred))

const suggestions = computed(() => {
  const tiers = llmStore.device?.tier === 'high' ? ['standard', 'high'] : ['standard']
  return NATIVE_MODEL_SUGGESTIONS.filter((suggestion) => tiers.includes(suggestion.tier))
})

function useServer(server) {
  llmStore.settings.nativeBaseUrl = server.baseUrl
  llmStore.refreshModels()
}
</script>

<template>
  <div>
    <p class="mb-3">
      Uses an inference server installed on this computer, such as
      <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> or
      <a href="https://lmstudio.ai" target="_blank" rel="noopener">LM Studio</a>. It runs models
      with full hardware acceleration, and your session data stays on this computer.
    </p>

    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <v-btn
        prepend-icon="mdi-radar"
        :loading="llmStore.isDetectingServers"
        v-tippy="
          'Looks for Ollama, LM Studio, and llama.cpp at their default addresses on this computer. The browser may ask for permission to access the local network.'
        "
        @click="llmStore.detectServers()"
      >
        Detect servers
      </v-btn>
      <v-chip
        v-for="server in llmStore.servers"
        :key="server.baseUrl"
        label
        role="button"
        tabindex="0"
        :color="server.baseUrl === llmStore.settings.nativeBaseUrl ? 'primary' : undefined"
        @click="useServer(server)"
        @keydown.enter="useServer(server)"
      >
        {{ NATIVE_SERVER_NAMES[server.kind] }} · {{ server.models.length }} model{{
          server.models.length === 1 ? '' : 's'
        }}
      </v-chip>
    </div>

    <v-text-field
      v-model="llmStore.settings.nativeBaseUrl"
      label="Server address"
      density="compact"
      hide-details
      class="mb-3"
      @keydown.enter="llmStore.refreshModels()"
    >
      <template #append-inner>
        <v-btn size="small" variant="text" class="px-2" @click="llmStore.refreshModels()">
          Connect
        </v-btn>
      </template>
    </v-text-field>

    <v-alert
      v-if="isBlockedAsMixedContent"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      Browsers do not let this secure page reach an unencrypted (http) server on another machine.
      Use an https address or a server on this computer.
    </v-alert>

    <v-alert
      v-if="llmStore.modelsError"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-3"
      role="alert"
    >
      <p>{{ llmStore.modelsError }}</p>
      <ul class="hints">
        <li>Check that the server is running.</li>
        <li>
          <b>Ollama</b> must allow this page: start it with the setting
          <code>OLLAMA_ORIGINS={{ pageOrigin }}</code
          >.
        </li>
        <li><b>LM Studio</b>: switch on “Enable CORS” in the settings of its local server.</li>
        <li v-if="llmStore.localNetworkPermission === 'denied'">
          This browser blocks the page from reaching local servers. Allow local network access in
          the site settings.
        </li>
        <li v-else>
          Allow the access when the browser asks whether this page may connect to the local network.
        </li>
        <li v-if="isSafari && isSecurePage">
          Safari does not let secure pages reach local servers; use Chrome, Edge, or Firefox.
        </li>
        <li>
          Only allow this page’s address in the server; PUREsuggest never changes server settings
          itself.
        </li>
      </ul>
    </v-alert>

    <LlmModelList />

    <div
      v-if="!llmStore.isLoadingModels && !llmStore.modelsError && !hasPreferredModel"
      class="mt-3"
    >
      <p class="mb-1">Suggested models to install (for Ollama):</p>
      <ul class="hints">
        <li v-for="suggestion in suggestions" :key="suggestion.tag">
          {{ suggestion.name }}: <code>ollama pull {{ suggestion.tag }}</code>
        </li>
      </ul>
    </div>

    <v-checkbox
      v-if="llmStore.location === 'remote'"
      v-model="llmStore.hasRemoteConsent"
      density="compact"
      hide-details
      class="mt-2"
      label="This server is not on this computer. Allow sending session data (titles, abstracts, keywords) to it."
    />

    <v-expansion-panels class="mt-3" variant="accordion">
      <v-expansion-panel title="Server requires a key">
        <v-expansion-panel-text>
          <v-text-field
            v-model="llmStore.apiKeys.native"
            label="API key of the server"
            type="password"
            autocomplete="off"
            density="compact"
            hide-details
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<style scoped lang="scss">
.hints {
  list-style-type: disc;
  margin: 0.25rem 0 0 1.25rem;

  & code {
    user-select: all;
  }
}
</style>
