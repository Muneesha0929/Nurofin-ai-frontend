export interface UserSession {
  token: string;
  refreshToken: string;
  user: {
    id: string | number;
    name: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<UserSession> => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error('Invalid email or password');
    }

    const data = await res.json();
    const token = data.data.access_token;
    const user = data.data.user;

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }

    return {
      token,
      refreshToken: "dummy_refresh_token",
      user: {
        id: String(user.id),
        name: user.full_name || "User",
        email: user.email,
        role: user.role || "Member"
      }
    };
  },
  getMe: async (): Promise<any> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) throw new Error('No auth token found');

    const res = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await res.json();
    return data.data;
  },
  refresh: async (token: string): Promise<string> => {
    const res = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Token expired');
    return token;
  },
  logout: async (): Promise<void> => {
    return Promise.resolve();
  }
};
