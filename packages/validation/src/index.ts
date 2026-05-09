import { z } from "zod";

export const basicIntakeSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["M", "F", "U"]),
  birthDatetime: z.string().min(1),
  birthPlace: z.string().min(1),
});

export type BasicIntakeInput = z.infer<typeof basicIntakeSchema>;

