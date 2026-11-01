import * as cheerio from "cheerio";
import {
  PageObservation,
  LinkObservation,
  ResourceObservation,
  Confidence,
} from "@/types";

export interface ParsedHtmlResult {
  title?: string;
  metaDescription?: string;
  canonicalCandidate?: string;
  robotsDirectives: string[];
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  visibleTextSample: string;
  visibleWordCount: number;
  language?: string;
  doctype?: string;
  encoding?: string;
  links: LinkObservation[];
  resources: ResourceObservation[];
  structuredData: any[];
  openGraph: Record<string, string>;
  favicon?: string;
  pageTemplateGuess?: string;
  templateConfidence: Confidence;
  analyticsSignals: {
    ga4Id?: string;
    gtmId?: string;
    hasMetaPixel: boolean;
    hasAdsPixel: boolean;
    hasConsentBanner: boolean;
    hasAiScripts: boolean;
  };
}

/**
 * Recursively bounds structured data entities to prevent memory/CPU exhaustion
 * from adversarial or pathological JSON-LD trees.
 * Enforces:
 * - Max recursion depth: 8
 * - Max keys per object: 100
 * - Max array items: 100
 * - Max string length: 10,000 characters
 */
function sanitizeStructuredValue(val: any, depth = 0): any {
  if (depth > 8) return null;
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return val.slice(0, 10000);
  if (typeof val === "number" || typeof val === "boolean") return val;

  if (Array.isArray(val)) {
    const boundedArr: any[] = [];
    const limit = Math.min(val.length, 100);
    for (let i = 0; i < limit; i++) {
      const sanitized = sanitizeStructuredValue(val[i], depth + 1);
      if (sanitized !== undefined) {
        boundedArr.push(sanitized);
      }
    }
    return boundedArr;
  }

  if (typeof val === "object") {
    const boundedObj: Record<string, any> = {};
    let keyCount = 0;
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        keyCount++;
        if (keyCount > 100) break;
        const sanitized = sanitizeStructuredValue(val[k], depth + 1);
        if (sanitized !== undefined) {
          boundedObj[k.slice(0, 100)] = sanitized;
        }
      }
    }
    return boundedObj;
  }

  return String(val).slice(0, 1000);
}

function sanitizeStructuredEntity(raw: any): Record<string, any> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const sanitized = sanitizeStructuredValue(raw, 0);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized) ? sanitized : null;
}

