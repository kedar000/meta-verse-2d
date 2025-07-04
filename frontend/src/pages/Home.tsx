"use client"

import { useEffect, useState } from "react"
import { tokenService } from "../services/api/tokenService"

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(tokenService.isAuthenticated())
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold text-center mb-4">Welcome to Home Page</h1>
      {isAuthenticated ? (
        <div className="text-center">
          <p className="text-green-600 text-lg">✅ You are successfully logged in!</p>
          <p className="text-gray-600 mt-2">Welcome back to your dashboard.</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-600 text-lg">Please sign in or sign up to continue.</p>
        </div>
      )}
    </div>
  )
}

export default Home