# ⚡ Quick Start - Deploy Frontend lên Vercel

## Bước 1: Lấy Backend URL (1 phút)

Từ Render Dashboard, copy URL backend:
```
https://internflow.onrender.com
```
(Thay bằng URL thực tế của bạn)

---

## Bước 2: Push code lên GitHub (2 phút)

```bash
cd d:\CheckSV\InternFlow-UI
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

---

## Bước 3: Deploy lên Vercel (5 phút)

### 3.1. Import Project

1. Vào https://vercel.com/new
2. Login với GitHub
3. Chọn repository **InternFlow-UI**
4. Click **"Import"**

### 3.2. Thêm Environment Variables

Click **"Environment Variables"** và thêm **2 biến**:

#### Biến 1:
```
NAME: VITE_API_BASE_URL
VALUE: https://internflow.onrender.com/api
```
*(Thay `internflow.onrender.com` bằng backend URL của bạn)*

#### Biến 2:
```
NAME: VITE_GOOGLE_CLIENT_ID
VALUE: 548332785385-5t4pcftrhba9f0fj7lsnqourqgt9ik6e.apps.googleusercontent.com
```

**Chọn**: All (Production, Preview, Development)

### 3.3. Deploy

1. Click **"Deploy"**
2. Đợi 2-3 phút
3. Lấy URL: `https://your-project.vercel.app`

---

## Bước 4: Cập nhật CORS trên Backend (3 phút)

1. Vào Render Dashboard
2. Chọn Web Service **InternFlow**
3. Tab **Environment**
4. Tìm `CORS_ALLOWED_ORIGINS`
5. Sửa thành: `https://your-project.vercel.app`
6. Click **"Save Changes"**
7. Đợi redeploy

---

## Bước 5: Cập nhật Google OAuth (2 phút)

1. Vào https://console.cloud.google.com
2. Chọn project **internflow-496202**
3. **APIs & Services** → **Credentials**
4. Click OAuth 2.0 Client ID
5. Thêm **Authorized JavaScript origins**:
   ```
   https://your-project.vercel.app
   ```
6. Thêm **Authorized redirect URIs**:
   ```
   https://your-project.vercel.app
   https://your-project.vercel.app/auth/callback
   ```
7. Click **"Save"**

---

## ✅ Test (2 phút)

1. Mở `https://your-project.vercel.app`
2. Kiểm tra:
   - [ ] Trang load OK
   - [ ] Không có CORS errors
   - [ ] API calls hoạt động
   - [ ] Google Login hoạt động

---

## 🎉 Hoàn thành!

Frontend: `https://your-project.vercel.app`
Backend: `https://internflow.onrender.com`

---

## 📝 Tóm tắt Environment Variables cần thiết

### Vercel (Frontend):
```
VITE_API_BASE_URL=https://internflow.onrender.com/api
VITE_GOOGLE_CLIENT_ID=548332785385-5t4pcftrhba9f0fj7lsnqourqgt9ik6e.apps.googleusercontent.com
```

### Render (Backend):
```
CORS_ALLOWED_ORIGINS=https://your-project.vercel.app
```

---

**Tổng thời gian: ~15 phút** ⏱️
