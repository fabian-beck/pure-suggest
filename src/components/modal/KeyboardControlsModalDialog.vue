<script>
import { useInterfaceStore } from '@/stores/interface.js'

export default {
  setup() {
    const interfaceStore = useInterfaceStore()
    return { interfaceStore }
  }
}
</script>

<template>
  <ModalDialog
    v-model="interfaceStore.isKeyboardControlsModalDialogShown"
    title="Keyboard Controls"
    icon="mdi-keyboard-outline"
    header-color="light"
  >
    <div class="content">
      <section>
        <p>You can use the following keyboard shortcuts to control the application.</p>
        <h2>General</h2>
        <ul class="keys">
          <li><v-icon>mdi-alpha-s-box-outline</v-icon> Open "Search" dialog</li>
          <li><v-icon>mdi-alpha-b-box-outline</v-icon> Jump to "Boost" input</li>
          <li>
            <v-icon>mdi-alpha-u-box-outline</v-icon> Update selected publications (if publications
            are waiting)
          </li>
          <li><v-icon>mdi-alpha-f-box-outline</v-icon> Switch on/off filtering of suggestions</li>
          <li>
            <v-icon>mdi-alpha-a-box-outline</v-icon> Open list of authors of selected publications
          </li>
          <li>
            <v-icon>mdi-arrow-left-bold-box-outline</v-icon> Jump to first publication of "Selected"
          </li>
          <li>
            <v-icon>mdi-arrow-right-bold-box-outline</v-icon> Jump to first publication of
            "Suggested"
          </li>
          <li>
            <v-icon>mdi-arrow-down-bold-box-outline</v-icon> Move one publication down (if one is
            active)
          </li>
          <li>
            <v-icon>mdi-arrow-up-bold-box-outline</v-icon> Move one publication up (if one is
            active)
          </li>
          <li><v-icon>mdi-keyboard-esc</v-icon> Escape input field or active</li>
          <li><v-icon>mdi-alpha-c-box-outline</v-icon> Clear session</li>
        </ul>
        <h2>Active Publication</h2>
        <p>If a publication is marked as active:</p>
        <ul class="keys">
          <li><v-icon>mdi-plus-box-outline</v-icon> Add publication to selection</li>
          <li>
            <v-icon>mdi-minus-box-outline</v-icon> Exclude publication from selection/suggestion
          </li>
          <li><v-icon>mdi-alpha-d-box-outline</v-icon> Open "DOI" link</li>
          <li><v-icon>mdi-alpha-t-box-outline</v-icon> Show abstract</li>
          <li><v-icon>mdi-alpha-g-box-outline</v-icon> Open "Google Scholar" link</li>
          <li><v-icon>mdi-alpha-x-box-outline</v-icon> Export as BibTeX citation</li>
          <li><v-icon>mdi-alpha-i-box-outline</v-icon> Toggle DOI filter</li>
        </ul>
        <h2>Citation Network</h2>
        <ul class="keys">
          <li>
            <v-icon>mdi-alpha-m-box-outline</v-icon> Toggle mode of citation network visualization
            between <em>timeline</em> and
            <em>clusters</em>
          </li>
          <li>
            <v-icon>mdi-alpha-p-box-outline</v-icon> Toggle performance panel for network debugging
          </li>
        </ul>
      </section>
    </div>
  </ModalDialog>
</template>

<style lang="scss" scoped>
.card {
  .card-content {
    & .subtitle {
      margin-top: 0.5rem;
    }

    & ul.keys {
      list-style-type: none;
    }
  }
}
</style>
