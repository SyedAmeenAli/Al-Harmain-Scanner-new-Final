import React from 'react';
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
