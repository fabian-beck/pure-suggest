<template>
  <li>
    <b-message
      class="waitingNotification"
      :class="{
        'is-primary': sessionStore.isQueuingForSelected(publication.doi),
        'is-dark': sessionStore.isQueuingForExcluded(publication.doi),
      }"
      v-if="
        sessionStore.isQueuingForSelected(publication.doi) ||
        sessionStore.isQueuingForExcluded(publication.doi)
      "
      has-icon
      icon="tray-full"
      icon-size="mdi-24px"
      ><div class="level is-mobile">
        <div class="level-item">
          To be&nbsp;
          <span v-if="sessionStore.isQueuingForSelected(publication.doi)"
            ><b>selected </b> <b-icon icon="plus-thick" size="is-small"></b-icon
          ></span>
          <span v-else
            ><b> excluded </b
            ><b-icon icon="minus-thick" size="is-small"></b-icon
          ></span>
        </div>
        <div class="level-right">
          <b-button
            class="is-small"
            icon-left="undo"
            data-tippy-content="Remove publication from queue again."
            v-tippy
            @click.stop="sessionStore.removeFromQueues(publication.doi)"
          >
          </b-button>
        </div>
      </div>
    </b-message>
    <div
      class="publication-component media"
      :class="{
        active: publication.isActive,
        selected: publication.isSelected,
        linkedToActive: publication.isLinkedToActive,
        unread:
          !publication.isRead &&
          !publication.isSelected &&
          publication.wasFetched,
        queuing:
          sessionStore.isQueuingForSelected(publication.doi) ||
          sessionStore.isQueuingForExcluded(publication.doi),
      }"
      :id="publication.doi"
      tabindex="0"
      v-on:focus="activate"
      @click.stop="activate"
    >
      <tippy class="media-left">
        <template v-slot:trigger>
          <div
            class="glyph has-text-centered"
            :class="{
              'is-keyword-hovered': publication.isKeywordHovered,
            }"
            v-bind:style="{ 'background-color': publication.scoreColor }"
            v-show="publication.wasFetched"
          >
            <div class="tooltip-target">
              <div class="is-size-3 is-inline-block">
                {{ publication.score }}
              </div>
              <div
                class="boost-indicator"
                :class="chevronType"
                v-if="publication.boostFactor > 1"
              >
                <b-icon :icon="chevronType" size="is-small" />
              </div>
            </div>
            <div class="reference-counts is-size-6">
              <div class="is-pulled-left">
                <span
                  v-if="
                    publication.citationCount > 0 ||
                    publication.referenceDois.length === 0
                  "
                  :class="publication.referenceDois.length ? '' : 'unknown'"
                >
                  <b-icon
                    icon="arrow-bottom-left-thick"
                    size="is-small"
                  ></b-icon>
                  {{
                    publication.citationCount ? publication.citationCount : "-"
                  }}
                </span>
              </div>
              <div class="is-pulled-right">
                <span v-if="publication.referenceCount > 0">
                  {{ publication.referenceCount }}
                  <b-icon icon="arrow-top-left-thick" size="is-small"></b-icon>
                </span>
              </div>
            </div>
          </div>
        </template>
        <div>
          Suggestion score of
          <b
            >{{ publication.score }} =
            <span v-if="publication.boostFactor != 1">(</span
            >{{ publication.citationCount }} + {{ publication.referenceCount
            }}<span v-if="publication.boostFactor != 1"
              >) &middot; {{ publication.boostFactor }}</span
            ></b
          >,<br />
          citing <b>{{ publication.citationCount }}</b> (<b-icon
            icon="arrow-bottom-left-thick"
            size="is-small"
            :class="publication.referenceDois.length ? '' : 'unknown'"
          ></b-icon
          ><span v-if="!publication.referenceDois.length" class="unknown"
            >, citing data not available</span
          >) and cited by <b>{{ publication.referenceCount }}</b> (<b-icon
            icon="arrow-top-left-thick"
            size="is-small"
          ></b-icon
          >) selected publications<span v-if="publication.boostFactor != 1"
            >, multiplied by a boost factor of
            <b
              >{{ publication.boostFactor }} = 2<sup>{{
                publication.boostMatches
              }}</sup>
            </b>
            (<b-icon :icon="chevronType" size="is-small"></b-icon>;
            {{ publication.boostMatches }} keyword<span
              v-if="publication.boostMatches > 1"
              >s</span
            >
            matched)</span
          >.
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
            <b
              ><span
                v-html="
                  publication.titleHighlighted
                    ? publication.titleHighlighted
                    : publication.title
                "
              ></span></b
            >&ensp;</span
          >
          <span v-if="!publication.title" class="unknown">
            <b>[unknown title] </b>
          </span>
          <span
            >(<span>{{
              publication.authorShort ? publication.authorShort + ", " : ""
            }}</span
            ><span :class="publication.year ? '' : 'unknown'">{{
              publication.year ? publication.year : "[unknown year]"
            }}</span
            >)
          </span>
          <b-taglist>
            <b-icon
              icon="tag"
              size="is-small"
              class="mr-2"
              v-if="publication.hasTag()"
            ></b-icon>
            <b-tag
              icon="star"
              class="is-dark"
              size="is-small"
              v-if="publication.isHighlyCited"
              :data-tippy-content="`Identified as highly cited: ${publication.isHighlyCited}.`"
              v-tippy
              >Highly cited</b-tag
            >
            <b-tag
              icon="table"
              class="is-dark"
              size="is-small"
              v-if="publication.isSurvey"
              :data-tippy-content="`Identified as literature survey: ${publication.isSurvey}.`"
              v-tippy
              >Literature survey</b-tag
            >
            <b-tag
              icon="alarm"
              class="is-dark"
              size="is-small"
              v-if="publication.isNew"
              :data-tippy-content="`Identified as new: ${publication.isNew}.`"
              v-tippy
              >New</b-tag
            >
            <b-tag
              icon="alert-box-outline"
              class="is-dark"
              size="is-small"
              v-if="publication.isUnnoted"
              :data-tippy-content="`Identified as yet unnoted: ${publication.isUnnoted}.`"
              v-tippy
              >Unnoted</b-tag
            >
            <b-tag
              icon="lock-open-check-outline"
              class="is-dark"
              size="is-small"
              v-if="publication.isOpenAccess"
              :data-tippy-content="`Identified as open access: open access link available.`"
              v-tippy
              >Open access</b-tag
            >
          </b-taglist>
        </div>
        <div v-if="publication.isActive">
          <span>
            <span
              v-html="
                publication.authorOrcid +
                (publication.authorOrcid.endsWith('.') ? '' : '.')
              "
              v-if="publication.author"
              @click.stop="refocus"
              @click.middle.stop="refocus"
            ></span>
          </span>
          <span v-if="publication.container">
            <em v-html="` ${publication.container}`"></em>.
          </span>
          <label><span class="key">D</span>OI:</label>
          <a
            :href="publication.doiUrl"
            @click.stop="refocus"
            @click.middle.stop="refocus"
            >{{ publication.doi }}</a
          >
        </div>
        <div
          class="notification has-background-danger-light has-text-danger-dark"
          v-if="
            !publication.year &&
            !publication.title & !publication.author &&
            !publication.container &&
            publication.isActive
          "
        >
          No metadata could be retrieved for the publication from
          <a
            :href="`https://opencitations.net/index/coci/api/v1/metadata/${publication.doi}`"
            @click.stop="refocus"
            @click.middle.stop="refocus"
            >Open Citations</a
          >.
          <span v-if="publication.score === 0"
            >Also, it is not cited by another selected publication&mdash;<b
              >please check if the DOI is correct.</b
            >
          </span>
        </div>
        <div
          class="notification has-background-danger-light has-text-danger-dark"
          v-if="!publication.year && publication.isActive"
        >
          The publication cannot be shown in the citation network visualization
          because of the unknown publication year.
        </div>
        <div v-if="publication.isActive" class="stats-and-links level">
          <div class="level-left">
            <div
              :class="`level-item ${
                publication.referenceDois.length ? '' : 'unknown'
              }`"
            >
              <label
                ><b-icon icon="arrow-bottom-left-thick" size="is-small"></b-icon
                >Citing:</label
              >
              <b>{{
                publication.referenceDois.length
                  ? publication.referenceDois.length.toLocaleString("en")
                  : "not available"
              }}</b>
            </div>
            <div class="level-item">
              <label
                ><b-icon icon="arrow-top-left-thick" size="is-small"></b-icon
                >Cited by:</label
              >
              <b>{{ publication.citationDois.length.toLocaleString("en") }}</b>
              <span v-if="publication.citationsPerYear > 0">
                &nbsp;({{ publication.citationsPerYear.toFixed(1) }}/year)
              </span>
            </div>
          </div>
          <div
            class="level-right"
            v-if="publication.title && publication.isActive"
          >
            <div class="level-item">
              <a
                v-if="publication.abstract"
                @click.stop="showAbstract"
                @click.middle.stop="showAbstract"
                @keyup.enter="showAbstract"
                data-tippy-content="Abs<span class='key'>t</span>ract"
                v-tippy
                ><b-icon icon="text"></b-icon
              ></a>
              <a
                v-if="publication.oaLink"
                :href="publication.oaLink"
                class="ml-5"
                @click.stop="refocus"
                @click.middle.stop="refocus"
                data-tippy-content="<span class='key'>O</span>pen access"
                v-tippy
                ><b-icon icon="lock-open-check-outline"></b-icon
              ></a>
              <a
                :href="publication.gsUrl"
                class="ml-5"
                @click.stop="refocus"
                @click.middle.stop="refocus"
                data-tippy-content="<span class='key'>G</span>oogle Scholar"
                v-tippy
                ><b-icon icon="school"></b-icon
              ></a>
              <a
                @click.stop="exportBibtex"
                @click.middle.stop="exportBibtex"
                @keyup.enter="exportBibtex"
                class="ml-5"
                data-tippy-content="Export as BibTe<span class='key'>X</span> citation"
                v-tippy
                ><b-icon icon="format-quote-close"></b-icon
              ></a>
            </div>
          </div>
        </div>
      </div>
      <div class="media-right">
        <div>
          <b-button
            v-if="!publication.isSelected"
            class="is-primary is-small"
            icon-left="plus-thick"
            data-tippy-content="Mark publication to be added to selected publications."
            @click.stop="sessionStore.queueForSelected(publication.doi)"
            v-tippy
          >
          </b-button>
        </div>
        <div>
          <b-button
            class="is-small"
            icon-left="minus-thick"
            data-tippy-content="Mark publication to be excluded for suggestions."
            @click.stop="sessionStore.queueForExcluded(publication.doi)"
            v-tippy
          >
          </b-button>
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
      } else if (this.publication.boostFactor >= 4) {
        return "chevron-double-up";
      } else if (this.publication.boostFactor > 1) {
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

        &.is-keyword-hovered{
          @include warning-shadow;
        }

        & .tooltip-target {
          position: relative;
        }

        & .reference-counts {
          .icon {
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

          & .icon {
            position: relative;
          }

          &.chevron-up {
            top: -7px;
            right: -7px;
            width: 1.2rem;
            height: 1.2rem;

            & .icon {
              top: -0.45rem;
            }
          }

          &.chevron-double-up {
            top: -8px;
            right: -8px;
            width: 1.5rem;
            height: 1.5rem;

            & .icon {
              top: -0.35rem;
            }
          }

          &.chevron-triple-up {
            top: -9px;
            right: -9px;
            width: 1.8rem;
            height: 1.8rem;

            & .icon {
              top: -0.2rem;
            }
          }
        }
      }
    }

    &:hover {
      background: rgba($color: #000000, $alpha: 0.03) !important;

      & .glyph {
        transform: scale(1.05);
      }
    }

    &.active {
      background: rgba($color: #000000, $alpha: 0.1) !important;
      cursor: default;
    }

    &.unread {
      background: rgba($color: $info, $alpha: 0.1);

      & .summary {
        color: $info-dark;
      }

      & .glyph {
        color: $info-dark;
      }
    }

    &.selected .glyph {
      border-color: $primary;

      & .boost-indicator {
        border-color: $primary;
      }
    }

    &.active .glyph,
    &.linkedToActive .glyph {
      border-width: 0.3rem;
    }

    & .glyph > div:focus > div {
      outline: 1px solid $dark;
      outline-offset: 0.1rem;
    }

    & .media-content {
      padding: 0.5rem;
      overflow: auto;

      & div.summary {
        margin-bottom: 0.5rem;

        & .tag {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        & .tag:focus {
          outline-offset: 0.1rem;
        }
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

      & .button {
        margin: 0.5rem 0;
      }
    }

    &.queuing {
      & > div {
        filter: blur(1px) opacity(50%);
      }
    }

    &:focus,
    &.active {
      outline: 1px solid $dark;
    }
  }

  & .waitingNotification {
    position: absolute;
    z-index: 1;
    background: white;
    @include light-shadow;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: max(240px, 30%);

    & .message-body {
      padding: 0.5rem 0.5rem;

      & .media-left .icon {
        margin-top: 0.25rem;
      }

      & .level-left {
        text-align: center;
      }

      & button {
        margin-left: 1rem;
        margin-top: 0.15rem;
      }
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