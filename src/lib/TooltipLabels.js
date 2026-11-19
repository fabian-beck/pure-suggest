const ICON_CONTROL_SELECTOR = 'button, a[href], [role="button"]'
// Tooltip content last applied per tippy instance; vue-tippy updates props on every re-render
const labelledContents = new WeakMap()

/**
 * Gives icon-only buttons and links their tooltip text as accessible name, so that
 * screen readers announce them. Meant as tippy `onCreate`/`onAfterUpdate` hook.
 * @param {import('tippy.js').Instance} instance - The tippy instance.
 */
export function labelIconControlByTooltip(instance) {
  const element = instance.reference
  const { content } = instance.props
  if (
    typeof content !== 'string' ||
    labelledContents.get(instance) === content ||
    !element.matches(ICON_CONTROL_SELECTOR) ||
    element.textContent.trim()
  ) {
    return
  }
  labelledContents.set(instance, content)
  // DOMParser keeps the (possibly data-derived) HTML inert while extracting the text
  const label = new DOMParser().parseFromString(content, 'text/html').body.textContent.trim()
  element.setAttribute('aria-label', label)
  // The label already carries the text, so don't announce it again as description
  if (instance.props.aria.content !== null) {
    instance.setProps({ aria: { ...instance.props.aria, content: null } })
  }
}
