"use client";

import { Loader } from "@/components";
import { HomePageContent } from "@/components/HomePage";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<Loader />}>
      <HomePageContent />
    </Suspense>
  );
}
