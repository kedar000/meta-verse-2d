"use client"

import type React from "react"

import type { ReactElement } from "react"
import { useState, useEffect, useCallback } from "react"
import { grid } from "../data/mapData"
import type { Space } from "../services/api"
import { useWebSocketSpace } from "../hooks/useWebSocketSpace"
import RegionFolksModal from "./RegionFolksModal"
import { webrtcService, type IncomingCall } from "../services/webrtc/webrtcService"
import CallNotificationModal from "./CallNotificationModal"
import CallModal from "./CallModal"

interface TestGridSpaceProps {
  space: Space
  onExit: () => void
}

const TestGridSpace = ({ space, onExit }: TestGridSpaceProps): ReactElement => {
  const mapMatrix = grid

  // Single player state - name will be updated with actual display name from API
  const [player, setPlayer] = useState({
    row: 25,
    col: 25,
    name: "Loading...", // This will be updated with actual display name
  })

  // Camera/viewport settings
  const [viewportSize, setViewportSize] = useState({ rows: 20, cols: 30 })

  // Chat state
  const [chatTab, setChatTab] = useState("All")
  const [chatMessage, setChatMessage] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  // UI state
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)

  // Global Call states - moved from RegionFolksModal to here for global access
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [currentCall, setCurrentCall] = useState<{
    type: "audio" | "video"
    remoteUser: string
    isIncoming: boolean
  } | null>(null)
  const [isCallMuted, setIsCallMuted] = useState(false)
  const [isCallVideoOff, setIsCallVideoOff] = useState(false)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")

  // Video refs for displaying streams
  // Remove these lines:
  // const localVideoRef = useRef<HTMLVideoElement>(null)
  // const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // WebSocket connection - memoize the currentUser object to prevent unnecessary re-renders
  const currentUser = {
    row: player.row,
    col: player.col,
    name: player.name,
  }

  const { connectedUsers, isConnected, connectionError, sendMove, userCount, currentUserDisplayName } =
    useWebSocketSpace({
      space,
      currentUser,
    })

  // Update player name when we get the display name from API
  useEffect(() => {
    if (currentUserDisplayName && currentUserDisplayName !== "Loading...") {
      setPlayer((prev) => ({ ...prev, name: currentUserDisplayName }))
    }
  }, [currentUserDisplayName])

  // CRITICAL: Set up WebRTC event listeners at space level for global call notifications
  useEffect(() => {
    console.log("[TestGridSpace] Setting up global WebRTC event listeners")

    // Handle incoming calls - this will work regardless of which modal is open
    webrtcService.onIncomingCallReceived((call) => {
      console.log("[TestGridSpace] Global incoming call received:", call)
      setIncomingCall(call)
    })

    webrtcService.onCallWasAccepted(() => {
      console.log("[TestGridSpace] Global call was accepted")
      setIsCallActive(true)
      setIncomingCall(null)
    })

    webrtcService.onCallWasRejected(() => {
      console.log("[TestGridSpace] Global call was rejected")
      setIncomingCall(null)
      setCurrentCall(null)
      setIsCallActive(false)
    })

    webrtcService.onCallWasEnded(() => {
      console.log("[TestGridSpace] Global call ended")
      setIncomingCall(null)
      setCurrentCall(null)
      setIsCallActive(false)
      setIsCallMuted(false)
      setIsCallVideoOff(false)
    })

    webrtcService.onConnectionStateChanged((state) => {
      console.log("[TestGridSpace] Global connection state changed:", state)
      setConnectionState(state)
    })

    // Handle local stream for UI display
    webrtcService.onLocalStreamReceived((stream) => {
      console.log("[TestGridSpace] Local stream received")
    })

    // Handle remote stream for UI display
    webrtcService.onRemoteStreamReceived((stream) => {
      console.log("[TestGridSpace] Remote stream received")
    })

    // Cleanup function
    return () => {
      console.log("[TestGridSpace] Cleaning up global WebRTC event listeners")
      // Note: We don't clean up the service itself here as it might be used elsewhere
    }
  }, []) // Empty dependency array - set up once when component mounts

  // Global call functions
  const handleAcceptCall = async () => {
    if (!incomingCall) return

    try {
      console.log("[TestGridSpace] Accepting global call")
      setCurrentCall({
        type: incomingCall.callType,
        remoteUser: incomingCall.fromDisplayName,
        isIncoming: true,
      })

      await webrtcService.acceptCall(incomingCall.offer, incomingCall.callType)
    } catch (error) {
      console.error("[TestGridSpace] Failed to accept call:", error)
      alert("Failed to accept call. Please try again.")
      setIncomingCall(null)
      setCurrentCall(null)
    }
  }

  const handleRejectCall = () => {
    console.log("[TestGridSpace] Rejecting global call")
    webrtcService.rejectCall()
  }

  const handleDismissCall = () => {
    console.log("[TestGridSpace] Dismissing global call notification")
    // Just dismiss the notification without rejecting the call
    setIncomingCall(null)
  }

  const handleEndCall = () => {
    console.log("[TestGridSpace] Ending global call")
    webrtcService.endCall()
  }

  const handleToggleCallMute = () => {
    const localStream = webrtcService.getLocalStream()
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsCallMuted(!audioTrack.enabled)
        console.log("[TestGridSpace] Toggled mute:", !audioTrack.enabled)
      }
    }
  }

  const handleToggleCallVideo = () => {
    const localStream = webrtcService.getLocalStream()
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCallVideoOff(!videoTrack.enabled)
        console.log("[TestGridSpace] Toggled video:", !videoTrack.enabled)
      }
    }
  }

  // Function to initiate call to any user in the space - available globally
  const initiateCallToUser = async (targetUserId: string, callType: "audio" | "video", targetDisplayName?: string) => {
    try {
      console.log(`[TestGridSpace] Initiating global ${callType} call to:`, targetDisplayName, targetUserId)

      if (webrtcService.isInCall()) {
        alert("You are already in a call")
        return
      }

      setCurrentCall({
        type: callType,
        remoteUser: targetDisplayName || `User ${targetUserId.slice(0, 8)}`,
        isIncoming: false,
      })

      await webrtcService.initiateCall(targetUserId, callType, targetDisplayName)
    } catch (error) {
      console.error("[TestGridSpace] Failed to initiate call:", error)
      alert("Failed to start call. Please try again.")
      setCurrentCall(null)
    }
  }

  // Handle local audio/video controls
  const handleToggleMute = () => {
    if (isCallActive) {
      handleToggleCallMute()
    } else {
      setIsMuted(!isMuted)
    }
  }

  const handleToggleVideo = () => {
    if (isCallActive) {
      handleToggleCallVideo()
    } else {
      setIsVideoOff(!isVideoOff)
    }
  }

  // Calculate viewport size based on screen dimensions
  useEffect(() => {
    const calculateViewportSize = () => {
      const cellSize = 48
      const availableWidth = window.innerWidth
      const availableHeight = window.innerHeight

      let cols = Math.floor(availableWidth / cellSize)
      let rows = Math.floor(availableHeight / cellSize)

      cols = Math.min(cols, 25)
      rows = Math.min(rows, 15)

      setViewportSize({ rows, cols })
    }

    calculateViewportSize()
    window.addEventListener("resize", calculateViewportSize)

    return () => window.removeEventListener("resize", calculateViewportSize)
  }, [])

  // Check if the new position is walkable and within bounds
  const isValidMove = (row: number, col: number): boolean => {
    // Check bounds
    if (row < 0 || row >= 50 || col < 0 || col >= 50) {
      return false
    }

    // Check if it's a walkable tile
    if (mapMatrix[row][col] !== ".") {
      return false
    }

    // Additional backend-specific validation
    // Add any specific positions that backend considers invalid
    if ((row === 23 || row === 24) && (col === 25 || col === 26)) {
      return false
    }

    return true
  }

  // Keyboard movement with WebSocket integration
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event
      let newRow = player.row
      let newCol = player.col

      switch (key.toLowerCase()) {
        case "w":
        case "arrowup":
          newRow = Math.max(0, player.row - 1)
          break
        case "s":
        case "arrowdown":
          newRow = Math.min(49, player.row + 1)
          break
        case "a":
        case "arrowleft":
          newCol = Math.max(0, player.col - 1)
          break
        case "d":
        case "arrowright":
          newCol = Math.min(49, player.col + 1)
          break
        default:
          return
      }

      // Use the validation function
      if (isValidMove(newRow, newCol)) {
        // Update local state immediately for responsive feel
        setPlayer((prev) => ({ ...prev, row: newRow, col: newCol }))

        // Send move to server via WebSocket
        sendMove(newRow, newCol)
      } else {
        console.log(`Invalid move attempted: (${newRow}, ${newCol})`)
      }
    },
    [player.row, player.col, sendMove],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [handleKeyPress])

  // Handle exit with proper cleanup
  const handleExit = useCallback(() => {
    console.log("Exiting space, cleaning up WebSocket connection...")
    // End any active calls before exiting
    if (webrtcService.isInCall()) {
      webrtcService.endCall()
    }
    onExit()
  }, [onExit])

  // Get visible cells around player
  const getVisibleCells = () => {
    const cells = []
    const halfRows = Math.floor(viewportSize.rows / 2)
    const halfCols = Math.floor(viewportSize.cols / 2)

    for (let row = 0; row < viewportSize.rows; row++) {
      for (let col = 0; col < viewportSize.cols; col++) {
        const mapRow = player.row - halfRows + row
        const mapCol = player.col - halfCols + col

        // Check if coordinates are within map bounds (0-49 for 50x50 grid)
        const isValidCell = mapRow >= 0 && mapRow < 50 && mapCol >= 0 && mapCol < 50

        // If outside bounds, treat as wall
        let cellType = "#"
        if (isValidCell) {
          cellType = mapMatrix[mapRow][mapCol]
        }

        // Double-check: if backend considers this position invalid, treat as wall
        // This handles edge cases where frontend and backend might disagree
        if (isValidCell && (mapRow === 23 || mapRow === 24) && (mapCol === 25 || mapCol === 26)) {
          cellType = "#" // Force these specific problematic positions to be walls
        }

        // Check if current player is at this position
        const isCurrentPlayer = mapRow === player.row && mapCol === player.col

        // Check if any other user is at this position
        const otherUsersAtPosition = connectedUsers.filter(
          (user) => user.y === mapRow && user.x === mapCol && user.userId !== "current-user",
        )

        cells.push({
          row,
          col,
          mapRow,
          mapCol,
          cellType,
          isCurrentPlayer,
          otherUsers: otherUsersAtPosition,
          isValidCell,
        })
      }
    }
    return cells
  }

  // Get minimap data
  const getMinimapData = () => {
    const minimapCells = []
    const halfRows = Math.floor(viewportSize.rows / 2)
    const halfCols = Math.floor(viewportSize.cols / 2)

    const viewportTop = Math.max(0, player.row - halfRows)
    const viewportBottom = Math.min(49, player.row + halfRows)
    const viewportLeft = Math.max(0, player.col - halfCols)
    const viewportRight = Math.min(49, player.col + halfCols)

    for (let row = 0; row < 50; row++) {
      for (let col = 0; col < 50; col++) {
        const cellType = mapMatrix[row][col]
        const isCurrentPlayer = row === player.row && col === player.col
        const isInViewport = row >= viewportTop && row <= viewportBottom && col >= viewportLeft && col <= viewportRight

        // Check for other users at this position
        const hasOtherUsers = connectedUsers.some(
          (user) => user.y === row && user.x === col && user.userId !== "current-user",
        )

        minimapCells.push({
          row,
          col,
          cellType,
          isCurrentPlayer,
          hasOtherUsers,
          isInViewport,
        })
      }
    }
    return minimapCells
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (chatMessage.trim()) {
      console.log(`[${space.name}] [${chatTab}] ${player.name}: ${chatMessage}`)
      setChatMessage("")
    }
  }

  return (
    <div className="h-screen w-screen bg-gray-800 relative overflow-hidden">
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">
            {connectionError ? `Connection Error: ${connectionError}` : "Connecting..."}
          </div>
        </div>
      )}

      {/* Full Screen Game Grid */}
      <div className="absolute inset-0">
        <div
          className="w-full h-full"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${viewportSize.cols}, 1fr)`,
            gridTemplateRows: `repeat(${viewportSize.rows}, 1fr)`,
            gap: "1px",
            padding: "2px",
          }}
        >
          {getVisibleCells().map((cell) => (
            <div
              key={`${cell.row}-${cell.col}`}
              className={`flex items-center justify-center relative ${
                cell.cellType === "#" ? "bg-gray-900 border border-gray-800" : "bg-gray-50 border border-gray-200"
              }`}
              style={{
                minHeight: "48px",
                minWidth: "48px",
              }}
            >
              {/* Small dot indicator for walkable empty cells */}
              {cell.cellType === "." && !cell.isCurrentPlayer && cell.otherUsers.length === 0 && (
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-30"></div>
              )}

              {/* Current Player */}
              {cell.isCurrentPlayer && (
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{player.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium shadow-lg">
                    🇮🇳 {player.name} (You)
                  </div>
                </div>
              )}

              {/* Other Users with Call Buttons */}
              {cell.otherUsers.map((user, index) => {
                const colors = [
                  "from-blue-500 to-blue-600",
                  "from-green-500 to-green-600",
                  "from-purple-500 to-purple-600",
                  "from-yellow-500 to-yellow-600",
                  "from-pink-500 to-pink-600",
                  "from-indigo-500 to-indigo-600",
                ]
                const bgColors = [
                  "bg-blue-600",
                  "bg-green-600",
                  "bg-purple-600",
                  "bg-yellow-600",
                  "bg-pink-600",
                  "bg-indigo-600",
                ]
                const colorIndex = index % colors.length
                const displayName = user.displayName || user.name || `User ${user.userId.slice(0, 6)}`

                return (
                  <div
                    key={user.userId}
                    className="absolute inset-0 flex items-center justify-center group"
                    style={{
                      transform: `translate(${index * 12}px, ${index * 12}px)`,
                      zIndex: 10 - index,
                    }}
                  >
                    <div
                      className={`w-10 h-10 bg-gradient-to-br ${colors[colorIndex]} rounded-full border-3 border-white shadow-lg flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-lg">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div
                      className={`absolute -top-12 left-1/2 transform -translate-x-1/2 ${bgColors[colorIndex]} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium shadow-lg`}
                      style={{
                        transform: `translate(-50%, ${index * 12 - 48}px)`,
                      }}
                    >
                      👤 {displayName}
                    </div>

                    {/* Call Buttons - Show on hover */}
                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                      {/* Audio Call Button */}
                      <button
                        onClick={() => initiateCallToUser(user.userId, "audio", displayName)}
                        disabled={webrtcService.isInCall()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-1.5 rounded-full transition-colors text-xs"
                        title={`Audio call ${displayName}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        onClick={() => initiateCallToUser(user.userId, "video", displayName)}
                        disabled={webrtcService.isInCall()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-1.5 rounded-full transition-colors text-xs"
                        title={`Video call ${displayName}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Space Name Header - Better positioned */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg backdrop-blur-sm border border-white/20">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <h1 className="font-bold text-xl tracking-wide">{space.name}</h1>
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
          </div>
          <div className="text-center text-sm opacity-90 mt-1">
            Position: ({player.row}, {player.col})
          </div>
        </div>
      </div>

      {/* Exit Button Only - Top Left */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={handleExit}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Exit Space</span>
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center space-x-3">
          {/* Clickable User Count */}
          <button
            onClick={() => setShowUsersModal(true)}
            className="bg-black bg-opacity-70 text-white px-4 py-3 rounded-xl hover:bg-opacity-80 flex items-center space-x-2 backdrop-blur-sm transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="font-medium">{userCount}</span>
          </button>

          {/* Region Folks Button */}
          <button
            onClick={() => setIsRegionModalOpen(true)}
            className="bg-purple-600 bg-opacity-90 text-white px-4 py-3 rounded-xl hover:bg-opacity-100 backdrop-blur-sm flex items-center space-x-2 transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm font-medium">Region Folks</span>
          </button>
        </div>
      </div>

      {/* Video Box - Right Side - Now shows actual streams */}
      <div className="absolute top-20 right-4 z-20 w-80">
        <div className="bg-black bg-opacity-90 rounded-xl p-4 backdrop-blur-sm shadow-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Video</h3>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
          </div>

          {/* Local Video Stream */}
          <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-500 mb-2">
            {!isVideoOff && (isCallActive || webrtcService.getLocalStream()) ? (
              <video autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-2xl">{player.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-white text-sm">Camera Off</p>
                  <p className="text-gray-400 text-xs">{player.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Remote Video Stream (only show if in call) */}
          {isCallActive && (
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-green-500">
              {webrtcService.getRemoteStream() ? (
                <video autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-bold text-2xl">
                        {currentCall?.remoteUser.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white text-sm">Connecting...</p>
                    <p className="text-gray-400 text-xs">{currentCall?.remoteUser}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
              <h2 className="text-xl font-bold text-white">Room Users ({userCount})</h2>
              <button
                onClick={() => setShowUsersModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {/* Current User */}
                <div className="flex items-center space-x-3 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{player.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-red-400 text-sm">
                      You • Position: ({player.row}, {player.col})
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>

                {/* Other Users with Call Buttons */}
                {connectedUsers
                  .filter((user) => user.userId !== "current-user")
                  .map((user, index) => {
                    const colors = [
                      "from-blue-500 to-blue-600",
                      "from-green-500 to-green-600",
                      "from-purple-500 to-purple-600",
                      "from-yellow-500 to-yellow-600",
                      "from-pink-500 to-pink-600",
                      "from-indigo-500 to-indigo-600",
                    ]
                    const colorIndex = index % colors.length
                    const displayName = user.displayName || user.name || `User ${user.userId.slice(0, 6)}`

                    return (
                      <div key={user.userId} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 bg-gradient-to-br ${colors[colorIndex]} rounded-full flex items-center justify-center`}
                            >
                              <span className="text-white font-bold">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">{displayName}</p>
                              <p className="text-gray-400 text-sm">
                                Position: ({user.x}, {user.y})
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Audio Call Button */}
                            <button
                              onClick={() => initiateCallToUser(user.userId, "audio", displayName)}
                              disabled={webrtcService.isInCall()}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                              title={`Audio call ${displayName}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              onClick={() => initiateCallToUser(user.userId, "video", displayName)}
                              disabled={webrtcService.isInCall()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                              title={`Video call ${displayName}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>

                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface - Bottom Left */}
      <div className="absolute bottom-20 left-4 z-20">
        <div className="bg-black bg-opacity-90 rounded-xl p-4 backdrop-blur-sm max-w-md shadow-lg border border-white/10">
          <div className="text-white text-sm font-medium mb-3 flex items-center justify-between">
            <span>Chat - {space.name}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
          </div>

          <div className="flex mb-3">
            <button
              onClick={() => setChatTab("All")}
              className={`px-4 py-2 rounded-l-lg transition-colors ${
                chatTab === "All" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChatTab("Private")}
              className={`px-4 py-2 rounded-r-lg transition-colors ${
                chatTab === "Private" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🔒 Private
            </button>
          </div>

          <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              disabled={!isConnected}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={!isConnected}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Control Bar - Bottom Center - Now functional */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center space-x-4 bg-black bg-opacity-90 rounded-full px-6 py-3 backdrop-blur-sm shadow-lg border border-white/10">
          <button
            onClick={handleToggleMute}
            className={`p-3 rounded-full transition-all duration-200 ${
              isMuted || isCallMuted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isMuted || isCallMuted ? (
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>

          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVideoOff || isCallVideoOff
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>

          <button className="p-3 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500 transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button className="p-3 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500 transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </button>

          <button className="p-3 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500 transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zM9 7a1 1 0 11-2 0 1 1 0 012 0zm.5 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Minimap - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-black bg-opacity-90 rounded-xl p-3 backdrop-blur-sm shadow-lg border border-white/10">
          <div className="text-white text-xs font-medium mb-2 text-center">Map</div>
          <div
            className="border border-gray-600 rounded-lg overflow-hidden"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(50, 3px)",
              gridTemplateRows: "repeat(50, 3px)",
              gap: "0px",
              width: "150px",
              height: "150px",
            }}
          >
            {getMinimapData().map((cell) => (
              <div
                key={`minimap-${cell.row}-${cell.col}`}
                className={`relative ${
                  cell.cellType === "#" ? "bg-gray-800" : cell.isInViewport ? "bg-blue-300" : "bg-gray-300"
                }`}
                style={{
                  width: "3px",
                  height: "3px",
                }}
              >
                {cell.isCurrentPlayer && (
                  <div
                    className="absolute inset-0 bg-red-500 rounded-full border border-white"
                    style={{
                      width: "3px",
                      height: "3px",
                      transform: "scale(1.5)",
                      transformOrigin: "center",
                    }}
                  />
                )}

                {cell.hasOtherUsers && (
                  <div
                    className="absolute inset-0 bg-green-500 rounded-full border border-white"
                    style={{
                      width: "3px",
                      height: "3px",
                      transform: "scale(1.2)",
                      transformOrigin: "center",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-white text-xs mt-2 text-center opacity-75">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>You
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 ml-2"></span>Others
            <span className="inline-block w-2 h-2 bg-blue-300 rounded-full mr-1 ml-2"></span>View
          </div>
        </div>
      </div>

      {/* Region Folks Modal - Pass call functions as props */}
      <RegionFolksModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        currentPosition={{ x: player.col, y: player.row }}
        onInitiateCall={initiateCallToUser}
      />

      {/* GLOBAL Call Notification Modal - This will show regardless of which modal is open */}
      <CallNotificationModal
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onDismiss={handleDismissCall}
      />

      {/* GLOBAL Active Call Modal - This will show regardless of which modal is open */}
      {isCallActive && currentCall && (
        <CallModal
          isOpen={isCallActive}
          callType={currentCall.type}
          isIncoming={currentCall.isIncoming}
          remoteUserName={currentCall.remoteUser}
          localStream={webrtcService.getLocalStream()}
          remoteStream={webrtcService.getRemoteStream()}
          connectionState={connectionState}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleCallMute}
          onToggleVideo={handleToggleCallVideo}
          isMuted={isCallMuted}
          isVideoOff={isCallVideoOff}
        />
      )}
    </div>
  )
}

export default TestGridSpace
