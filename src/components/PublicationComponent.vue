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
  },
  // When true, the active publication is not expanded inline (details shown in the side panel)
  suppressActiveDetails: Boolean
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

// When details are not expanded inline, show compact citing/cited counts on the card
const showCompactStats = computed(
  () => props.publication.wasFetched && !(props.publication.isActive && !props.suppressActiveDetails)
)

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
            <div class="is-size-5 is-inline-block score">
              {{ publication.score }}
            </div>
            <div class="boost-indicator" :class="chevronType" v-if="publication.boostFactor > 1">
              <v-icon size="x-small">mdi-{{ chevronType }}</v-icon>
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
          :suppress-active-details="suppressActiveDetails"
        ></PublicationDescription>
        <div class="card-stats" v-if="showCompactStats">
          <span
            :class="publication.referenceDois?.length ? '' : 'unknown'"
            v-tippy="'Number of publications this one cites (references).'"
          >
            <InlineIcon
              icon="mdi-arrow-bottom-left-thick"
              :color="publication.referenceDois?.length ? 'dark' : 'danger'"
            />
            {{ publication.referenceDois?.length ? publication.referenceDois.length : '–' }}
          </span>
          <span v-tippy="'Number of publications citing this one.'">
            <InlineIcon icon="mdi-arrow-top-left-thick" color="dark" />
            {{ publication.tooManyCitations ? '≥1000' : (publication.citationDois?.length ?? 0) }}
          </span>
        </div>
        <div
          class="notification has-background-danger-light has-text-danger-dark"
          v-if="
            (!publication.year || !publication.title || !publication.author) && publication.isActive
          "
        >
          <div class="level publication-metadata-warning-level">
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
  border-bottom: 1px solid #eef0f2;

  .publication-component {
    padding: 0;
    margin: 0;
    cursor: pointer;
    min-height: 3.25rem;
    outline-offset: -0.25rem;
    z-index: -1;
    text-shadow: 0 0 15px white;

    & .media-left {
      margin: 0;

      & .glyph {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.6rem;
        height: 2.6rem;
        margin: 0.5rem;
        border-radius: 6px;
        border-width: 0.125rem;
        border-color: var(--bulma-info);
        border-style: solid;
        font-weight: 700;
        @include light-shadow;

        & .tooltip-target {
          position: relative;
          line-height: 1;
        }

        & .boost-indicator {
          border-radius: 50%;
          position: absolute;
          top: -0.45rem;
          right: -0.45rem;
          width: 1.1rem;
          height: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          @include light-shadow;
          background: var(--bulma-warning);
          border: 1px solid var(--bulma-info);

          & .v-icon {
            font-size: 0.85rem;
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

      & .card-stats {
        display: flex;
        gap: 1rem;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: var(--bulma-grey-dark);

        & .unknown {
          color: var(--bulma-danger);
        }
      }

      & .notification {
        padding: 0.5rem;
        margin: 0.5rem 0;
      }

      & .publication-metadata-warning-level {
        flex-wrap: wrap;
        row-gap: 0.5rem;

        & .level-left {
          min-width: 0;
        }

        & .level-right {
          flex-shrink: 0;
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
