"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { webrtcService, type IncomingCall } from "../services/webrtc/webrtcService"
import { websocketService } from "../services/websocket/websocketService"
import CallNotificationModal from "../components/CallNotificationModal"

const KedarTarunVideoChat = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Predefined user IDs
  const KEDAR_ID = "93e3cf0e-c15c-48c8-9702-594d0cedbbc9"
  const TARUN_ID = "65319269-e3ca-42cd-99a5-fb437d87f419"

  // Get current user from URL or default to Kedar
  const currentUser = searchParams.get("user") || "kedar"
  const currentUserId = currentUser === "kedar" ? KEDAR_ID : TARUN_ID
  const targetUserId = currentUser === "kedar" ? TARUN_ID : KEDAR_ID
  const currentUserName = currentUser === "kedar" ? "Kedar" : "Tarun"
  const targetUserName = currentUser === "kedar" ? "Tarun" : "Kedar"

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

  // Initialize WebSocket connection for signaling
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        setConnectionError(null)

        // Connect to a dedicated space for Kedar-Tarun video chat
        await websocketService.connect("kedar-tarun-video-chat")
        setIsWebSocketConnected(true)

        console.log(`[KedarTarunVideoChat] WebSocket connected for ${currentUserName}`)
      } catch (error) {
        console.error("[KedarTarunVideoChat] Failed to connect WebSocket:", error)
        setConnectionError("Failed to connect to signaling server")
      }
    }

    initializeWebSocket()

    return () => {
      websocketService.disconnect()
    }
  }, [currentUserName])

  // Set up WebRTC event listeners
  useEffect(() => {
    console.log(`[KedarTarunVideoChat] Setting up WebRTC event listeners for ${currentUserName}`)

    // Handle incoming calls
    webrtcService.onIncomingCallReceived((call) => {
      console.log(`[KedarTarunVideoChat] ${currentUserName} received incoming call:`, call)
      setIncomingCall(call)
    })

    webrtcService.onCallWasAccepted(() => {
      console.log(`[KedarTarunVideoChat] ${currentUserName}'s call was accepted`)
      setIsCallActive(true)
      setIncomingCall(null)
    })

    webrtcService.onCallWasRejected(() => {
      console.log(`[KedarTarunVideoChat] ${currentUserName}'s call was rejected`)
      setIncomingCall(null)
      setIsCallActive(false)
    })

    webrtcService.onCallWasEnded(() => {
      console.log(`[KedarTarunVideoChat] ${currentUserName}'s call ended`)
      setIncomingCall(null)
      setIsCallActive(false)
      setIsCallMuted(false)
      setIsCallVideoOff(false)
      setLocalStream(null)
      setRemoteStream(null)
    })

    webrtcService.onConnectionStateChanged((state) => {
      console.log(`[KedarTarunVideoChat] ${currentUserName}'s connection state:`, state)
      setConnectionState(state)
    })

    webrtcService.onLocalStreamReceived((stream) => {
      console.log(`[KedarTarunVideoChat] ${currentUserName} received local stream`)
      setLocalStream(stream)
    })

    webrtcService.onRemoteStreamReceived((stream) => {
      console.log(`[KedarTarunVideoChat] ${currentUserName} received remote stream`)
      setRemoteStream(stream)
    })

    return () => {
      console.log(`[KedarTarunVideoChat] Cleaning up WebRTC event listeners for ${currentUserName}`)
    }
  }, [currentUserName])

  // Set up video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log(`[KedarTarunVideoChat] Setting ${currentUserName}'s local stream to video element`)
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(console.error)
    }
  }, [localStream, currentUserName])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log(`[KedarTarunVideoChat] Setting ${currentUserName}'s remote stream to video element`)
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(console.error)
    }
  }, [remoteStream, currentUserName])

  // Call functions
  const initiateCall = async (type: "audio" | "video") => {
    try {
      console.log(`[KedarTarunVideoChat] ${currentUserName} initiating ${type} call to ${targetUserName}`)

      if (!isWebSocketConnected) {
        alert("Not connected to signaling server")
        return
      }

      if (webrtcService.isInCall()) {
        alert("Already in a call")
        return
      }

      setCallType(type)
      await webrtcService.initiateCall(targetUserId, type, targetUserName)
    } catch (error) {
      console.error(`[KedarTarunVideoChat] ${currentUserName} failed to initiate call:`, error)
      alert("Failed to start call. Please try again.")
    }
  }

  const acceptCall = async () => {
    if (!incomingCall) return

    try {
      console.log(`[KedarTarunVideoChat] ${currentUserName} accepting call`)
      setCallType(incomingCall.callType)
      await webrtcService.acceptCall(incomingCall.offer, incomingCall.callType)
    } catch (error) {
      console.error(`[KedarTarunVideoChat] ${currentUserName} failed to accept call:`, error)
      alert("Failed to accept call. Please try again.")
      setIncomingCall(null)
    }
  }

  const rejectCall = () => {
    console.log(`[KedarTarunVideoChat] ${currentUserName} rejecting call`)
    webrtcService.rejectCall()
  }

  const endCall = () => {
    console.log(`[KedarTarunVideoChat] ${currentUserName} ending call`)
    webrtcService.endCall()
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsCallMuted(!audioTrack.enabled)
        console.log(`[KedarTarunVideoChat] ${currentUserName} toggled mute:`, !audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCallVideoOff(!videoTrack.enabled)
        console.log(`[KedarTarunVideoChat] ${currentUserName} toggled video:`, !videoTrack.enabled)
      }
    }
  }

  const dismissCall = () => {
    setIncomingCall(null)
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

  const switchUser = (user: "kedar" | "tarun") => {
    navigate(`/kedar-tarun-video?user=${user}`)
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
              <h1 className="text-2xl font-bold">🎥 Kedar ↔ Tarun Video Chat</h1>
              <p className="text-blue-200 text-sm">
                Current User: <span className="font-semibold">{currentUserName}</span> → Calling:{" "}
                <span className="font-semibold">{targetUserName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Switcher */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => switchUser("kedar")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentUser === "kedar"
                    ? "bg-blue-600 text-white"
                    : "text-blue-200 hover:text-white hover:bg-white/10"
                }`}
              >
                👨‍💻 Kedar
              </button>
              <button
                onClick={() => switchUser("tarun")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentUser === "tarun"
                    ? "bg-purple-600 text-white"
                    : "text-purple-200 hover:text-white hover:bg-white/10"
                }`}
              >
                👨‍💼 Tarun
              </button>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
              <span className="text-sm">{getConnectionStatusText()}</span>
            </div>
          </div>
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
        {!isCallActive ? (
          /* Call Initiation Interface */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Call Controls */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 text-center">🚀 Start a Call</h2>

              <div className="space-y-6">
                {/* Current User Card */}
                <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 rounded-xl p-4 border border-blue-400/30">
                  <h3 className="font-semibold mb-2 text-blue-200">You are:</h3>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        currentUser === "kedar" ? "bg-blue-600" : "bg-purple-600"
                      }`}
                    >
                      {currentUser === "kedar" ? "👨‍💻" : "👨‍💼"}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{currentUserName}</p>
                      <p className="text-sm text-gray-300 font-mono">{currentUserId.slice(0, 8)}...</p>
                    </div>
                  </div>
                </div>

                {/* Target User Card */}
                <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-400/30">
                  <h3 className="font-semibold mb-2 text-purple-200">Calling:</h3>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        targetUserName === "Kedar" ? "bg-blue-600" : "bg-purple-600"
                      }`}
                    >
                      {targetUserName === "Kedar" ? "👨‍💻" : "👨‍💼"}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{targetUserName}</p>
                      <p className="text-sm text-gray-300 font-mono">{targetUserId.slice(0, 8)}...</p>
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

            {/* Instructions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold mb-6 text-center">📋 How to Test</h2>

              <div className="space-y-6 text-gray-200">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Open two browser windows</p>
                    <p className="text-sm text-gray-300">One for Kedar, one for Tarun</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Kedar's Window:</p>
                    <code className="text-xs bg-black/30 px-3 py-2 rounded-lg block mt-2 font-mono">
                      /kedar-tarun-video?user=kedar
                    </code>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Tarun's Window:</p>
                    <code className="text-xs bg-black/30 px-3 py-2 rounded-lg block mt-2 font-mono">
                      /kedar-tarun-video?user=tarun
                    </code>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold mt-1">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-white">Start calling!</p>
                    <p className="text-sm text-gray-300">Either person can initiate audio or video calls</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-lg p-4 border border-yellow-400/30 mt-6">
                  <p className="text-yellow-200 text-sm">
                    💡 <strong>Tip:</strong> Use the user switcher buttons above to quickly switch between Kedar and
                    Tarun views in the same window!
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
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                      targetUserName === "Kedar" ? "bg-blue-600" : "bg-purple-600"
                    }`}
                  >
                    {targetUserName === "Kedar" ? "👨‍💻" : "👨‍💼"}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{targetUserName}</h3>
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
                  <p className="text-sm text-gray-300">with {currentUserName}</p>
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
                        onLoadedMetadata={() =>
                          console.log(`[KedarTarunVideoChat] ${currentUserName} remote video loaded`)
                        }
                        onPlay={() => console.log(`[KedarTarunVideoChat] ${currentUserName} remote video playing`)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <div className="text-center">
                          <div
                            className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mx-auto mb-6 ${
                              targetUserName === "Kedar" ? "bg-blue-600" : "bg-purple-600"
                            }`}
                          >
                            {targetUserName === "Kedar" ? "👨‍💻" : "👨‍💼"}
                          </div>
                          <p className="text-white text-2xl font-bold">{targetUserName}</p>
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
                        onLoadedMetadata={() =>
                          console.log(`[KedarTarunVideoChat] ${currentUserName} local video loaded`)
                        }
                        onPlay={() => console.log(`[KedarTarunVideoChat] ${currentUserName} local video playing`)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <div className="text-center">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 ${
                              currentUser === "kedar" ? "bg-blue-600" : "bg-purple-600"
                            }`}
                          >
                            {currentUser === "kedar" ? "👨‍💻" : "👨‍💼"}
                          </div>
                          <p className="text-white text-sm font-semibold">{currentUserName}</p>
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
                    <div
                      className={`w-40 h-40 rounded-full flex items-center justify-center text-8xl mx-auto mb-8 ${
                        targetUserName === "Kedar" ? "bg-blue-600" : "bg-purple-600"
                      }`}
                    >
                      {targetUserName === "Kedar" ? "👨‍💻" : "👨‍💼"}
                    </div>
                    <h3 className="text-white text-4xl font-bold mb-4">{targetUserName}</h3>
                    <p className="text-gray-300 text-xl">🎵 Audio Call</p>
                    <p className="text-gray-400 text-lg mt-2">with {currentUserName}</p>
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
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.617l3.766-2.793a1 1 0 011.617.793z"
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

export default KedarTarunVideoChat
