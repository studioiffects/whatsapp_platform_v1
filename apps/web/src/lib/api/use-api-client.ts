"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { ApiClient } from "./client";

export function useApiClient(): ApiClient | null {
  const { data } = useSession();

  return useMemo(() => {
    const token = data?.accessToken;
    if (!token) return null;
    return new ApiClient(token);
  }, [data?.accessToken]);
}
