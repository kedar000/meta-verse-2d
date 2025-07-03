import { Link } from "react-router-dom";

const Navbar = () => (
  <nav className="flex justify-between items-center p-4 shadow">
    <Link to="/" className="text-xl font-bold">MyApp</Link>
    <div className="space-x-4">
      <Link to="/signin">Sign In</Link>
      <Link to="/signup">Sign Up</Link>
    </div>
  </nav>
);

export default Navbar;
