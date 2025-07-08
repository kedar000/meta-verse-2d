import { websocketService } from "../websocket/websocketService"

export interface CallOffer {
  from: string
  to: string
  offer: RTCSessionDescriptionInit
  callType: "audio" | "video"
  fromDisplayName?: string
}

export interface CallAnswer {
  from: string
  to: string
  answer: RTCSessionDescriptionInit
}

export interface ICECandidate {
  from: string
  to: string
  candidate: RTCIceCandidateInit
}

export interface IncomingCall {
  from: string
  fromDisplayName: string
  callType: "audio" | "video"
  offer: RTCSessionDescriptionInit
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private currentCallType: "audio" | "video" | null = null
  private isCallActive = false

  // CRITICAL: Track the current call target properly
  private currentCallTarget: string | null = null
  private currentCallInitiator: string | null = null
  private isIncomingCall = false

  // Event callbacks
  private onIncomingCall: ((call: IncomingCall) => void) | null = null
  private onCallAccepted: (() => void) | null = null
  private onCallRejected: (() => void) | null = null
  private onCallEnded: (() => void) | null = null
  private onRemoteStream: ((stream: MediaStream) => void) | null = null
  private onLocalStream: ((stream: MediaStream) => void) | null = null
  private onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null

  constructor() {
    this.setupWebSocketListeners()
  }

  private setupWebSocketListeners() {
    // Listen for WebRTC signaling messages from WebSocket
    websocketService.onWebRTCMessage = (message: any) => {
      console.log("[WebRTC] Received message:", message)

      switch (message.type) {
        case "offer":
          this.handleIncomingOffer(message)
          break
        case "answer":
          this.handleIncomingAnswer(message)
          break
        case "candidate":
          this.handleIncomingCandidate(message)
          break
        case "call_ended":
          this.handleRemoteCallEnded(message)
          break
        default:
          console.warn("[WebRTC] Unknown message type:", message.type)
      }
    }
  }

  private createPeerConnection(): RTCPeerConnection {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    }

