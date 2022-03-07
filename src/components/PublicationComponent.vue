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
    v-on:focus ="$emit('activate', publication.doi)"
    @click.stop="$emit('activate', publication.doi)"
  >
    <div
      class="media-left has-text-centered"
      v-bind:style="{ 'background-color': publication.scoreColor }"
    >
      <tippy>
        <template v-slot:trigger>
          <div class="tooltip-target">
            <div class="is-size-3 is-inline-block">{{ publication.score }}</div>
            <div
              class="boost-indicator has-background-warning is-size-6 is-inline-block ml-1"
              v-if="publication.boostFactor > 1"
            >
              <b-icon :icon="chevronType" size="is-small"></b-icon>
            </div>
          </div>
          <div class="is-size-7">
            {{ publication.referenceCount }}
            <b-icon icon="arrow-left-thick" size="is-small"></b-icon>
            + {{ publication.citationCount }}
            <b-icon icon="arrow-right-thick" size="is-small"></b-icon>
          </div>
        </template>
        <div>
          Suggestion score of
          <b>{{ publication.score }}</b
          >:<br />
          Referenced by <b>{{ publication.referenceCount }}</b> (<b-icon
            icon="arrow-left-thick"
            size="is-small"
          ></b-icon
          >) and referencing <b>{{ publication.citationCount }}</b> (<b-icon
            icon="arrow-right-thick"
            size="is-small"
          ></b-icon
          >) selected publications<span v-if="publication.boostFactor != 1"
            >, multiplied by a boost factor of
            <b>{{ publication.boostFactor }}</b> (<b-icon
              :icon="chevronType"
              size="is-small"
            ></b-icon
            >)</span
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
    </div>
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
          <strong>...</strong>
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
        <a :href="publication.doiUrl">{{
          publication.doi
        }}</a>
      </div>
      <div v-if="publication.isActive" class="stats-and-links level is-size-7">
        <div class="level-left">
          <div class="level-item">
            <label>Citing:</label> <b>{{ publication.referenceDois.length }}</b>
          </div>
          <div class="level-item">
            <label>Cited by:</label> <b>{{ publication.citationDois.length }}</b>
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
            <a :href="publication.oaLink"><span class="key">O</span>pen access</a>
          </div>
          <div class="level-item">
            <a
              :href="publication.gsUrl"
              ><span class="key">G</span>oogle Scholar</a
            >
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
  },
};
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/_all";

.boost-indicator {
  border-radius: 50%;
  height: 25px;
  width: 25px;
  position: relative;
  top: -5px;
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

  & .media-content {
    padding: 0.5rem;

    & div.summary {
      margin-bottom: 0.5rem;

      & .tag {
        margin-top: 0.25rem;
        margin-bottom: 0.25rem;
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
}

@include mobile {
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