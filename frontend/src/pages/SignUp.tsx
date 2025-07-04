"use client"

import { useForm } from "react-hook-form"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { authService, type SignUpRequest } from "../services/api"
import { tokenService } from "../services/api/tokenService"

type FormData = SignUpRequest

const SignUp = () => {
  const { register, handleSubmit } = useForm<FormData>()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await authService.signUp(data)

      // Store token using token service
      tokenService.setToken(response.token)

      setMessage("Sign up successful! Redirecting...")
      console.log("Sign Up successful, token stored:", `Bearer ${response.token}`)

      // Trigger storage event to update navbar
      window.dispatchEvent(new Event("storage"))

      // Redirect to home page after 1.5 seconds
      setTimeout(() => {
        navigate("/")
      }, 1500)
    } catch (error: any) {
      console.error("Sign up error:", error)

      if (error.response?.data?.message) {
        setMessage(`Error: ${error.response.data.message}`)
      } else if (error.message) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage("Network error. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register("email", { required: true })}
            type="email"
            className="w-full p-2 border rounded"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            {...register("password", { required: true })}
            type="password"
            className="w-full p-2 border rounded"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
      {message && (
        <div
          className={`mt-4 p-2 rounded text-center ${
            message.includes("successful") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}

export default SignUp
