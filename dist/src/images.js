/**
 * Pure helpers for image support in read_note / write_note: embed parsing,
 * filename validation, base64 decoding and magic-byte sniffing. No filesystem
 * access lives here — FileSystemService applies the vault security checks.
 */
/** Formats accepted by the major LLM vision APIs. */
export const IMAGE_MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_CALL = 10;
const SUPPORTED_EXTENSIONS = Object.keys(IMAGE_MIME_BY_EXT).join(', ');
/** MIME type for a path's image extension (case-insensitive), or undefined. */
export function getImageMimeType(path) {
    const dot = path.lastIndexOf('.');
    if (dot === -1 || dot < path.lastIndexOf('/')) {
        return undefined;
    }
    return IMAGE_MIME_BY_EXT[path.slice(dot).toLowerCase()];
}
/** Detect a supported image format from its leading bytes. */
export function sniffImageMimeType(buf) {
    const startsWith = (bytes, offset = 0) => buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);
    const ascii = (text) => Array.from(text, (c) => c.charCodeAt(0));
    if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        return 'image/png';
    if (startsWith([0xff, 0xd8, 0xff]))
        return 'image/jpeg';
    if (startsWith(ascii('GIF87a')) || startsWith(ascii('GIF89a')))
        return 'image/gif';
    if (startsWith(ascii('RIFF')) && startsWith(ascii('WEBP'), 8))
        return 'image/webp';
    return undefined;
}
/**
 * Validate a caller-supplied image filename. It must be a bare file name (the
 * folder comes from attachmentFolder), not hidden, free of characters that
 * break `![[...]]` links or are invalid on common filesystems, and carry a
 * supported image extension. Returns the trimmed name.
 */
export function validateImageFilename(raw) {
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw new Error('Image filename is required (e.g. "diagram.png").');
    }
    const name = raw.trim();
    if (name.includes('/') || name.includes('\\')) {
        throw new Error(`Invalid image filename: ${name}. Provide a file name only (no folders); use attachmentFolder to choose the folder.`);
    }
    if (name.startsWith('.')) {
        throw new Error(`Invalid image filename: ${name}. Hidden files (leading '.') are not allowed.`);
    }
    if (name.length > 255) {
        throw new Error(`Invalid image filename: ${name.slice(0, 50)}... File names are limited to 255 characters.`);
    }
    if (/[\x00-\x1f\[\]|#^*"<>:?]/.test(name)) {
        throw new Error(`Invalid image filename: ${name}. File names cannot contain control characters or any of [ ] | # ^ * " < > : ?`);
    }
    if (!getImageMimeType(name)) {
        throw new Error(`Unsupported image type: ${name}. Supported extensions: ${SUPPORTED_EXTENSIONS}.`);
    }
    return name;
}
/**
 * Decode base64 image data (an optional `data:image/...;base64,` prefix is
 * accepted) and verify the bytes are a supported image matching the
 * filename's extension.
 */
export function decodeBase64Image(data, filename) {
    if (typeof data !== 'string') {
        throw new Error(`Image data for ${filename} must be a base64-encoded string.`);
    }
    const payload = data.replace(/^data:[^,]*;base64,/i, '').replace(/\s+/g, '');
    if (payload === '') {
        throw new Error(`Image data for ${filename} is empty.`);
    }
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(payload) || payload.length % 4 === 1) {
        throw new Error(`Image data for ${filename} is not valid base64.`);
    }
    const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
    const decodedLength = Math.floor((payload.length * 3) / 4) - padding;
    if (decodedLength > MAX_IMAGE_BYTES) {
        throw new Error(`Image ${filename} is too large (${decodedLength} bytes). Maximum size is ${MAX_IMAGE_BYTES} bytes (5 MB).`);
    }
    const buffer = Buffer.from(payload, 'base64');
    const expected = getImageMimeType(filename);
    const actual = sniffImageMimeType(buffer);
    if (!actual) {
        throw new Error(`Image data for ${filename} is not a valid PNG, JPEG, GIF or WebP image.`);
    }
    if (actual !== expected) {
        throw new Error(`Image data for ${filename} is ${actual}, which does not match the file extension (expected ${expected}).`);
    }
    return { buffer, mimeType: actual };
}
const WIKI_EMBED = /!\[\[([^\[\]\n]+?)\]\]/g;
// Unbracketed targets may contain balanced parentheses, e.g. `image (1).png`
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\(\s*(<[^>\n]*>|(?:[^()\s]|\([^()\s]*\))+)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
function cleanWikiTarget(inner) {
    // Obsidian table cells escape the alias pipe as `\|`.
    const beforeAlias = inner.split('|')[0].replace(/\\$/, '');
    return beforeAlias.split('#')[0].trim();
}
function cleanMarkdownTarget(target) {
    let t = target.startsWith('<') && target.endsWith('>') ? target.slice(1, -1) : target;
    t = t.split('#')[0].split('?')[0].trim();
    try {
        t = decodeURIComponent(t);
    }
    catch {
        // Malformed escape sequence: keep the target as written
    }
    return t;
}
/**
 * Find local image embeds in markdown, in document order. Recognizes Obsidian
 * embeds (`![[pic.png]]`, `![[pic.png|300]]`) and markdown images
 * (`![alt](pic.png)`, `![](<my pic.png> "title")`). Skips URLs and other
 * schemes, non-image targets (note embeds), and anything inside fenced code
 * blocks — fences follow the same CommonMark rules as getNoteOutline.
 */
export function extractImageEmbeds(content) {
    const embeds = [];
    let inFence = false;
    let fenceChar = '';
    let fenceLength = 0;
    for (const rawLine of content.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        const fenceMatch = FENCE.exec(line);
        if (fenceMatch) {
            const markers = fenceMatch[1];
            const char = markers.charAt(0);
            if (!inFence) {
                inFence = true;
                fenceChar = char;
                fenceLength = markers.length;
            }
            else if (char === fenceChar && markers.length >= fenceLength && fenceMatch[2].trim() === '') {
                inFence = false;
            }
            continue;
        }
        if (inFence) {
            continue;
        }
        const found = [];
        for (const match of line.matchAll(WIKI_EMBED)) {
            const target = cleanWikiTarget(match[1]);
            found.push({ raw: match[0], target, kind: 'wiki', index: match.index });
        }
        for (const match of line.matchAll(MARKDOWN_IMAGE)) {
            const rawTarget = match[1];
            if (URL_SCHEME.test(rawTarget.replace(/^</, ''))) {
                continue;
            }
            found.push({ raw: match[0], target: cleanMarkdownTarget(rawTarget), kind: 'markdown', index: match.index });
        }
        found
            .filter((embed) => embed.target !== '' && getImageMimeType(embed.target))
            .sort((a, b) => a.index - b.index)
            .forEach(({ raw, target, kind }) => embeds.push({ raw, target, kind }));
    }
    return embeds;
}
