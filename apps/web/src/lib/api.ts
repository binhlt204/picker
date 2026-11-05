import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'pickball_token';

// Các trang không cần đăng nhập
export const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function getToken(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // trình duyệt chặn localStorage: bỏ qua, người dùng sẽ phải đăng nhập lại mỗi lần tải trang
  }
}

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính token đăng nhập vào mọi request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Phiên đăng nhập hết hạn (đã gửi token mà vẫn 401): xóa token và chuyển về trang đăng nhập
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const hadToken = Boolean(error?.config?.headers?.Authorization);
    if (error?.response?.status === 401 && hadToken && typeof window !== 'undefined') {
      setToken(null);
      const path = window.location.pathname;
      if (!PUBLIC_PATHS.includes(path)) {
        window.location.assign(`/login?next=${encodeURIComponent(path + window.location.search)}`);
      }
    }
    return Promise.reject(error);
  }
);

export const getApiBaseUrl = () => API_BASE_URL;

/** Lấy thông báo lỗi dễ đọc từ lỗi axios. */
export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi, vui lòng thử lại'): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string; code?: string };
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ';
  return fallback;
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* dùng cách bên dưới */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : fallback;
}

/**
 * Tải file từ API có yêu cầu đăng nhập (thẻ <a href> không gửi được token nên phải tải bằng axios).
 * Ví dụ: downloadFile('/classrooms/<id>/cards/pdf', 'the-in.pdf')
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  try {
    const res = await api.get(path, { responseType: 'blob' });
    const name = filenameFromDisposition(res.headers['content-disposition'], fallbackName);
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    // Khi lỗi, server trả JSON nhưng axios đọc dưới dạng blob nên phải đọc lại nội dung
    const blob = err?.response?.data;
    if (blob instanceof Blob) {
      try {
        const parsed = JSON.parse(await blob.text());
        if (parsed?.error) throw new Error(parsed.error);
      } catch (inner) {
        if (inner instanceof Error && inner.message && !(inner instanceof SyntaxError)) throw inner;
      }
    }
    throw new Error(getErrorMessage(err, 'Tải file thất bại'));
  }
}
