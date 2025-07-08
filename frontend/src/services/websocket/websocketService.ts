import { tokenService } from "../api/tokenService"

export interface UserPosition {
  userId: string
  x: number
  y: number
  spaceId: string
  name?: string
  displayName?: string
}

export interface WebSocketMessage {
  type:
    | "MOVE"
    | "POSITION_UPDATE"
    | "USER_JOINED"
    | "USER_LEFT"
    | "INITIAL_USERS"
    | "ERROR"
    | "INVALID_MOVE"
    | "offer"
    | "answer"
    | "candidate"
    | "call_ended"
  userId?: string
  x?: number
  y?: number
  spaceId?: string
  users?: UserPosition[]
  message?: string
  name?: string
  displayName?: string
  // WebRTC fields
  targetId?: string
  from?: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  callType?: "audio" | "video"
  fromDisplayName?: string
  reason?: string
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private spaceId: string | null = null
  private userId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false

  // Event callbacks
  private onPositionUpdate: ((users: UserPosition[]) => void) | null = null
  private onUserJoined: ((user: UserPosition) => void) | null = null
  private onUserLeft: ((userId: string) => void) | null = null
  private onConnectionChange: ((connected: boolean) => void) | null = null
  private onInitialUsers: ((users: UserPosition[]) => void) | null = null
  private onError: ((message: string) => void) | null = null

  // WebRTC callback
  public onWebRTCMessage: ((message: any) => void) | null = null

  connect(spaceId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Prevent multiple simultaneous connections
      if (this.isConnecting) {
        reject(new Error("Connection already in progress"))
        return
      }

      // If already connected to the same space, resolve immediately
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.spaceId === spaceId) {
        resolve(true)
        return
      }

      // Disconnect from previous space if connected to different space
      if (this.ws && this.spaceId !== spaceId) {
        this.disconnect()
      }

      this.isConnecting = true

      try {
        const token = tokenService.getTokenValue()
        if (!token) {
          this.isConnecting = false
          reject(new Error("No authentication token found"))
          return
        }

        this.spaceId = spaceId
        const wsUrl = `ws://localhost:8080/ws?token=${encodeURIComponent(token)}&space=${encodeURIComponent(spaceId)}`

        console.log("Connecting to WebSocket:", wsUrl)
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("WebSocket connected to space:", spaceId)
          this.reconnectAttempts = 0
          this.isConnecting = false
          this.onConnectionChange?.(true)
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error("Error parsing WebSocket message:", error)
          }
        }

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason)
          this.isConnecting = false
          this.onConnectionChange?.(false)

          // Only attempt to reconnect if it wasn't a normal closure and we're not manually disconnecting
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && this.spaceId) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error)
          this.isConnecting = false
          reject(error)
        }

        // Timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false
            reject(new Error("Connection timeout"))
          }
        }, 10000) // 10 second timeout
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.spaceId || this.isConnecting) {
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (this.spaceId && !this.isConnecting) {
        this.connect(this.spaceId).catch((error) => {
          console.error("Reconnection failed:", error)
        })
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  private handleMessage(message: WebSocketMessage) {
    console.log("Received WebSocket message:", message)

    // Handle WebRTC signaling messages (including call_ended)
    if (["offer", "answer", "candidate", "call_ended"].includes(message.type)) {
      this.onWebRTCMessage?.(message)
      return
    }

    switch (message.type) {
      case "INITIAL_USERS":
        if (message.users) {
          console.log("Received initial users:", message.users)
          this.onInitialUsers?.(message.users)
        }
        break

      case "POSITION_UPDATE":
        if (message.userId && message.x !== undefined && message.y !== undefined) {
          const user: UserPosition = {
            userId: message.userId,
            x: message.x,
            y: message.y,
            spaceId: message.spaceId || this.spaceId || "",
            name: message.displayName || message.name || `User ${message.userId.slice(0, 6)}`,
            displayName: message.displayName,
          }

          console.log("Position update for user:", user)
          this.onPositionUpdate?.([user])
        }
        break

      case "USER_JOINED":
        if (message.userId && message.x !== undefined && message.y !== undefined) {
          const user: UserPosition = {
            userId: message.userId,
            x: message.x,
            y: message.y,
            spaceId: message.spaceId || this.spaceId || "",
            name: message.displayName || message.name || `User ${message.userId.slice(0, 6)}`,
            displayName: message.displayName,
          }

          console.log("User joined:", user)
          this.onUserJoined?.(user)
        }
        break

      case "USER_LEFT":
        if (message.userId) {
          console.log("User left:", message.userId)
          this.onUserLeft?.(message.userId)
        }
        break

      case "ERROR":
        if (message.message) {
          console.error("WebSocket error:", message.message)
          this.onError?.(message.message)
        }
        break

      case "INVALID_MOVE":
        console.warn("Invalid move attempted")
        break
    }
  }

  sendMove(x: number, y: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: "MOVE",
        x,
        y,
      }
      this.ws.send(JSON.stringify(message))
      console.log("Sent move:", { x, y })
    } else {
      console.warn("WebSocket not connected, cannot send move")
    }
  }

  sendWebRTCMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      console.log("Sent WebRTC message:", message)
    } else {
      console.warn("WebSocket not connected, cannot send WebRTC message")
    }
  }

  disconnect() {
    console.log("Disconnecting WebSocket...")
    if (this.ws) {
      // Set to null first to prevent reconnection attempts
      const wsToClose = this.ws
      this.ws = null
      wsToClose.close(1000, "User disconnected")
    }
    this.spaceId = null
    this.userId = null
    this.reconnectAttempts = 0
    this.isConnecting = false
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getCurrentSpaceId(): string | null {
    return this.spaceId
  }

  // Event listeners
  onPositionUpdated(callback: (users: UserPosition[]) => void) {
    this.onPositionUpdate = callback
  }

  onUserJoinedSpace(callback: (user: UserPosition) => void) {
    this.onUserJoined = callback
  }

  onUserLeftSpace(callback: (userId: string) => void) {
    this.onUserLeft = callback
  }

  onConnectionChanged(callback: (connected: boolean) => void) {
    this.onConnectionChange = callback
  }

  onInitialUsersReceived(callback: (users: UserPosition[]) => void) {
    this.onInitialUsers = callback
  }

  onErrorReceived(callback: (message: string) => void) {
    this.onError = callback
  }
}

// Export a singleton instance
export const websocketService = new WebSocketService()
