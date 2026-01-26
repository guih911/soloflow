import type { Directive } from 'vue'

function applyMask(value: string, mask: string): string {
  if (!value || !mask) return value

  const digits = value.replace(/\D/g, '')
  let result = ''
  let digitIndex = 0

  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === '#') {
      result += digits[digitIndex]
      digitIndex++
    } else {
      result += mask[i]
    }
  }

  return result
}

function getMask(masks: string | string[], value: string): string {
  if (typeof masks === 'string') return masks

  // Multiple masks: use the shortest that fits, or the longest
  const digits = value.replace(/\D/g, '')
  const sorted = [...masks].sort((a, b) => {
    const aDigits = (a.match(/#/g) || []).length
    const bDigits = (b.match(/#/g) || []).length
    return aDigits - bDigits
  })

  for (const mask of sorted) {
    const maskDigits = (mask.match(/#/g) || []).length
    if (digits.length <= maskDigits) return mask
  }

  return sorted[sorted.length - 1]
}

function handleInput(el: HTMLInputElement, masks: string | string[]) {
  const raw = el.value
  const mask = getMask(masks, raw)
  const masked = applyMask(raw, mask)

  if (el.value !== masked) {
    el.value = masked
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

export const maskDirective: Directive = {
  mounted(el: HTMLElement, binding) {
    const input = el.tagName === 'INPUT' ? el as HTMLInputElement : el.querySelector('input')
    if (!input) return

    const masks = binding.value
    if (!masks) return

    const handler = () => handleInput(input, masks)
    input.addEventListener('input', handler)
    ;(el as any).__maskHandler = handler
    ;(el as any).__maskInput = input

    // Apply mask to initial value
    if (input.value) {
      handleInput(input, masks)
    }
  },

  updated(el: HTMLElement, binding) {
    const input = (el as any).__maskInput as HTMLInputElement
    if (!input) return

    const masks = binding.value
    if (!masks) return

    if (input.value) {
      const mask = getMask(masks, input.value)
      const masked = applyMask(input.value, mask)
      if (input.value !== masked) {
        input.value = masked
      }
    }
  },

  unmounted(el: HTMLElement) {
    const input = (el as any).__maskInput as HTMLInputElement
    const handler = (el as any).__maskHandler
    if (input && handler) {
      input.removeEventListener('input', handler)
    }
  },
}
