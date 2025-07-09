"use client"

import { BrowserRouter as Router } from "react-router-dom"
import { useAuth } from "./hooks/useAuth"
import AppRoutes from "./routes/AppRoutes"
import Navbar from "./components/Navbar"
import { useLocation } from "react-router-dom"

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Hide navbar on test-grid route (space view)
  const hideNavbar = location.pathname === "/test-grid"

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {!hideNavbar && isAuthenticated && <Navbar />}
      <AppRoutes />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
