# Google OAuth Setup - Fix 403 Error

## Vấn đề
```
Error 403: access_denied
Access blocked: internFlow has not completed the Google verification process
```

## Nguyên nhân
Google OAuth app chưa được verify và chưa có test users.

## Giải pháp: Thêm Test Users

### Bước 1: Vào OAuth Consent Screen
1. Mở Google Cloud Console: https://console.cloud.google.com
2. Chọn project: **internFlow** (ID: `internflow-406202`)
3. Menu bên trái → **APIs & Services** → **OAuth consent screen**

### Bước 2: Thêm Test Users
1. Scroll xuống phần **"Test users"**
2. Click nút **"+ ADD USERS"**
3. Nhập email cần test (mỗi dòng 1 email):
   ```
   helen.a14138@gmail.com
   tranthienloc.nina@gmail.com
   tranthienloc21102005@gmail.com
   daonguyenquocviet9190@gmail.com
   ```
4. Click **"SAVE"**

### Bước 3: Test lại
1. Logout khỏi Google (nếu đang login)
2. Vào app: http://localhost:5173/journal
3. Click "Gửi mail cuối ngày"
4. Login với email đã thêm vào test users
5. Cho phép quyền Gmail

## Giải pháp thay thế: Publish App

### Option 1: Publish (Không cần verify)
1. Vào OAuth consent screen
2. Click **"PUBLISH APP"**
3. Confirm
4. User sẽ thấy warning "App not verified" nhưng vẫn dùng được

### Option 2: Submit for Verification (Lâu)
1. Publish app trước
2. Click **"Submit for verification"**
3. Điền form và đợi Google review (1-2 tuần)

## Kiểm tra cấu hình hiện tại

### OAuth Consent Screen
- **App name:** internFlow
- **User support email:** Phải điền
- **Developer contact:** Phải điền
- **Scopes:** 
  - `https://www.googleapis.com/auth/gmail.send`
  - `openid`
  - `email`
  - `profile`

### Authorized redirect URIs
Đảm bảo có:
```
http://localhost:5173
http://localhost:5173/journal
https://intern-flow-ui.vercel.app
https://intern-flow-ui.vercel.app/journal
```

## Troubleshooting

### Lỗi: "redirect_uri_mismatch"
→ Thêm URI vào Authorized redirect URIs

### Lỗi: "access_denied" 
→ Thêm email vào Test users

### Lỗi: "invalid_client"
→ Kiểm tra VITE_GOOGLE_CLIENT_ID trong .env

## Current Config

### Frontend (.env)
```env
VITE_GOOGLE_CLIENT_ID=548332785385-5t4pcftrhba9f0fj7lsnqourqgt9ik6e.apps.googleusercontent.com
```

### Google Cloud Project
- **Project ID:** internflow-406202
- **Client ID:** 548332785385-5t4pcftrhba9f0fj7lsnqourqgt9ik6e.apps.googleusercontent.com

## Quick Fix (5 phút)

1. Vào: https://console.cloud.google.com/apis/credentials/consent?project=internflow-406202
2. Scroll xuống "Test users"
3. Click "+ ADD USERS"
4. Paste email: `helen.a14138@gmail.com`
5. Click "SAVE"
6. Test lại!

## Notes

- **Test users:** Tối đa 100 users
- **Publishing status:** 
  - Testing → Chỉ test users dùng được
  - In production → Mọi người dùng được (có warning)
  - Verified → Mọi người dùng được (không warning)
- **Scopes sensitive:** Gmail send scope cần verify nếu muốn bỏ warning
