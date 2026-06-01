import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { profileSchema, type ProfileFormValues } from "@/features/auth/schemas/profile.schema";
import { updateProfile } from "@/services/user.service";
import { loginWithGoogle } from "@/services/auth.service";
import { getMissingProfileFields, isProfileComplete, profileFieldLabels } from "@/utils/profile-completeness";
import type { User } from "@/types/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Khai báo Google GSI types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number;
            }
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// Load Google GSI script một lần toàn cục
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Không tải được Google script.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google login."));
    document.head.appendChild(script);
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);

  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pendingCredential, setPendingCredential] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const gsiContainerRef = useRef<HTMLDivElement>(null);
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      email: profileEmail ?? "",
      fullName: pendingUser?.fullName ?? "",
      studentCode: pendingUser?.studentCode ?? "",
      studentClass: pendingUser?.studentClass ?? "",
      school: pendingUser?.school ?? "",
      phone: pendingUser?.phone ?? "",
    },
  });

  const profileMissingFields = pendingUser ? getMissingProfileFields(pendingUser) : [];


  const requireProfileCompletion = (user: User) => {
    setPendingUser(user);
    setProfileEmail(user.email);
    profileForm.reset({
      email: user.email,
      fullName: user.fullName ?? "",
      studentCode: user.studentCode ?? "",
      studentClass: user.studentClass ?? "",
      school: user.school ?? "",
      phone: user.phone ?? "",
    });
  };

  const handleCredential = async (credential: string) => {
    setLoginError(null);
    try {
      const user = await loginWithGoogle(credential);
      if (!hasCompleteProfile(user)) {
        setPendingCredential(credential);
        requireProfileCompletion(user);
        return;
      }
      setPendingCredential(null);
      setSession(user, credential);
      navigate(from, { replace: true });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Không thể đăng nhập Google.");
    }
  };

  // 1. Load script + initialize khi vào trang login
  useEffect(() => {
    if (profileEmail) return;
    if (!GOOGLE_CLIENT_ID) {
      setLoginError("Chưa cấu hình VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    loadGoogleScript()
      .then(() => {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: true,
          cancel_on_tap_outside: false,
          callback: (response) => {
            if (!response.credential) {
              setLoginError("Google không trả về token đăng nhập.");
              return;
            }
            void handleCredential(response.credential);
          },
        });
        setScriptReady(true);
      })
      .catch((err: unknown) => {
        setLoginError(
          err instanceof Error ? err.message : "Không tải được Google login."
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileEmail]);

  // 2. Render GSI button + kích hoạt One Tap khi script sẵn sàng
  useEffect(() => {
    if (!scriptReady || !gsiContainerRef.current) return;
    const container = gsiContainerRef.current;
    container.innerHTML = "";
    window.google?.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: container.offsetWidth || 320,
    });
    // One Tap — tự hiện card tài khoản trên desktop
    window.google?.accounts.id.prompt();
  }, [scriptReady]);

  const handleCreateProfile = async (values: ProfileFormValues) => {
    try {
      if (!pendingUser) throw new Error("Chưa có phiên Google để cập nhật hồ sơ.");
      const user = await updateProfile(pendingUser.id, values, pendingCredential);
      setSession(user, pendingCredential ?? undefined);
      navigate(from, { replace: true });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Không thể tạo hồ sơ");
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.10),_transparent_36rem),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_500px] lg:items-center">

          {/* Hero — desktop only */}
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Quản lý ca thực tập linh động
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-normal text-slate-950">
              InternFlow giúp sinh viên điểm danh và tự động hóa hồ sơ thực tập.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Mỗi sinh viên dùng Gmail riêng. Nếu chưa có hồ sơ, hệ thống sẽ yêu cầu nhập thông
              tin một lần để phục vụ điểm danh, báo cáo và gửi mail cuối ca.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {["Gmail riêng", "Hồ sơ một lần", "Dữ liệu đúng role"].map((item) => (
                <div key={item} className="rounded-lg border bg-white p-4 text-sm font-medium shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Card đăng nhập */}
          <Card className="glass-panel">
            <CardHeader className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                IF
              </div>
              <CardTitle className="text-2xl">
                {profileEmail ? "Tạo hồ sơ sinh viên" : "Đăng nhập InternFlow"}
              </CardTitle>
              <CardDescription>
                {profileEmail
                  ? "Email này chưa có hồ sơ. Nhập thông tin một lần để hệ thống tự động quản lý về sau."
                  : "Sinh viên đăng nhập bằng Gmail của mình. Admin và nhóm trưởng dùng email đã được cấp quyền."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {!profileEmail ? (
                <>
                  {/*
                    Google GSI renderButton tự render nút với avatar + tên tài khoản.
                    Skeleton hiện khi script chưa load xong.
                  */}
                  <div
                    ref={gsiContainerRef}
                    className="flex min-h-[44px] w-full items-center justify-center overflow-hidden rounded-md"
                  >
                    {!scriptReady && (
                      <div className="h-11 w-full animate-pulse rounded-md bg-slate-100" />
                    )}
                  </div>

                  {loginError && (
                    <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loginError}</p>
                  )}

                  <p className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-muted-foreground">
                    InternFlow chỉ cho đăng nhập bằng Google để đảm bảo đúng email thật của sinh viên.
                  </p>
                </>
              ) : (
                <form className="space-y-3" onSubmit={profileForm.handleSubmit(handleCreateProfile)}>
                  {profileMissingFields.length > 0 && (
                    <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                      Ho so thieu thong tin bat buoc cho mail cuoi ngay: {profileMissingFields.map((field) => profileFieldLabels[field] ?? field).join(", ")}.
                    </p>
                  )}
                  <Input readOnly className="bg-slate-100" {...profileForm.register("email")} />
                  <Input placeholder="Họ và tên" {...profileForm.register("fullName")} />
                  {profileForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.fullName.message}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="Mã số sinh viên" {...profileForm.register("studentCode")} />
                    <Input placeholder="Lớp" {...profileForm.register("studentClass")} />
                  </div>
                  <Input placeholder="Trường" {...profileForm.register("school")} />
                  <Input placeholder="Số điện thoại" {...profileForm.register("phone")} />
                  {Object.values(profileForm.formState.errors)[0]?.message && (
                    <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                      {Object.values(profileForm.formState.errors)[0]?.message}
                    </p>
                  )}
                  {loginError && (
                    <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loginError}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfileEmail(null);
                        setPendingCredential(null);
                        setLoginError(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Quay lại
                    </Button>
                    <Button type="submit">
                      Hoàn tất hồ sơ và vào app
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
