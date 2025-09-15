<script setup>
import { computed } from 'vue'

import { useAppState } from '@/composables/useAppState.js'
import { useInterfaceStore } from '@/stores/interface.js'
import { useQueueStore } from '@/stores/queue.js'

const props = defineProps({
  publication: {
    type: Object,
    required: true
  },
  publicationType: {
    type: String,
    default: 'suggested',
    validator: (value) => ['selected', 'suggested', 'general'].includes(value)
  }
})
const emit = defineEmits(['activate'])
const queueStore = useQueueStore()
const interfaceStore = useInterfaceStore()
const {
  retryLoadingPublication,
  activatePublicationComponentByDoi,
  queueForSelected,
  queueForExcluded
} = useAppState()

const chevronType = computed(() => {
  if (props.publication.boostFactor >= 8) {
    return 'chevron-triple-up'
  } else if (props.publication.boostFactor >= 4) {
    return 'chevron-double-up'
  } else if (props.publication.boostFactor > 1) {
    return 'chevron-up'
  }
  return ''
})

const minusButtonTooltip = computed(() => {
  return props.publicationType === 'selected'
    ? 'Remove publication from selected and mark to stay excluded.'
    : 'Mark publication to be excluded for suggestions.'
})

let isActivating = false

function activate() {
  // Prevent recursive activation calls
  if (isActivating) {
    return
  }

  isActivating = true
  activatePublicationComponentByDoi(props.publication.doi)
  emit('activate', props.publication.doi)

  // Reset the flag after a brief delay to allow for the activation to complete
  setTimeout(() => {
    isActivating = false
  }, 100)
}

function handleMouseEnter() {
  interfaceStore.setHoveredPublication(props.publication)
}

function handleMouseLeave() {
  interfaceStore.setHoveredPublication(null)
}
</script>

