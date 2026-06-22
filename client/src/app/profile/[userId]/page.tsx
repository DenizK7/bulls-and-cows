"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProfileView } from "@/components/ProfileView";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();
  const myId = (session as { userId?: string })?.userId;

  return <ProfileView userId={userId} isOwn={myId === userId} />;
}
