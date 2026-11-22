<script>
import { useModalStore } from '@/stores/modal.js'

export default {
  setup() {
    const modalStore = useModalStore()
    return { modalStore }
  }
}
</script>

<template>
  <ModalDialog
    v-model="modalStore.isKeyboardControlsModalDialogShown"
    title="Keyboard Controls"
    icon="mdi-keyboard-outline"
    header-color="light"
  >
    <div class="content">
      <section>
        <p>You can use the following keyboard shortcuts to control the application.</p>
        <h2>General</h2>
        <ul class="keys">
          <li><v-icon>mdi-alpha-s-box-outline</v-icon> Open "Search/add" dialog</li>
          <li><v-icon>mdi-alpha-a-box-outline</v-icon> Open "Authors" modal</li>
          <li><v-icon>mdi-alpha-o-box-outline</v-icon> Open "Concepts" modal</li>
          <li><v-icon>mdi-alpha-q-box-outline</v-icon> Open "Queue" dialog</li>
          <li><v-icon>mdi-alpha-e-box-outline</v-icon> Open "Excluded publications" dialog</li>
          <li><v-icon>mdi-help-box-outline</v-icon> Open this overview of keyboard controls</li>
          <li><v-icon>mdi-alpha-b-box-outline</v-icon> Jump to "Boost" input</li>
          <li>
            <v-icon>mdi-alpha-u-box-outline</v-icon> Update selected publications (if publications
            are waiting)
          </li>
          <li>
            <v-icon>mdi-alpha-f-box-outline</v-icon> Open or close the filter menu (opening switches
            filtering on)
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
        <h2>Dialogs</h2>
        <p>Each dialog opens with the most likely next step preselected.</p>
        <ul class="keys">
          <li>
            <v-icon>mdi-arrow-up-down-bold-outline</v-icon> Move between entries of a dialog (also
            <em>Home</em>/<em>End</em>); from a text field into the entries and back
          </li>
          <li>
            <v-icon>mdi-keyboard-return</v-icon> Confirm, apply the preselected action, or open the
            entry
          </li>
          <li><v-icon>mdi-keyboard-esc</v-icon> Close or cancel the dialog</li>
          <li>
            <v-icon>mdi-plus-box-outline</v-icon> <v-icon>mdi-minus-box-outline</v-icon>
            <v-icon>mdi-alpha-d-box-outline</v-icon> <v-icon>mdi-alpha-t-box-outline</v-icon>
            <v-icon>mdi-alpha-g-box-outline</v-icon> <v-icon>mdi-alpha-x-box-outline</v-icon> Act on
            a publication entry like on an active publication
          </li>
          <li>
            <v-icon>mdi-backspace-outline</v-icon> Remove the entry from the queue or the excluded
            publications (also <em>Delete</em>)
          </li>
        </ul>
        <p>Specific to individual dialogs:</p>
        <ul class="keys">
          <li>
            <b>Search/add:</b> <v-icon>mdi-keyboard-return</v-icon> on a result adds it;
            <em>Shift</em>+<v-icon>mdi-keyboard-return</v-icon> in the search field adds all
            publications found by DOI; <v-icon>mdi-alpha-s-box-outline</v-icon> returns to the
            search field
          </li>
          <li>
            <b>Authors:</b> <v-icon>mdi-keyboard-return</v-icon> opens an author;
            <v-icon>mdi-arrow-left-bold-box-outline</v-icon> returns to the list;
            <v-icon>mdi-alpha-i-box-outline</v-icon> toggles the author filter;
            <v-icon>mdi-alpha-g-box-outline</v-icon> searches the author on Google Scholar
          </li>
          <li>
            <b>Concepts:</b> <v-icon>mdi-alpha-c-box-outline</v-icon> compute,
            <v-icon>mdi-alpha-a-box-outline</v-icon> apply,
            <v-icon>mdi-alpha-d-box-outline</v-icon> disable
          </li>
          <li><b>Queue:</b> <v-icon>mdi-alpha-u-box-outline</v-icon> update</li>
          <li><b>Abstract:</b> <v-icon>mdi-alpha-t-box-outline</v-icon> closes it again</li>
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
