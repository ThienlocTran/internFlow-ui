import { useNavigate, useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, loginWithEmail, loginAsDemo } = useAuthStore();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  const finishLogin = () => {
    loginWithGoogle();
    navigate(from, { replace: true });
  };

  const onSubmit = (values: LoginFormValues) => {
    loginWithEmail(values.email);
    navigate(from, { replace: true });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.10),_transparent_36rem),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Flexible internship attendance
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-normal text-slate-950">
              InternFlow keeps shifts, proof, and progress in one clean workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Built for flexible checkin, team leader quota, image proof, and weekly attendance tracking.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {["Google login", "Quota rules", "Team dashboard"].map((item) => (
                <div key={item} className="rounded-lg border bg-white p-4 text-sm font-medium shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <Card className="glass-panel">
            <CardHeader className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
                IF
              </div>
              <CardTitle className="text-2xl">Sign in to InternFlow</CardTitle>
              <CardDescription>Your admin email is already mapped for InternFlow access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <GoogleLoginButton onClick={finishLogin} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Demo mode</span>
                </div>
              </div>
              <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                  <Input placeholder="student@school.edu.vn" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="mt-2 text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <Button className="w-full" type="submit">
                  Continue as intern
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    loginAsDemo("TEAM_LEADER");
                    navigate("/dashboard", { replace: true });
                  }}
                >
                  Team leader
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    loginAsDemo("ADMIN");
                    navigate("/dashboard", { replace: true });
                  }}
                >
                  Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
