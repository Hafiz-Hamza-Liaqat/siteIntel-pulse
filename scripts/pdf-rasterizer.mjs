import fs from "node:fs/promises";
import path from "node:path";

let cachedPdfjsCode = null;
let cachedWorkerCode = null;

async function getPdfjsAssets() {
  if (!cachedPdfjsCode || !cachedWorkerCode) {
    cachedPdfjsCode = await fs.readFile("node_modules/pdfjs-dist/build/pdf.min.mjs", "utf8");
    cachedWorkerCode = await fs.readFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "utf8");
  }
  return { pdfjsCode: cachedPdfjsCode, workerCode: cachedWorkerCode };
}

/**
 * Deterministically rasterizes every page of a PDF file using Mozilla PDF.js inside Playwright Chromium.
 *
 * @param {import("playwright").Browser} browser
 * @param {Buffer} pdfBuffer
 * @param {string} outputDir Directory where rasterized PNG images are saved
 * @param {string} filePrefix Prefix for generated image files
 * @param {number} scale Rasterization scale (default 1.5 for high-resolution A4)
 * @returns {Promise<{
 *   numPages: number,
 *   pages: Array<{
 *     pageNum: number,
 *     ptWidth: number,
 *     ptHeight: number,
 *     pixelWidth: number,
 *     pixelHeight: number,
 *     imagePath: string,
 *     imageSizeBytes: number,
 *     text: string,
 *     hasPageNumber: boolean,
 *     isBlank: boolean
 *   }>
 * }>}
 */
export async function rasterizePdf(browser, pdfBuffer, outputDir, filePrefix, scale = 1.5) {
  await fs.mkdir(outputDir, { recursive: true });

  const { pdfjsCode, workerCode } = await getPdfjsAssets();
  const page = await browser.newPage();

  try {
    // Set up HTML5 canvas page with embedded PDF.js and Web Worker
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module">
          ${pdfjsCode}
          window.pdfjsLib = globalThis.pdfjsLib;
          const workerBlob = new Blob([${JSON.stringify(workerCode)}], { type: 'application/javascript' });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
        </script>
      </head>
      <body>
        <canvas id="pdf-raster-canvas"></canvas>
      </body>
      </html>
    `);

    const base64Pdf = pdfBuffer.toString("base64");

    const evaluationResult = await page.evaluate(
      async ({ base64, renderScale }) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: bytes });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;

        const canvas = document.getElementById("pdf-raster-canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const pageRecords = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const pdfPage = await pdfDoc.getPage(pageNum);
          const baseViewport = pdfPage.getViewport({ scale: 1.0 });
          const scaledViewport = pdfPage.getViewport({ scale: renderScale });

          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          // Clear canvas before render
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await pdfPage.render({
            canvasContext: ctx,
            viewport: scaledViewport,
          }).promise;

          // Blank page detection: sample pixel data across canvas
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let nonWhitePixels = 0;
          // Sample every 4th pixel for speed
          for (let p = 0; p < data.length; p += 16) {
            const r = data[p];
            const g = data[p + 1];
            const b = data[p + 2];
            // If pixel is noticeably different from pure white
            if (r < 250 || g < 250 || b < 250) {
              nonWhitePixels++;
            }
          }

          const isBlank = nonWhitePixels < 50; // Fewer than 50 non-white pixels indicates an unrendered or blank page

          const dataUrl = canvas.toDataURL("image/png");
          const textContent = await pdfPage.getTextContent();
          const text = textContent.items.map((it) => it.str).join(" ");

          pageRecords.push({
            pageNum,
            ptWidth: baseViewport.width,
            ptHeight: baseViewport.height,
            pixelWidth: scaledViewport.width,
            pixelHeight: scaledViewport.height,
            dataUrl,
            text,
            isBlank,
            nonWhitePixelsSampled: nonWhitePixels,
          });
        }

        return { numPages, pageRecords };
      },
      { base64: base64Pdf, renderScale: scale }
    );

    const pages = [];
    for (const rec of evaluationResult.pageRecords) {
      if (rec.isBlank) {
        throw new Error(`Suspiciously blank PDF page detected! Page ${rec.pageNum} of ${filePrefix} contains almost no visible pixels (${rec.nonWhitePixelsSampled} non-white samples).`);
      }

      // Check page dimensions match A4 (595.28 x 841.89 pt within ±1.5 pt tolerance)
      if (rec.ptWidth < 594 || rec.ptWidth > 597 || rec.ptHeight < 840 || rec.ptHeight > 844) {
        throw new Error(`Page ${rec.pageNum} dimensions (${rec.ptWidth.toFixed(2)} x ${rec.ptHeight.toFixed(2)} pt) deviate from A4 standard.`);
      }

      // Save rasterized PNG to disk
      const base64Data = rec.dataUrl.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const imgFileName = `${filePrefix}-page-${rec.pageNum}.png`;
      const imgPath = path.join(outputDir, imgFileName);

      await fs.writeFile(imgPath, imageBuffer);
      const imgStat = await fs.stat(imgPath);

      if (imgStat.size < 8000) {
        throw new Error(`Rasterized page image ${imgPath} is suspiciously small (${imgStat.size} bytes).`);
      }

      // Enforceable page-number validation: validate expected page number and total page count
      // Strict regex matching exact pattern: "Page <pageNum> of <numPages>"
      const pageNumberPattern = new RegExp(`\\bPage\\s+${rec.pageNum}\\s+of\\s+${evaluationResult.numPages}\\b`, "i");
      const pageNumberingValid = pageNumberPattern.test(rec.text);

      if (!pageNumberingValid) {
        throw new Error(
          `Enforceable page-number validation failed on page ${rec.pageNum} of ${filePrefix}: ` +
          `Expected exact pattern "Page ${rec.pageNum} of ${evaluationResult.numPages}" in extracted text, but it was missing or incorrect.`
        );
      }

      pages.push({
        pageNum: rec.pageNum,
        ptWidth: rec.ptWidth,
        ptHeight: rec.ptHeight,
        pixelWidth: rec.pixelWidth,
        pixelHeight: rec.pixelHeight,
        imagePath: imgPath,
        imageFileName: imgFileName,
        imageSizeBytes: imgStat.size,
        text: rec.text,
        textLength: rec.text.length,
        hasPageNumber: true,
        pageNumberingValid: true,
        isBlank: rec.isBlank,
      });
    }

    // STRICT INVARIANT: Number of rendered page images MUST equal the actual PDF page count
    if (pages.length !== evaluationResult.numPages) {
      throw new Error(`Rasterized image count (${pages.length}) does not match PDF page count (${evaluationResult.numPages}).`);
    }

    return {
      numPages: evaluationResult.numPages,
      pages,
    };
  } finally {
    await page.close();
  }
}
