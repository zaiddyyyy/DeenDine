import type { HalalStatus } from "@/lib/restaurants";

export const STATUS_LABEL: Record<HalalStatus, string> = {
  zabiha: "Zabiha verified",
  halal: "Fully halal",
  "select-items": "Select items halal",
};

export const STATUS_DOT: Record<HalalStatus, string> = {
  zabiha: "bg-[#0f7254]",
  halal: "bg-[#1da774]",
  "select-items": "bg-[#c98a1f]",
};
