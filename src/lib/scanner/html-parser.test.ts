import { describe, it, expect } from "vitest";
import { parsePageHtml } from "./html-parser";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Company A | Sustainable Apparel &amp; Organic Fashion</title>
  <meta name="description" content="Discover premium organic cotton clothes. Ethically made apparel with carbon-neutral shipping and zero waste.">
  <link rel="canonical" href="https://example.com/shop">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Company A Apparel">
  <link rel="stylesheet" href="/assets/style.css">
  <script src="https://www.googletagmanager.com/gtag/js?id=G-XYZ1234567"></script>
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Company A",
      "url": "https://example.com"
    }
  </script>
</head>
<body>
  <header>
    <h1>Sustainable Organic Clothing for Modern Living</h1>
    <nav>
      <a href="/shop">Shop Now</a>
      <a href="/about" rel="nofollow">About Us</a>
      <a href="https://partner.com" target="_blank">Partner Store</a>
    </nav>
  </header>
  <main>
    <h2>Winter Eco Collection</h2>
    <p>Explore our latest arrivals made from 100% GOTS certified organic materials. Perfect comfort with minimal ecological footprint.</p>
    <img src="/images/coat.jpg" alt="Recycled wool winter coat in olive green" width="600" height="400">
    <img src="/images/badge.png">
  </main>
</body>
</html>
`;

describe("html-parser", () => {
  it("extracts title, meta description, and canonical accurately", () => {
    const page = parsePageHtml(SAMPLE_HTML, "https://example.com/shop");
    expect(page.title).toBe("Company A | Sustainable Apparel & Organic Fashion");
    expect(page.metaDescription).toContain("Discover premium organic cotton clothes");
    expect(page.canonicalCandidate).toBe("https://example.com/shop");
    expect(page.robotsDirectives).toEqual(["index", "follow"]);
  });

  it("extracts headings hierarchy and visible text", () => {
    const page = parsePageHtml(SAMPLE_HTML, "https://example.com/shop");
    expect(page.headings.h1).toEqual(["Sustainable Organic Clothing for Modern Living"]);
    expect(page.headings.h2).toEqual(["Winter Eco Collection"]);
    expect(page.visibleWordCount).toBeGreaterThan(15);
    expect(page.visibleTextSample).toContain("Winter Eco Collection");
  });

  it("extracts internal and external links with rel attributes", () => {
    const page = parsePageHtml(SAMPLE_HTML, "https://example.com/shop");
    expect(page.links.length).toBe(3);

    const internalLinks = page.links.filter((l) => l.isInternal);
    expect(internalLinks.length).toBe(2);
    expect(internalLinks[0].targetUrl).toBe("https://example.com/shop");
    expect(internalLinks[1].rel).toBe("nofollow");

    const externalLinks = page.links.filter((l) => !l.isInternal);
    expect(externalLinks.length).toBe(1);
    expect(externalLinks[0].targetUrl).toBe("https://partner.com/");
  });

  it("extracts JSON-LD structured data and OpenGraph tags", () => {
    const page = parsePageHtml(SAMPLE_HTML, "https://example.com/shop");
    expect(page.structuredData.length).toBe(1);
    expect(page.structuredData[0]["@type"]).toBe("Organization");
    expect(page.structuredData[0].name).toBe("Company A");
    expect(page.openGraph["og:title"]).toBe("Company A Apparel");
  });

  it("extracts resources, images, and alt tags", () => {
    const page = parsePageHtml(SAMPLE_HTML, "https://example.com/shop");
    const images = page.resources.filter((r) => r.type === "image");
    expect(images.length).toBe(2);

    const scripts = page.resources.filter((r) => r.type === "script");
    expect(scripts.length).toBe(1);
    expect(scripts[0].isThirdParty).toBe(true);
  });

  it("treats apex and www subdomains as internal and not third-party", () => {
    const html = `
      <html>
        <head><script src="https://www.example.com/assets/app.js"></script></head>
        <body>
          <a href="https://www.example.com/products">Products</a>
          <a href="https://other.com/ext">External</a>
        </body>
      </html>
    `;
    const page = parsePageHtml(html, "https://example.com/home");
    const internal = page.links.filter((l) => l.isInternal);
    const external = page.links.filter((l) => !l.isInternal);
    expect(internal.length).toBe(1);
    expect(internal[0].targetUrl).toBe("https://www.example.com/products");
    expect(external.length).toBe(1);

    const script = page.resources.find((r) => r.type === "script");
    expect(script?.isThirdParty).toBe(false);
  });
});
