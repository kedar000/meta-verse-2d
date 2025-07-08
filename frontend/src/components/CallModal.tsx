"use client"

import type React from "react"
import type { RefObject } from "react"

interface CallModalProps {
  callType: "audio" | "video"
  remoteUser: string
  isIncoming: boolean
  isMuted: boolean
  isVideoOff: boolean
  connectionState: RTCPeerConnectionState
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  localVideoRef: RefObject<HTMLVideoElement>
  remoteVideoRef: RefObject<HTMLVideoElement>
}

const CallModal: React.FC<CallModalProps> = ({
  callType,
  remoteUser,
  isIncoming,
  isMuted,
  isVideoOff,
  connectionState,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  localVideoRef,
  remoteVideoRef,
}) => {
  const getConnectionStatusText = () => {
    switch (connectionState) {
      case "connecting":
        return "Connecting..."
      case "connected":
        return "Connected"
      case "disconnected":
        return "Disconnected"
      case "failed":
        return "Connection Failed"
      case "closed":
        return "Call Ended"
      default:
        return "Connecting..."
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "text-green-400"
      case "connecting":
        return "text-yellow-400"
      case "disconnected":
      case "failed":
      case "closed":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">{remoteUser.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{remoteUser}</h2>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${getConnectionStatusColor()}`}>{getConnectionStatusText()}</span>
                <span className="text-gray-400 text-sm">•</span>
                <span className="text-gray-400 text-sm capitalize">{callType} Call</span>
                {isIncoming && <span className="text-blue-400 text-sm">• Incoming</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onEndCall}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors"
            title="End Call"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18"
              />
            </svg>
          </button>
        </div>

        {/* Video Content */}
        <div className="p-6">
          {callType === "video" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Remote Video */}
              <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-blue-500 relative">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  {remoteUser}
                </div>
                {connectionState !== "connected" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-2xl">{remoteUser.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="text-white text-sm">{getConnectionStatusText()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Video */}
              <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-green-500 relative">
                {!isVideoOff ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-2xl">Y</span>
                      </div>
                      <p className="text-white text-sm">Camera Off</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                  You {isVideoOff && "(Camera Off)"}
                </div>
              </div>
            </div>
          ) : (
            /* Audio Call UI */
            <div className="text-center py-12">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-4xl">{remoteUser.charAt(0).toUpperCase()}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{remoteUser}</h3>
              <p className={`text-lg ${getConnectionStatusColor()}`}>{getConnectionStatusText()}</p>
              <p className="text-gray-400 mt-2">Audio Call {isIncoming && "• Incoming"}</p>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`p-4 rounded-full transition-all duration-200 ${
                isMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                )}
              </svg>
            </button>

            {/* Video Button (only for video calls) */}
            {callType === "video" && (
              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isVideoOff ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                }`}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isVideoOff ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-4.5-4.5m0 0L8 12l4.5 4.5zm0 0L16.5 21M3 3l3.5 3.5M21 21l-3.5-3.5"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  )}
                </svg>
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
              title="End Call"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
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
