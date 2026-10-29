import { useEffect, useState } from 'react';
import { isPdf, docxToHtml } from '../lib/readFile.js';

export default function FileViewer({ file }) {
  const [url, setUrl] = useState(null);
  const [html, setHtml] = useState('');
  useEffect(() => {
    if (!file) return;
    if (isPdf(file)) {
      const u = URL.createObjectURL(file);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
    docxToHtml(file).then(setHtml).catch(() => setHtml('<p>Hujjatni ko\'rsatib bo\'lmadi</p>'));
  }, [file]);
  if (!file) return <div className="empty">Fayl tanlanmagan</div>;
  return url ? (
    <iframe className="viewer" src={url} title={file.name} />
  ) : (
    <div className="viewer docx" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