export function parsePageHtml(
  html: string,
  pageUrl: string,
  statusCode = 200,
  responseTimeMs = 0,
  headers: Record<string, string> = {}
): PageObservation {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(pageUrl);
  const baseHostname = parsedUrl.hostname.toLowerCase();

  // Content-Type and Document Type Detection
  const rawContentType = (headers["content-type"] || "").toLowerCase();
  const lowerPath = parsedUrl.pathname.toLowerCase();

  const isRobotsTxt = lowerPath.endsWith("/robots.txt") || lowerPath === "/robots.txt";
  const trimmedHtml = html.trim();
  const lowerHtml = trimmedHtml.toLowerCase();

  // Document body signatures
  const hasHtmlSignature =
    /^<!doctype\s+html/i.test(trimmedHtml) ||
    /^<html[\s>]/i.test(trimmedHtml) ||
    (lowerHtml.includes("<body") && lowerHtml.includes("</body"));
  const hasSitemapXmlTag =
    lowerHtml.includes("<urlset") ||
    lowerHtml.includes("<sitemapindex>") ||
    (lowerHtml.includes("<sitemap>") && lowerHtml.includes("<loc>"));
  const hasXmlProlog = trimmedHtml.startsWith("<?xml");
  const isXmlByHeader = rawContentType.includes("xml");
  const isXmlByExtension = lowerPath.endsWith(".xml");

  // Determine isXmlSitemap reliably:
  // Must NOT be classified as sitemap if it is actually an HTML document (e.g. HTML served at .xml path)
  const isXmlSitemap =
    hasSitemapXmlTag ||
    (!hasHtmlSignature && (isXmlByExtension || isXmlByHeader || hasXmlProlog) && (lowerHtml.includes("<url") || lowerHtml.includes("<sitemap")));

  let documentType: PageObservation["documentType"] = "html";
  if (statusCode >= 400) {
    documentType = "inaccessible";
  } else if (isRobotsTxt) {
    documentType = "robots_txt";
  } else if (isXmlSitemap) {
    documentType = "xml_sitemap";
  } else if (!hasHtmlSignature && (isXmlByHeader || hasXmlProlog || (isXmlByExtension && !hasHtmlSignature))) {
    documentType = "xml";
  } else if (
    rawContentType.includes("json") ||
    lowerPath.endsWith(".json") ||
    (!hasHtmlSignature && ((trimmedHtml.startsWith("{") && trimmedHtml.endsWith("}")) || (trimmedHtml.startsWith("[") && trimmedHtml.endsWith("]"))))
  ) {
    documentType = "api_json";
  } else if (rawContentType.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(lowerPath)) {
    documentType = "image";
  } else if (rawContentType.includes("pdf") || /\.(pdf|docx?|xlsx?|pptx?|zip|gz)$/i.test(lowerPath)) {
    documentType = "document";
  } else if (rawContentType.includes("javascript") || lowerPath.endsWith(".js")) {
    documentType = "script";
  } else if (!rawContentType.includes("html") && rawContentType !== "" && !hasHtmlSignature) {
    documentType = "other";
  } else {
    documentType = "html";
  }

  const isHtml = documentType === "html";

  // Helper for whitespace normalization
  const cleanText = (s?: string) => (s ? s.replace(/\s+/g, " ").trim() : undefined);

  // 1. Title & Meta Description (HTML only)
  const title = isHtml ? cleanText($("title").first().text()) : undefined;
  const metaDescription = isHtml ? (
    cleanText($('meta[name="description" i]').attr("content")) ||
    cleanText($('meta[property="og:description" i]').attr("content")) ||
    undefined
  ) : undefined;

  // 2. Canonical URL (HTML only)
  const canonicalCandidate = isHtml ? cleanText($('link[rel="canonical" i]').attr("href")) : undefined;

  // Viewport Meta Tag (HTML only)
  const metaViewport = isHtml ? cleanText($('meta[name="viewport" i]').attr("content")) : undefined;

  // Forms Extraction & Usability Analysis (HTML only)
  const forms: PageObservation["forms"] = [];
  const MAX_PARSED_FORMS = 200;
  if (isHtml) {
    $("form").each((idx, el) => {
      if (forms.length >= MAX_PARSED_FORMS) return false;
      const formId = $(el).attr("id") || `form_${idx}`;
      const rawAction = $(el).attr("action")?.trim() || "";
      const method = ($(el).attr("method") || "GET").toUpperCase();
      let isSecureAction = true;
      if (rawAction) {
        try {
          const resolvedAction = new URL(rawAction, pageUrl);
          isSecureAction = resolvedAction.protocol === "https:";
        } catch {
          isSecureAction = true;
        }
      } else {
        isSecureAction = pageUrl.startsWith("https://");
      }
      const hasPasswordInput = $(el).find('input[type="password" i]').length > 0;
      const inputs = $(el).find("input, select, textarea");
      const inputsCount = inputs.length;
      const unlabeledInputs = inputs.filter((_, inputEl) => {
        const type = $(inputEl).attr("type")?.toLowerCase();
        if (type === "hidden" || type === "submit" || type === "button") return false;
        const id = $(inputEl).attr("id");
        const hasAssociatedLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
        const hasParentLabel = $(inputEl).closest("label").length > 0;
        const hasAria = Boolean($(inputEl).attr("aria-label") || $(inputEl).attr("aria-labelledby") || $(inputEl).attr("placeholder"));
        return !hasAssociatedLabel && !hasParentLabel && !hasAria;
      });
      const hasLabels = unlabeledInputs.length === 0;
      const formText = $(el).text().toLowerCase();
      const isAuthForm = hasPasswordInput || formText.includes("login") || formText.includes("sign in") || formText.includes("register");
      forms.push({
        id: formId.slice(0, 255),
        action: rawAction.slice(0, 4096),
        method: method.slice(0, 20),
        isSecureAction,
        hasPasswordInput,
        inputsCount,
        hasLabels,
        isAuthForm,
      });
    });
  }

  // Theme & Observable Styling Clues
  const themeColor = !isXmlSitemap ? $('meta[name="theme-color" i]').attr("content")?.trim()?.slice(0, 100) : undefined;
  const htmlClass = $("html").attr("class") || "";
  const bodyClass = $("body").attr("class") || "";
  const hasDarkModeClass = Boolean(
    htmlClass.includes("dark") ||
    bodyClass.includes("dark") ||
    $("html").attr("data-theme")?.includes("dark") ||
    $("body").attr("data-theme")?.includes("dark")
  );
  const colorScheme = $('meta[name="color-scheme" i]').attr("content")?.trim()?.slice(0, 100);
  const themeClues = {
    themeColor,
    hasDarkModeClass,
    colorScheme,
  };

  // 3. Robots directives (bounded extraction)
  const robotsDirectives: string[] = [];
  const MAX_ROBOTS_DIRECTIVES = 100;
  const robotsMeta = $('meta[name="robots" i]').attr("content");
  if (robotsMeta) {
    robotsMeta.split(",").forEach((d) => {
      if (robotsDirectives.length < MAX_ROBOTS_DIRECTIVES) {
        robotsDirectives.push(d.trim().toLowerCase().slice(0, 500));
      }
    });
  }
  const xRobots = headers["x-robots-tag"];
  if (xRobots) {
    xRobots.split(",").forEach((d) => {
      if (robotsDirectives.length < MAX_ROBOTS_DIRECTIVES) {
        robotsDirectives.push(d.trim().toLowerCase().slice(0, 500));
      }
    });
  }

  // 4. Headings Outline (HTML only with bounded collection counts)
  const cleanHeading = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 2000);
  const headings = !isHtml
    ? { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }
    : {
        h1: $("h1").slice(0, 200).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
        h2: $("h2").slice(0, 500).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
        h3: $("h3").slice(0, 1000).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
        h4: $("h4").slice(0, 1000).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
        h5: $("h5").slice(0, 1000).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
        h6: $("h6").slice(0, 1000).map((_, el) => cleanHeading($(el).text())).get().filter(Boolean),
      };

  // 5. Visible Text & Word Count (HTML only)
  let visibleWordCount = 0;
  let visibleTextSample = "";
  if (isHtml) {
    const contentClone = $("body").clone();
    contentClone.find("script, style, noscript, svg, path, select, option").remove();
    const rawText = contentClone.text().replace(/\s+/g, " ").trim();
    visibleWordCount = rawText ? rawText.split(/\s+/).length : 0;
    visibleTextSample = rawText.slice(0, 500);
  }

  // 6. Language, doctype, encoding
  const language = $("html").attr("lang")?.trim() || undefined;
  const doctype = html.startsWith("<!DOCTYPE") || html.startsWith("<!doctype") ? "html5" : undefined;
  const encoding =
    $('meta[charset]').attr("charset")?.trim() ||
    $('meta[http-equiv="Content-Type" i]').attr("content") ||
    undefined;

  // 7. Links Extraction (bounded collection cap: 10,000)
  const links: LinkObservation[] = [];
  const MAX_PARSED_LINKS = 10000;
  $("a[href]").each((i, el) => {
    if (links.length >= MAX_PARSED_LINKS) return false;
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      return;
    }

    try {
      const resolved = new URL(rawHref, pageUrl);
      const resolvedHost = resolved.hostname.toLowerCase().replace(/^www\./, "");
      const baseHost = baseHostname.replace(/^www\./, "");
      const isInternal = resolvedHost === baseHost;
      const rel = $(el).attr("rel")?.trim()?.slice(0, 500);
      const anchorText = $(el).text().trim() || $(el).attr("title")?.trim() || "";

      links.push({
        id: `link_${i}_${resolved.pathname.replace(/[^a-zA-Z0-9]/g, "")}`.slice(0, 128),
        sourceUrl: pageUrl.slice(0, 4096),
        targetUrl: resolved.toString().slice(0, 4096),
        isInternal,
        anchorText: anchorText.slice(0, 2000),
        rel,
        isBroken: false,
        isRedirect: false,
      });
    } catch {
      // Ignore unparseable hrefs
    }
  });

  // 8. Resources Extraction (bounded collection cap: 5,000)
  const resources: ResourceObservation[] = [];
  const MAX_PARSED_RESOURCES = 5000;
  // Scripts
  $("script[src]").each((i, el) => {
    if (resources.length >= MAX_PARSED_RESOURCES) return false;
    const src = $(el).attr("src")?.trim();
    if (!src) return;
    try {
      const resolved = new URL(src, pageUrl);
      const isThirdParty = resolved.hostname.toLowerCase().replace(/^www\./, "") !== baseHostname.replace(/^www\./, "");
      resources.push({
        id: `script_${i}`.slice(0, 128),
        url: resolved.toString().slice(0, 4096),
        type: "script",
        isRenderBlocking: !$(el).attr("defer") && !$(el).attr("async"),
        isThirdParty,
      });
    } catch {}
  });

  // Stylesheets
  $('link[rel="stylesheet" i]').each((i, el) => {
    if (resources.length >= MAX_PARSED_RESOURCES) return false;
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    try {
      const resolved = new URL(href, pageUrl);
      const isThirdParty = resolved.hostname.toLowerCase().replace(/^www\./, "") !== baseHostname.replace(/^www\./, "");
      resources.push({
        id: `style_${i}`.slice(0, 128),
        url: resolved.toString().slice(0, 4096),
        type: "stylesheet",
        isRenderBlocking: true,
        isThirdParty,
      });
    } catch {}
  });

  // Images
  $("img[src]").each((i, el) => {
    if (resources.length >= MAX_PARSED_RESOURCES) return false;
    const src = $(el).attr("src")?.trim();
    if (!src) return;
    try {
      const resolved = new URL(src, pageUrl);
      const isThirdParty = resolved.hostname.toLowerCase().replace(/^www\./, "") !== baseHostname.replace(/^www\./, "");
      resources.push({
        id: `img_${i}`.slice(0, 128),
        url: resolved.toString().slice(0, 4096),
        type: "image",
        isRenderBlocking: false,
        isThirdParty,
      });
    } catch {}
  });

  // 9. Structured Data (JSON-LD bounded to max 200 entities, 500KB block size, depth 8, and element caps)
  const structuredData: any[] = [];
  const MAX_STRUCTURED_DATA = 200;
  const MAX_JSONLD_BYTES = 500 * 1024;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (structuredData.length >= MAX_STRUCTURED_DATA) return false;
    try {
      const content = $(el).html();
      if (content && content.length <= MAX_JSONLD_BYTES) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (structuredData.length < MAX_STRUCTURED_DATA) {
              const entity = sanitizeStructuredEntity(item);
              if (entity) structuredData.push(entity);
            }
          }
        } else {
          const entity = sanitizeStructuredEntity(parsed);
          if (entity) structuredData.push(entity);
        }
      }
    } catch {}
  });

  // 10. Open Graph & Public Tags (bounded to max 100 keys)
  const openGraph: Record<string, string> = {};
  const MAX_OPENGRAPH_KEYS = 100;
  let openGraphKeyCount = 0;
  $('meta[property^="og:" i]').each((_, el) => {
    if (openGraphKeyCount >= MAX_OPENGRAPH_KEYS) return false;
    const prop = $(el).attr("property")?.toLowerCase();
    const content = $(el).attr("content");
    if (prop && content && !openGraph[prop.slice(0, 100)]) {
      openGraph[prop.slice(0, 100)] = content.slice(0, 2000);
      openGraphKeyCount++;
    }
  });

  // Favicon
  const favicon =
    $('link[rel="icon" i]').attr("href") ||
    $('link[rel="shortcut icon" i]').attr("href") ||
    undefined;

  // 11. Page Template Guess
  let pageTemplateGuess = "content";
  let templateConfidence: Confidence = "LOW";
  const path = parsedUrl.pathname.toLowerCase();

  if (documentType === "xml_sitemap") {
    pageTemplateGuess = "sitemap";
    templateConfidence = "HIGH";
  } else if (documentType === "robots_txt") {
    pageTemplateGuess = "robots";
    templateConfidence = "HIGH";
  } else if (documentType === "api_json" || documentType === "image" || documentType === "document" || documentType === "xml") {
    pageTemplateGuess = documentType;
    templateConfidence = "HIGH";
  } else if (path === "/" || path === "") {
    pageTemplateGuess = "homepage";
    templateConfidence = "HIGH";
  } else if (path.includes("cart") || path.includes("checkout")) {
    pageTemplateGuess = "checkout";
    templateConfidence = "HIGH";
  } else if (path.includes("product") || path.includes("/p/") || path.includes("/item/")) {
    pageTemplateGuess = "product";
    templateConfidence = "MEDIUM";
  } else if (path.includes("category") || path.includes("collection") || path.includes("/c/")) {
    pageTemplateGuess = "category";
    templateConfidence = "MEDIUM";
  } else if (path.includes("blog") || path.includes("article") || path.includes("post") || path.includes("news")) {
    pageTemplateGuess = "blog";
    templateConfidence = "HIGH";
  } else if (path.includes("contact") || path.includes("about") || path.includes("privacy") || path.includes("terms")) {
    pageTemplateGuess = "informational";
    templateConfidence = "HIGH";
  }

  // 12. Parse Cookies from headers (bounded to max 500 cookies)
  const cookieAttributes: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite?: string }> = [];
  const MAX_PARSED_COOKIES = 500;
  const setCookie = headers["set-cookie"];
  if (setCookie) {
    const cookieStrings = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of cookieStrings) {
      if (cookieAttributes.length >= MAX_PARSED_COOKIES) break;
      const parts = c.split(";").map((p: string) => p.trim());
      const nameVal = (parts[0]?.split("=")[0] || "unknown").slice(0, 500);
      const secure = parts.some((p: string) => p.toLowerCase() === "secure");
      const httpOnly = parts.some((p: string) => p.toLowerCase() === "httponly");
      const sameSitePart = parts.find((p: string) => p.toLowerCase().startsWith("samesite="));
      const sameSite = sameSitePart ? sameSitePart.split("=")[1]?.slice(0, 50) : undefined;
      cookieAttributes.push({ name: nameVal, secure, httpOnly, sameSite });
    }
  }

  return {
    id: `page_${Buffer.from(pageUrl).toString("base64url").slice(0, 16)}`,
    requestedUrl: pageUrl,
    normalizedUrl: pageUrl,
    finalUrl: pageUrl,
    statusCode,
    responseTimeMs,
    contentType: headers["content-type"] || "text/html",
    redirectHistory: [],
    title,
    metaDescription,
    canonicalCandidate,
    robotsDirectives,
    headings,
    visibleTextSample,
    visibleWordCount,
    language,
    doctype,
    encoding,
    links,
    resources,
    structuredData,
    openGraph,
    favicon,
    headers,
    cookieAttributes,
    pageTemplateGuess,
    templateConfidence,
    discoveredAtDepth: 0,
    discoverySource: "entry",
    consoleErrors: [],
    isXmlSitemap,
    documentType,
    metaViewport,
    forms,
    themeClues,
  };
}
