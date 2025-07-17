"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { webrtcService, type IncomingCall } from "../services/webrtc/webrtcService"
import { websocketService } from "../services/websocket/websocketService"
import CallNotificationModal from "../components/CallNotificationModal"
import { userService } from "../services/api/userService"

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

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px", borderBottom: "1px solid #ccc", paddingBottom: "10px" }}>
        <button onClick={() => navigate("/")} style={{ marginRight: "10px" }}>
          Back to Home
        </button>
        <h1>Video Chat - Simple Test</h1>
        {!isSettingUp && (
          <div style={{ marginTop: "10px" }}>
            <button onClick={resetSetup} style={{ marginRight: "10px" }}>
              Change Users
            </button>
            <span>
              Connection: {isWebSocketConnected ? "Connected" : "Disconnected"} | WebRTC: {connectionState}
            </span>
          </div>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div
          style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "10px",
            marginBottom: "20px",
            border: "1px solid #ef5350",
          }}
        >
          Error: {connectionError}
        </div>
      )}

      {/* Debug Info */}
      <div style={{ backgroundColor: "#f5f5f5", padding: "10px", marginBottom: "20px", fontSize: "12px" }}>
        <strong>Debug Info:</strong>
        <br />
        WebSocket Connected: {isWebSocketConnected ? "Yes" : "No"}
        <br />
        WebRTC State: {connectionState}
        <br />
        Call Active: {isCallActive ? "Yes" : "No"}
        <br />
        Call Type: {callType}
        <br />
        Local Stream: {localStream ? "Available" : "None"}
        <br />
        Remote Stream: {remoteStream ? "Available" : "None"}
        <br />
        Muted: {isCallMuted ? "Yes" : "No"}
        <br />
        Video Off: {isCallVideoOff ? "Yes" : "No"}
      </div>

      {isSettingUp ? (
        /* User ID Setup */
        <div>
          <h2>Setup Users</h2>
          <div style={{ marginBottom: "10px" }}>
            <label>Your User ID:</label>
            <br />
            <input
              type="text"
              value={myUserId}
              onChange={(e) => setMyUserId(e.target.value)}
              placeholder="Enter your User ID"
              style={{ width: "400px", padding: "5px", marginTop: "5px" }}
              disabled={isValidatingUsers}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label>Friend's User ID:</label>
            <br />
            <input
              type="text"
              value={friendUserId}
              onChange={(e) => setFriendUserId(e.target.value)}
              placeholder="Enter friend's User ID"
              style={{ width: "400px", padding: "5px", marginTop: "5px" }}
              disabled={isValidatingUsers}
            />
          </div>
          <button
            onClick={validateAndSetupUsers}
            disabled={isValidatingUsers || !myUserId.trim() || !friendUserId.trim()}
            style={{ padding: "10px 20px", fontSize: "16px" }}
          >
            {isValidatingUsers ? "Validating..." : "Connect"}
          </button>
        </div>
      ) : !isCallActive ? (
        /* Call Controls */
        <div>
          <h2>Ready to Call</h2>
          <div style={{ marginBottom: "20px" }}>
            <p>
              <strong>You:</strong> {myUserName} ({myUserId.slice(0, 8)}...)
            </p>
            <p>
              <strong>Friend:</strong> {friendUserName} ({friendUserId.slice(0, 8)}...)
            </p>
          </div>
          <div>
            <button
              onClick={() => initiateCall("audio")}
              disabled={!isWebSocketConnected || webrtcService.isInCall()}
              style={{ padding: "10px 20px", marginRight: "10px", fontSize: "16px" }}
            >
              Audio Call
            </button>
            <button
              onClick={() => initiateCall("video")}
              disabled={!isWebSocketConnected || webrtcService.isInCall()}
              style={{ padding: "10px 20px", fontSize: "16px" }}
            >
              Video Call
            </button>
          </div>
        </div>
      ) : (
        /* Active Call */
        <div>
          <h2>
            Active {callType} Call with {friendUserName}
          </h2>

          {/* Video Area */}
          <div style={{ marginBottom: "20px" }}>
            {callType === "video" ? (
              <div>
                <div style={{ marginBottom: "10px" }}>
                  <h3>Remote Video:</h3>
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: "640px", height: "480px", backgroundColor: "#000", border: "1px solid #ccc" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "640px",
                        height: "480px",
                        backgroundColor: "#333",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                      }}
                    >
                      Waiting for remote video...
                    </div>
                  )}
                </div>

                <div>
                  <h3>Local Video (You):</h3>
                  {localStream && !isCallVideoOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "320px", height: "240px", backgroundColor: "#000", border: "1px solid #ccc" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "320px",
                        height: "240px",
                        backgroundColor: "#666",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                      }}
                    >
                      {isCallVideoOff ? "Camera Off" : "No local video"}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{ padding: "40px", textAlign: "center", backgroundColor: "#f0f0f0", border: "1px solid #ccc" }}
              >
                <h3>Audio Call Active</h3>
                <p>Talking with {friendUserName}</p>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div>
            <button
              onClick={toggleMute}
              style={{
                padding: "10px 20px",
                marginRight: "10px",
                backgroundColor: isCallMuted ? "#f44336" : "#4CAF50",
                color: "white",
                border: "none",
              }}
            >
              {isCallMuted ? "Unmute" : "Mute"}
            </button>

            {callType === "video" && (
              <button
                onClick={toggleVideo}
                style={{
                  padding: "10px 20px",
                  marginRight: "10px",
                  backgroundColor: isCallVideoOff ? "#f44336" : "#4CAF50",
                  color: "white",
                  border: "none",
                }}
              >
                {isCallVideoOff ? "Turn On Video" : "Turn Off Video"}
              </button>
            )}

            <button
              onClick={endCall}
              style={{
                padding: "10px 20px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
              }}
            >
              End Call
            </button>
          </div>
        </div>
      )}

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
