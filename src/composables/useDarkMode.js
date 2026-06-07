import { ref, computed } from 'vue'

const STORAGE_KEY = 'puresuggest-theme'
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const preference = ref(localStorage.getItem(STORAGE_KEY) || 'system')
const systemDark = ref(mediaQuery.matches)

mediaQuery.addEventListener('change', (e) => {
  systemDark.value = e.matches
})

export const isDark = computed(
  () => preference.value === 'dark' || (preference.value === 'system' && systemDark.value)
)

export function toggleDarkMode() {
  preference.value = isDark.value ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, preference.value)
}
