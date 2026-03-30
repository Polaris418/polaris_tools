export const mockUser = {
  id: 1,
  username: 'test_user',
  email: 'test@example.com',
  nickname: '测试用户',
  avatar: '',
  role: 'USER',
  isAdmin: false,
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockAdminUser = {
  ...mockUser,
  id: 2,
  username: 'admin_user',
  email: 'admin@example.com',
  role: 'ADMIN',
  isAdmin: true,
};

export const mockLoginResponse = {
  code: 200,
  message: '登录成功',
  data: {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 86400000,
    user: mockUser,
  },
};
