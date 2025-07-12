"use client"

import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { tokenService } from "../services/api/tokenService"

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(tokenService.isAuthenticated())
    }

    checkAuth()

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener("storage", checkAuth)

    return () => {
      window.removeEventListener("storage", checkAuth)
    }
  }, [])

  const handleLogout = () => {
    tokenService.removeToken()
    setIsAuthenticated(false)
    window.location.href = "/"
  }

  return (
    <nav className="flex justify-between items-center p-4 shadow">
      <Link to="/" className="text-xl font-bold">
        MyApp
      </Link>
      <div className="space-x-4">
        <Link to="/test-grid" className="hover:underline">
          Test Grid
        </Link>
        <Link to="/video-chat" className="hover:underline text-purple-600 font-semibold">
          🎥 Video Chat
        </Link>
        <Link to="/kedar-tarun-video?user=kedar" className="hover:underline text-blue-600 font-semibold">
          🎥 Kedar ↔ Tarun
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/space" className="hover:underline">
              Space
            </Link>
            <button onClick={handleLogout} className="hover:underline text-red-600">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signin" className="hover:underline">
              Sign In
            </Link>
            <Link to="/signup" className="hover:underline">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
