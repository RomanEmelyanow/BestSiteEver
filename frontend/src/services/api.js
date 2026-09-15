import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Создаем axios инстанс с автоматическим добавлением токена
const createAuthClient = (token) => axios.create({
  baseURL: API_URL,
  headers: { Authorization: `Bearer ${token}` },
})

export const authService = {
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { username, password })
    return response.data
  },

  logout: async (token) => {
    const client = createAuthClient(token)
    const response = await client.post('/auth/logout')
    return response.data
  },

  getCurrentUser: async (token) => {
    const client = createAuthClient(token)
    const response = await client.get('/auth/me')
    return response.data
  },

  // Регистрация заявки (упрощенная - только fullName + кабинеты)
  registerRequest: async (data) => {
    const response = await axios.post(`${API_URL}/auth/register-request`, data)
    return response.data
  },

  // Кабинеты
  getClassrooms: async (token) => {
    const client = createAuthClient(token)
    const response = await client.get('/auth/classrooms')
    return response.data
  },

  getUserClassrooms: async (userId, token) => {
    const client = createAuthClient(token)
    const response = await client.get(`/auth/users/${userId}/classrooms`)
    return response.data
  },

  assignUserClassroom: async (userId, classroomId, token) => {
    const client = createAuthClient(token)
    const response = await client.post(`/auth/users/${userId}/classrooms`, { classroom_id: classroomId })
    return response.data
  },

  removeUserClassroom: async (userId, classroomId, token) => {
    const client = createAuthClient(token)
    const response = await client.delete(`/auth/users/${userId}/classrooms/${classroomId}`)
    return response.data
  },

  getAvailableClassrooms: async (userId, token) => {
    const client = createAuthClient(token)
    const response = await client.get(`/auth/users/${userId}/available-classrooms`)
    return response.data
  },

  // Заявки
  createRequest: async (data, token) => {
    const client = createAuthClient(token)
    const response = await client.post('/auth/requests', data)
    return response.data
  },

  getRequests: async (params, token) => {
    const client = createAuthClient(token)
    const response = await client.get('/auth/requests', { params })
    return response.data
  },

  updateRequest: async (requestId, data, token) => {
    const client = createAuthClient(token)
    const response = await client.patch(`/auth/requests/${requestId}`, data)
    return response.data
  },

  getRequestHistory: async (userId, token) => {
    const client = createAuthClient(token)
    const response = await client.get(`/auth/requests/history/${userId}`)
    return response.data
  },

  getRequestCount: async (token) => {
    const client = createAuthClient(token)
    const response = await client.get('/auth/requests/count')
    return response.data
  },
}

export const userService = {
  getAllUsers: async (token) => {
    const response = await axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  getUserById: async (id, token) => {
    const response = await axios.get(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  createUser: async (userData, token) => {
    const response = await axios.post(`${API_URL}/users`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  updateUser: async (id, userData, token) => {
    const response = await axios.put(`${API_URL}/users/${id}`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  deleteUser: async (id, token) => {
    const response = await axios.delete(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },
}