import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/dashboard/views/profile";
import { getCountryOptions } from "@/lib/countries";

export const metadata: Metadata = { title: "Basic Info" };

export default function Page() {
  return (
    <Suspense>
      <ProfileView countries={getCountryOptions()} />
    </Suspense>
  );
}
