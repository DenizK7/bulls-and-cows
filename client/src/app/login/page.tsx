"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import { BrandTitle } from "@/components/BrandTitle";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useT();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/lobby");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-80 h-80 bg-bull/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-cow/6 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[300px] bg-accent/5 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 glass-card rounded-2xl p-8 sm:p-10 max-w-sm w-full text-center"
      >
        <div className="mb-4">
          <BrandTitle size="md" />
        </div>

        <p className="text-text-muted mb-8">{t("login.signIn")}</p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/lobby" })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t("login.continueGoogle")}
        </button>

        <p className="text-text-dim text-xs mt-6">
          {t("login.noAccount")}
        </p>
      </motion.div>
    </div>
  );
}
