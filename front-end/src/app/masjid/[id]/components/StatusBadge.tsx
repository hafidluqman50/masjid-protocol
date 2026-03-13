import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-none inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Terverifikasi
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-none">
          Menunggu Verifikasi
        </Badge>
      );
    case "flagged":
      return (
        <Badge className="bg-red-100 text-red-800 border-none inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> Bermasalah
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-500 border-none">{status}</Badge>
      );
  }
}
