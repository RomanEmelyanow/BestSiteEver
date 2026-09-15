import { createContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'

export const AuthContext = createContext()

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [isLoading, setIsLoading] = useState(false)

  // Инициализация - проверяем токен при загрузке
  useEffect(() => {
    if (token) {
      validateToken()
    }
  }, [])

  const validateToken = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch (error) {
      console.error('Token validation failed:', error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const login = useCallback(async (username, password) => {
    try {
      setIsLoading(true)
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      })

      const { token: newToken, user: userData } = response.data
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(userData)

      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Ошибка при входе'
      return { success: false, message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post(
          `${API_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    }
  }, [token])

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}