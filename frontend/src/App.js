import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";

// Legacy customer experience removed.
import BookExperience from "@/bookExperience/BookExperience";
import AdminApp from "@/admin/catalogue/AdminApp";
import NotFoundPage from "@/pages/NotFound";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Customer-facing Al Haramain catalogue experience — THE BOOK OF
              FRAGRANCES. */}
          <Route path="/" element={<BookExperience />} />
          <Route path="/experience" element={<BookExperience />} />
          {/* Admin Experience */}
          <Route path="/admin/catalogue/*" element={<AdminApp />} />
          {/* Anything else falls through cleanly to a 404 rather than the
              old ecommerce shell (removed — see git history if it's ever
              needed again). */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
