/* List-side counterpart of the map's "you are here" dot — same primary
   fill with a background ring. Decorative: the accompanying text carries
   the accessible name. */
export function RouteUserBadge({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="route-dot absolute inset-0 border-[3px] border-background bg-primary" />
    </span>
  );
}
