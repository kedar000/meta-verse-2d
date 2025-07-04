import { BrowserRouter as Router, useLocation } from "react-router-dom"
import AppRoutes from "./routes/AppRoutes"
import Navbar from "./components/Navbar"

const AppContent = () => {
  const location = useLocation()
  const hideNavbar = location.pathname === "/test-grid"

  return (
    <>
      {!hideNavbar && <Navbar />}
      <AppRoutes />
    </>
  )
}

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
