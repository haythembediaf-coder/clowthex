import { useEffect, useRef } from "react";
import { renderBarcodeToSvg } from "@/lib/barcode";

export function BarcodePreview({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value ? renderBarcodeToSvg(value) : "";
    }
  }, [value]);
  return <div ref={ref} className={className} />;
}
