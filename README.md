# InternFlow UI

InternFlow là ứng dụng web quản lý thực tập - theo dõi điểm danh, lịch trình, báo cáo và tiến độ của thực tập sinh.

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 7 |
| State | Zustand 5 |
| Server State | TanStack React Query 5 |
| Form | React Hook Form + Zod |
| UI Components | Radix UI + CVA + Lucide Icons |
| Deploy | Vercel |

## Tính năng

- **Đăng nhập** - Xác thực qua Google OAuth
- **Dashboard** - Tổng quan theo vai trò (Intern, Team Leader, Admin, Manager)
- **Điểm danh** - Check-in/out, upload ảnh cá nhân & nhóm, kiểm tra đủ ảnh theo quy định
- **Đăng ký ca** - Đăng ký lịch làm việc theo ca (Company / Home Report)
- **Nhóm** - Quản lý nhóm thực tập (Team Leader, Admin, Manager)
- **Quản lý Admin** - Quản lý sinh viên, chi tiết điểm danh từng ngày
- **Báo cáo** - Theo dõi tiến độ báo cáo thực tập
- **Nhật ký** - Ghi nhận báo cáo hàng ngày
- **Xuất CSV** - Xuất dữ liệu báo cáo

## Vai trò

| Vai trò | Quyền |
|---------|-------|
| `INTERN` | Dashboard, điểm danh, đăng ký ca, báo cáo, nhật ký |
| `TEAM_LEADER` | Tất cả quyền Intern + quản lý nhóm |
| `ADMIN` | Tất cả quyền Team Leader + quản lý sinh viên, báo cáo tổng |
| `MANAGER` | Tất cả quyền Admin |

## Cài đặt

### Yêu cầu

- Node.js >= 18
- Backend API đang chạy (mặc định `http://localhost:8080/api`)

### Chạy local

```bash
# Cài dependencies
npm install

# Tạo file .env
cp .env.example .env

# Chạy dev server
npm run dev
```

### Environment Variables

| Biến | Mô tả | Mặc định |
|------|--------|----------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8080/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | - |

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm run preview` | Preview build |
| `npm run lint` | Chạy ESLint |

## Cấu trúc thư mục

```
src/
├── api/                # HTTP client & API config
├── components/
│   ├── common/         # Shared components (EmptyState, Loading, Error)
│   ├── dashboard/      # Dashboard cards & charts
│   ├── navigation/     # Sidebar & TopNavbar
│   └── ui/             # Base UI (Button, Card, Input, Badge, Progress)
├── features/
│   ├── auth/           # Login, Google OAuth, schemas
│   └── dashboard/      # Dashboard pages theo vai trò
├── layouts/            # AppLayout
├── pages/              # Route pages (Attendance, Schedule, Team, Admin, Reports, Journal)
├── routes/             # Router config, ProtectedRoute, RoleRoute
├── services/           # API service layer
├── store/              # Zustand stores (auth, server-status)
├── types/              # TypeScript types
└── utils/              # Helpers (date, CSV export, attendance rules)
```

## Backend

Frontend kết nối với backend API tại `VITE_API_BASE_URL`. Backend deploy trên Render tại `internflow.onrender.com`.

Xem thêm hướng dẫn deploy tại [VERCEL_QUICK_START.md](./docs/deployment/VERCEL_QUICK_START.md).

## Image bandwidth

Attendance uploads are compressed in the browser before upload. Saved images keep the full Cloudinary URL for audit/preview and use `thumbnailUrl` or a Cloudinary `c_limit,w_400,q_auto,f_auto` fallback for dashboard, list, checklist, and review grids. Full images should load only after the user opens/clicks the preview.

Backend retention cleanup is disabled/dry-run by default. Frontend screens must continue to support legacy rows that only have `imageUrl`.

## Deploy

Ứng dụng deploy trên Vercel với SPA rewrite (tất cả routes -> `index.html`). Xem [VERCEL_DEPLOYMENT.md](./docs/deployment/VERCEL_DEPLOYMENT.md) và [ATTENDANCE_UPLOAD_MECHANISM.md](./docs/features/ATTENDANCE_UPLOAD_MECHANISM.md) để biết thêm chi tiết.
