import { describe, it, expect } from "vitest";
import { extractYouTubeId, classifyJourneyLink, journeyLinkHref } from "../../src/lib/journeyLinks";

describe("extractYouTubeId", () => {
  it("parses standard watch URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses watch URLs with extra params", () => {
    expect(extractYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("parses youtu.be short links", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be short links with timestamps", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?t=30")).toBe("dQw4w9WgXcQ");
  });

  it("parses /shorts/ URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses /embed/ URLs", () => {
    expect(extractYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("parses /live/ URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses mobile host URLs", () => {
    expect(extractYouTubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeId("https://example.com/video/dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for plain text", () => {
    expect(extractYouTubeId("not a url")).toBeNull();
  });

  it("returns null for non-http protocols", () => {
    expect(extractYouTubeId("javascript:alert(1)")).toBeNull();
    expect(extractYouTubeId("ftp://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null when the v param is missing", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?list=PL123")).toBeNull();
  });
});

describe("classifyJourneyLink", () => {
  it("classifies YouTube links", () => {
    expect(classifyJourneyLink("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
  });

  it("classifies in-app paths as internal", () => {
    expect(classifyJourneyLink("/library/abc-123")).toBe("internal");
    expect(classifyJourneyLink("/challenges/xyz")).toBe("internal");
    expect(classifyJourneyLink("/rel-fi")).toBe("internal");
  });

  it("classifies other http URLs as external", () => {
    expect(classifyJourneyLink("https://example.com/reading")).toBe("external");
  });

  it("returns null for empty or missing links", () => {
    expect(classifyJourneyLink(null)).toBeNull();
    expect(classifyJourneyLink(undefined)).toBeNull();
    expect(classifyJourneyLink("")).toBeNull();
    expect(classifyJourneyLink("   ")).toBeNull();
  });
});

describe("journeyLinkHref", () => {
  it("keeps in-app paths as-is", () => {
    expect(journeyLinkHref("/library/abc")).toBe("/library/abc");
  });

  it("keeps absolute http(s) URLs as-is", () => {
    expect(journeyLinkHref("https://example.com/x")).toBe("https://example.com/x");
  });

  it("adds https:// to bare domains", () => {
    expect(journeyLinkHref("example.com/x")).toBe("https://example.com/x");
  });
});
