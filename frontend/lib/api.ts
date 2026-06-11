import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
// Request interceptor: Tự động đính kèm Access Token vào header của các request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
// Response interceptor: Tự động bắt lỗi 401 (Unauthorized) để làm mới Access Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu mã lỗi là 401 và request chưa được thử lại trước đó
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;

          if (!refreshToken || !user?.id) {
            throw new Error('No refresh token or user ID found');
          }

          // Gọi API làm mới token từ server
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api'}/auth/refresh`,
            {
              userId: user.id,
              refreshToken,
            },
          );

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

          // Lưu token mới vào localStorage
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Cập nhật lại cookie chứa access token cho middleware kiểm tra (phía server)
          document.cookie = `accessToken=${newAccessToken}; path=/; max-age=900; SameSite=Lax;`;

          // Cập nhật lại Authorization header cho request ban đầu và gửi lại
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Nếu refresh token thất bại (hết hạn hoặc không hợp lệ), thực hiện đăng xuất
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  },
);
export default api;
