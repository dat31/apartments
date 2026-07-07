/** Renders a schema.org JSON-LD block. Server component — the script tag is
    part of the prerendered HTML. `<` is escaped so listing-provided text can
    never close the script tag. */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
