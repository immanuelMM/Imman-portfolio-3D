/** The six story chapters, in page order. Each is a `section#id[data-chapter]` in the page and a camera pose in the scene. */
export const CHAPTER_IDS = ['about', 'experience', 'ai', 'web', 'education', 'contact'] as const
export type ChapterId = (typeof CHAPTER_IDS)[number]
