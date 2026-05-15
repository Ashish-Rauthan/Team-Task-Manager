import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signup:         (data)           => api.post('/auth/signup', data),
  login:          (data)           => api.post('/auth/login', data),
  logout:         ()               => api.post('/auth/logout'),
  me:             ()               => api.get('/auth/me'),
  updateMe:       (data)           => api.patch('/auth/me', data),
  listUsers:      ()               => api.get('/auth/users'),
  updateUserRole: (id, role)       => api.patch(`/auth/users/${id}/role`, { role }),
};

export const projectsAPI = {
  list:             ()                  => api.get('/projects'),
  get:              (id)                => api.get(`/projects/${id}`),
  create:           (data)              => api.post('/projects', data),
  update:           (id, data)          => api.patch(`/projects/${id}`, data),
  delete:           (id)                => api.delete(`/projects/${id}`),
  getMembers:       (id)                => api.get(`/projects/${id}/members`),
  addMember:        (id, data)          => api.post(`/projects/${id}/members`, data),
  updateMemberRole: (pid, mid, role)    => api.patch(`/projects/${pid}/members/${mid}`, { role }),
  removeMember:     (pid, mid)          => api.delete(`/projects/${pid}/members/${mid}`),
  getActivity:      (id)                => api.get(`/projects/${id}/activity`),
};

export const tasksAPI = {
  list:          (projectId, params)           => api.get(`/projects/${projectId}/tasks`, { params }),
  get:           (projectId, id)               => api.get(`/projects/${projectId}/tasks/${id}`),
  create:        (projectId, data)             => api.post(`/projects/${projectId}/tasks`, data),
  update:        (projectId, id, data)         => api.patch(`/projects/${projectId}/tasks/${id}`, data),
  updateStatus:  (projectId, id, status)       => api.patch(`/projects/${projectId}/tasks/${id}/status`, { status }),
  delete:        (projectId, id)               => api.delete(`/projects/${projectId}/tasks/${id}`),
  myTasks:       ()                            => api.get('/tasks/my'),
  dashboard:     ()                            => api.get('/dashboard'),
  addComment:    (projectId, taskId, body)     => api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { body }),
  deleteComment: (projectId, taskId, cid)      => api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${cid}`),
};

export default api;