<template>
  <li>
    <v-overlay v-if="sessionStore.isQueuingForSelected(publication.doi) ||
      sessionStore.isQueuingForExcluded(publication.doi)" absolute>
      <div class="level is-mobile" :class="{
        'to-be-selected': sessionStore.isQueuingForSelected(publication.doi),
      }">
        <div class="level-item">
          <span>
            <InlineIcon icon="mdi-tray-full" color="dark" />
            To be
            <span v-if="sessionStore.isQueuingForSelected(publication.doi)"><b>selected </b>
              <InlineIcon icon="mdi-plus-thick" color="primary-dark" />
            </span>
            <span v-else><b> excluded </b>
              <InlineIcon icon="mdi-minus-thick" color="black" />
            </span>
          </span>
        </div>
        <CompactButton icon="mdi-undo" class="ml-4 level-right" data-tippy-content="Remove publication from queue again."
          v-tippy v-on:click="sessionStore.removeFromQueues(publication.doi)" color="black"></CompactButton>
      </div>
    </v-overlay>
    <div class="publication-component media" :class="{
      'is-active': publication.isActive,
      'is-selected': publication.isSelected,
      'is-linked-to-active': publication.isLinkedToActive,
      'is-unread':
        !publication.isRead &&
        !publication.isSelected &&
        publication.wasFetched,
      'is-queuing':
        sessionStore.isQueuingForSelected(publication.doi) ||
        sessionStore.isQueuingForExcluded(publication.doi),
      'is-hovered': publication.isHovered,
      'is-keyword-hovered': publication.isKeywordHovered,
    }" :id="publication.doi" tabindex="0" v-on:focus="activate" @click.stop="activate"
      @mouseenter="sessionStore.hoverPublication(publication, true)"
      @mouseleave="sessionStore.hoverPublication(publication, false)">
      <tippy class="media-left">
        <template v-slot:trigger>
          <div class="glyph has-text-centered" v-bind:style="{ 'background-color': publication.scoreColor }"
            v-show="publication.wasFetched">
            <div class="tooltip-target">
              <div class="is-size-3 is-inline-block">
                {{ publication.score }}
              </div>
              <div class="boost-indicator" :class="chevronType" v-if="publication.boostFactor > 1">
                <v-icon>mdi-{{ chevronType }}</v-icon>
              </div>
            </div>
            <div class="reference-counts is-size-6">
              <div class="is-pulled-left">
                <span v-if="publication.citationCount > 0 ||
                  publication.referenceDois.length === 0
                  " :class="publication.referenceDois.length ? '' : 'unknown'">
                  <InlineIcon icon="mdi-arrow-bottom-left-thick" :color="publication.referenceDois.length ? '' : 'danger'" />
                  {{
                    publication.citationCount ? publication.citationCount : "-"
                  }}
                </span>
              </div>
              <div class="is-pulled-right">
                <span v-if="publication.referenceCount > 0">
                  {{ publication.referenceCount }}
                  <InlineIcon icon="mdi-arrow-top-left-thick" />
                </span>
              </div>
            </div>
          </div>
        </template>
        <div>
          Suggestion score of
          <b>{{ publication.score }} =
            <span v-if="publication.boostFactor != 1">(</span>{{ publication.citationCount }} + {{
              publication.referenceCount
            }}<span v-if="publication.boostFactor != 1">) &middot; {{ publication.boostFactor }}</span></b>,<br />
          citing <b>{{ publication.citationCount }}</b> (
          <InlineIcon icon="mdi-arrow-bottom-left-thick" :color="publication.referenceDois.length ? 'white' : 'danger'" />
          <span v-if="!publication.referenceDois.length" class="unknown">, citing data not available</span>) and cited by
          <b>{{ publication.referenceCount }}</b> (
          <InlineIcon icon="mdi-arrow-top-left-thick" color="white" />) selected
          publications<span v-if="publication.boostFactor != 1">, multiplied by a boost factor of
            <b>{{ publication.boostFactor }} = 2<sup>{{
              publication.boostMatches
            }}</sup>
            </b>
            (
            <InlineIcon :icon="`mdi-${chevronType}`" color="white" />;
            {{ publication.boostMatches }} keyword<span v-if="publication.boostMatches > 1">s</span>
            matched)
          </span>.
        </div>
        <div v-if="publication.isLinkedToActive">
          <br />
          Marked as refered by or referencing currently active publication.
        </div>
        <div v-if="publication.isActive">
          <br />
          Currently active, with linked publications highlighted.
        </div>
      </tippy>
      <div class="media-content">
        <div class="summary" v-show="publication.wasFetched">
          <span v-if="publication.title">
            <b><span v-html="publication.titleHighlighted
              ? publication.titleHighlighted
              : publication.title
              "></span></b>&ensp;</span>
          <span v-if="!publication.title" class="unknown">
            <b>[unknown title] </b>
          </span>
          <span>(<span>{{
            publication.authorShort ? publication.authorShort : ""
          }}</span><span v-if="!publication.author" class="unknown">[unknown author]</span>, <span
              :class="publication.year ? '' : 'unknown'">{{
                publication.year ? publication.year : "[unknown year]"
              }}</span>)
          </span>
          <div>
            <PublicationTag v-if="publication.isHighlyCited" icon="mdi-star"
              :data-tippy-content="`Identified as highly cited: ${publication.isHighlyCited}.`" v-tippy>Highly cited
            </PublicationTag>
            <PublicationTag v-if="publication.isSurvey" icon="mdi-table"
              :data-tippy-content="`Identified as literature survey: ${publication.isSurvey}.`" v-tippy>Literature survey
            </PublicationTag>
            <PublicationTag v-if="publication.isNew" icon="mdi-alarm"
              :data-tippy-content="`Identified as new: ${publication.isNew}.`" v-tippy>New</PublicationTag>
            <PublicationTag v-if="publication.isUnnoted" icon="mdi-alert-box-outline"
              :data-tippy-content="`Identified as yet unnoted: ${publication.isUnnoted}.`" v-tippy>Unnoted
            </PublicationTag>
            <PublicationTag v-if="publication.isOpenAccess" icon="mdi-lock-open-check-outline"
              :data-tippy-content="`Identified as open access: open access link available.`" v-tippy>Open access
            </PublicationTag>
          </div>
        </div>
        <div v-if="publication.isActive">
          <span>
            <span v-html="publication.authorOrcidHtml +
              (publication.authorOrcidHtml.endsWith('.') ? '' : '.')
              " v-if="publication.author" @click.stop="refocus" @click.middle.stop="refocus"></span>
          </span>
          <span v-if="publication.container">
            <em v-html="` ${publication.container}`"></em>.
          </span>
          <label><span class="key">D</span>OI:</label>
          <a :href="publication.doiUrl" @click.stop="refocus" @click.middle.stop="refocus">{{ publication.doi }}</a>
        </div>
        <div class="notification has-background-danger-light has-text-danger-dark" v-if="(!publication.year || !publication.title || !publication.author) &&
          publication.isActive
          ">
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                No or only partial metadata could be retrieved for the
                publication.
              </div>
            </div>
            <div class="level-right">
              <v-btn data-tippy-content="Retry loading metadata." v-tippy
                @click.stop="sessionStore.retryLoadingPublication(publication)" small>
                <v-icon left>mdi-refresh</v-icon>
                Retry
              </v-btn>
            </div>
          </div>
          <div v-if="publication.score === 0">
            Also, it is not cited by another selected publication&mdash;<b>please check if the DOI is correct.</b>
          </div>
        </div>

        <div class="notification has-background-danger-light has-text-danger-dark"
          v-if="!publication.year && publication.isActive">
          The publication cannot be shown in the citation network visualization
          because of the unknown publication year.
        </div>
        <div v-if="publication.isActive" class="stats-and-links level">
          <div class="level-left">
            <div :class="`level-item ${publication.referenceDois.length ? '' : 'unknown'
              }`">
              <label>
                <InlineIcon icon="mdi-arrow-bottom-left-thick"
                  :color="publication.referenceDois.length ? 'dark' : 'danger'" /> Citing:
              </label>
              <b>{{
                publication.referenceDois.length
                ? publication.referenceDois.length.toLocaleString("en")
                : "not available"
              }}</b>
            </div>
            <div class="level-item">
              <label>
                <InlineIcon icon="mdi-arrow-top-left-thick" color="dark" /> Cited by:
              </label>
              <b>{{ publication.citationDois.length.toLocaleString("en") }}</b>
              <span v-if="publication.citationsPerYear > 0">
                &nbsp;({{ publication.citationsPerYear.toFixed(1) }}/year)
              </span>
            </div>
          </div>
          <div class="level-right" v-if="publication.title && publication.isActive">
            <div class="level-item">
              <CompactButton icon="mdi-text" class="ml-5" v-if="publication.abstract" v-on:click="showAbstract"
                data-tippy-content="Abs<span class='key'>t</span>ract" v-tippy></CompactButton>
              <CompactButton icon="mdi-lock-open-check-outline" class="ml-5" v-if="publication.oaLink"
                :href="publication.oaLink" data-tippy-content="<span class='key'>O</span>pen access" v-tippy>
              </CompactButton>
              <CompactButton icon="mdi-school" class="ml-5" :href="publication.gsUrl"
                data-tippy-content="<span class='key'>G</span>oogle Scholar" v-tippy></CompactButton>
              <CompactButton icon="mdi-format-quote-close" class="ml-5" v-on:click="exportBibtex"
                data-tippy-content="Export as BibTe<span class='key'>X</span> citation" v-tippy></CompactButton>
            </div>
          </div>
        </div>
      </div>
      <div class="media-right">
        <div>
          <CompactButton v-if="!publication.isSelected" icon="mdi-plus-thick"
            v-on:click="sessionStore.queueForSelected(publication.doi)" class="has-text-primary"
            data-tippy-content="Mark publication to be added to selected publications." v-tippy></CompactButton>
        </div>
        <div>
          <CompactButton icon="mdi-minus-thick" v-on:click="sessionStore.queueForExcluded(publication.doi)"
            data-tippy-content="Mark publication to be excluded for suggestions." v-tippy></CompactButton>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
import { useSessionStore } from "./../stores/session.js";
import { useInterfaceStore } from "./../stores/interface.js";

export default {
  name: "PublicationComponent",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  props: {
    publication: Object,
  },
  computed: {
    chevronType: function () {
      if (this.publication.boostFactor >= 8) {
        return "chevron-triple-up";
      }
      else if (this.publication.boostFactor >= 4) {
        return "chevron-double-up";
      }
      else if (this.publication.boostFactor > 1) {
        return "chevron-up";
      }
      return "";
    },
  },
  methods: {
    activate: function () {
      this.sessionStore.activatePublicationComponentByDoi(this.publication.doi);
      this.$emit("activate", this.publication.doi);
    },
    showAbstract: function () {
      this.interfaceStore.showAbstract(this.publication);
    },
    exportBibtex: function () {
      this.sessionStore.exportSingleBibtex(this.publication);
      this.refocus();
    },
    refocus: function () {
      document.getElementById(this.publication.doi).focus();
    },
  },
};
</script>

<style lang="scss">
li {
  position: relative;

  .publication-component {
    padding: 0;
    margin: 0;
    cursor: pointer;
    min-height: 5rem;
    outline-offset: -0.25rem;
    z-index: -1;
    text-shadow: 0 0 15px white;

    & .media-left {
      margin: 0;

      & .glyph {
        width: 5rem;
        height: 5rem;
        margin: 0.6rem;
        border-width: 0.125rem;
        border-color: $info;
        border-style: solid;
        @include light-shadow;

        & .tooltip-target {
          position: relative;
        }

        & .reference-counts {
          .v-icon {
            margin: -0.4em;
          }

          div {
            width: 50%;
          }
        }

        & .boost-indicator {
          border-radius: 50%;
          position: absolute;
          top: -7px;
          right: -7px;
          @include light-shadow;
          background: $warning;
          font-size: $size-5;
          border: 1px solid $info;

          & .v-icon {
            position: relative;
          }

          &.chevron-up {
            top: -7px;
            right: -7px;
            width: 1.2rem;
            height: 1.2rem;

            & .v-icon {
              top: -0.6rem;
              left: -0.17rem;
            }
          }

          &.chevron-double-up {
            top: -8px;
            right: -8px;
            width: 1.5rem;
            height: 1.5rem;

            & .v-icon {
              top: -0.5rem;
              left: -0.05rem;
            }
          }

          &.chevron-triple-up {
            top: -9px;
            right: -9px;
            width: 1.8rem;
            height: 1.8rem;

            & .v-icon {
              top: -0.3rem;
            }
          }
        }
      }
    }

    &.is-hovered {
      background: rgba($color: #000000, $alpha: 0.03) !important;

      & .glyph {
        transform: scale(1.05);
      }
    }

    &.is-keyword-hovered .glyph {
      box-shadow: 0 0 0.2rem 0.05rem $warning;
      border-color: $warning-dark;
    }

    &.is-active {
      background: rgba($color: #000000, $alpha: 0.1) !important;
      cursor: default;
    }

    &.is-unread {
      background: rgba($color: $info, $alpha: 0.1);

      & .summary {
        color: $info-dark;
      }

      & .glyph {
        color: $info-dark;
      }
    }

    &.is-selected .glyph {
      border-color: $primary;

      & .boost-indicator {
        border-color: $primary;
      }
    }

    &.is-active .glyph,
    &.is-linked-to-active .glyph {
      border-width: 0.3rem;
    }

    & .glyph>div:focus>div {
      outline: 1px solid $dark;
      outline-offset: 0.1rem;
    }

    & .media-content {
      padding: 0.5rem;
      overflow: auto;

      & div.summary {
        margin-bottom: 0.5rem;
      }

      & label {
        padding-right: 0.25rem;
      }

      & .abstract {
        font-style: italic;
        font-size: 0.95rem;
        padding: 0.5rem 0;

        &::before {
          content: "Abstract: ";
          font-weight: bold;
        }
      }

      & .notification {
        padding: 0.5rem;
        margin: 0.5rem 0;
      }

      & .stats-and-links {
        flex-wrap: wrap;

        & .level-left,
        & .level-right {
          margin-top: 0.25rem;
          flex-wrap: wrap;
          flex-grow: 1;
        }

        & .level-item {
          flex-wrap: wrap;
        }

        & .level-left .level-item {
          margin-right: 1.5rem;
        }

        & .level-right .level-item {
          justify-content: right;
          margin: 0;
        }
      }
    }

    & .media-right {
      margin-right: 0.5rem;

      & button {
        margin: 0.5rem 0;
      }
    }

    &.is-queuing {
      &>div {
        filter: blur(1px) opacity(50%);
      }
    }

    &:focus,
    &.is-active {
      outline: 1px solid $dark;
    }
  }

  & .v-overlay__content>div {
    border-radius: 4px;
    width: 250px;
    color: $dark;
    border-left: 4px solid $dark;
    padding: 0.5rem;
    background-color: white;

    &.to-be-selected {
      border-color: $primary;
      color: $primary-dark;
      background-color: $primary-light;
    }

  }
}

@include touch {
  .publication-component {
    & .media-content {
      padding-left: 0;
      padding-right: 0;

      .level {
        & .level-left .level-item {
          justify-content: left;
        }

        & .level-right .level-item {
          justify-content: right;
        }
      }
    }

    & .media-right {
      margin-left: 0.5rem;
    }
  }
}
</style>