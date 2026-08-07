import { z } from "zod";

/** Vendor / innovator — the Journey A actor (BUILD_SPEC §6). */
export const VendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  founder: z.string(),
  description: z.string(),
  website: z.string(),
});
export type Vendor = z.infer<typeof VendorSchema>;
