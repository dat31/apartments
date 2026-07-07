import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/seo";
import { loadOgFonts, OG_DARK, OG_SIZE, TowerMark } from "@/lib/og";

/* Site-wide social-share card (og:image fallback), one per locale. Detail
   pages have their own product-preview card (see apartments/[id]); every
   other page shares this one. Implements the "Dark — typographic (default)"
   frame from the "Danapa OG Images" Claude Design doc: tower mark + wordmark,
   headline with the city in brand green, district chips, and right-edge
   color bars. */

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Danapa — find your place in Đà Nẵng";

const C = OG_DARK;
const SAGE = "#7ea385"; // --sage-b
const SAND = "#bc957b"; // --sand-b

const DISTRICT_CHIPS = ["Hải Châu", "Sơn Trà", "Ngũ Hành Sơn"];

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const [t, fonts] = await Promise.all([
    getTranslations({ locale: lang, namespace: "meta" }),
    loadOgFonts(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: C.bg,
          color: C.fg,
          fontFamily: "Be Vietnam Pro",
        }}
      >
        {/* right-edge color bars */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: 20,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, backgroundColor: SAGE }} />
          <div style={{ flex: 1, backgroundColor: C.primary }} />
          <div style={{ flex: 1, backgroundColor: SAND }} />
        </div>

        <div
          style={{
            flex: 1,
            padding: 76,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <TowerMark size={60} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 600,
                  letterSpacing: -1.26,
                  lineHeight: 1,
                }}
              >
                Danapa
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 4.16,
                  marginTop: 8,
                  lineHeight: 1,
                  color: C.muted,
                }}
              >
                Đà Nẵng
              </div>
            </div>
          </div>

          {/* headline */}
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: 88,
                fontWeight: 600,
                letterSpacing: -3.1,
                lineHeight: 1.02,
                maxWidth: 720,
              }}
            >
              {t.rich("ogHeadline", {
                em: (chunks) => (
                  <span style={{ color: C.primary }}>{chunks}</span>
                ),
              })}
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.35,
                marginTop: 26,
                maxWidth: 620,
                color: C.muted,
              }}
            >
              {t("ogSub")}
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: -0.24,
                color: C.primary,
              }}
            >
              {new URL(SITE_URL).host}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {DISTRICT_CHIPS.map((name) => (
                <div
                  key={name}
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    padding: "9px 18px",
                    lineHeight: 1,
                    backgroundColor: C.accent,
                    color: C.fg,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [...fonts] }
  );
}
