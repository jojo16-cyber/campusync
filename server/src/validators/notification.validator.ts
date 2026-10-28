import { z } from 'zod';

export const queryNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  unreadOnly: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;