<template>
  <div class="publication-component-wrapper">
    <div
      class="level is-mobile queue-controls"
      v-if="
        queueStore.isQueuingForSelected(publication.doi) ||
        queueStore.isQueuingForExcluded(publication.doi)
      "
      :class="{
        'to-be-selected': queueStore.isQueuingForSelected(publication.doi)
      }"
    >
      <div class="level-item">
        <span>
          <InlineIcon icon="mdi-tray-full" color="dark" />
          To be
          <span v-if="queueStore.isQueuingForSelected(publication.doi)"
            ><b>selected </b>
            <InlineIcon icon="mdi-plus-thick" color="primary-dark" />
          </span>
          <span v-else
            ><b> excluded </b>
            <InlineIcon icon="mdi-minus-thick" color="black" />
          </span>
        </span>
      </div>
      <div class="level-right">
        <CompactButton
          icon="mdi-undo"
          v-tippy="'Remove publication from queue again.'"
          @click="queueStore.removeFromQueues(publication.doi)"
        ></CompactButton>
      </div>
    </div>
    <div
      class="publication-component media"
      :class="{
        'is-active': publication.isActive,
        'is-selected': publication.isSelected,
        'is-linked-to-active': publication.isLinkedToActive,
        'is-unread': !publication.isRead && !publication.isSelected && publication.wasFetched,
        'is-queuing':
          queueStore.isQueuingForSelected(publication.doi) ||
          queueStore.isQueuingForExcluded(publication.doi),
        'is-hovered': interfaceStore.hoveredPublication === publication.doi,
        'is-keyword-hovered': publication.isKeywordHovered,
        'is-author-hovered': publication.isAuthorHovered,
        'is-newly-added': publication.isNewlyAdded
      }"
      :id="publication.doi"
      tabindex="0"
      @focus="activate"
      @click.stop
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <tippy class="media-left" placement="right">
        <div
          class="glyph has-text-centered"
          :style="{ 'background-color': publication.scoreColor }"
          v-show="publication.wasFetched"
        >
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
              <span
                v-if="publication.citationCount > 0 || publication.referenceDois.length === 0"
                :class="publication.referenceDois.length ? '' : 'unknown'"
              >
                <InlineIcon
                  icon="mdi-arrow-bottom-left-thick"
                  :color="publication.referenceDois.length ? '' : 'danger'"
                />
                {{ publication.citationCount ? publication.citationCount : '-' }}
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
            <b
              >{{ publication.score }} = <span v-if="publication.boostFactor != 1">(</span
              >{{ publication.citationCount }} + {{ publication.referenceCount
              }}<span v-if="publication.isSelected"> + 1</span
              ><span v-if="publication.boostFactor != 1"
                >) &middot; {{ publication.boostFactor }}</span
              ></b
            >,<br />
            citing <b>{{ publication.citationCount }}</b> (
            <InlineIcon
              icon="mdi-arrow-bottom-left-thick"
              :color="publication.referenceDois.length ? 'white' : 'danger'"
            />
            <span v-if="!publication.referenceDois.length" class="unknown"
              >, citing data not available</span
            >) and cited by <b>{{ publication.referenceCount }}</b> (
            <InlineIcon icon="mdi-arrow-top-left-thick" color="white" />) selected publications<span
              v-if="publication.isSelected"
              >, <b>1</b> as self-reference being selected itself</span
            ><span v-if="publication.boostFactor != 1"
              >; multiplied by a boost factor of
              <b
                >{{ publication.boostFactor }} = 2<sup>{{ publication.boostMatches }}</sup>
              </b>
              (
              <InlineIcon :icon="`mdi-${chevronType}`" color="white" />;
              {{ publication.boostMatches }} keyword<span v-if="publication.boostMatches > 1"
                >s</span
              >
              matched) </span
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
          <div v-if="publication.isNewlyAdded">
            <br />
            The publication was added to selected in the most recent update.
          </div>
        </template>
      </tippy>
      <div class="media-content">
        <PublicationDescription
          :publication="publication"
          :publication-type="publicationType"
        ></PublicationDescription>
        <div
          class="notification has-background-danger-light has-text-danger-dark"
          v-if="
            (!publication.year || !publication.title || !publication.author) && publication.isActive
          "
        >
          <div class="level">
            <div class="level-left">
              <div class="level-item">
                No or only partial metadata could be retrieved for the publication.
              </div>
            </div>
            <div class="level-right">
              <v-btn
                v-tippy="'Retry loading metadata.'"
                @click.stop="retryLoadingPublication(publication)"
                small
              >
                <v-icon left>mdi-refresh</v-icon>
                Retry
              </v-btn>
            </div>
          </div>
          <div v-if="publication.score === 0">
            Also, it is not cited by another selected publication&mdash;<b
              >please check if the DOI is correct.</b
            >
          </div>
        </div>
        <div
          class="notification has-background-danger-light has-text-danger-dark"
          v-if="!publication.year && publication.isActive"
        >
          The publication cannot be shown in the citation network visualization because of the
          unknown publication year.
        </div>
      </div>
      <div class="media-right">
        <div>
          <CompactButton
            v-if="!publication.isSelected"
            icon="mdi-plus-thick"
            @click="queueForSelected(publication.doi)"
            class="has-text-primary"
            v-tippy="'Mark publication to be added to selected publications.'"
          ></CompactButton>
        </div>
        <div>
          <CompactButton
            icon="mdi-minus-thick"
            @click="queueForExcluded(publication.doi)"
            v-tippy="minusButtonTooltip"
          >
          </CompactButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.publication-component-wrapper {
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
        border-color: var(--bulma-info);
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
          background: var(--bulma-warning);
          font-size: 1.25rem;
          border: 1px solid var(--bulma-info);

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
        animation: glyph-pulse 2s ease-in-out infinite;
      }
    }

    &.is-keyword-hovered .glyph {
      box-shadow: 0 0 0.2rem 0.05rem var(--bulma-warning);
      border-color: hsl(
        var(--bulma-warning-h),
        var(--bulma-warning-s),
        calc(var(--bulma-warning-l) - 20%)
      ) !important;
    }

    &.is-author-hovered .glyph {
      box-shadow: 0 0 0.2rem 0.05rem var(--bulma-dark);
      border-color: var(--bulma-dark) !important;
    }

    &.is-active {
      background: rgba($color: #000000, $alpha: 0.1) !important;
      cursor: default;
    }

    &.is-unread {
      background: hsla(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l), 0.1);

      & .summary {
        color: hsl(var(--bulma-info-h), var(--bulma-info-s), calc(var(--bulma-info-l) - 20%));
      }

      & .glyph .score {
        color: hsl(var(--bulma-info-h), var(--bulma-info-s), calc(var(--bulma-info-l) - 20%));
      }
    }

    &.is-unread.is-hovered {
      background: hsla(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l), 0.14) !important;

      & .glyph {
        transform: scale(1.05);
        animation: glyph-pulse 2s ease-in-out infinite;
      }
    }

    &.is-selected .glyph {
      border-color: var(--bulma-primary);

      & .boost-indicator {
        border-color: var(--bulma-primary);
      }
    }

    &.is-newly-added {
      background: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.08) !important;
    }

    &.is-newly-added.is-hovered {
      background: hsla(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l), 0.12) !important;

      & .glyph {
        transform: scale(1.05);
        animation: glyph-pulse 2s ease-in-out infinite;
      }
    }

    &.is-active .glyph,
    &.is-linked-to-active .glyph {
      border-width: 0.3rem;
    }

    & .glyph > div:focus > div {
      outline: 1px solid var(--bulma-dark);
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
      outline: 1px solid var(--bulma-dark);
    }
  }

  & .queue-controls {
    z-index: 1;
    position: absolute;
    border-radius: 4px;
    width: 250px;
    color: var(--bulma-dark);
    border-left: 4px solid var(--bulma-dark);
    padding: 0.5rem;
    background-color: white;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    @include light-shadow;

    &.to-be-selected {
      border-color: var(--bulma-primary);
      color: hsl(
        var(--bulma-primary-h),
        var(--bulma-primary-s),
        calc(var(--bulma-primary-l) - 20%)
      );
      background-color: var(--bulma-primary-95);
    }
  }
}

@keyframes glyph-pulse {
  0%,
  100% {
    transform: scale(0.95);
  }

  50% {
    transform: scale(1.1);
  }
}

@media screen and (max-width: 1023px) {
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
