<template>
  <li>
    <v-overlay :model-value="sessionStore.isQueuingForSelected(publication.doi) ||
      sessionStore.isQueuingForExcluded(publication.doi)" contained persistent class="align-center justify-center">
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
        <div class="level-right">
          <CompactButton icon="mdi-undo" v-tippy="'Remove publication from queue again.'"
            v-on:click="sessionStore.removeFromQueues(publication.doi)"></CompactButton>
        </div>
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
      'is-author-hovered': publication.isAuthorHovered,
    }" :id="publication.doi" tabindex="0" v-on:focus="activate" @click.stop="activate"
      @mouseenter="sessionStore.hoverPublication(publication, true)"
      @mouseleave="sessionStore.hoverPublication(publication, false)">
      <tippy class="media-left" placement="right">
        <div class="glyph has-text-centered" v-bind:style="{ 'background-color': publication.scoreColor }"
          v-show="publication.wasFetched">
          <div class="tooltip-target">
            <div class="is-size-3 is-inline-block score">
              {{ publication.score }}
            </div>
            <div class="boost-indicator" :class="chevronType" v-if="publication.boostFactor > 1">
              <v-icon size="small">mdi-{{ chevronType }}</v-icon>
            </div>
          </div>
          <div class="reference-counts is-size-6">
            <div class="is-pulled-left">
              <span v-if="publication.citationCount > 0 ||
                publication.referenceDois.length === 0
                " :class="publication.referenceDois.length ? '' : 'unknown'">
                <InlineIcon icon="mdi-arrow-bottom-left-thick"
                  :color="publication.referenceDois.length ? '' : 'danger'" />
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
        <template #content>
          <div>
            Score of
            <b>{{ publication.score }} =
              <span v-if="publication.boostFactor != 1">(</span>{{ publication.citationCount }} + {{
                publication.referenceCount
              }}<span v-if="publication.isSelected"> + 1</span><span v-if="publication.boostFactor != 1">) &middot; {{
  publication.boostFactor }}</span></b>,<br />
            citing <b>{{ publication.citationCount }}</b> (
            <InlineIcon icon="mdi-arrow-bottom-left-thick"
              :color="publication.referenceDois.length ? 'white' : 'danger'" />
            <span v-if="!publication.referenceDois.length" class="unknown">, citing data not available</span>) and cited
            by
            <b>{{ publication.referenceCount }}</b> (
            <InlineIcon icon="mdi-arrow-top-left-thick" color="white" />) selected
            publications<span v-if="publication.isSelected">, <b>1</b> as self-reference being selected itself</span><span
              v-if="publication.boostFactor != 1">; multiplied by a boost factor of
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
        </template>
      </tippy>
      <div class="media-content">
        <PublicationDescription :publication="publication" :activationSource="activationSource"></PublicationDescription>
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
              <v-btn v-tippy="'Retry loading metadata.'" @click.stop="sessionStore.retryLoadingPublication(publication)"
                small>
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
      </div>
      <div class="media-right">
        <div>
          <CompactButton v-if="!publication.isSelected" icon="mdi-plus-thick"
          v-on:click="sessionStore.queueForSelected(publication.doi); sessionStore.logQd(publication.doi, (activationSource == 'network' ? 'network' : 'suggested'))"
          class="has-text-primary"
              v-tippy="'Mark publication to be added to selected publications.'"></CompactButton>
        </div>
        <div>
          <CompactButton icon="mdi-minus-thick" v-on:click="sessionStore.queueForExcluded(publication.doi)" v-on:click.stop = "sessionStore.logExclude(publication.doi, (activationSource == 'network' ? 'network' : (publication.isSelected ? 'selected' :  'suggested')))"
            v-tippy="'Mark publication to be excluded for suggestions.'"></CompactButton>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";

export default {
  name: "PublicationComponent",
  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore };
  },
  props: {
    publication: Object,
    activationSource: String
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
      border-color: $warning-dark !important;
    }

    &.is-author-hovered .glyph {
      box-shadow: 0 0 0.2rem 0.05rem $dark;
      border-color: $dark !important;
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

      & .glyph .score {
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

      & .notification {
        padding: 0.5rem;
        margin: 0.5rem 0;
      }
    }

    & .media-right {
      margin-right: 0.5rem;

      & button {
        margin: 0.5rem 0;
      }
    }

    &.is-queuing {
      filter: blur(1px) opacity(50%);
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