import { AuthShell } from "@/components/auth/AuthShell";
import { SignupFlow } from "@/components/auth/SignupFlow";
import { Providers } from "../providers";

export default function SignupPage() {
  return (
    <Providers>
      <AuthShell>
        <SignupFlow />
      </AuthShell>
    </Providers>
  );
}
