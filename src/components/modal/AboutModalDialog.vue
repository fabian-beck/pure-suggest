<script>
import { useInterfaceStore } from '@/stores/interface.js'
import { useModalStore } from '@/stores/modal.js'

export default {
  inject: ['appMeta'],
  setup() {
    const interfaceStore = useInterfaceStore()
    const modalStore = useModalStore()
    return { interfaceStore, modalStore }
  }
}
</script>

<template>
  <ModalDialog
    v-model="modalStore.isAboutModalDialogShown"
    header-color="light"
    title="About"
    icon="mdi-information-outline"
  >
    <div class="content">
      <section>
        <div class="level">
          <div class="level-left">
            <div class="level-item">
              <span v-html="appMeta.nameHtml" class="title"></span>
            </div>
            <div class="level-item ml-8">
              <span class="subtitle">{{ appMeta.subtitle }}</span>
            </div>
          </div>
          <div class="level-right">
            <span class="is-size-7 level-item"
              ><label>Version:&nbsp;</label>{{ appMeta.version }}</span
            >
          </div>
        </div>
        <p>
          <em>PUREsuggest</em> is a scientific literature search tool that, starting from some seed
          papers, suggests scientific publications through citations/references.
        </p>
        <p>
          The code is available on
          <a href="https://github.com/fabian-beck/pure-suggest"
            >GitHub
            <InlineIcon icon="mdi-github" />
          </a>
          under
          <a href="https://github.com/fabian-beck/pure-suggest/blob/master/LICENSE"
            >MIT License <InlineIcon icon="mdi-license" /> </a
          >.
        </p>
        <h2><v-icon>mdi-file-document</v-icon>&ensp;Read more</h2>
        <p>
          We publish news, tutorials, use cases, etc. as part of our
          <b
            >blog
            <InlineIcon icon="mdi-post" />
          </b>
          on <a href="https://medium.com/@pure_suggest">medium.com</a>.
        </p>
        <p>
          If you want to learn more on the background of the tool or cite it, you can refer to the
          following <b>scientific publications</b>:
        </p>
        <ul>
          <li>
            <strong>[Main Publication]</strong> Beck, F., 2025.
            <em
              >PUREsuggest: Citation-Based Literature Search and Visual Exploration with
              Keyword-Controlled Rankings.</em
            >
            In IEEE Transactions on Visualization and Computer Graphics, 31(1), 316-326. DOI:
            <a href="https://doi.org/10.1109/TVCG.2024.3456199">10.1109/TVCG.2024.3456199</a>. [<a
              href="https://arxiv.org/pdf/2408.02508"
              >PDF</a
            >]
          </li>
          <li>
            Rabsahl, S. and Beck, F., 2024.
            <em
              >A Multi-layer Event Visualization for Exploring User Search Patterns in Literature
              Discovery with PUREsuggest.</em
            >
            In Proceedings of Mensch und Computer 2024. DOI:
            <a href="https://doi.org/10.1145/3670653.3677502">10.1145/3670653.3677502</a>
          </li>
          <li>
            Beck, F., 2022.
            <em
              >Assessing Discussions of Related Work through Citation-based Recommendations and
              Network Visualization.</em
            >
            In Workshop on Open Citations and Open Scholarly Metadata 2022. DOI:
            <a href="https://doi.org/10.5281/zenodo.7123500">10.5281/zenodo.7123500</a>
          </li>
          <li>
            Beck, F. and Krause, C., 2022.
            <em
              >Visually Explaining Publication Ranks in Citation-based Literature Search with PURE
              suggest.</em
            >
            In EuroVis 2022 - Posters. DOI:
            <a href="https://diglib.eg.org/handle/10.2312/evp20221110">10.2312/evp.20221110</a>. [<a
              href="https://diglib.eg.org/bitstream/handle/10.2312/evp20221110/019-021.pdf"
              >PDF</a
            >]
          </li>
        </ul>
        <h2><v-icon>mdi-database</v-icon>&ensp;Data Sources</h2>
        <p>
          APIs by the following projects are used to retrieve the literature meta-data and citation
          information.
        </p>
        <ul>
          <li><a href="https://opencitations.net/">OpenCitations</a></li>
          <li><a href="https://www.crossref.org/">CrossRef</a></li>
        </ul>
        <h2><v-icon>mdi-tools</v-icon>&ensp;Similar Tools</h2>
        <p>
          <em>PUREsuggest</em> is not the first of its kind, but other tools are available that also
          provide a visually supported literature search through citation links. Try them out and
          decide yourself which one you like best!
        </p>
        <ul>
          <li>
            <a href="https://citationgecko.azurewebsites.net/">Citation Gecko</a>
          </li>
          <li>
            <a href="https://www.connectedpapers.com">Connected Papers</a>
          </li>
          <li>
            <a href="https://inciteful.xyz/">Inciteful</a>
          </li>
          <li>
            <a href="https://www.litmaps.com/">Litmaps</a>
          </li>
          <li>
            <a href="https://www.researchrabbit.ai/">Research Rabbit</a>
          </li>
        </ul>
        <h2><v-icon>mdi-card-account-mail</v-icon>&ensp;Contact</h2>
        <p><em>PUREsuggest</em> has been created by:</p>
        <p>
          <a href="https://github.com/fabian-beck">Fabian Beck</a> <br />
          University of Bamberg <br />
          96047 Bamberg, Germany <br />
          <a href="mailto:fabian.beck@uni-bamberg.de">fabian.beck@uni-bamberg.de</a>
        </p>
        <p>
          Thanks a lot to all other contributors, especially
          <a href="https://github.com/cedrickrause">Cedric Krause</a>.
        </p>
      </section>
    </div>
  </ModalDialog>
</template>

<style lang="scss" scoped>
.content {
  & .subtitle {
    margin-top: 0.5rem;
  }
}
</style>
