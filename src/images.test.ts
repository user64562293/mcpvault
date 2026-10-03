import { test, expect, describe } from "vitest";
import {
  MAX_IMAGE_BYTES,
  decodeBase64Image,
  extractImageEmbeds,
  getImageMimeType,
  sniffImageMimeType,
  validateImageFilename,
} from "./images.js";

// 1x1 transparent PNG
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF_BYTES = Buffer.from("GIF89a\x01\x00\x01\x00", "latin1");
const WEBP_BYTES = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x1a, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);

describe("getImageMimeType", () => {
  test("maps supported extensions case-insensitively", () => {
    expect(getImageMimeType("a.png")).toBe("image/png");
    expect(getImageMimeType("dir/a.JPG")).toBe("image/jpeg");
    expect(getImageMimeType("a.jpeg")).toBe("image/jpeg");
    expect(getImageMimeType("a.gif")).toBe("image/gif");
    expect(getImageMimeType("a.webp")).toBe("image/webp");
  });

  test("returns undefined for unsupported or missing extensions", () => {
    expect(getImageMimeType("a.svg")).toBeUndefined();
    expect(getImageMimeType("note.md")).toBeUndefined();
    expect(getImageMimeType("folder.png/file")).toBeUndefined();
    expect(getImageMimeType("noext")).toBeUndefined();
  });
});

describe("sniffImageMimeType", () => {
  test("detects each supported format from magic bytes", () => {
    expect(sniffImageMimeType(Buffer.from(PNG_BASE64, "base64"))).toBe("image/png");
    expect(sniffImageMimeType(JPEG_BYTES)).toBe("image/jpeg");
    expect(sniffImageMimeType(GIF_BYTES)).toBe("image/gif");
    expect(sniffImageMimeType(WEBP_BYTES)).toBe("image/webp");
  });

  test("rejects text, truncated, and RIFF non-WebP data", () => {
    expect(sniffImageMimeType(Buffer.from("not an image"))).toBeUndefined();
    expect(sniffImageMimeType(Buffer.from([0x89, 0x50]))).toBeUndefined();
    expect(sniffImageMimeType(Buffer.from("RIFF\x00\x00\x00\x00WAVE", "latin1"))).toBeUndefined();
    expect(sniffImageMimeType(Buffer.alloc(0))).toBeUndefined();
  });
});

describe("validateImageFilename", () => {
  test("accepts and trims plain image filenames", () => {
    expect(validateImageFilename("  photo 1.png ")).toBe("photo 1.png");
    expect(validateImageFilename("Pasted image 20250812140124.JPG")).toBe("Pasted image 20250812140124.JPG");
  });

  test("rejects folders, traversal, hidden files and link-breaking characters", () => {
    expect(() => validateImageFilename("a/b.png")).toThrow(/file name only/);
    expect(() => validateImageFilename("..\\b.png")).toThrow(/file name only/);
    expect(() => validateImageFilename("../x.png")).toThrow(/file name only/);
    expect(() => validateImageFilename(".hidden.png")).toThrow(/Hidden files/);
    expect(() => validateImageFilename("..png")).toThrow(/Hidden files/);
    expect(() => validateImageFilename("a|b.png")).toThrow(/cannot contain/);
    expect(() => validateImageFilename("a[1].png")).toThrow(/cannot contain/);
    expect(() => validateImageFilename("a#b.png")).toThrow(/cannot contain/);
    expect(() => validateImageFilename("a\nb.png")).toThrow(/cannot contain/);
  });

  test("rejects unsupported types and missing names", () => {
    expect(() => validateImageFilename("x.svg")).toThrow(/Unsupported image type/);
    expect(() => validateImageFilename("note.md")).toThrow(/Unsupported image type/);
    expect(() => validateImageFilename("")).toThrow(/filename is required/);
    expect(() => validateImageFilename(undefined)).toThrow(/filename is required/);
    expect(() => validateImageFilename(`${"a".repeat(260)}.png`)).toThrow(/255 characters/);
  });
});

