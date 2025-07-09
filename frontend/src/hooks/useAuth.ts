"use client"

import { useState, useEffect } from "react"
import { tokenService } from "../services/api/tokenService"

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = tokenService.isAuthenticated()
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    checkAuth()

    // Listen for storage changes
    window.addEventListener("storage", checkAuth)

    return () => {
      window.removeEventListener("storage", checkAuth)
    }
  }, [])

  const login = (token: string) => {
    tokenService.setToken(token)
    setIsAuthenticated(true)
  }

  const logout = () => {
    tokenService.removeToken()
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    isLoading,
    user: isAuthenticated ? { authenticated: true } : null, // Add user property
    loading: isLoading, // Add loading property as alias
    login,
    logout,
  }
}
