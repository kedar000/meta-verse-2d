import { Routes, Route } from "react-router-dom"
import Home from "../pages/Home"
import SignIn from "../pages/SignIn"
import SignUp from "../pages/SignUp"
import Space from "../pages/Space"
import TestGrid from "../pages/TestGrid"
import Friends from "../pages/Friends"
import Profile from "../pages/Profile"
import Settings from "../pages/Settings"
import Analytics from "../pages/Analytics"
import VideoChat from "../pages/VideoChat"
import KedarTarunVideoChat from "../pages/demoVideoChat"
import ProtectedRoute from "../components/ProtecedRoutes"

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/test-grid" element={<TestGrid />} />
      <Route path="/video-chat" element={<VideoChat />} />
      <Route path="/kedar-tarun-video" element={<KedarTarunVideoChat />} />
      <Route
        path="/space"
        element={
          <ProtectedRoute>
            <Space />
          </ProtectedRoute>
        }
      />
      <Route
        path="/friends"
        element={
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes
