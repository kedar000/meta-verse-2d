export const tokenService = {
  // Store token in localStorage with Bearer prefix
  setToken: (token: string): void => {
    localStorage.setItem("token", `Bearer ${token}`)
  },

  // Get token from localStorage
  getToken: (): string | null => {
    return localStorage.getItem("token")
  },

  // Remove token from localStorage
  removeToken: (): void => {
    localStorage.removeItem("token")
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem("token")
    return !!token
  },

  // Get token without Bearer prefix
  getTokenValue: (): string | null => {
    const token = localStorage.getItem("token")
    return token ? token.replace("Bearer ", "") : null
  },
}
