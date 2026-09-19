import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="rf-full-page-loading" style={{ flexDirection: "column", gap: 16 }}>
      <h1 className="rf-gradient-text" style={{ fontSize: "3rem" }}>404</h1>
      <p>That page doesn't exist.</p>
      <Link to="/" className="rf-btn rf-btn--primary">Back home</Link>
    </div>
  );
}
