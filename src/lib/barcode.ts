import JsBarcode from "jsbarcode";

export function generateBarcodeValue(): string {
  // 12-digit numeric code (EAN-13 style, without check digit constraint; CODE128 compatible)
  const rnd = Math.floor(100000000 + Math.random() * 899999999).toString();
  return Date.now().toString().slice(-5) + rnd.slice(0, 7);
}

export function renderBarcodeToSvg(value: string): string {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  try {
    JsBarcode(svg, value, {
      format: "CODE128",
      lineColor: "#000",
      background: "#fff",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 8,
    });
  } catch {
    /* ignore */
  }
  return new XMLSerializer().serializeToString(svg);
}

export function printBarcode(value: string, productName: string) {
  const svg = renderBarcodeToSvg(value);
  const w = window.open("", "_blank", "width=400,height=300");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Barcode</title>
  <style>
    body{font-family:system-ui;margin:0;padding:16px;text-align:center}
    .label{padding:8px;border:1px dashed #ccc;display:inline-block}
    h3{margin:0 0 4px;font-size:14px}
    @media print{.label{border:none}}
  </style>
  </head><body>
  <div class="label">
    <h3>${escapeHtml(productName)}</h3>
    ${svg}
  </div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},200)}</script>
  </body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}
