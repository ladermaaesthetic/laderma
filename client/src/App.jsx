import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Gallery from './pages/Gallery';
import Pricing from './pages/Pricing';
import CategoryPage from './pages/CategoryPage';
import Reviews from './pages/Reviews';
import Location from './pages/Location';
import Booking from './pages/Booking';
import Login from './pages/account/Login';
import Register from './pages/account/Register';
import Account from './pages/account/Account';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes are deliberately outside the public Layout — no
            site header/footer/floating CTA, it should feel like a
            separate internal tool rather than a public page. */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/pricing/:categoryId" element={<CategoryPage />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/location" element={<Location />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/account" element={<Account />} />
                <Route path="/account/login" element={<Login />} />
                <Route path="/account/register" element={<Register />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
