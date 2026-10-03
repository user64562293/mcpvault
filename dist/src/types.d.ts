export interface ParsedNote {
    frontmatter: Record<string, any>;
    content: string;
    originalContent: string;
    matter?: string;
}
export interface NoteWriteParams {
    path: string;
    content: string;
    frontmatter?: Record<string, any>;
    mode?: 'overwrite' | 'append' | 'prepend';
    /** Images to save into the attachment folder alongside the note. */
    images?: NoteImageInput[];
    /** Folder for saved images, relative to vault root. Defaults to Obsidian's attachment setting, then "attachments". */
    attachmentFolder?: string;
}
export interface NoteImageInput {
    /** File name only, e.g. "diagram.png". */
    filename: string;
    /** Base64-encoded image bytes; a `data:image/...;base64,` prefix is accepted. */
    data: string;
    /** Append an `![[...]]` embed to the content unless it already embeds the file (default: true). */
    embed?: boolean;
}
export interface NoteWriteResult {
    /** Vault-relative paths of the images saved by this write. */
    images: string[];
}
export interface NoteImage {
    path: string;
    mimeType: string;
    /** Base64-encoded image bytes. */
    data: string;
}
export interface NoteImagesResult {
    images: NoteImage[];
    skipped: Array<{
        ref: string;
        error: string;
    }>;
}
export interface PatchNoteParams {
    path: string;
    oldString: string;
    newString: string;
    replaceAll?: boolean;
}
export interface PatchNoteResult {
    success: boolean;
    path: string;
    message: string;
    matchCount?: number;
}
export interface DeleteNoteParams {
    path: string;
    confirmPath: string;
    trashMode?: 'none' | 'local' | 'system';
}
export interface DeleteResult {
    success: boolean;
    path: string;
    message: string;
}
export interface DirectoryListing {
    files: string[];
    directories: string[];
}
export interface FrontmatterValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export interface PathFilterConfig {
    ignoredPatterns: string[];
    allowedExtensions: string[];
}
export interface SearchParams {
    query: string;
    limit?: number;
    searchContent?: boolean;
    searchFrontmatter?: boolean;
    caseSensitive?: boolean;
    /** Restrict the search to a vault subtree (directory prefix, e.g. "Projects/2026"). */
    pathPrefix?: string;
    /** Skip files under any of these subtrees (directory prefixes). */
    excludePaths?: string[];
}
export interface SearchResult {
    p: string;
    t: string;
    ex: string;
    mc: number;
    ln?: number;
    uri?: string;
}
export interface RankCandidate {
    result: SearchResult;
    termFreqs: Map<string, number>;
    docLength: number;
}
export interface MoveNoteParams {
    oldPath: string;
    newPath: string;
    overwrite?: boolean;
}
export interface MoveFileParams {
    oldPath: string;
    newPath: string;
    confirmOldPath: string;
    confirmNewPath: string;
    overwrite?: boolean;
}
export interface MoveResult {
    success: boolean;
    oldPath: string;
    newPath: string;
    message: string;
}
export interface BatchReadParams {
    paths: string[];
    includeContent?: boolean;
    includeFrontmatter?: boolean;
}
export interface BatchReadResult {
    successful: Array<{
        path: string;
        frontmatter?: Record<string, any>;
        content?: string;
        obsidianUri?: string;
    }>;
    failed: Array<{
        path: string;
        error: string;
    }>;
}
export interface UpdateFrontmatterParams {
    path: string;
    frontmatter: Record<string, any>;
    merge?: boolean;
}
export interface NoteInfo {
    path: string;
    size: number;
    modified: number;
    hasFrontmatter: boolean;
    obsidianUri?: string;
}
export interface TagManagementParams {
    path: string;
    operation: 'add' | 'remove' | 'list';
    tags?: string[];
}
export interface TagManagementResult {
    path: string;
    operation: string;
    tags: string[];
    success: boolean;
    message?: string;
}
export interface NoteHeading {
    level: number;
    text: string;
    line: number;
}
export interface ReadNoteLinesParams {
    path: string;
    startLine: number;
    endLine: number;
}
export interface VaultStats {
    totalNotes: number;
    totalFolders: number;
    totalSize: number;
    recentlyModified: Array<{
        path: string;
        modified: number;
    }>;
}
//# sourceMappingURL=types.d.ts.map