import axios from "axios"

// Base API configuration
export const API_BASE_URL = "http://localhost:4000/api/v1"

// Create a base axios instance
export const baseAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
baseAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for error handling
baseAPI.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("token")
      window.location.href = "/signin"
    }
    return Promise.reject(error)
  },
)
