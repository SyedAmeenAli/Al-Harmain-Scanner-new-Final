import React, { useState, useEffect } from "react";
import "./admin.css";

const ADMIN_LOGO = `${process.env.PUBLIC_URL}/assets/brand/logo-al-haramain.png`;

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        setIsAuthenticated(true);
      }
    } catch (err) {}
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setError(data.detail || "Invalid PIN");
      }
    } catch (err) {
      setError("Network error");
    }
    setLoading(false);
  };

  if (loading) return <div className="ahx-admin-loading">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="ahx-admin-login-wrap">
        <form className="ahx-admin-login-form" onSubmit={handleLogin}>
          <img className="ahx-admin-login-logo" src={ADMIN_LOGO} alt="Al Haramain Perfumes" width={48} height={48} />
          <p className="ahx-admin-login-label">CATALOGUE ADMIN</p>
          <h2>Admin Access</h2>
          <p className="ahx-admin-login-sub">Enter your catalogue PIN to continue.</p>
          {error && <div className="ahx-admin-error">{error}</div>}
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            autoFocus
          />
          <button type="submit">Unlock</button>
          <a className="ahx-admin-login-return" href="/">Return to Book of Fragrances</a>
        </form>
      </div>
    );
  }

  return (
    <div className="ahx-admin-layout">
      <div className="ahx-admin-identity-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={ADMIN_LOGO} alt="Al Haramain" width={32} height={32} style={{ borderRadius: '50%' }} />
          <span className="ahx-admin-identity-label">CATALOGUE ADMIN</span>
        </div>
        <a className="ahx-admin-identity-return" href="/">Return to Catalogue</a>
      </div>
      {children}
    </div>
  );
}
