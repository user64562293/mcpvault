/**
 * Pure helpers for image support in read_note / write_note: embed parsing,
 * filename validation, base64 decoding and magic-byte sniffing. No filesystem
 * access lives here — FileSystemService applies the vault security checks.
 */
/** Formats accepted by the major LLM vision APIs. */
export declare const IMAGE_MIME_BY_EXT: Readonly<Record<string, string>>;
export declare const MAX_IMAGE_BYTES: number;
export declare const MAX_IMAGES_PER_CALL = 10;
export interface ImageEmbed {
    /** The embed exactly as written in the note, e.g. `![[pic.png|300]]`. */
    raw: string;
    /** Link target with size/alias, fragment and title stripped; URI-decoded for markdown. */
    target: string;
    kind: 'wiki' | 'markdown';
}
/** MIME type for a path's image extension (case-insensitive), or undefined. */
export declare function getImageMimeType(path: string): string | undefined;
/** Detect a supported image format from its leading bytes. */
export declare function sniffImageMimeType(buf: Uint8Array): string | undefined;
/**
 * Validate a caller-supplied image filename. It must be a bare file name (the
 * folder comes from attachmentFolder), not hidden, free of characters that
 * break `![[...]]` links or are invalid on common filesystems, and carry a
 * supported image extension. Returns the trimmed name.
 */
export declare function validateImageFilename(raw: unknown): string;
/**
 * Decode base64 image data (an optional `data:image/...;base64,` prefix is
 * accepted) and verify the bytes are a supported image matching the
 * filename's extension.
 */
export declare function decodeBase64Image(data: unknown, filename: string): {
    buffer: Buffer;
    mimeType: string;
};
/**
 * Find local image embeds in markdown, in document order. Recognizes Obsidian
 * embeds (`![[pic.png]]`, `![[pic.png|300]]`) and markdown images
 * (`![alt](pic.png)`, `![](<my pic.png> "title")`). Skips URLs and other
 * schemes, non-image targets (note embeds), and anything inside fenced code
 * blocks — fences follow the same CommonMark rules as getNoteOutline.
 */
export declare function extractImageEmbeds(content: string): ImageEmbed[];
//# sourceMappingURL=images.d.ts.map