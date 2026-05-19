import { reactive, readonly } from 'vue'

const state = reactive({
  items: [],
})

let nextId = 1

const removeToast = (id) => {
  state.items = state.items.filter((item) => item.id !== id)
}

const pushToast = (message, variant = 'info', timeout = 3200) => {
  const id = nextId++
  state.items = [...state.items, { id, message, variant }]

  if (timeout > 0) {
    setTimeout(() => {
      removeToast(id)
    }, timeout)
  }
}

export const useToast = () => ({
  toasts: readonly(state),
  success: (message, timeout) => pushToast(message, 'success', timeout),
  error: (message, timeout) => pushToast(message, 'error', timeout),
  info: (message, timeout) => pushToast(message, 'info', timeout),
  removeToast,
})
