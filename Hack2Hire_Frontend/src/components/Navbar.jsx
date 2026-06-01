import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <Link className="brand" to="/" aria-label="TakeOff home">
        <span className="brand-mark" aria-hidden="true">
          🚀
        </span>
        <span>TakeOff</span>
      </Link>
      <span className="nav-pill">AI Mock Interviews</span>
    </header>
  );
}
