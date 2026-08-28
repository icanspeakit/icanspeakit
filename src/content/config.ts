import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    word: z.string().optional(),
    origin: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
