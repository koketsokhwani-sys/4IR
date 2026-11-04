import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PackageSelection,
  QueryPackageSelection,
} from "@/components/package-selection";

export const metadata: Metadata = {
  title: "Choose your website package",
  robots: { index: false, follow: true },
};

export default function GetStarted() {
  return (
    <Suspense fallback={<PackageSelection />}>
      <QueryPackageSelection />
    </Suspense>
  );
}
