import { baseAPI } from "./baseAPI"

// Types for Space API
export interface Space {
  id: string
  name: string
  description: string
  isPrivate: boolean
  maxMembers: number
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface GetSpacesResponse {
  message: string
  allSpaces: Space[]
}

export interface CreateSpaceRequest {
  name: string
  description: string
  maxMembers: number
}

export interface CreateSpaceResponse {
  message: string
  space?: Space
}

// Space API calls
export const spaceService = {
  // Get all spaces
  getAllSpaces: async (): Promise<GetSpacesResponse> => {
    const response = await baseAPI.get("/get-spaces")
    return response.data
  },

  // Create space
  createSpace: async (spaceData: CreateSpaceRequest): Promise<CreateSpaceResponse> => {
    const response = await baseAPI.post("/create-space", spaceData)
    return response.data
  },

  // Get single space (for future use)
  getSpace: async (spaceId: string) => {
    const response = await baseAPI.get(`/space/${spaceId}`)
    return response.data
  },
}
