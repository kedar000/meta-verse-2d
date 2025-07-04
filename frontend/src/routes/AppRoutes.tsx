import { Routes, Route } from "react-router-dom"
import Home from "../pages/Home"
import SignIn from "../pages/SignIn"
import SignUp from "../pages/SignUp"
import Space from "../pages/Space"
import TestGrid from "../pages/TestGrid"
import ProtectedRoute from "../components/ProtecedRoutes"

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/test-grid" element={<TestGrid />} />
      <Route
        path="/space"
        element={
          <ProtectedRoute>
            <Space />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default AppRoutes
