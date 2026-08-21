import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveBookVisual } from '../../bookExperience/data/resolveBookVisual';

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
      <div className="ahx-admin-header">
        <div className="ahx-admin-header-actions" style={{marginTop: 0}}>
          <button type="button" onClick={() => navigate('/admin/catalogue')} className="ahx-admin-btn-outline">Back</button>
          <button type="button" onClick={save} disabled={saving} className="ahx-admin-btn">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
      
      <div className="ahx-admin-form">
          <section className="ahx-admin-section">
            <h3>Image</h3>
            {(resolveBookVisual(data, { context: 'thumb' })?.primary || data.images?.[0] || data.imageUrl) && !file && (
              <img 
                src={resolveBookVisual(data, { context: 'thumb' })?.primary || data.images?.[0]?.mediumPath || data.images?.[0]?.sourceUrl || data.imageUrl} 
                alt="Product" 
                style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', marginBottom: 15, background: '#f8f8f8', borderRadius: 6 }} 
              />
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

        <section className="ahx-admin-section">
          <h3>Categories (comma separated)</h3>
          <input type="text" value={data.categories?.join(', ') || ''} onChange={e => setData({...data, categories: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="e.g. perfume, attar" />
        </section>

        <section className="ahx-admin-section">
          <h3>Fragrance Notes (comma separated)</h3>
          <input type="text" value={data.topNotes?.join(', ') || ''} onChange={e => setData({...data, topNotes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="Top Notes" style={{marginBottom: 8}} />
          <input type="text" value={data.middleNotes?.join(', ') || ''} onChange={e => setData({...data, middleNotes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="Heart Notes" style={{marginBottom: 8}} />
          <input type="text" value={data.baseNotes?.join(', ') || ''} onChange={e => setData({...data, baseNotes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="Base Notes" />
        </section>

        <section className="ahx-admin-section">
          <h3>Pricing & Sizes</h3>
          <div style={{display: 'flex', gap: 10, marginBottom: 15}}>
             <input type="number" value={data.priceMin || ''} onChange={e => setData({...data, priceMin: parseInt(e.target.value)||0})} placeholder="Min Price" />
             <input type="number" value={data.priceMax || ''} onChange={e => setData({...data, priceMax: parseInt(e.target.value)||0})} placeholder="Max Price" />
          </div>
          
          <h4>Sizes</h4>
          {data.sizes?.map((s, i) => (
            <div key={i} style={{display: 'flex', gap: 10, marginBottom: 10}}>
              <input type="text" value={s.label || ''} onChange={e => {
                const newSizes = [...data.sizes]; newSizes[i].label = e.target.value; setData({...data, sizes: newSizes});
              }} placeholder="Label (e.g. 50ml)" style={{flex: 1}}/>
              <input type="number" value={s.price || ''} onChange={e => {
                const newSizes = [...data.sizes]; newSizes[i].price = parseInt(e.target.value)||0; setData({...data, sizes: newSizes});
              }} placeholder="Price" style={{flex: 1}}/>
              <label style={{display: 'flex', alignItems: 'center'}}><input type="checkbox" checked={s.inStock} onChange={e => {
                const newSizes = [...data.sizes]; newSizes[i].inStock = e.target.checked; setData({...data, sizes: newSizes});
              }} /> Stock</label>
              <button type="button" onClick={() => {
                const newSizes = [...data.sizes]; newSizes.splice(i, 1); setData({...data, sizes: newSizes});
              }} style={{color: 'red'}}>X</button>
            </div>
          ))}
          <button type="button" onClick={() => setData({...data, sizes: [...(data.sizes||[]), {label: '', price: 0, inStock: true}]})}>Add Size</button>
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
