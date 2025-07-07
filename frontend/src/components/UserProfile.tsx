"use client"

import { useState, useEffect } from "react"
import { userService } from "../services/api/userService"

interface UserProfileProps {
  isCompact?: boolean
}

const UserProfileComponent = ({ isCompact = false }: UserProfileProps) => {
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true)
        const response = await userService.getCurrentUser()
        setUserProfile(response.user)
        setError(null)
      } catch (error: any) {
        console.error("Failed to fetch user profile:", error)
        if (error.response?.data?.message) {
          setError(error.response.data.message)
        } else {
          setError("Failed to load profile")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [])

  if (isLoading) {
    return (
      <div className={`${isCompact ? "p-4" : "p-6"} bg-white rounded-lg shadow-md border border-gray-200`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${isCompact ? "p-4" : "p-6"} bg-red-50 rounded-lg border border-red-200`}>
        <div className="flex items-center space-x-2 text-red-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isCompact) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">{userProfile.displayName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{userProfile.displayName}</h3>
            <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-2xl">{userProfile.displayName.charAt(0).toUpperCase()}</span>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-800 truncate">{userProfile.displayName}</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-2 h-2 mr-1 fill-current" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Online
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
              {userProfile.email}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0a1 1 0 00-1 1v10a1 1 0 001 1h6a1 1 0 001-1V8a1 1 0 00-1-1"
                />
              </svg>
              Member since {formatDate(userProfile.createdAt)}
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              ID: {userProfile.id.slice(0, 8)}...
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 mt-4">
            <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
              Edit Profile
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 text-sm font-medium">
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfileComponent
