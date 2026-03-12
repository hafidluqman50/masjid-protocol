"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BoardUI from "../ui";

function DashboardInner() {
  const params = useSearchParams();
  const masjidId = params.get("masjid_id") ?? undefined;
  return <BoardUI selectedMasjidId={masjidId} />;
}

export default function BoardDashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
