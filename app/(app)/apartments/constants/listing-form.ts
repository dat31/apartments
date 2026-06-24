/* Static options for the listing form (create / edit). */

/* District enum + labels now live in the domain layer (@/schemas/listing)
   so seed data and schemas can share them. Re-exported here for the form. */
export { District, DISTRICT_LABELS, DISTRICTS } from "@/schemas/listing";

export const BED_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const BATH_OPTIONS = [1, 2, 3, 4] as const;
