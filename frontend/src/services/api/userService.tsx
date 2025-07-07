import { baseAPI } from "./baseAPI"

// Types for User API
export interface UserProfile {
  id: string
  email: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export interface GetUserResponse {
  message: string
  user: UserProfile
}

// User API calls
export const userService = {
  // Get current user profile
  getCurrentUser: async (): Promise<GetUserResponse> => {
    const response = await baseAPI.get("/user/get-user")
    return response.data
  },

  // Update user profile (for future use)
  updateProfile: async (userData: Partial<UserProfile>) => {
    const response = await baseAPI.put("/user/update-profile", userData)
    return response.data
  },
}
