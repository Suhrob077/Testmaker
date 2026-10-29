import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const isPdf = (f) => /\.pdf$/i.test(f.name);
export const isDocx = (f) => /\.docx$/i.test(f.name);

/** PDF/DOCX → oddiy matn (qatorma-qator) */
export async function readText(file) {
  const buf = await file.arrayBuffer();
  if (isPdf(file)) {
    const pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
    let out = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      let lastY = null;
      let line = '';
      for (const it of content.items) {
        if (!('str' in it)) continue;
        const y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) { out += line + '\n'; line = ''; }
        line += it.str;
        lastY = y;
      }
      out += line + '\n';
    }
    return out;
  }
  if (isDocx(file)) {
    const r = await mammoth.extractRawText({ arrayBuffer: buf });
    return r.value;
  }
  throw new Error('Faqat .pdf va .docx fayllar qo\'llab-quvvatlanadi');
}

export async function docxToHtml(file) {
  const r = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return r.value;
}
