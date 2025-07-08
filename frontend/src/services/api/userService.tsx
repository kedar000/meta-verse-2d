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

export interface GetUserByIdResponse {
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

  // Get user profile by ID
  getUserById: async (userId: string): Promise<GetUserByIdResponse> => {
    const response = await baseAPI.get(`/user/get-user/${userId}`)
    return response.data
  },

  // Get multiple users by IDs
  getUsersByIds: async (userIds: string[]): Promise<{ users: UserProfile[] }> => {
    try {
      const response = await baseAPI.post("/user/get-users-by-ids", { userIds })
      return response.data
    } catch (error) {
      // If batch endpoint doesn't exist, fall back to individual requests
      console.log("Batch user fetch not available, using individual requests")
      const users: UserProfile[] = []

      for (const userId of userIds) {
        try {
          const userResponse = await userService.getUserById(userId)
          users.push(userResponse.user)
        } catch (err) {
          console.error(`Failed to fetch user ${userId}:`, err)
          // Create a fallback user object
          users.push({
            id: userId,
            email: `${userId.slice(0, 8)}@example.com`,
            displayName: `User ${userId.slice(0, 8)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      }

      return { users }
    }
  },

  // Update user profile (for future use)
  updateProfile: async (userData: Partial<UserProfile>) => {
    const response = await baseAPI.put("/user/update-profile", userData)
    return response.data
  },
}
