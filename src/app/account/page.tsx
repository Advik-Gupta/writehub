"use client";

import { AccountPage } from "@/components/account/AccountPage";
import { SessionGate } from "@/components/auth/SessionGate";
import { Providers } from "../providers";

export default function Account() {
  return (
    <Providers>
      <SessionGate>
        <AccountPage />
      </SessionGate>
    </Providers>
  );
}
