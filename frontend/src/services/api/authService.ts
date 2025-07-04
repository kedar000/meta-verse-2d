import axios from "axios"

const API_BASE_URL = "http://localhost:4000/api/v1"

// Create axios instance with base configuration
const authAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Types for API responses
export interface SignUpRequest {
  email: string
  password: string
}

export interface SignUpResponse {
  token: string
  message?: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignInResponse {
  token: string
  message?: string
}

// Auth API calls
export const authService = {
  // Sign up user
  signUp: async (data: SignUpRequest): Promise<SignUpResponse> => {
    const response = await authAPI.post("/sign-up", data)
    return response.data
  },

  // Sign in user
  signIn: async (data: SignInRequest): Promise<SignInResponse> => {
    const response = await authAPI.post("/sign-in", data)
    return response.data
  },

  // Get user profile (example for future use)
  getProfile: async (token: string) => {
    const response = await authAPI.get("/profile", {
      headers: {
        Authorization: token,
      },
    })
    return response.data
  },

  // Logout (example for future use)
  logout: async (token: string) => {
    const response = await authAPI.post(
      "/logout",
      {},
      {
        headers: {
          Authorization: token,
        },
      },
    )
    return response.data
  },
}
