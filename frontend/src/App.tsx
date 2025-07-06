"use client"

import { BrowserRouter as Router, useLocation } from "react-router-dom"
import AppRoutes from "./routes/AppRoutes"
import Dashboard from "./components/Dashboard"
import { tokenService } from "./services/api/tokenService"
import { useEffect, useState } from "react"

const AppContent = () => {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = tokenService.isAuthenticated()
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    checkAuth()

    // Listen for storage changes (when user logs in/out)
    window.addEventListener("storage", checkAuth)

    return () => {
      window.removeEventListener("storage", checkAuth)
    }
  }, [])

  // Pages that should not show the dashboard
  const noDashboardPages = ["/test-grid", "/signin", "/signup"]
  const shouldShowDashboard = isAuthenticated && !noDashboardPages.includes(location.pathname)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (shouldShowDashboard) {
    return (
      <Dashboard>
        <AppRoutes />
      </Dashboard>
    )
  }

  return <AppRoutes />
}

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
