import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { PrivacyNotes } from "@/components/auth/PrivacyNotes";
import { Providers } from "../providers";

export default function LoginPage() {
  return (
    <Providers>
      <AuthShell
        aside={
          <div className="space-y-5">
            <p className="text-[11px] font-medium tracking-wider text-mute uppercase">Why this is private</p>
            <PrivacyNotes compact />
          </div>
        }
      >
        <LoginForm />
      </AuthShell>
    </Providers>
  );
}
