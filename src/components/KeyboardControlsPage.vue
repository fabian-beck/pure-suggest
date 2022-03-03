<template>
  <div id="keyboardControls" class="card">
    <header class="card-header has-background-primary">
      <p class="card-header-title has-text-white">Keyboard Controls</p>
    </header>
    <div class="card-content">
      <div class="content">
        <section>
          <p>
            You can use the following keyboard shortcuts to control the
            application.
          </p>
          <h2>General</h2>
          <ul>
            <li><b>a</b> &ndash; Jump to "Add" input field</li>
            <li><b>b</b> &ndash; Jump to "Boost" input field</li>
            <li><b>c</b> &ndash; Clear session</li>
            <li>
              <b>Arrow left</b> &ndash; Jump to first publication of "Selected"
            </li>
            <li>
              <b>Arrow right</b> &ndash; Jump to first publication of
              "Suggested"
            </li>
            <li>
              <b>Arrow down</b> &ndash; Move one publication down (if one is
              active)
            </li>
            <li>
              <b>Arrow up</b> &ndash; Move one publication up (if one is active)
            </li>
            <li>
              <b>Escape</b> &ndash; Escape input field or active publication
            </li>
          </ul>
          <h2>Active Publication</h2>
          <p>If a publication is marked as active:</p>
          <ul>
            <li><b>+ (plus)</b> &ndash; Add publication to selection</li>
            <li>
              <b>- (minus)</b> &ndash; Exclude publication from
              selection/suggestion
            </li>
            <li><b>d</b> &ndash; Open "DOI" link</li>
            <li><b>o</b> &ndash; Open "Open access" link</li>
            <li><b>g</b> &ndash; Open "Google Scholar" link</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "~bulma";
@import "~buefy/src/scss/buefy";

.card {
  .card-content {
    & .subtitle {
      margin-top: 0.5rem;
    }

    & h2 {
      font-size: $size-5 !important;
    }
  }
}
</style>