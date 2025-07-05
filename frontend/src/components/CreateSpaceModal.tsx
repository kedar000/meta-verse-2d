"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { spaceService, type CreateSpaceRequest } from "../services/api"

interface CreateSpaceModalProps {
  isOpen: boolean
  onClose: () => void
  onSpaceCreated: () => void
}

const CreateSpaceModal = ({ isOpen, onClose, onSpaceCreated }: CreateSpaceModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSpaceRequest>()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  const onSubmit = async (data: CreateSpaceRequest) => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await spaceService.createSpace(data)
      setMessage("Space created successfully!")

      // Reset form and close modal after success
      setTimeout(() => {
        reset()
        onClose()
        onSpaceCreated() // Refresh the spaces list
        setMessage("")
      }, 1500)
    } catch (error: any) {
      console.error("Error creating space:", error)

      if (error.response?.data?.message) {
        setMessage(`Error: ${error.response.data.message}`)
      } else if (error.message) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage("Failed to create space. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setMessage("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Create New Space</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            {/* Space Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Space Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", {
                  required: "Space name is required",
                  minLength: { value: 3, message: "Name must be at least 3 characters" },
                  maxLength: { value: 50, message: "Name must be less than 50 characters" },
                })}
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter space name"
                disabled={isLoading}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                  minLength: { value: 10, message: "Description must be at least 10 characters" },
                  maxLength: { value: 200, message: "Description must be less than 200 characters" },
                })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                placeholder="Describe your space..."
                disabled={isLoading}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            {/* Max Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Members <span className="text-red-500">*</span>
              </label>
              <input
                {...register("maxMembers", {
                  required: "Maximum members is required",
                  min: { value: 1, message: "Must have at least 1 member" },
                  max: { value: 100, message: "Cannot exceed 100 members" },
                  valueAsNumber: true,
                })}
                type="number"
                min="1"
                max="100"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="e.g., 12"
                disabled={isLoading}
              />
              {errors.maxMembers && <p className="mt-1 text-sm text-red-600">{errors.maxMembers.message}</p>}
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.includes("successfully")
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                "Create Space"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSpaceModal
