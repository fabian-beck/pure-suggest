const TAG_ICONS = {
  isBookmarked: 'mdi-bookmark',
  isHighlyCited: 'mdi-star',
  isSurvey: 'mdi-table',
  isNew: 'mdi-alarm',
  isUnnoted: 'mdi-alert-box-outline'
}

/**
 * Icon of a publication tag; all concept tags share an icon
 */
export function getTagIcon(tagValue) {
  return tagValue.startsWith('concept') ? 'mdi-group' : TAG_ICONS[tagValue] || ''
}
