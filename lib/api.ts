import axios from "axios";

// In Next.js, API routes are on the same origin — no base URL needed.
const api = axios.create({ withCredentials: false });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const guestToken = localStorage.getItem("guestToken");
  const authToken = token || guestToken;
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const guestToken = localStorage.getItem("guestToken");
      if (guestToken && !token) {
        console.log("Guest token expired or invalid");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
