"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BikeLoader } from "@/components/bike-loader";
import { useAuth } from "@/components/auth-provider";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? "/dashboard/" : "/login/");
  }, [ready, user, router]);
  return (
    <div className="grid min-h-svh place-items-center">
      <BikeLoader className="w-56 sm:w-72" />
    </div>
  );
}
