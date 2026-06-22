"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProfileView } from "@/components/ProfileView";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const userId = (session as { userId?: string })?.userId;

  if (status === "loading" || !userId) {
    return <LoadingScreen />;
  }

  return <ProfileView userId={userId} isOwn />;
}
