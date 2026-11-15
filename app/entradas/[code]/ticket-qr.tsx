import QRCode from "qrcode";
import { isTicketCode } from "@/app/lib/tickets";

export default function TicketQr({ code }: { code: string }) {
  if (!isTicketCode(code)) throw new Error("Invalid ticket code");
  const { modules } = QRCode.create(code, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  const size = modules.size + quietZone * 2;
  const path: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.get(row, column)) path.push(`M${column + quietZone},${row + quietZone}h1v1h-1z`);
    }
  }
  return <svg role="img" aria-label="QR del código de tu entrada; el código también aparece como texto debajo" viewBox={`0 0 ${size} ${size}`} width="280" height="280" shapeRendering="crispEdges">
    <rect width={size} height={size} fill="#fff" />
    <path d={path.join("")} fill="#000" />
  </svg>;
}
