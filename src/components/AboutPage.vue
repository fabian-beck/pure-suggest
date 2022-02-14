<template>
  <div id="about" class="card">
    <header class="card-header has-background-primary">
      <p class="card-header-title has-text-white">About</p>
    </header>
    <div class="card-content">
      <div class="content">
        <section>
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                <span v-html="this.$appNameHtml" class="title"></span>
              </div>
              <div class="level-item">
                <span class="subtitle">{{ this.$appSubtitle }}</span>
              </div>
            </div>
            <div class="level-right">
              <span class="is-size-7 level-item"
                ><label>Version:&nbsp;</label>{{ this.$version }}</span
              >
            </div>
          </div>
          <p>
            <em>PURE suggest</em> is a scientific literature search tool that,
            starting from some seed papers, suggests scientific publications
            through citations/references. It has been created by
            <a href="https://github.com/fabian-beck">Fabian Beck</a>.
          </p>
          <p>
            The code is available on
            <a href="https://github.com/fabian-beck/pure-suggest">GitHub</a>
            under
            <a
              href="https://github.com/fabian-beck/pure-suggest/blob/master/LICENSE"
              >MIT License</a
            >.
          </p>
          <h2>Data Sources</h2>
          <p>
            APIs by the following projects are used to retrieve the literature
            meta-data and citation information.
          </p>
          <ul>
            <li><a href="https://opencitations.net/">OpenCitations</a></li>
            <li><a href="https://www.crossref.org/">CrossRef</a></li>
          </ul>
          <h2>Similar Tools</h2>
          <p>
            <em>PURE suggest</em> is not the first of its kind, but other tools
            are available that also provide a visually supported literature
            search through citation links.
          </p>
          <ul>
            <li>
              <a href="https://www.citationgecko.com/">Citation Gecko</a>
            </li>
            <li>
              <a href="https://www.connectedpapers.com">Connected Papers</a>
            </li>
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