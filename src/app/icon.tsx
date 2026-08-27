import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

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
          borderRadius: 7,
          color: "#D98A3A",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        m
      </div>
    ),
    size
  );
}
