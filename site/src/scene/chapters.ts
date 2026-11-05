/** The six story chapters, in page order. Each is a `section#id[data-chapter]` in the page and a camera pose in the scene. */
export const CHAPTER_IDS = ['about', 'experience', 'ai', 'web', 'education', 'contact'] as const
export type ChapterId = (typeof CHAPTER_IDS)[number]

/**
 * Which side of the screen each chapter's content card sits on at desktop width (>= 1024, landscape); they alternate so the
 * opposite half of the viewport is open scene. The camera frames the subject in that open half. Tablet and phone stack.
 */
export type CardSide = 'left' | 'right'
export const CHAPTER_SIDES: Record<ChapterId, CardSide> = {
  about: 'left',
  experience: 'right',
  ai: 'left',
  web: 'right',
  education: 'left',
  contact: 'right',
}
