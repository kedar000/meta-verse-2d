"use client"

import type React from "react"

import type { ReactElement } from "react"
import { useState, useEffect, useCallback } from "react"
import { grid } from "../data/mapData"
import type { Space } from "../services/api"
import { useWebSocketSpace } from "../hooks/useWebSocketSpace"
import RegionFolksModal from "./RegionFolksModal"

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
  const [zoom, setZoom] = useState(1)
  const [viewportSize, setViewportSize] = useState({ rows: 20, cols: 30 })

  // Chat state
  const [chatTab, setChatTab] = useState("All")
  const [chatMessage, setChatMessage] = useState("")
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoOff, setIsVideoOff] = useState(true)

  // Region folks modal state
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)

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
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30">
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
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        >
          {getVisibleCells().map((cell) => (
            <div
              key={`${cell.row}-${cell.col}`}
              className={`flex items-center justify-center relative border-[0.5px] ${
                cell.cellType === "#" ? "bg-gray-900 border-gray-700" : "bg-gray-100 border-gray-300"
              }`}
            >
              {/* Current Player */}
              {cell.isCurrentPlayer && (
                <>
                  <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg z-10" />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-sm px-3 py-1 rounded whitespace-nowrap z-20 font-medium">
                    🇮🇳 {player.name} (You)
                  </div>
                </>
              )}

              {/* Other Users */}
              {cell.otherUsers.map((user, index) => (
                <div key={user.userId} className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg z-10"
                    style={{
                      transform: `translate(${index * 8}px, ${index * 8}px)`, // Offset multiple users
                    }}
                  />
                  <div
                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-sm px-3 py-1 rounded whitespace-nowrap z-20 font-medium"
                    style={{
                      transform: `translate(${index * 8}px, ${index * 8 - 32}px)`,
                    }}
                  >
                    👤 {user.displayName || user.name || `User ${user.userId.slice(0, 6)}`}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Space Info Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black bg-opacity-80 text-white text-center py-2 px-6 rounded-lg backdrop-blur-sm">
          <div className="font-semibold text-lg flex items-center justify-center space-x-2">
            <span>{space.name}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
          </div>
          <div className="text-sm opacity-75">
            Use WASD or Arrow Keys to move • Position: ({player.row}, {player.col}) • Users: {userCount}/
            {space.maxMembers}
          </div>
        </div>
      </div>

      {/* Floating Top Left Controls with Exit Button */}
      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center space-x-3">
          {/* Exit Button */}
          <button
            onClick={handleExit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Exit Space</span>
          </button>

          {/* Game Controls */}
          <div className="flex items-center space-x-2 bg-black bg-opacity-70 rounded-full px-4 py-2 backdrop-blur-sm">
            <button className="text-white hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="text-white hover:text-gray-300 text-xl font-bold"
            >
              −
            </button>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="text-white hover:text-gray-300 text-xl font-bold"
            >
              +
            </button>
            <button className="text-white hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Top Right Controls */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center space-x-2">
          <button className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg hover:bg-opacity-80 flex items-center space-x-1 backdrop-blur-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm">{userCount}</span>
          </button>

          {/* Region Folks Button */}
          <button
            onClick={() => setIsRegionModalOpen(true)}
            className="bg-purple-600 bg-opacity-90 text-white px-4 py-2 rounded-lg hover:bg-opacity-100 backdrop-blur-sm flex items-center space-x-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm">Region Folks</span>
          </button>

          <button className="bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-lg hover:bg-opacity-100 backdrop-blur-sm">
            Invite
          </button>
        </div>
      </div>

      {/* Floating Right Sidebar - Player Info */}
      <div className="absolute top-20 right-4 z-20 w-72">
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-white font-semibold mb-2">{player.name}</h3>
          <div className="text-gray-300 text-sm mb-4">Space: {space.name}</div>

          {/* Connected Users List */}
          <div className="mb-4">
            <div className="text-white text-sm font-medium mb-2">Connected Users ({userCount})</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {/* Current User */}
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-white">{player.name} (You)</span>
              </div>

              {/* Other Users */}
              {connectedUsers
                .filter((user) => user.userId !== "current-user")
                .map((user) => (
                  <div key={user.userId} className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">
                      {user.displayName || user.name || `User ${user.userId.slice(0, 6)}`}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">👤</span>
            </div>
            <div className="text-red-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Left Chat Interface */}
      <div className="absolute bottom-20 left-4 z-20">
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm max-w-md">
          {/* Chat Header */}
          <div className="text-white text-sm font-medium mb-2 flex items-center justify-between">
            <span>Chat - {space.name}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
          </div>

          {/* Chat Tabs */}
          <div className="flex mb-3">
            <button
              onClick={() => setChatTab("All")}
              className={`px-4 py-2 rounded-l-lg ${
                chatTab === "All" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setChatTab("Private")}
              className={`px-4 py-2 rounded-r-lg ${
                chatTab === "Private" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"
              }`}
            >
              🔒 Private
            </button>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Please enter your chat"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              disabled={!isConnected}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
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

      {/* Floating Bottom Center Control Bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center space-x-4 bg-black bg-opacity-80 rounded-full px-6 py-3 backdrop-blur-sm">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full ${isMuted ? "bg-red-500 text-white" : "bg-gray-600 text-gray-300"}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              {isMuted ? (
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
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-2 rounded-full ${isVideoOff ? "bg-red-500 text-white" : "bg-gray-600 text-gray-300"}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>

          <button className="p-2 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button className="p-2 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </button>

          <button className="p-2 rounded-full bg-gray-600 text-gray-300 hover:bg-gray-500">
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
        <div className="bg-black bg-opacity-90 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-white text-xs font-medium mb-2 text-center">Map</div>
          <div
            className="border border-gray-600 rounded"
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
                {/* Current Player */}
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

                {/* Other Users */}
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

      {/* Region Folks Modal */}
      <RegionFolksModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        currentPosition={{ x: player.col, y: player.row }}
      />
    </div>
  )
}

export default TestGridSpace
