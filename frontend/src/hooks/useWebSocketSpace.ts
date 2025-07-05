"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { websocketService, type UserPosition } from "../services/websocket/websocketService"
import type { Space } from "../services/api"
import { tokenService } from "../services/api/tokenService"

interface UseWebSocketSpaceProps {
  space: Space
  currentUser: {
    row: number
    col: number
    name: string
  }
}

export const useWebSocketSpace = ({ space, currentUser }: UseWebSocketSpaceProps) => {
  const [connectedUsers, setConnectedUsers] = useState<Map<string, UserPosition>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>("You")
  const hasInitialized = useRef(false)
  const currentSpaceId = useRef<string | null>(null)
  const connectionPromise = useRef<Promise<boolean> | null>(null)

  // Get current user's display name from token or API
  useEffect(() => {
    const getUserDisplayName = async () => {
      try {
        // You might want to decode the JWT token to get the display name
        // or make an API call to get user info
        const token = tokenService.getTokenValue()
        if (token) {
          // For now, we'll use a default name, but you can decode JWT or make API call
          setCurrentUserDisplayName("You") // You can replace this with actual display name
        }
      } catch (error) {
        console.error("Failed to get user display name:", error)
      }
    }

    getUserDisplayName()
  }, [])

  // Initialize WebSocket connection
  useEffect(() => {
    // Prevent multiple connections for the same space
    if (hasInitialized.current && currentSpaceId.current === space.id) {
      return
    }

    // If we're switching spaces, disconnect from previous space first
    if (hasInitialized.current && currentSpaceId.current !== space.id) {
      websocketService.disconnect()
      setConnectedUsers(new Map())
      setIsConnected(false)
      setConnectionError(null)
    }

    hasInitialized.current = true
    currentSpaceId.current = space.id

    const initializeConnection = async () => {
      // If there's already a connection attempt in progress, wait for it
      if (connectionPromise.current) {
        try {
          await connectionPromise.current
          return
        } catch (error) {
          // Continue with new connection attempt if previous failed
        }
      }

      try {
        setConnectionError(null)

        // Set up event listeners only once
        websocketService.onConnectionChanged((connected) => {
          setIsConnected(connected)
          if (!connected) {
            setConnectedUsers(new Map())
          }
        })

        websocketService.onInitialUsersReceived((users) => {
          console.log("Setting initial users:", users)
          const userMap = new Map<string, UserPosition>()
          users.forEach((user) => {
            userMap.set(user.userId, user)
          })
          setConnectedUsers(userMap)
        })

        websocketService.onPositionUpdated((users) => {
          setConnectedUsers((prev) => {
            const newMap = new Map(prev)
            users.forEach((user) => {
              console.log("Updating user position:", user)
              newMap.set(user.userId, user)
            })
            return newMap
          })
        })

        websocketService.onUserJoinedSpace((user) => {
          console.log("User joined space:", user)
          setConnectedUsers((prev) => {
            const newMap = new Map(prev)
            newMap.set(user.userId, user)
            return newMap
          })
        })

        websocketService.onUserLeftSpace((userId) => {
          console.log("User left space:", userId)
          setConnectedUsers((prev) => {
            const newMap = new Map(prev)
            newMap.delete(userId)
            return newMap
          })
        })

        websocketService.onErrorReceived((message) => {
          setConnectionError(message)
        })

        // Create connection promise to prevent multiple simultaneous connections
        connectionPromise.current = websocketService.connect(space.id)
        await connectionPromise.current
        connectionPromise.current = null
      } catch (error) {
        console.error("Failed to initialize WebSocket connection:", error)
        setConnectionError(error instanceof Error ? error.message : "Connection failed")
        connectionPromise.current = null
      }
    }

    initializeConnection()

    // Cleanup function
    return () => {
      // Only disconnect if we're unmounting or changing spaces
      if (currentSpaceId.current === space.id) {
        websocketService.disconnect()
        hasInitialized.current = false
        currentSpaceId.current = null
        connectionPromise.current = null
      }
    }
  }, [space.id]) // Only depend on space.id

  // Send move to server
  const sendMove = useCallback(
    (newRow: number, newCol: number) => {
      if (isConnected && websocketService.isConnected()) {
        websocketService.sendMove(newCol, newRow) // Note: backend expects x, y (col, row)
      }
    },
    [isConnected],
  )

  // Get all users including current user
  const getAllUsers = useCallback(() => {
    const allUsers = new Map(connectedUsers)

    // Add current user with their actual display name
    const currentUserId = "current-user" // This should be the actual user ID from your auth
    allUsers.set(currentUserId, {
      userId: currentUserId,
      x: currentUser.col,
      y: currentUser.row,
      spaceId: space.id,
      name: currentUser.name,
      displayName: currentUserDisplayName,
    })

    return Array.from(allUsers.values())
  }, [connectedUsers, currentUser, space.id, currentUserDisplayName])

  return {
    connectedUsers: getAllUsers(),
    isConnected,
    connectionError,
    sendMove,
    userCount: connectedUsers.size + 1, // +1 for current user
    currentUserDisplayName,
  }
}
