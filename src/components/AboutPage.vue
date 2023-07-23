<template>
  <div id="about" class="card">
    <header class="card-header has-background-light">
      <p class="card-header-title">
        <v-icon>mdi-information-outline</v-icon>&ensp;About
      </p>
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
            through citations/references.
          </p>
          <p>
            The code is available on
            <a href="https://github.com/fabian-beck/pure-suggest"
              >GitHub <b-icon icon="github" size="is-small"
            /></a>
            under
            <a
              href="https://github.com/fabian-beck/pure-suggest/blob/master/LICENSE"
              >MIT License <b-icon icon="license" size="is-small" /></a
            >.
          </p>
          <p>
            Follow updates on
            <a href="https://twitter.com/pure_suggest">
              Twitter
              <b-icon icon="twitter" size="is-small"></b-icon>
              (@pure_suggest) </a
            >.
          </p>
          <h2><v-icon>mdi-file-document</v-icon>&ensp;Read more</h2>
          <p>
            We publish news, tutorials, use cases, etc. as part of our <b>blog</b> on
            <a href="https://medium.com/@pure_suggest">medium.com</a>.
          </p>
          <p>
            If you want to learn more on the background of the tool or cite it,
            you can refer to the following <b>scientific publications</b>:
          </p>
          <ul>
            <li>
              Beck, F. and Krause, C., 2022. Visually Explaining Publication
              Ranks in Citation-based Literature Search with PURE suggest. In
              EuroVis 2022 - Posters. DOI:
              <a href="https://diglib.eg.org/handle/10.2312/evp20221110"
                >10.2312/evp.20221110</a
              >. [<a
                href="https://diglib.eg.org/bitstream/handle/10.2312/evp20221110/019-021.pdf"
                >PDF</a
              >]
            </li>
            <li>
              Beck, F., 2022. Assessing Discussions of Related Work through
              Citation-based Recommendations and Network Visualization.
              <a href="https://doi.org/10.5281/zenodo.7123500"
                >https://doi.org/10.5281/zenodo.7123500</a
              >
            </li>
          </ul>
          <h2><v-icon>mdi-database</v-icon>&ensp;Data Sources</h2>
          <p>
            APIs by the following projects are used to retrieve the literature
            meta-data and citation information.
          </p>
          <ul>
            <li><a href="https://opencitations.net/">OpenCitations</a></li>
            <li><a href="https://www.crossref.org/">CrossRef</a></li>
          </ul>
          <h2><v-icon>mdi-tools</v-icon>&ensp;Similar Tools</h2>
          <p>
            <em>PURE suggest</em> is not the first of its kind, but other tools
            are available that also provide a visually supported literature
            search through citation links. Try them out and decide yourself
            which one you like best!
          </p>
          <ul>
            <li>
              <a href="https://www.citationgecko.com/">Citation Gecko</a>
            </li>
            <li>
              <a href="https://www.connectedpapers.com">Connected Papers</a>
            </li>
            <li>
              <a href="https://inciteful.xyz/">Inciteful</a>
            </li>
            <li>
              <a href="https://www.researchrabbit.ai/">Research Rabbit</a>
            </li>
          </ul>
          <h2><v-icon>mdi-card-account-mail</v-icon>&ensp;Contact</h2>
          <p><em>PURE suggest</em> has been created by:</p>
          <p>
            <a href="https://github.com/fabian-beck">Fabian Beck</a> <br />
            University of Bamberg <br />
            96047 Bamberg, Germany <br />
            <a href="mailto:fabian.beck@uni-bamberg.de"
              >fabian.beck@uni-bamberg.de</a
            >
          </p>
          <p>
            Thanks a lot to all other contributors, especially
            <a href="https://github.com/cedrickrause">Cedric Krause</a>.
          </p>
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

      & .v-icon {
        position: relative;
        top: -0.15rem;
      }
    }
  }
}
</style>