describe("decodeBase64Image", () => {
  test("decodes plain base64 and data URLs", () => {
    const plain = decodeBase64Image(PNG_BASE64, "a.png");
    expect(plain.mimeType).toBe("image/png");
    expect(plain.buffer.equals(Buffer.from(PNG_BASE64, "base64"))).toBe(true);

    const dataUrl = decodeBase64Image(`data:image/png;base64,${PNG_BASE64}`, "a.png");
    expect(dataUrl.buffer.equals(plain.buffer)).toBe(true);
  });

  test("tolerates whitespace and line breaks in the payload", () => {
    const wrapped = PNG_BASE64.replace(/(.{20})/g, "$1\n");
    expect(decodeBase64Image(wrapped, "a.png").mimeType).toBe("image/png");
  });

  test("rejects empty, non-string and invalid base64", () => {
    expect(() => decodeBase64Image("", "a.png")).toThrow(/empty/);
    expect(() => decodeBase64Image(undefined, "a.png")).toThrow(/base64-encoded string/);
    expect(() => decodeBase64Image("not*base64!", "a.png")).toThrow(/not valid base64/);
  });

  test("rejects data that is not an image", () => {
    const text = Buffer.from("hello world").toString("base64");
    expect(() => decodeBase64Image(text, "a.png")).toThrow(/not a valid PNG, JPEG, GIF or WebP/);
  });

  test("rejects bytes that don't match the extension", () => {
    expect(() => decodeBase64Image(PNG_BASE64, "a.jpg")).toThrow(/does not match the file extension/);
    expect(decodeBase64Image(JPEG_BYTES.toString("base64"), "a.jpeg").mimeType).toBe("image/jpeg");
  });

  test("rejects images over the size limit before decoding", () => {
    const tooBig = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    tooBig.set(Buffer.from(PNG_BASE64, "base64"));
    expect(() => decodeBase64Image(tooBig.toString("base64"), "big.png")).toThrow(/too large/);
  });
});

describe("extractImageEmbeds", () => {
  test("finds wiki embeds and strips size, alias and fragment", () => {
    const embeds = extractImageEmbeds("![[a.png]] text ![[b.jpg|300]] ![[c.gif#section]]");
    expect(embeds).toEqual([
      { raw: "![[a.png]]", target: "a.png", kind: "wiki" },
      { raw: "![[b.jpg|300]]", target: "b.jpg", kind: "wiki" },
      { raw: "![[c.gif#section]]", target: "c.gif", kind: "wiki" },
    ]);
  });

  test("handles table-escaped pipes and path-qualified wiki embeds", () => {
    const embeds = extractImageEmbeds("| ![[img/a.png\\|200]] |");
    expect(embeds).toEqual([{ raw: "![[img/a.png\\|200]]", target: "img/a.png", kind: "wiki" }]);
  });

  test("finds markdown images with alt text, angle brackets, encoding and titles", () => {
    const content = [
      "![alt text](img/a.png)",
      "![](<my pic.png>)",
      "![](Pasted%20image.png)",
      '![x](b.webp "Title")',
    ].join("\n");
    expect(extractImageEmbeds(content).map((e) => e.target)).toEqual([
      "img/a.png",
      "my pic.png",
      "Pasted image.png",
      "b.webp",
    ]);
    expect(extractImageEmbeds(content).every((e) => e.kind === "markdown")).toBe(true);
  });

  test("allows balanced parentheses in unbracketed markdown targets", () => {
    const embeds = extractImageEmbeds('![](Pasted%20image%20(1).png) ![](b.png (title))');
    expect(embeds.map((e) => e.target)).toEqual(["Pasted image (1).png", "b.png"]);
  });

  test("keeps document order when wiki and markdown embeds share a line", () => {
    const embeds = extractImageEmbeds("![](first.png) ![[second.png]]");
    expect(embeds.map((e) => e.target)).toEqual(["first.png", "second.png"]);
  });

  test("skips remote URLs, data URIs and other schemes", () => {
    const content = [
      "![](https://example.com/a.png)",
      "![](http://example.com/b.png)",
      "![](data:image/png;base64,AAAA)",
      "![](file:///etc/c.png)",
      "![](<https://example.com/d.png>)",
    ].join("\n");
    expect(extractImageEmbeds(content)).toEqual([]);
  });

  test("skips note embeds and non-image files", () => {
    expect(extractImageEmbeds("![[Other note]] ![[doc.pdf]] ![](notes.md) [[pic.png]]")).toEqual([]);
  });

  test("ignores embeds inside backtick and tilde code fences", () => {
    const content = [
      "![[before.png]]",
      "```markdown",
      "![[in-backticks.png]]",
      "~~~",
      "![[still-inside.png]]",
      "```",
      "~~~~",
      "![](in-tildes.png)",
      "~~~~",
      "![[after.png]]",
    ].join("\n");
    expect(extractImageEmbeds(content).map((e) => e.target)).toEqual(["before.png", "after.png"]);
  });

  test("handles CRLF line endings", () => {
    expect(extractImageEmbeds("![[a.png]]\r\n![](b.png)\r\n").map((e) => e.target)).toEqual(["a.png", "b.png"]);
  });
});
