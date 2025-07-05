"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { tokenService } from "../services/api/tokenService"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = tokenService.isAuthenticated()
      setIsAuthenticated(authenticated)
    }

    checkAuth()
  }, [])

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p>Loading...</p>
      </div>
    )
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // Render the protected component if authenticated
  return <>{children}</>
}

export default ProtectedRoute
