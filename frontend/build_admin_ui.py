import os

DIR = "src/admin/catalogue"
os.makedirs(DIR, exist_ok=True)

files = {
    "AdminApp.jsx": """import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminEditor from './AdminEditor';

export default function AdminApp() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/product/new" element={<AdminEditor isNew />} />
        <Route path="/product/:id" element={<AdminEditor />} />
      </Routes>
    </AdminLayout>
  );
}
""",
    "AdminLayout.jsx": """import React, { useState, useEffect } from "react";
import "./admin.css";

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
          <h2>Admin Access</h2>
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
        </form>
      </div>
    );
  }

  return <div className="ahx-admin-layout">{children}</div>;
}
""",
    "AdminDashboard.jsx": """import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async (reset = false) => {
    setLoading(true);
    const p = reset ? 1 : page;
    const res = await fetch(`/api/admin/catalogue?page=${p}&limit=30${q ? `&q=${q}` : ''}`);
    const data = await res.json();
    if (reset) setProducts(data.items || data); // Search vs list diff
    else setProducts(prev => [...prev, ...(data.items || data)]);
    
    if (data.items) {
      setHasMore(data.hasMore);
      setPage(p + 1);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => load(true), 300);
    return () => clearTimeout(timer);
  }, [q]);
  
  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="ahx-admin-dash">
      <header className="ahx-admin-header">
        <h1>Catalogue Admin</h1>
        <div>
          <Link to="/admin/catalogue/product/new" className="ahx-admin-btn">Add Product</Link>
          <button onClick={handleLogout} className="ahx-admin-btn-outline">Log out</button>
        </div>
      </header>
      
      <div className="ahx-admin-filters">
        <input 
          type="text" 
          placeholder="Search products..." 
          value={q} 
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="ahx-admin-list">
        {products.map(p => (
          <div key={p.slug} className="ahx-admin-row" onClick={() => navigate(`/admin/catalogue/product/${p.slug}`)}>
            <img src={p.images?.[0]?.thumbPath ? p.images[0].thumbPath : (p.imageUrl || '/assets/products/frontal-bottle.jpg')} alt="" />
            <div className="ahx-admin-info">
              <h3>{p.name}</h3>
              <p>{p.type || p.categories?.[0]} • {p.inStock ? 'In Stock' : 'Out of Stock'}</p>
            </div>
          </div>
        ))}
        {hasMore && (
          <button onClick={() => load()} className="ahx-admin-btn-outline" style={{width: '100%', marginTop: 20}}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
}
""",
    "AdminEditor.jsx": """import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function AdminEditor({ isNew }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({
    name: '', description: '', priceMin: '', priceMax: '',
    inStock: true, isPopular: false, topNotes: [], middleNotes: [], baseNotes: [], sizes: [], categories: []
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!isNew && id) {
      fetch(`/api/admin/catalogue/${id}`).then(r => r.json()).then(d => {
        setData(d);
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const save = async () => {
    setSaving(true);
    const method = isNew ? 'POST' : 'PATCH';
    const url = isNew ? '/api/admin/catalogue' : `/api/admin/catalogue/${id}`;
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      const savedData = await res.json();
      
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/admin/catalogue/${savedData.slug}/images`, {
          method: 'POST',
          body: formData
        });
      }
      navigate('/admin/catalogue');
    } else {
      alert("Save failed");
    }
    setSaving(false);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Soft delete this product?")) {
      await fetch(`/api/admin/catalogue/${id}`, { method: 'DELETE' });
      navigate('/admin/catalogue');
    }
  };
  
  const handleRestore = async () => {
    if (window.confirm("Restore this product?")) {
      await fetch(`/api/admin/catalogue/${id}/restore`, { method: 'POST' });
      alert("Restored!");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="ahx-admin-editor">
      <header className="ahx-admin-header">
        <button onClick={() => navigate('/admin/catalogue')} className="ahx-admin-btn-outline">Back</button>
        <button onClick={save} disabled={saving} className="ahx-admin-btn">{saving ? 'Saving...' : 'Save'}</button>
      </header>
      
      <div className="ahx-admin-form">
        <section className="ahx-admin-section">
          <h3>Image</h3>
          {data.images?.[0] && !file && (
             <img src={data.images[0].mediumPath || data.images[0].sourceUrl} alt="Product" style={{maxHeight: 150, display: 'block', marginBottom: 10}} />
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} capture="environment" />
        </section>

        <section className="ahx-admin-section">
          <h3>Basic</h3>
          <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Product Name" />
          <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Description"></textarea>
        </section>

        <section className="ahx-admin-section">
          <h3>Status</h3>
          <label><input type="checkbox" checked={data.inStock} onChange={e => setData({...data, inStock: e.target.checked})} /> In Stock</label>
          <label><input type="checkbox" checked={data.isPopular} onChange={e => setData({...data, isPopular: e.target.checked})} /> Most Loved</label>
        </section>
        
        {!isNew && (
            <section className="ahx-admin-section" style={{marginTop: 40}}>
                <button type="button" onClick={handleDelete} style={{color: 'red'}}>Soft Delete</button>
                <button type="button" onClick={handleRestore} style={{marginLeft: 20}}>Restore</button>
            </section>
        )}
      </div>
    </div>
  );
}
""",
    "admin.css": """
.ahx-admin-layout {
  background: #f4f3ec;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  color: #1a271d;
  padding: 20px;
}
.ahx-admin-login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f4f3ec;
}
.ahx-admin-login-form {
  background: #fff;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 320px;
}
.ahx-admin-login-form input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  text-align: center;
  letter-spacing: 0.2em;
}
.ahx-admin-login-form button {
  background: #1a271d;
  color: #fff;
  padding: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.ahx-admin-error {
  color: #d93025;
  font-size: 14px;
  text-align: center;
}
.ahx-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.ahx-admin-btn {
  background: #1a271d;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  border: none;
  cursor: pointer;
}
.ahx-admin-btn-outline {
  background: transparent;
  color: #1a271d;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  border: 1px solid #1a271d;
  cursor: pointer;
  margin-left: 10px;
}
.ahx-admin-filters input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  margin-bottom: 20px;
}
.ahx-admin-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ahx-admin-row {
  background: #fff;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
}
.ahx-admin-row img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.ahx-admin-info h3 { margin: 0 0 5px 0; font-size: 16px; }
.ahx-admin-info p { margin: 0; font-size: 14px; color: #666; }
.ahx-admin-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.ahx-admin-section input[type="text"], .ahx-admin-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
}
.ahx-admin-section textarea { min-height: 100px; }
"""
}

for name, body in files.items():
    with open(os.path.join(DIR, name), 'w', encoding='utf-8') as f:
        f.write(body)

print("Created admin UI files")
