import { ImageResponse } from "next/og";
import { BRAND_ACCENT, MARK } from "@/components/brand/Logo";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const ARM = "#F5F3ED";

/**
 * App icon: the woven-goniometer mark from `components/brand/Logo`, on night.
 *
 * Satori (which backs ImageResponse) renders only a subset of SVG as elements,
 * so the mark is handed over as a data URI image instead — that path renders
 * the vector, masks included, faithfully at any size. The geometry comes from
 * the same `MARK` constants the component uses.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<defs>
<mask id="o" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/><path d="${MARK.threadOverGap}" stroke="#000" stroke-width="${MARK.gapWidth}"/></mask>
<mask id="u" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#fff"/><path d="${MARK.threadUnderGap}" stroke="#000" stroke-width="${MARK.gapWidth}"/></mask>
</defs>
<path d="${MARK.referenceArm}" stroke="${ARM}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round" mask="url(#o)"/>
<path d="${MARK.movingArm}" stroke="${ARM}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round"/>
<path d="${MARK.thread}" stroke="${BRAND_ACCENT}" stroke-width="${MARK.strokeWidth}" stroke-linecap="round" mask="url(#u)"/>
<circle cx="${MARK.pivot.cx}" cy="${MARK.pivot.cy}" r="${MARK.pivot.r}" fill="${BRAND_ACCENT}"/>
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
          background: "#0E2A26",
          borderRadius: 14,
        }}
      >
        <img
          width={46}
          height={46}
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}`}
        />
      </div>
    ),
    size,
  );
}
