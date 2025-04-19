"use client";

import { Loader } from "@/components";
import { HomePage } from "@/components/HomePage";
import { Suspense } from "react";

// Use the top-level component directly, which already has its own Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={<Loader />}>
      <HomePage />
    </Suspense>
  );
}
