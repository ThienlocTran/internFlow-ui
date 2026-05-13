import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

type GoogleLoginButtonProps = {
  onClick: () => void;
};

export function GoogleLoginButton({ onClick }: GoogleLoginButtonProps) {
  return (
    <Button type="button" variant="outline" className="w-full bg-white" onClick={onClick}>
      <Chrome className="h-4 w-4" />
      Đăng nhập bằng Google
    </Button>
  );
}
