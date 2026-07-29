export const VISIT_PHOTO_MAX_FILES = 5;
export const VISIT_PHOTO_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const VISIT_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type VisitPhotoAllowedContentType = (typeof VISIT_PHOTO_ALLOWED_TYPES)[number];
