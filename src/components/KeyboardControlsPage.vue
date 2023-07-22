<template>
  <div id="keyboardControls" class="card">
    <header class="card-header has-background-light">
      <p class="card-header-title">
        <b-icon icon="keyboard-outline"></b-icon>&ensp;Keyboard Controls
      </p>
    </header>
    <div class="card-content">
      <div class="content">
        <section>
          <p>
            You can use the following keyboard shortcuts to control the
            application.
          </p>
          <h2>General</h2>
          <ul class="keys">
            <li>
              <b-icon icon="alpha-b-box-outline"></b-icon> Jump to "Boost" input
              field
            </li>
            <li>
              <b-icon icon="alpha-a-box-outline"></b-icon> Jump to "Add" input
              field
            </li>
            <li>
              <b-icon icon="alpha-s-box-outline"></b-icon> Open "Search" dialog
            </li>
            <li>
              <b-icon icon="alpha-u-box-outline"></b-icon> Update selected
              publications (if publications are waiting)
            </li>
            <li>
              <b-icon icon="alpha-f-box-outline"></b-icon> Switch on/off
              filtering of suggestions
            </li>
            <li>
              <b-icon icon="arrow-left-bold-box-outline"></b-icon> Jump to first
              publication of "Selected"
            </li>
            <li>
              <b-icon icon="arrow-right-bold-box-outline"></b-icon> Jump to
              first publication of "Suggested"
            </li>
            <li>
              <b-icon icon="arrow-down-bold-box-outline"></b-icon> Move one
              publication down (if one is active)
            </li>
            <li>
              <b-icon icon="arrow-up-bold-box-outline"></b-icon> Move one
              publication up (if one is active)
            </li>
            <li>
              <b-icon icon="keyboard-esc"></b-icon> Escape input field or active
              publication
            </li>
            <li><b-icon icon="alpha-c-box-outline"></b-icon> Clear session</li>
          </ul>
          <h2>Active Publication</h2>
          <p>If a publication is marked as active:</p>
          <ul class="keys">
            <li>
              <b-icon icon="plus-box-outline"></b-icon> Add publication to
              selection
            </li>
            <li>
              <b-icon icon="minus-box-outline"></b-icon> Exclude publication
              from selection/suggestion
            </li>
            <li>
              <b-icon icon="alpha-d-box-outline"></b-icon> Open "DOI" link
            </li>
            <li><b-icon icon="alpha-t-box-outline"></b-icon> Show abstract</li>
            <li>
              <b-icon icon="alpha-o-box-outline"></b-icon> Open "Open access"
              link
            </li>
            <li>
              <b-icon icon="alpha-g-box-outline"></b-icon> Open "Google Scholar"
              link
            </li>
            <li>
              <b-icon icon="alpha-x-box-outline"></b-icon> Export as BibTeX
              citation
            </li>
          </ul>
          <h2>Citation Network</h2>
          <ul class="keys">
            <li>
              <b-icon icon="alpha-m-box-outline"></b-icon> Toggle mode of
              citation network visualization between <em>timeline</em> and
              <em>clusters</em>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  .card-content {
    & .subtitle {
      margin-top: 0.5rem;
    }

    & h2 {
      font-size: $size-5 !important;
    }

    & ul.keys {
      list-style-type: none;

      & .icon {
        position: relative;
        top: 0.15rem;
        margin-right: 0.5rem;
      }
    }
  }
}
</style>