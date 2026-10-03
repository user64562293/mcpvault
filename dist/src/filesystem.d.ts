import { FrontmatterHandler } from './frontmatter.js';
import { PathFilter } from './pathfilter.js';
import type { ParsedNote, DirectoryListing, NoteWriteParams, NoteWriteResult, NoteImagesResult, DeleteNoteParams, DeleteResult, MoveNoteParams, MoveFileParams, MoveResult, BatchReadParams, BatchReadResult, UpdateFrontmatterParams, NoteInfo, TagManagementParams, TagManagementResult, PatchNoteParams, PatchNoteResult, VaultStats, NoteHeading, ReadNoteLinesParams } from './types.js';
/**
 * Map a filesystem write failure to a clear, accurate Error.
 *
 * Classifies by the Node error `code`, NOT by message substring. The old
 * substring matching (`message.includes('space')`) mislabeled any error whose
 * message merely contained "space" as a disk-full error, producing false
 * "No space left on device" reports (#109). Errors we threw ourselves with a
 * meaningful message (no `code`) pass through unchanged.
 */
export declare function classifyWriteError(error: unknown, path: string): Error;
export declare class FileSystemService {
    private vaultPath;
    private frontmatterHandler;
    private pathFilter;
    constructor(vaultPath: string, pathFilter?: PathFilter, frontmatterHandler?: FrontmatterHandler);
    /**
     * Normalize an incoming path to be vault-relative. Strips leading slashes
     * and the vault path prefix when a caller accidentally passes an absolute path
     * (e.g. "/Users/me/vault/wiki/note.md" instead of "wiki/note.md").
     */
    private normalizePath;
    private resolvePath;
    readNote(path: string): Promise<ParsedNote>;
    writeNote(params: NoteWriteParams): Promise<NoteWriteResult>;
    /**
     * Validate write_note images and resolve where each will be saved. Throws
     * on the first problem so a bad image never results in a partial write.
     */
    private prepareImages;
    /**
     * Resolve the folder new images are saved to: the caller's override, else
     * Obsidian's "Default location for new attachments" setting, else
     * "attachments". The setting is read internally — .obsidian stays
     * unreachable through the tools — and the result is validated like any
     * other path, so a hostile setting can't point outside the vault.
     */
    private resolveAttachmentFolder;
    private readObsidianAttachmentFolder;
    /**
     * Append an `![[...]]` embed for each image unless the content already
     * embeds a file with that name. Links use the bare filename when it is
     * unique in the vault (Obsidian's "shortest path") and the vault-relative
     * path otherwise, so the embed can't resolve to a different file.
     */
    private appendImageEmbeds;
    /**
     * Read the local images a note embeds (`![[pic.png]]`, `![](pic.png)`),
     * resolving targets the way Obsidian does: note-relative and vault-relative
     * paths, then a vault-wide filename match for bare names. Every candidate
     * passes the same path checks as other tools. Images that are missing,
     * restricted, too large, or not real images are reported in `skipped`
     * instead of failing the read.
     */
    readNoteImages(notePath: string, content: string): Promise<NoteImagesResult>;
    /** Vault-relative paths to try for an embed, in Obsidian's resolution order. */
    private imageCandidates;
    /**
     * Check a candidate image path against the vault security rules. Returns
     * `{ error }` when the path is not allowed, `{ found }` for an existing
     * file, and `{}` when nothing is there.
     */
    private locateImage;
    /**
     * Find vault files whose basename is in `names`, skipping restricted paths.
     * Each list is sorted root-first with an alphabetical tiebreak, matching
     * findPathForWikiLink.
     */
    private findFilesByName;
    patchNote(params: PatchNoteParams): Promise<PatchNoteResult>;
    listDirectory(path?: string): Promise<DirectoryListing>;
    exists(path: string): Promise<boolean>;
    isDirectory(path: string): Promise<boolean>;
    deleteNote(params: DeleteNoteParams): Promise<DeleteResult>;
    moveNote(params: MoveNoteParams): Promise<MoveResult>;
    moveFile(params: MoveFileParams): Promise<MoveResult>;
    readMultipleNotes(params: BatchReadParams): Promise<BatchReadResult>;
    updateFrontmatter(params: UpdateFrontmatterParams): Promise<void>;
    getNotesInfo(paths: string[]): Promise<NoteInfo[]>;
    manageTags(params: TagManagementParams): Promise<TagManagementResult>;
    getVaultPath(): string;
    /**
     * Resolve an Obsidian wiki link name to its vault-relative paths.
     * Scans the vault for exact filename matches (name + .md).
     *
     * A name containing `/` is path-qualified (Obsidian emits these when a
     * basename is ambiguous, e.g. [[folder/Note]]): it must match the full
     * vault-relative path instead of just the basename.
     *
     * Returns all matches sorted root-first (by path depth ascending), with
     * alphabetical tiebreak at equal depth. Empty array on zero matches.
     * The caller decides how to handle zero/single/multi — this function does
     * not throw on lookup outcomes.
     *
     * Throws only on caller misuse (empty name).
     */
    findPathForWikiLink(wikiLinkName: string): Promise<string[]>;
    getNoteOutline(path: string): Promise<NoteHeading[]>;
    readNoteLines(params: ReadNoteLinesParams): Promise<string>;
    getVaultStats(recentCount?: number): Promise<VaultStats>;
    listAllTags(): Promise<Array<{
        tag: string;
        count: number;
    }>>;
}
//# sourceMappingURL=filesystem.d.ts.map