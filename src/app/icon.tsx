import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * App icon: the goniometer mark from `components/brand/Logo`, on pine.
 *
 * Satori (which backs ImageResponse) renders only a subset of SVG as elements,
 * so the mark is handed over as a data URI image instead — that path renders
 * the vector faithfully at any size. The geometry is kept in step with
 * Logo.tsx by hand; it is four shapes and it changes approximately never.
 */
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<path d="M6 26H29" stroke="#F5F3ED" stroke-width="2.6" stroke-linecap="round"/>
<path d="M6 26 21.98 9.46" stroke="#F5F3ED" stroke-width="2.6" stroke-linecap="round"/>
<path d="M15.5 26A9.5 9.5 0 0 0 12.6 19.17" stroke="#D98A3A" stroke-width="2.8" stroke-linecap="round"/>
<circle cx="6" cy="26" r="3.5" fill="#D98A3A"/>
</svg>`;

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1C332B",
          borderRadius: 14,
        }}
      >
        <img
          width={46}
          height={46}
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`}
        />
      </div>
    ),
    size,
  );
}
