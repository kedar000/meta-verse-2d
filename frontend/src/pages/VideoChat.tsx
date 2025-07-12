"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { webrtcService, type IncomingCall } from "../services/webrtc/webrtcService"
import { websocketService } from "../services/websocket/websocketService"
import CallNotificationModal from "../components/CallNotificationModal"
import { userService } from "../services/api/userService"
// import type { HTMLVideoElement } from "react"

const VideoChat = () => {
  const navigate = useNavigate()

  // User ID input states
  const [myUserId, setMyUserId] = useState("")
  const [friendUserId, setFriendUserId] = useState("")
  const [myUserName, setMyUserName] = useState("")
  const [friendUserName, setFriendUserName] = useState("")
  const [isSettingUp, setIsSettingUp] = useState(true)
  const [isValidatingUsers, setIsValidatingUsers] = useState(false)

  // Connection states
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Call states
  const [callType, setCallType] = useState<"audio" | "video">("video")
  const [isCallActive, setIsCallActive] = useState(false)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")
  const [isCallMuted, setIsCallMuted] = useState(false)
  const [isCallVideoOff, setIsCallVideoOff] = useState(false)

  // Stream states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  // Validate user IDs and get user names
  const validateAndSetupUsers = async () => {
    if (!myUserId.trim() || !friendUserId.trim()) {
      alert("Please enter both user IDs")
      return
    }

    if (myUserId === friendUserId) {
      alert("User IDs cannot be the same")
      return
    }

    setIsValidatingUsers(true)
    setConnectionError(null)

    try {
      // Fetch user profiles to validate and get names
      const [myProfile, friendProfile] = await Promise.all([
        userService.getUserById(myUserId.trim()),
        userService.getUserById(friendUserId.trim()),
      ])

      setMyUserName(myProfile.user.displayName || myProfile.user.email || `User ${myUserId.slice(0, 8)}`)
      setFriendUserName(
        friendProfile.user.displayName || friendProfile.user.email || `User ${friendUserId.slice(0, 8)}`,
      )

      // Initialize WebSocket connection
      await initializeWebSocket()

      setIsSettingUp(false)
    } catch (error: any) {
      console.error("[VideoChat] Failed to validate users:", error)
      if (error.response?.status === 404) {
        setConnectionError("One or both user IDs not found. Please check the user IDs.")
      } else {
        setConnectionError("Failed to validate users. Please try again.")
      }
    } finally {
      setIsValidatingUsers(false)
    }
  }

  // Initialize WebSocket connection for signaling
  const initializeWebSocket = async () => {
    try {
      // Connect to a video chat space for signaling
      await websocketService.connect("video-chat-space")
      setIsWebSocketConnected(true)
      console.log("[VideoChat] WebSocket connected for signaling")
    } catch (error) {
      console.error("[VideoChat] Failed to connect WebSocket:", error)
      throw new Error("Failed to connect to signaling server")
    }
  }

  // Set up WebRTC event listeners
  useEffect(() => {
    if (!isSettingUp) {
      console.log("[VideoChat] Setting up WebRTC event listeners")

      // Handle incoming calls
      webrtcService.onIncomingCallReceived((call) => {
        console.log("[VideoChat] Incoming call received:", call)
        setIncomingCall(call)
      })

      webrtcService.onCallWasAccepted(() => {
        console.log("[VideoChat] Call was accepted")
        setIsCallActive(true)
        setIncomingCall(null)
      })

      webrtcService.onCallWasRejected(() => {
        console.log("[VideoChat] Call was rejected")
        setIncomingCall(null)
        setIsCallActive(false)
      })

      webrtcService.onCallWasEnded(() => {
        console.log("[VideoChat] Call ended")
        setIncomingCall(null)
        setIsCallActive(false)
        setIsCallMuted(false)
        setIsCallVideoOff(false)
        setLocalStream(null)
        setRemoteStream(null)
      })

      webrtcService.onConnectionStateChanged((state) => {
        console.log("[VideoChat] Connection state changed:", state)
        setConnectionState(state)
      })

      webrtcService.onLocalStreamReceived((stream) => {
        console.log("[VideoChat] Local stream received")
        setLocalStream(stream)
      })

      webrtcService.onRemoteStreamReceived((stream) => {
        console.log("[VideoChat] Remote stream received")
        setRemoteStream(stream)
      })
    }

    return () => {
      if (!isSettingUp) {
        console.log("[VideoChat] Cleaning up WebRTC event listeners")
      }
    }
  }, [isSettingUp])

  // Set up video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[VideoChat] Setting local stream to video element")
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(console.error)
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("[VideoChat] Setting remote stream to video element")
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(console.error)
    }
  }, [remoteStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      websocketService.disconnect()
      if (webrtcService.isInCall()) {
        webrtcService.endCall()
      }
    }
  }, [])

  // Call functions
  const initiateCall = async (type: "audio" | "video") => {
    try {
      console.log(`[VideoChat] Initiating ${type} call to:`, friendUserName)

      if (!isWebSocketConnected) {
        alert("Not connected to signaling server")
        return
      }

      if (webrtcService.isInCall()) {
        alert("Already in a call")
        return
      }

      setCallType(type)
      await webrtcService.initiateCall(friendUserId, type, friendUserName)
    } catch (error) {
      console.error("[VideoChat] Failed to initiate call:", error)
      alert("Failed to start call. Please try again.")
    }
  }

  const acceptCall = async () => {
    if (!incomingCall) return

    try {
      console.log("[VideoChat] Accepting call")
      setCallType(incomingCall.callType)
      await webrtcService.acceptCall(incomingCall.offer, incomingCall.callType)
    } catch (error) {
      console.error("[VideoChat] Failed to accept call:", error)
      alert("Failed to accept call. Please try again.")
      setIncomingCall(null)
    }
  }

  const rejectCall = () => {
    console.log("[VideoChat] Rejecting call")
    webrtcService.rejectCall()
  }

  const endCall = () => {
    console.log("[VideoChat] Ending call")
    webrtcService.endCall()
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsCallMuted(!audioTrack.enabled)
        console.log("[VideoChat] Toggled mute:", !audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCallVideoOff(!videoTrack.enabled)
        console.log("[VideoChat] Toggled video:", !videoTrack.enabled)
      }
    }
  }

  const dismissCall = () => {
    setIncomingCall(null)
  }

  const resetSetup = () => {
    setIsSettingUp(true)
    setMyUserId("")
    setFriendUserId("")
    setMyUserName("")
    setFriendUserName("")
    setConnectionError(null)
    websocketService.disconnect()
    setIsWebSocketConnected(false)
    if (webrtcService.isInCall()) {
      webrtcService.endCall()
    }
  }

  const getConnectionStatusColor = () => {
    if (!isWebSocketConnected) return "bg-red-500"

    switch (connectionState) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "disconnected":
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getConnectionStatusText = () => {
    if (!isWebSocketConnected) return "Signaling Disconnected"

    switch (connectionState) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "disconnected":
        return "Disconnected"
      case "failed":
        return "Connection Failed"
      default:
        return "Ready"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      {/* Header */}
      <div className="bg-black bg-opacity-30 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/")}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </button>

            <div>
              <h1 className="text-2xl font-bold">🎥 Video Chat</h1>
              <p className="text-blue-200 text-sm">Connect with friends using User IDs</p>
            </div>
          </div>

          {!isSettingUp && (
            <div className="flex items-center space-x-4">
              <button
                onClick={resetSetup}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
              >
                Change Users
              </button>

              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-sm">{getConnectionStatusText()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-600/90 backdrop-blur-sm text-white p-4 text-center border-b border-red-500/30">
          <p>⚠️ {connectionError}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {isSettingUp ? (
          /* User ID Setup Interface */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-center mb-8">🚀 Setup Video Chat</h2>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 rounded-xl p-6 border border-blue-400/30">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <h3 className="text-xl font-semibold text-blue-200">Enter Your User ID</h3>
                  </div>

                  <input
                    type="text"
                    value={myUserId}
                    onChange={(e) => setMyUserId(e.target.value)}
                    placeholder="Enter your User ID (e.g., 93e3cf0e-c15c-48c8-9702-594d0cedbbc9)"
                    className="w-full px-4 py-3 bg-black/30 border border-blue-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isValidatingUsers}
                  />
                  <p className="text-blue-300 text-sm mt-2">This is your unique user identifier</p>
                </div>

                {/* Step 2 */}
                <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 rounded-xl p-6 border border-purple-400/30">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <h3 className="text-xl font-semibold text-purple-200">Enter Friend's User ID</h3>
                  </div>

                  <input
                    type="text"
                    value={friendUserId}
                    onChange={(e) => setFriendUserId(e.target.value)}
                    placeholder="Enter your friend's User ID (e.g., 65319269-e3ca-42cd-99a5-fb437d87f419)"
                    className="w-full px-4 py-3 bg-black/30 border border-purple-400/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={isValidatingUsers}
                  />
                  <p className="text-purple-300 text-sm mt-2">The person you want to call</p>
                </div>

                {/* Connect Button */}
                <div className="pt-4">
                  <button
                    onClick={validateAndSetupUsers}
                    disabled={isValidatingUsers || !myUserId.trim() || !friendUserId.trim()}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {isValidatingUsers ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Validating Users...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>Connect & Start Chat</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-6 border border-yellow-400/30 mt-6">
                  <h4 className="font-semibold text-yellow-200 mb-3">📋 How it works:</h4>
                  <ul className="text-yellow-100 text-sm space-y-2">
                    <li>• Enter both user IDs and click "Connect & Start Chat"</li>
                    <li>• Both users will be connected to the same chat room</li>
                    <li>• Either person can initiate audio or video calls</li>
                    <li>• The other person will receive a call notification</li>
                    <li>• Accept the call to start your video/audio chat!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : !isCallActive ? (
          /* Call Initiation Interface */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Call Controls */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 text-center">🚀 Ready to Call</h2>

              <div className="space-y-6">
                {/* My Info Card */}
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-400/30">
                  <h3 className="font-semibold mb-2 text-blue-200">You:</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl">
                      👤
                    </div>
                    <div>
                      <p className="font-bold text-lg">{myUserName}</p>
                      <p className="text-sm text-gray-300 font-mono">{myUserId.slice(0, 8)}...</p>
                    </div>
                  </div>
                </div>

                {/* Friend Info Card */}
                <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-400/30">
                  <h3 className="font-semibold mb-2 text-purple-200">Calling:</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-2xl">
                      👥
                    </div>
                    <div>
                      <p className="font-bold text-lg">{friendUserName}</p>
                      <p className="text-sm text-gray-300 font-mono">{friendUserId.slice(0, 8)}...</p>
                    </div>
                  </div>
                </div>

                {/* Call Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => initiateCall("audio")}
                    disabled={!isWebSocketConnected || webrtcService.isInCall()}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-6 rounded-xl transition-all duration-200 flex flex-col items-center space-y-3 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="font-bold text-lg">🎵 Audio Call</span>
                  </button>

                  <button
                    onClick={() => initiateCall("video")}
                    disabled={!isWebSocketConnected || webrtcService.isInCall()}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-6 rounded-xl transition-all duration-200 flex flex-col items-center space-y-3 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-bold text-lg">📹 Video Call</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Status & Instructions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 text-center">📊 Status & Tips</h2>

              <div className="space-y-6">
                {/* Connection Status */}
                <div className="bg-black/20 rounded-xl p-4 border border-gray-600/30">
                  <h3 className="font-semibold mb-3 text-gray-200">Connection Status:</h3>
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getConnectionStatusColor()}`}></div>
                    <span className="text-lg">{getConnectionStatusText()}</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-4 text-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                      💡
                    </div>
                    <div>
                      <p className="font-medium text-white">Ready to Call</p>
                      <p className="text-sm text-gray-300">Click Audio or Video Call to start</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                      🔔
                    </div>
                    <div>
                      <p className="font-medium text-white">Call Notifications</p>
                      <p className="text-sm text-gray-300">Your friend will receive a call notification</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                      🎮
                    </div>
                    <div>
                      <p className="font-medium text-white">Call Controls</p>
                      <p className="text-sm text-gray-300">Mute, video toggle, and end call options available</p>
                    </div>
                  </div>
                </div>

                {/* Waiting Status */}
                <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-400/30">
                  <p className="text-green-200 text-center">
                    ✅ <strong>Ready!</strong> You can now make calls to {friendUserName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Call Interface */
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20">
            {/* Call Header */}
            <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-3xl">
                    👥
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{friendUserName}</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                      <span className="text-sm text-gray-300">{getConnectionStatusText()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{callType === "video" ? "📹" : "🎵"}</span>
                    <span className="text-lg font-semibold">{callType === "video" ? "Video Call" : "Audio Call"}</span>
                  </div>
                  <p className="text-sm text-gray-300">with {myUserName}</p>
                </div>
              </div>
            </div>

            {/* Video Area */}
            <div className="relative bg-black" style={{ height: "60vh" }}>
              {callType === "video" ? (
                <>
                  {/* Remote Video (Main) */}
                  <div className="w-full h-full">
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => console.log("[VideoChat] Remote video loaded")}
                        onPlay={() => console.log("[VideoChat] Remote video playing")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <div className="text-center">
                          <div className="w-32 h-32 bg-purple-600 rounded-full flex items-center justify-center text-6xl mx-auto mb-6">
                            👥
                          </div>
                          <p className="text-white text-2xl font-bold">{friendUserName}</p>
                          <p className="text-gray-400 text-lg">Waiting for video...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Local Video (PiP) */}
                  <div className="absolute top-6 right-6 w-64 h-48 bg-gray-800 rounded-xl overflow-hidden border-4 border-white/20 shadow-2xl">
                    {localStream && !isCallVideoOff ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => console.log("[VideoChat] Local video loaded")}
                        onPlay={() => console.log("[VideoChat] Local video playing")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                            👤
                          </div>
                          <p className="text-white text-sm font-semibold">{myUserName}</p>
                          <p className="text-gray-400 text-xs">Camera Off</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Audio Call Interface */
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50">
                  <div className="text-center">
                    <div className="w-40 h-40 bg-purple-600 rounded-full flex items-center justify-center text-8xl mx-auto mb-8">
                      👥
                    </div>
                    <h3 className="text-white text-4xl font-bold mb-4">{friendUserName}</h3>
                    <p className="text-gray-300 text-xl">🎵 Audio Call</p>
                    <p className="text-gray-400 text-lg mt-2">with {myUserName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-8 border-t border-white/10">
              <div className="flex items-center justify-center space-x-8">
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`p-6 rounded-full transition-all duration-200 transform hover:scale-110 ${
                    isCallMuted
                      ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30"
                      : "bg-gray-600 hover:bg-gray-500 shadow-lg shadow-gray-500/30"
                  }`}
                  title={isCallMuted ? "Unmute" : "Mute"}
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    {isCallMuted ? (
                      <path
                        fillRule="evenodd"
                        d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.894z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                </button>

                {/* Video Toggle (only for video calls) */}
                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`p-6 rounded-full transition-all duration-200 transform hover:scale-110 ${
                      isCallVideoOff
                        ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30"
                        : "bg-gray-600 hover:bg-gray-500 shadow-lg shadow-gray-500/30"
                    }`}
                    title={isCallVideoOff ? "Turn on camera" : "Turn off camera"}
                  >
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </button>
                )}

                {/* End Call Button */}
                <button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-full transition-all duration-200 transform hover:scale-110 shadow-lg shadow-red-500/30"
                  title="End call"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L17 17l-4-4m-6 6l-1.5-1.5M3.5 3.5l1.664 1.664"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Notification Modal */}
      <CallNotificationModal
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
        onDismiss={dismissCall}
      />
    </div>
  )
}

export default VideoChat
