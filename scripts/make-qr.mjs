// Regenerates the waitlist QR code. Usage: node scripts/make-qr.mjs [url]
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";

const url = process.argv[2] ?? "https://reknit.co.uk/landing?src=qr#waitlist";
const opts = { errorCorrectionLevel: "Q", margin: 4, color: { dark: "#0E2A26", light: "#FFFFFF" } };

writeFileSync("public/brand/qr/reknit-waitlist-qr.svg", await QRCode.toString(url, { ...opts, type: "svg" }));
await QRCode.toFile("public/brand/qr/reknit-waitlist-qr.png", url, { ...opts, width: 1024 });
console.log("QR for", url);