    const pc = new RTCPeerConnection(configuration)

    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallTarget) {
        console.log("[WebRTC] Sending ICE candidate to:", this.currentCallTarget)
        if (websocketService.isConnected()) {
          websocketService.sendWebRTCMessage({
            type: "candidate",
            targetId: this.currentCallTarget,
            candidate: event.candidate.toJSON(),
          })
        }
      }
    }

    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote stream:", event.streams[0])
      this.remoteStream = event.streams[0]
      this.onRemoteStream?.(this.remoteStream)
    }

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState)
      this.onConnectionStateChange?.(pc.connectionState)

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.log("[WebRTC] Connection failed/disconnected, ending call")
        this.endCall()
      }
    }

    // CRITICAL: Handle when remote peer closes connection
    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState)
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        console.log("[WebRTC] ICE connection failed/disconnected")
        // Don't auto-end here, let connection state handle it
      }
    }

    return pc
  }

  async initiateCall(targetUserId: string, callType: "audio" | "video", targetDisplayName?: string): Promise<void> {
    try {
      console.log(`[WebRTC] Initiating ${callType} call to ${targetUserId}`)

      if (this.isCallActive) {
        throw new Error("Another call is already active")
      }

      // CRITICAL: Set call target tracking
      this.currentCallTarget = targetUserId
      this.currentCallInitiator = null // We are the initiator
      this.isIncomingCall = false
      this.currentCallType = callType
      this.isCallActive = true

      // Get user media with proper constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log(
        "[WebRTC] Got local stream with tracks:",
        this.localStream.getTracks().map((t) => t.kind),
      )
      this.onLocalStream?.(this.localStream)

      // Create peer connection
      this.peerConnection = this.createPeerConnection()

      // CRITICAL: Add local stream tracks to peer connection BEFORE creating offer
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          console.log("[WebRTC] Adding track to peer connection:", track.kind)
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      // Create offer with proper options
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      })

      await this.peerConnection.setLocalDescription(offer)
      console.log("[WebRTC] Created and set local description (offer)")

      // Send offer via WebSocket
      this.sendOffer(targetUserId, offer, callType)
    } catch (error) {
      console.error("[WebRTC] Failed to initiate call:", error)
      this.cleanup()
      throw error
    }
  }

  async acceptCall(offer: RTCSessionDescriptionInit, callType: "audio" | "video"): Promise<void> {
    try {
      console.log(`[WebRTC] Accepting ${callType} call from ${this.currentCallInitiator}`)

      // CRITICAL: We already have the call target set from handleIncomingOffer
      this.currentCallType = callType
      this.isCallActive = true
      this.isIncomingCall = true

      // Get user media with proper constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === "video"
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              }
            : false,
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log(
        "[WebRTC] Got local stream for answer with tracks:",
        this.localStream.getTracks().map((t) => t.kind),
      )
      this.onLocalStream?.(this.localStream)

      // Create peer connection
      this.peerConnection = this.createPeerConnection()

      // CRITICAL: Add local stream tracks to peer connection BEFORE setting remote description
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          console.log("[WebRTC] Adding track to peer connection:", track.kind)
          this.peerConnection.addTrack(track, this.localStream)
        }
      })

      // Set remote description (offer)
      await this.peerConnection.setRemoteDescription(offer)
      console.log("[WebRTC] Set remote description (offer)")

      // Create answer with proper options
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      })

      await this.peerConnection.setLocalDescription(answer)
      console.log("[WebRTC] Created and set local description (answer)")

      // Send answer via WebSocket
      this.sendAnswer(answer)

      this.onCallAccepted?.()
    } catch (error) {
      console.error("[WebRTC] Failed to accept call:", error)
      this.cleanup()
      throw error
    }
  }

  rejectCall(): void {
    console.log("[WebRTC] Rejecting call")
    // Send rejection message to remote peer
    if (this.currentCallTarget && websocketService.isConnected()) {
      websocketService.sendWebRTCMessage({
        type: "call_ended",
        targetId: this.currentCallTarget,
        reason: "rejected",
      })
    }
    this.cleanup()
    this.onCallRejected?.()
  }

  endCall(): void {
    console.log("[WebRTC] Ending call")
    // CRITICAL: Notify remote peer that call is ending
    if (this.currentCallTarget && websocketService.isConnected()) {
      websocketService.sendWebRTCMessage({
        type: "call_ended",
        targetId: this.currentCallTarget,
        reason: "ended",
      })
    }
    this.cleanup()
    this.onCallEnded?.()
  }

  private async handleIncomingOffer(message: any): Promise<void> {
    console.log("[WebRTC] Handling incoming offer from:", message.from)

    if (this.isCallActive) {
      console.log("[WebRTC] Already in a call, rejecting offer")
      // Send rejection
      if (websocketService.isConnected()) {
        websocketService.sendWebRTCMessage({
          type: "call_ended",
          targetId: message.from,
          reason: "busy",
        })
      }
      return
    }

    // CRITICAL: Set call target tracking for incoming call
    this.currentCallTarget = message.from
    this.currentCallInitiator = message.from
    this.isIncomingCall = true

    const incomingCall: IncomingCall = {
      from: message.from,
      fromDisplayName: message.fromDisplayName || `User ${message.from.slice(0, 8)}`,
      callType: message.callType || "audio",
      offer: message.offer,
    }

    this.onIncomingCall?.(incomingCall)
  }

  private async handleIncomingAnswer(message: any): Promise<void> {
    console.log("[WebRTC] Handling incoming answer from:", message.from)

    if (!this.peerConnection) {
      console.error("[WebRTC] No peer connection for answer")
      return
    }

    // Verify this answer is from our call target
    if (message.from !== this.currentCallTarget) {
      console.warn("[WebRTC] Answer from unexpected user:", message.from, "expected:", this.currentCallTarget)
      return
    }

    try {
      await this.peerConnection.setRemoteDescription(message.answer)
      console.log("[WebRTC] Set remote description (answer)")
      this.onCallAccepted?.()
    } catch (error) {
      console.error("[WebRTC] Failed to set remote description:", error)
    }
  }

  private async handleIncomingCandidate(message: any): Promise<void> {
    console.log("[WebRTC] Handling incoming ICE candidate from:", message.from)

    if (!this.peerConnection) {
      console.error("[WebRTC] No peer connection for candidate")
      return
    }

    // Verify this candidate is from our call target
    if (message.from !== this.currentCallTarget) {
      console.warn("[WebRTC] Candidate from unexpected user:", message.from, "expected:", this.currentCallTarget)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(message.candidate)
      console.log("[WebRTC] Added ICE candidate")
    } catch (error) {
      console.error("[WebRTC] Failed to add ICE candidate:", error)
    }
  }

  // CRITICAL: Handle when remote peer ends the call
  private handleRemoteCallEnded(message: any): void {
    console.log("[WebRTC] Remote peer ended the call:", message.reason)

    // Verify this is from our call target
    if (message.from !== this.currentCallTarget) {
      console.warn("[WebRTC] Call ended message from unexpected user:", message.from)
      return
    }

    // Clean up and notify UI
    this.cleanup()
    this.onCallEnded?.()
  }

  private sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit, callType: "audio" | "video"): void {
    if (websocketService.isConnected()) {
      console.log("[WebRTC] Sending offer to:", targetUserId)
      websocketService.sendWebRTCMessage({
        type: "offer",
        targetId: targetUserId,
        offer,
        callType,
      })
    }
  }

  private sendAnswer(answer: RTCSessionDescriptionInit): void {
    if (websocketService.isConnected() && this.currentCallTarget) {
      console.log("[WebRTC] Sending answer to:", this.currentCallTarget)
      websocketService.sendWebRTCMessage({
        type: "answer",
        targetId: this.currentCallTarget,
        answer,
      })
    }
  }

  private cleanup(): void {
    console.log("[WebRTC] Cleaning up")

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop()
        console.log("[WebRTC] Stopped track:", track.kind)
      })
      this.localStream = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.remoteStream = null
    this.currentCallType = null
    this.isCallActive = false

    // CRITICAL: Reset call target tracking
    this.currentCallTarget = null
    this.currentCallInitiator = null
    this.isIncomingCall = false
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  isInCall(): boolean {
    return this.isCallActive
  }

  getCurrentCallType(): "audio" | "video" | null {
    return this.currentCallType
  }

  getCurrentTarget(): string | null {
    return this.currentCallTarget
  }

  isCurrentCallIncoming(): boolean {
    return this.isIncomingCall
  }

  // Event listeners
  onIncomingCallReceived(callback: (call: IncomingCall) => void): void {
    this.onIncomingCall = callback
  }

  onCallWasAccepted(callback: () => void): void {
    this.onCallAccepted = callback
  }

  onCallWasRejected(callback: () => void): void {
    this.onCallRejected = callback
  }

  onCallWasEnded(callback: () => void): void {
    this.onCallEnded = callback
  }

  onRemoteStreamReceived(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback
  }

  onLocalStreamReceived(callback: (stream: MediaStream) => void): void {
    this.onLocalStream = callback
  }

  onConnectionStateChanged(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChange = callback
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService()
