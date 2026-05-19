import { computed, reactive } from 'vue'

const AUTH_TOKEN_KEY = 'patchouli_erp_access_token'
const AUTH_EMAIL_KEY = 'patchouli_erp_user_email'
const AUTH_USER_ID_KEY = 'patchouli_erp_user_id'

const readToken = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

const readUserEmail = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(AUTH_EMAIL_KEY) ?? ''
}

const readUserId = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(AUTH_USER_ID_KEY) ?? ''
}

const state = reactive({
  token: readToken(),
  userEmail: readUserEmail(),
  userId: readUserId(),
  sessionExpiredAt: 0,
})

const getAccessToken = () => state.token

const setAccessToken = (token) => {
  const nextToken = String(token ?? '')
  state.token = nextToken
  if (typeof window === 'undefined') return
  if (!nextToken) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    return
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
}

const setUserEmail = (email) => {
  const nextEmail = String(email ?? '').trim()
  state.userEmail = nextEmail
  if (typeof window === 'undefined') return
  if (!nextEmail) {
    window.localStorage.removeItem(AUTH_EMAIL_KEY)
    return
  }
  window.localStorage.setItem(AUTH_EMAIL_KEY, nextEmail)
}

const setUserId = (userId) => {
  const nextUserId = String(userId ?? '').trim()
  state.userId = nextUserId
  if (typeof window === 'undefined') return
  if (!nextUserId) {
    window.localStorage.removeItem(AUTH_USER_ID_KEY)
    return
  }
  window.localStorage.setItem(AUTH_USER_ID_KEY, nextUserId)
}

const clearAccessToken = () => {
  setAccessToken('')
  setUserEmail('')
  setUserId('')
}

const markSessionExpired = () => {
  state.sessionExpiredAt = Date.now()
}

const clearSessionExpired = () => {
  state.sessionExpiredAt = 0
}

const hasAccessToken = () => Boolean(getAccessToken())
const getLoggedInUserId = () => state.userId

export const useAuthSession = () => ({
  token: computed(() => state.token),
  userEmail: computed(() => state.userEmail),
  userId: computed(() => state.userId),
  isAuthenticated: computed(() => Boolean(state.token)),
  sessionExpiredAt: computed(() => state.sessionExpiredAt),
  setAccessToken,
  setUserEmail,
  setUserId,
  clearAccessToken,
  markSessionExpired,
  clearSessionExpired,
})

export {
  AUTH_TOKEN_KEY,
  AUTH_EMAIL_KEY,
  AUTH_USER_ID_KEY,
  getAccessToken,
  getLoggedInUserId,
  setAccessToken,
  setUserEmail,
  setUserId,
  clearAccessToken,
  hasAccessToken,
  markSessionExpired,
}
