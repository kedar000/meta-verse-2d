"use client"

import { useState, useEffect } from "react"
import { regionService, type RegionUser } from "../services/api/regionService"

interface RegionFolksModalProps {
  isOpen: boolean
  onClose: () => void
  currentPosition: { x: number; y: number }
}

const RegionFolksModal = ({ isOpen, onClose, currentPosition }: RegionFolksModalProps) => {
  const [regionUsers, setRegionUsers] = useState<RegionUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && currentPosition?.x !== undefined && currentPosition?.y !== undefined) {
      fetchRegionUsers()
    }
  }, [isOpen, currentPosition?.x, currentPosition?.y])

  const fetchRegionUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await regionService.getRegionUsers(currentPosition.x, currentPosition.y)

      // Handle the actual API response structure
      const users = response?.nearbyUsers || []
      console.log("Fetched nearby users:", users)

      setRegionUsers(users)
    } catch (error: any) {
      console.error("Failed to fetch region users:", error)
      setRegionUsers([]) // Set empty array on error
      if (error.response?.data?.message) {
        setError(error.response.data.message)
      } else {
        setError("Failed to load region users")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCall = (user: RegionUser) => {
    console.log("Initiating call with user:", user.userId)
    // TODO: Implement call functionality
  }

  const handleVideo = (user: RegionUser) => {
    console.log("Initiating video call with user:", user.userId)
    // TODO: Implement video call functionality
  }

  const formatLastSeen = (lastMovedAt?: string) => {
    if (!lastMovedAt) return "Unknown"
    const date = new Date(lastMovedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  // Generate display name from userId
  const getDisplayName = (user: RegionUser) => {
    return user.displayName || `User ${user.userId.slice(0, 8)}`
  }

  // Check if user is recently active (within last 5 minutes)
  const isUserActive = (user: RegionUser) => {
    if (!user.lastMovedAt) return false
    const lastMoved = new Date(user.lastMovedAt)
    const now = new Date()
    const diffMs = now.getTime() - lastMoved.getTime()
    return diffMs < 5 * 60 * 1000 // 5 minutes
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span>Region Folks</span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Near position ({currentPosition.x}, {currentPosition.y})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span>Finding folks in your region...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Oops! Something went wrong</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={fetchRegionUsers}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : regionUsers && regionUsers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {regionUsers.length} {regionUsers.length === 1 ? "person" : "people"} nearby
                </h3>
                <button
                  onClick={fetchRegionUsers}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>

              {regionUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* User Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {getDisplayName(user).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {/* Online Status Indicator */}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                            isUserActive(user) ? "bg-green-500" : "bg-gray-500"
                          }`}
                        ></div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-lg">{getDisplayName(user)}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>
                              ({user.x}, {user.y})
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${isUserActive(user) ? "bg-green-500" : "bg-gray-500"}`}
                            ></div>
                            <span>
                              {isUserActive(user) ? "Active" : `Last moved ${formatLastSeen(user.lastMovedAt)}`}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">ID: {user.userId.slice(0, 8)}...</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {/* Call Button */}
                      <button
                        onClick={() => handleCall(user)}
                        className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-colors group"
                        title="Voice Call"
                      >
                        <svg
                          className="w-5 h-5 group-hover:scale-110 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                      </button>

                      {/* Video Call Button */}
                      <button
                        onClick={() => handleVideo(user)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors group"
                        title="Video Call"
                      >
                        <svg
                          className="w-5 h-5 group-hover:scale-110 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No one's around</h3>
                <p className="text-gray-400">No other users found in your region right now.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Position: ({currentPosition.x}, {currentPosition.y})
            </span>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegionFolksModal
