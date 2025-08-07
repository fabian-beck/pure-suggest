<template>
  <v-menu v-if="!sessionStore.isEmpty" v-model="interfaceStore.isFilterMenuOpen" ref="filterMenu" location="bottom"
    transition="slide-y-transition" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn class="filter-button" :class="interfaceStore.isMobile ? '' : 'p-1 pl-4'" 
        v-bind="props" :icon="interfaceStore.isMobile" @click="handleMenuClick"
        :density="interfaceStore.isMobile ? 'compact' : 'default'" :color="buttonColor">
        <v-icon size="18">mdi-filter</v-icon>
        <span class="is-hidden-touch ml-2">
          <span v-html="displayText"
            :class="{ 'has-text-black': sessionStore.filter.hasActiveFilters(), 'has-text-grey': !sessionStore.filter.hasActiveFilters() }"></span>
          <v-icon class="ml-2">
            mdi-menu-down
          </v-icon>
        </span>
      </v-btn>
    </template>
    <v-sheet class="has-background-grey-lighten-4 p-2 pt-4" style="width: 700px; max-width: 95vw;">
      <form>
        <v-row dense>
          <v-col cols="12" class="py-0">
            <!-- Mobile: Stack vertically, Desktop: Inline -->
            <div :class="interfaceStore.isMobile ? 'd-block' : 'd-flex align-center'">
              <div :class="interfaceStore.isMobile ? 'd-flex align-center mb-2' : 'd-flex align-center'">
                <v-switch ref="filterSwitch" v-model="sessionStore.filter.isActive" label="Apply filters" density="compact"
                  color="grey-darken-1" hide-details @keydown="handleSwitchKeydown" class="mr-2 ml-2"></v-switch>
                <span class="text-body-2 mr-3 ml-3" style="line-height: 24px; display: inline-flex; align-items: center;"
                  :class="{ 'text-disabled': !sessionStore.filter.isActive }">to</span>
              </div>
              <div class="d-flex" :class="[interfaceStore.isMobile ? 'ml-4' : '', { 'opacity-50': !sessionStore.filter.isActive }]">
                <v-checkbox v-model="sessionStore.filter.applyToSelected" label="selected" density="compact" hide-details
                  class="mr-4 primary-checkbox" :disabled="!sessionStore.filter.isActive"></v-checkbox>
                <v-checkbox v-model="sessionStore.filter.applyToSuggested" label="suggested" density="compact"
                  hide-details class="info-checkbox" :disabled="!sessionStore.filter.isActive"></v-checkbox>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-row dense :class="{ 'opacity-50': !sessionStore.filter.isActive }">
          <v-col cols="12" md="4" class="py-1">
            <v-text-field ref="filterInput" label="Search" v-model="sessionStore.filter.string" placeholder="Text"
              variant="underlined" prepend-inner-icon="mdi-card-search" clearable hide-details />
          </v-col>
          <v-col cols="12" md="4" class="py-1">
            <v-row no-gutters>
              <v-col cols="12" md="7">
                <v-text-field label="Year from" v-model="sessionStore.filter.yearStart" placeholder="YYYY"
                  variant="underlined" prepend-inner-icon="mdi-calendar" clearable :rules="yearRules" validate-on="blur"
                  hide-details />
              </v-col>
              <v-col cols="12" md="5">
                <v-text-field label="to" v-model="sessionStore.filter.yearEnd" placeholder="YYYY" variant="underlined"
                  clearable :rules="yearRules" validate-on="blur" hide-details />
              </v-col>
            </v-row>
          </v-col>
          <v-col cols="12" md="4" class="py-1">
            <v-select label="Tag" v-model="sessionStore.filter.tag" :items="Publication.TAGS" item-title="name"
              item-value="value" variant="underlined" prepend-inner-icon="mdi-tag" clearable hide-details />
          </v-col>
        </v-row>
        <v-row dense v-if="sessionStore.filter.dois.length > 0">
          <v-col class="py-1">
            <v-chip v-for="doi in sessionStore.filter.dois" :key="doi" class="ma-1" closable
              @click:close="removeDoi(doi)" @keydown="handleChipKeydown($event, doi)"
              v-tippy="{ content: getDoiTooltip(doi), allowHTML: true }">
              <v-icon left>mdi-file-document</v-icon>
              {{ doi }}
            </v-chip>
          </v-col>
        </v-row>
      </form>
    </v-sheet>
  </v-menu>
</template>

<script>
import { useSessionStore } from "@/stores/session.js";
import { useInterfaceStore } from "@/stores/interface.js";
import Publication from "@/Publication.js";

export default {
  name: "FilterMenuComponent",

  setup() {
    const sessionStore = useSessionStore();
    const interfaceStore = useInterfaceStore();
    return { sessionStore, interfaceStore, Publication };
  },

  data: () => ({
    yearRules: [
      value => {
        if (!value) return true;
        const regex = /^\d{4}$/;
        return regex.test(value) || "Year must be a four digit number.";
      },
    ],
  }),

  computed: {
    filterSummaryHtml() {
      const filter = this.sessionStore.filter;
      let parts = [];

      if (filter.string) {
        parts.push(`<span class="filter-part">text: "${filter.string}"</span>`);
      }

      if (filter.yearStart || filter.yearEnd) {
        let yearRange;
        if (filter.yearStart && filter.yearEnd) {
          // Both start and end specified: "XXXX–YYYY"
          yearRange = `${filter.yearStart}–${filter.yearEnd}`;
        } else if (filter.yearStart) {
          // Only start specified: "XXXX–" (meaning XXXX and later)
          yearRange = `${filter.yearStart}–`;
        } else {
          // Only end specified: "–XXXX" (meaning XXXX and earlier)
          yearRange = `–${filter.yearEnd}`;
        }
        parts.push(`<span class="filter-part">year: ${yearRange}</span>`);
      }

      if (filter.tag) {
        const tagName = Publication.TAGS.find(t => t.value === filter.tag)?.name || filter.tag;
        parts.push(`<span class="filter-part">tag: ${tagName}</span>`);
      }

      if (filter.dois.length > 0) {
        parts.push(`<span class="filter-part">citations: ${filter.dois.length}</span>`);
      }

      return parts.length > 0 ? parts.join('<span class="filter-separator">, </span>') : '';
    },

    displayText() {
      // If filters are turned off but have values, show "filters off" message
      if (!this.sessionStore.filter.isActive && this.hasFilterValues) {
        return '[FILTERS OFF]';
      }
      // If filters are on and have values, show summary
      if (this.sessionStore.filter.hasActiveFilters()) {
        return this.filterSummaryHtml;
      }
      // Default text when no filters are set
      return '[SET FILTERS]';
    },

    hasFilterValues() {
      const filter = this.sessionStore.filter;
      return !!(filter.string || filter.tag || filter.yearStart || filter.yearEnd || filter.dois.length > 0);
    },

    buttonColor() {
      if (!this.sessionStore.filter.hasActiveFilters()) {
        return 'grey-darken-1';
      }

      const applyToSelected = this.sessionStore.filter.applyToSelected;
      const applyToSuggested = this.sessionStore.filter.applyToSuggested;

      if (applyToSelected && !applyToSuggested) {
        // Use CSS custom property for Bulma primary color
        return 'hsl(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l))';
      } else if (!applyToSelected && applyToSuggested) {
        // Use CSS custom property for Bulma info color
        return 'hsl(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l))';
      } else {
        return 'default'; // Both or neither selected
      }
    },
  },

  methods: {
    handleMenuClick() {
      // Always turn on filters when clicking the button
      this.sessionStore.filter.isActive = true;
      this.handleMenuInput(true);
    },

    handleMenuInput(value) {
      if (value) {
        this.$nextTick(() => {
          // Focus on the switch element when menu opens via button click
          const switchElement = this.$refs.filterSwitch?.$el?.querySelector('input');
          if (switchElement) {
            switchElement.focus();
          }
        });
      }
    },

    openMenu() {
      // Ensure filters are active when opening menu
      this.sessionStore.filter.isActive = true;
      
      // Use store action to open menu (handles toggle logic)
      const wasOpened = this.interfaceStore.openFilterMenu();
      
      if (wasOpened) {
        this.$nextTick(() => {
          // Focus on the switch element (Vuetify v-switch creates an input element)
          const switchElement = this.$refs.filterSwitch?.$el?.querySelector('input');
          if (switchElement) {
            switchElement.focus();
          }
        });
      }
    },

    closeMenu() {
      this.interfaceStore.closeFilterMenu();
    },

    handleSwitchKeydown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.sessionStore.filter.isActive = !this.sessionStore.filter.isActive;
      }
    },

    handleChipKeydown(event, doi) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.removeDoi(doi);
      }
    },

    removeDoi(doi) {
      this.sessionStore.filter.removeDoi(doi);
    },
    getDoiTooltip(doi) {
      const publication = this.sessionStore.getSelectedPublicationByDoi(doi);
      return `Filtered to publications citing or cited by <b>${publication.title} (${publication.authorShort}, ${publication.year})</b>`;
    },
  },
};
</script>

<style lang="scss" scoped>
:deep(.filter-part) {
  font-weight: 500;
}

:deep(.filter-separator) {
  color: #aaa;
  margin: 0 0.2rem;
}

.filter-button {
  :deep(.v-btn__content) {
    text-transform: none;
  }
  
  /* Mobile round button icon centering - simple flexbox approach */
  &.v-btn--icon {
    :deep(.v-btn__content) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
    }
    
    :deep(.v-icon) {
      margin: 0 !important;
    }
  }
}

.opacity-50 {
  opacity: 0.5;
  pointer-events: none;
}

/* Use exact Bulma primary and info colors for checkboxes */
:deep(.primary-checkbox .v-selection-control__input) {
  color: hsl(var(--bulma-primary-h), var(--bulma-primary-s), var(--bulma-primary-l)) !important;
  /* Bulma primary - turquoise */
}

:deep(.info-checkbox .v-selection-control__input) {
  color: hsl(var(--bulma-info-h), var(--bulma-info-s), var(--bulma-info-l)) !important;
  /* Bulma info - cyan */
}

/* Ensure consistent gray colors for disabled elements */
:deep(.v-checkbox--disabled .v-label) {
  opacity: 0.6 !important;
  /* Use opacity instead of hardcoded color */
}

:deep(.v-text-field--disabled .v-field-label) {
  opacity: 0.6 !important;
  /* Use opacity instead of hardcoded color */
}

/* Disabled text color class */
.text-disabled {
  opacity: 0.6;
}
</style>