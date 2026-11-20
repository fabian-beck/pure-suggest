import { describe, it, expect, vi } from 'vitest'

import { labelIconControlByTooltip } from '@/lib/TooltipLabels.js'

const createInstance = (reference, content) => ({
  reference,
  props: { content, aria: { content: 'auto', expanded: 'auto' } },
  setProps: vi.fn()
})

const createButton = (html = '<i class="mdi mdi-text"></i>') => {
  const button = document.createElement('button')
  button.innerHTML = html
  return button
}

describe('labelIconControlByTooltip', () => {
  it('labels an icon-only button with the plain tooltip text', () => {
    const button = createButton()
    const instance = createInstance(button, "Abs<span class='key'>t</span>ract")

    labelIconControlByTooltip(instance)

    expect(button.getAttribute('aria-label')).toBe('Abstract')
    expect(instance.setProps).toHaveBeenCalledWith({ aria: { content: null, expanded: 'auto' } })
  })

  it('updates the label when the tooltip content changes', () => {
    const button = createButton()
    const instance = createInstance(button, 'Add author to filter.')
    labelIconControlByTooltip(instance)

    instance.props.content = 'Author is in filter. Click to remove.'
    labelIconControlByTooltip(instance)

    expect(button.getAttribute('aria-label')).toBe('Author is in filter. Click to remove.')
  })

  it('keeps an explicit aria-label', () => {
    const button = createButton()
    button.setAttribute('aria-label', 'Network right')

    labelIconControlByTooltip(createInstance(button, '<b>Network right</b><br>Drag the borders'))

    expect(button.getAttribute('aria-label')).toBe('Network right')
  })

  it('separates lines of the tooltip', () => {
    const button = createButton()

    labelIconControlByTooltip(createInstance(button, 'Zoom in<br>or scroll'))

    expect(button.getAttribute('aria-label')).toBe('Zoom in or scroll')
  })

  it('does not run markup from the tooltip content', () => {
    const button = createButton()
    window.injected = false

    labelIconControlByTooltip(
      createInstance(button, '<img src="x" onerror="window.injected = true">Title')
    )

    expect(button.getAttribute('aria-label')).toBe('Title')
    expect(window.injected).toBe(false)
  })

  it.each([
    ['a button with visible text', () => createButton('Update')],
    ['a non-interactive element', () => document.createElement('span')]
  ])('leaves %s unlabeled', (_, createElement) => {
    const element = createElement()

    labelIconControlByTooltip(createInstance(element, 'Tooltip'))

    expect(element.hasAttribute('aria-label')).toBe(false)
  })
})
