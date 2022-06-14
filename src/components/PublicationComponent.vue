<template>
  <li
    class="publication-component media"
    v-bind:class="{
      active: publication.isActive,
      selected: publication.isSelected,
      linkedToActive: publication.isLinkedToActive,
    }"
    :id="publication.doi"
    tabindex="0"
    v-on:focus="$emit('activate', publication.doi)"
    @click.stop="$emit('activate', publication.doi)"
  >
    <tippy class="glyph">
      <template v-slot:trigger>
        <div
          class="media-left has-text-centered"
          v-bind:style="{ 'background-color': publication.scoreColor }"
        >
          <div class="tooltip-target">
            <div class="is-size-3 is-inline-block">{{ publication.score }}</div>
            <div
              class="
                boost-indicator
                has-background-warning
                is-size-5 is-inline-block
                ml-1
              "
              v-if="publication.boostFactor > 1"
              :style="boostIndicatorSize"
            >
              <b-icon
                :icon="chevronType"
                size="is-small"
                :style="chevronOffset"
              />
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
                <b-icon icon="arrow-bottom-left-thick" size="is-small"></b-icon>
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
        ></b-icon
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
      <div class="summary">
        <span v-if="publication.title">
          <strong
            ><span
              v-html="
                publication.titleHighlighted
                  ? publication.titleHighlighted
                  : publication.title
              "
            ></span
            >&nbsp;</strong
          >
          <span v-if="publication.shortReference"
            >({{ publication.shortReference }})</span
          >
        </span>
        <span v-if="!publication.title">
          <strong>[unknown title]</strong>
        </span>
        <b-taglist>
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
          ></span>
          <span v-else>[unknown author]. </span>
        </span>
        <span v-if="publication.container"
          ><em> {{ publication.container }}. </em></span
        >
        <label><span class="key">D</span>OI:</label>
        <a :href="publication.doiUrl">{{ publication.doi }}</a>
      </div>
      <div v-if="publication.isActive" class="stats-and-links level is-size-7">
        <div class="level-left">
          <div
            class="level-item"
            :class="publication.referenceDois.length ? '' : 'unknown'"
          >
            <label
              ><b-icon icon="arrow-bottom-left-thick" size="is-small"></b-icon
              >Citing:</label
            >
            <b>{{
              publication.referenceDois.length
                ? publication.referenceDois.length
                : "not available"
            }}</b>
          </div>
          <div class="level-item">
            <label
              ><b-icon icon="arrow-top-left-thick" size="is-small"></b-icon
              >Cited by:</label
            >
            <b>{{ publication.citationDois.length }}</b>
            <span v-if="publication.citationsPerYear > 0">
              &nbsp;({{ publication.citationsPerYear.toFixed(1) }}
              per year)
            </span>
          </div>
        </div>
        <div
          class="level-right"
          v-if="publication.title && publication.isActive"
        >
          <div class="level-item" v-if="publication.oaLink">
            <a :href="publication.oaLink"
              ><span class="key">O</span>pen access</a
            >
          </div>
          <div class="level-item">
            <a :href="publication.gsUrl"
              ><span class="key">G</span>oogle Scholar</a
            >
          </div>
          <div
            class="level-item"
            data-tippy-content="Export as BibTe<span class='key'>X</span> citation"
            v-tippy
          >
            <a @click.stop="$emit('exportBibtex', publication)"
              ><b-icon icon="format-quote-close"></b-icon
            ></a>
          </div>
        </div>
      </div>
    </div>
    <div class="media-right">
      <div>
        <b-button
          v-if="suggestion"
          class="is-primary is-small"
          icon-left="plus-thick"
          data-tippy-content="Add publication to list of selected publications."
          @click.stop="$emit('add', publication.doi)"
          v-tippy
        >
        </b-button>
      </div>
      <div>
        <b-button
          class="is-small"
          icon-left="minus-thick"
          data-tippy-content="Remove publication from the list and exclude for suggestions."
          @click.stop="$emit('remove', publication.doi)"
          v-tippy
        >
        </b-button>
      </div>
    </div>
  </li>
</template>

<script>
export default {
  name: "PublicationComponent",
  props: {
    publication: Object,
    suggestion: Boolean,
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

    boostIndicatorSize: function () {
      if (this.publication.boostFactor >= 8) {
        return { width: "2rem", height: "2rem" };
      } else if (this.publication.boostFactor >= 4) {
        return { width: "1.6rem", height: "1.6rem" };
      } else if (this.publication.boostFactor > 1) {
        return { width: "1.3rem", height: "1.3rem " };
      }
      return "";
    },

    chevronOffset: function () {
      if (this.publication.boostFactor >= 8) {
        return { position: "relative", top: "0rem" };
      } else if (this.publication.boostFactor >= 4) {
        return { position: "relative", top: "-0.15rem" };
      } else if (this.publication.boostFactor > 1) {
        return { position: "relative", top: "-0.3rem" };
      }
      return "";
    },
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

.tooltip-target {
  position: relative;
}

.reference-counts {
  .icon {
    margin: -0.4em;
  }

  div {
    width: 50%;
  }
}

.boost-indicator {
  border-radius: 50%;
  position: absolute;
  top: -7px;
  right: -7px;
  // vertical-align: middle;
}

*:focus {
  outline: 1px solid $dark;
}

li.publication-component {
  padding: 0;
  margin: 0;
  cursor: pointer;
  min-height: 5rem;
  outline-offset: -0.25rem;

  &:hover {
    background: $white-ter;
  }

  &.active {
    background: $grey-lighter;
  }

  & .media-left {
    width: 5rem;
    height: 5rem;
    margin: 0.5rem;
    border-width: 0.125rem;
    border-color: $info;
    border-style: solid;
  }

  &.selected .media-left {
    border-color: $primary;
  }

  &.active .media-left {
    border-width: 0.375rem;
  }

  &.linkedToActive .media-left {
    border-width: 0.25rem;
  }

  & .glyph > div:focus > div {
    outline: 1px solid $dark;
    outline-offset: 0.1rem;
  }

  & .media-content {
    padding: 0.5rem;

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
      padding-right: 0.2rem;
    }

    & .stats-and-links {
      & .level-left .level-item {
        margin-right: 1.5rem;
      }

      & .level-right .level-item {
        margin-left: 1.5rem;
      }
    }
  }

  & .media-right {
    margin-right: 0.5rem;

    & .button {
      margin: 0.5rem 0;
    }
  }

  & .unknown {
    color: $danger;
  }
}

@include touch {
  li.publication-component {
    & .media-content {
      padding-left: 0;
      padding-right: 0;

      .level {
        & .level-left .level-item {
          justify-content: left;
          margin: 0;
        }

        & .level-right {
          margin: 0;

          & .level-item {
            justify-content: right;
            margin: 0;
          }
        }
      }
    }
    & .media-right {
      margin-left: 0.5rem;
    }
  }
}
</style>