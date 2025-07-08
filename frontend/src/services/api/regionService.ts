import { baseAPI } from "./baseAPI"

// Updated types to match actual API response
export interface RegionUser {
  id: string
  userId: string
  x: number
  y: number
  spaceId: string
  updatedAt: string
  lastMovedAt: string
  lastUpdatedAt: string
  // User profile fields that should come from the API
  displayName?: string
  email?: string
  name?: string
  isOnline?: boolean
  lastSeen?: string
  // User object if populated by backend
  user?: {
    id: string
    email: string
    displayName: string
    createdAt: string
    updatedAt: string
  }
}

export interface GetRegionUsersResponse {
  nearbyUsers: RegionUser[]
}

// Region API calls
export const regionService = {
  // Get users in current user's region
  getRegionUsers: async (x: number, y: number): Promise<GetRegionUsersResponse> => {
    const response = await baseAPI.get(`/region/get-user?x=${x}&y=${y}`)
    return response.data
  },

  // Get users in specific region (for future use)
  getSpecificRegionUsers: async (x: number, y: number, radius?: number): Promise<GetRegionUsersResponse> => {
    const params = new URLSearchParams({
      x: x.toString(),
      y: y.toString(),
    })
    if (radius) {
      params.append("radius", radius.toString())
    }
    const response = await baseAPI.get(`/region/get-user?${params}`)
    return response.data
  },
}
