"use client"

import type React from "react"
import type { IncomingCall } from "../services/webrtc/webrtcService"

interface CallNotificationModalProps {
  incomingCall: IncomingCall | null
  onAccept: () => void
  onReject: () => void
  onDismiss: () => void
}

const CallNotificationModal: React.FC<CallNotificationModalProps> = ({
  incomingCall,
  onAccept,
  onReject,
  onDismiss,
}) => {
  if (!incomingCall) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 animate-pulse-slow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {incomingCall.fromDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Incoming Call</h2>
                <p className="text-blue-100 text-sm">{incomingCall.fromDisplayName}</p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="text-white hover:text-gray-300 transition-colors p-1"
              title="Dismiss notification"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              {incomingCall.callType === "video" ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              )}
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">{incomingCall.fromDisplayName}</h3>
            <p className="text-gray-400">Incoming {incomingCall.callType === "video" ? "video" : "audio"} call</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            {/* Reject Button */}
            <button
              onClick={onReject}
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-all duration-200 shadow-lg"
              title="Reject call"
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

            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full transition-all duration-200 shadow-lg animate-pulse"
              title="Accept call"
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

export default CallNotificationModal
