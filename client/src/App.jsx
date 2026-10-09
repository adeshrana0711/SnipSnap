import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

import Home from './pages/HomePage/Home'
import Login from './pages/Logins/Login'
import Register from './pages/Logins/Register'
import ClientRegister from './pages/Logins/ClientRegister'

import Appointment from './pages/ClientSide/Appointment'
import MyBookings from './pages/ClientSide/MyBookings'
import Profile from './pages/ClientSide/Profile';

import Shop from './pages/Shop/Shop';
import ShopDashboard from './pages/Dashboard/ShopDashboard';

function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch('/logout', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        navigate('/', { replace: true })
      }
    }

    logout()
  }, [navigate])

  return <div className="loading">Logging out...</div>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login role="barber" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/barber/login" element={<Login role="barber" />} />
        <Route path="/barber/registration" element={<Register />} />
        <Route path="/client/login" element={<Login role="client" />} />
        <Route path="/client/registration" element={<ClientRegister />} />
        <Route path="/client-login" element={<Login role="client" />} />
        <Route path="/client-register" element={<ClientRegister />} />
        <Route path="/appointment/:barberId" element={<Appointment />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shop/dashboard" element={<ShopDashboard />} />
        <Route path="/shop/:id" element={<Shop />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App