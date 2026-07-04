import axios from 'axios';

const api = axios.create({ //tạo mới 1 instance tránh mỗi lần gọi api phải gõ lại url 
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api', 
  headers: {// định nghĩa dạng dữ liệu được gửi đi mặc định là json
    'Content-Type': 'application/json',
  },
});
// Request interceptor: Tự động đính kèm Access Token vào header của các request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') { //ktr code đang chạy ở client ko vì locaStorage chỉ tồn tại ở trình duyệt , chạy ở sever là crack app liền
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
  (response) => response,// trả về thẳng kết quả nếu request thành công 201
  async (error) => {
    const originalRequest = error.config; //lưu lại rq lỗi để gửi lại khi có token mới

    // ktr lỗi hết hạn token 
    if (error.response?.status === 401 && !originalRequest._retry) { 
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;

          if (!refreshToken || !user?.id) {
            throw new Error('không có refresh token hoặc user ID được tạo ra');
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

          // Lưu token mới vào localStorage , để lần gọi rq sau sẽ dùng token mới
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
