import { computed, reactive } from 'vue'

const AUTH_TOKEN_KEY = 'patchouli_erp_access_token'
const AUTH_EMAIL_KEY = 'patchouli_erp_user_email'
const AUTH_USER_ID_KEY = 'patchouli_erp_user_id'
const AUTH_USER_ROLE_KEY = 'patchouli_erp_user_role'
const AUTH_USER_NAME_KEY = 'patchouli_erp_user_name'

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

const readStored = (key) => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

const state = reactive({
  token: readToken(),
  userEmail: readUserEmail(),
  userId: readUserId(),
  userRole: readStored(AUTH_USER_ROLE_KEY),
  userName: readStored(AUTH_USER_NAME_KEY),
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

const setUserRole = (role) => {
  const nextRole = String(role ?? '').trim().toUpperCase()
  state.userRole = nextRole
  if (typeof window === 'undefined') return
  if (!nextRole) window.localStorage.removeItem(AUTH_USER_ROLE_KEY)
  else window.localStorage.setItem(AUTH_USER_ROLE_KEY, nextRole)
}

const setUserName = (name) => {
  const nextName = String(name ?? '').trim()
  state.userName = nextName
  if (typeof window === 'undefined') return
  if (!nextName) window.localStorage.removeItem(AUTH_USER_NAME_KEY)
  else window.localStorage.setItem(AUTH_USER_NAME_KEY, nextName)
}

const clearAccessToken = () => {
  setAccessToken('')
  setUserEmail('')
  setUserId('')
  setUserRole('')
  setUserName('')
}

const markSessionExpired = () => {
  state.sessionExpiredAt = Date.now()
}

const clearSessionExpired = () => {
  state.sessionExpiredAt = 0
}

const hasAccessToken = () => Boolean(getAccessToken())
const getLoggedInUserId = () => state.userId
const getUserRole = () => state.userRole

export const useAuthSession = () => ({
  token: computed(() => state.token),
  userEmail: computed(() => state.userEmail),
  userId: computed(() => state.userId),
  userRole: computed(() => state.userRole),
  userName: computed(() => state.userName),
  isAuthenticated: computed(() => Boolean(state.token)),
  sessionExpiredAt: computed(() => state.sessionExpiredAt),
  setAccessToken,
  setUserEmail,
  setUserId,
  setUserRole,
  setUserName,
  clearAccessToken,
  markSessionExpired,
  clearSessionExpired,
})

export {
  AUTH_TOKEN_KEY,
  AUTH_EMAIL_KEY,
  AUTH_USER_ID_KEY,
  AUTH_USER_ROLE_KEY,
  AUTH_USER_NAME_KEY,
  getAccessToken,
  getLoggedInUserId,
  setAccessToken,
  setUserEmail,
  setUserId,
  setUserRole,
  setUserName,
  getUserRole,
  clearAccessToken,
  hasAccessToken,
  markSessionExpired,
}
