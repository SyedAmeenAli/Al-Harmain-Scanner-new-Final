import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { resolveBookVisual } from '../../bookExperience/data/resolveBookVisual';

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

    if (!res.ok) {
      // e.g. { detail: "Not authenticated" } on an expired/missing session —
      // never treat an error body as the product list.
      if (reset) setProducts([]);
      setHasMore(false);
      setLoading(false);
      if (res.status === 401) {
        window.location.href = "/admin/login";
      }
      return;
    }

    const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
    if (reset) setProducts(items); // Search vs list diff
    else setProducts(prev => [...prev, ...items]);

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
      <div className="ahx-admin-header">
        <h1>Catalogue Admin</h1>
        <div className="ahx-admin-header-actions">
          <Link to="/admin/catalogue/product/new" className="ahx-admin-btn">Add Product</Link>
          <button type="button" onClick={handleLogout} className="ahx-admin-btn-outline">Log out</button>
        </div>
      </div>
      
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
            <img src={resolveBookVisual(p, { context: 'thumb' })?.primary || p.imageUrl || '/assets/products/frontal-bottle.jpg'} alt="" />
            <div className="ahx-admin-info">
              <h3>{p.name}</h3>
              <p>{p.type || p.categories?.[0]} • {p.inStock ? 'In Stock' : 'Out of Stock'}</p>
            </div>
          </div>
        ))}
        {hasMore && (
          <button type="button" onClick={() => load()} className="ahx-admin-btn-outline" style={{width: '100%', marginTop: 20}}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
}
