"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface CallModalProps {
  isOpen: boolean
  callType: "audio" | "video"
  isIncoming: boolean
  remoteUserName: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  isMuted: boolean
  isVideoOff: boolean
}

const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  callType,
  isIncoming,
  remoteUserName,
  localStream,
  remoteStream,
  connectionState,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[CallModal] Setting local stream to video element")
      localVideoRef.current.srcObject = localStream

      // Ensure video plays
      localVideoRef.current.play().catch((error) => {
        console.error("[CallModal] Failed to play local video:", error)
      })
    }
  }, [localStream])

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("[CallModal] Setting remote stream to video element")
      remoteVideoRef.current.srcObject = remoteStream

      // Ensure video plays
      remoteVideoRef.current.play().catch((error) => {
        console.error("[CallModal] Failed to play remote video:", error)
      })
    }
  }, [remoteStream])

  // Debug logging
  useEffect(() => {
    console.log("[CallModal] Props updated:", {
      isOpen,
      callType,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      connectionState,
      localStreamTracks: localStream?.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled })),
      remoteStreamTracks: remoteStream?.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled })),
    })
  }, [isOpen, callType, localStream, remoteStream, connectionState])

  if (!isOpen) return null

  const getConnectionStatusColor = () => {
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
        return "Initializing..."
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70] p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{remoteUserName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">{remoteUserName}</h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                  <span className="text-gray-400 text-sm">{getConnectionStatusText()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">{callType === "video" ? "Video Call" : "Audio Call"}</span>
              {isIncoming && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Incoming</span>}
            </div>
          </div>
        </div>

        {/* Video Content */}
        <div className="flex-1 relative bg-gray-900 h-[calc(100%-140px)]">
          {callType === "video" ? (
            <>
              {/* Remote Video (Main) */}
              <div className="w-full h-full relative">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef as React.RefObject<HTMLVideoElement>}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => console.log("[CallModal] Remote video metadata loaded")}
                    onPlay={() => console.log("[CallModal] Remote video started playing")}
                    onError={(e) => console.error("[CallModal] Remote video error:", e)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-3xl">{remoteUserName.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="text-white text-lg">{remoteUserName}</p>
                      <p className="text-gray-400 text-sm">
                        {connectionState === "connecting" ? "Connecting..." : "No video"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                {localStream && !isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => console.log("[CallModal] Local video metadata loaded")}
                    onPlay={() => console.log("[CallModal] Local video started playing")}
                    onError={(e) => console.error("[CallModal] Local video error:", e)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-bold text-lg">You</span>
                      </div>
                      <p className="text-gray-400 text-xs">Camera Off</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio Call Interface */
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white font-bold text-4xl">{remoteUserName.charAt(0).toUpperCase()}</span>
                </div>
                <h3 className="text-white text-2xl font-semibold mb-2">{remoteUserName}</h3>
                <p className="text-gray-400 text-lg mb-4">Audio Call</p>
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}></div>
                  <span className="text-gray-400">{getConnectionStatusText()}</span>
                </div>
              </div>

              {/* Hidden audio element for remote stream in audio calls */}
              {remoteStream && (
                <audio
                  ref={remoteVideoRef as React.RefObject<HTMLAudioElement>}
                  autoPlay
                  playsInline
                  onLoadedMetadata={() => console.log("[CallModal] Remote audio metadata loaded")}
                  onPlay={() => console.log("[CallModal] Remote audio started playing")}
                  onError={(e) => console.error("[CallModal] Remote audio error:", e)}
                />
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-center space-x-6">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Video Toggle Button (only for video calls) */}
            {callType === "video" && (
              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isVideoOff ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-all duration-200"
              title="End call"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  )
}

export default CallModal
