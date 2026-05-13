import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleLoginButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function GoogleLoginButton({ onClick, disabled }: GoogleLoginButtonProps) {
  return (
    <Button type="button" variant="outline" className="w-full bg-white" onClick={onClick} disabled={disabled}>
      <Chrome className="h-4 w-4" />
      {disabled ? "Đang mở Google..." : "Đăng nhập bằng Google"}
    </Button>
  );
}
