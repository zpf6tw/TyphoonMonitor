export interface PublicationPaper {
  year: string;
  conf: string;
  authors: string;
  title: string;
  url: string;
  downloadName: string;
}

const paperModules = import.meta.glob('../papers/*.pdf', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const parsePublicationFromPath = (filePath: string, url: string): PublicationPaper => {
  const filename = filePath.split('/').pop()?.replace(/\.pdf$/i, '') || '';
  const downloadName = `${filename
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || 'paper'}.pdf`;

  const matchWithAuthor = filename.match(/^(\d{4})_([^_]+)_([^_]+)_(.+)$/);
  if (matchWithAuthor) {
    return {
      year: matchWithAuthor[1],
      conf: matchWithAuthor[2],
      authors: matchWithAuthor[3],
      title: matchWithAuthor[4],
      url,
      downloadName,
    };
  }

  const matchWithoutAuthor = filename.match(/^(\d{4})_([^_]+)_(.+)$/);
  if (matchWithoutAuthor) {
    return {
      year: matchWithoutAuthor[1],
      conf: matchWithoutAuthor[2],
      authors: 'Lab Members',
      title: matchWithoutAuthor[3],
      url,
      downloadName,
    };
  }

  return {
    year: 'N/A',
    conf: 'Unknown',
    authors: 'Lab Members',
    title: filename,
    url,
    downloadName,
  };
};

export const PUBLICATION_PAPERS: PublicationPaper[] = Object.entries(paperModules)
  .map(([filePath, url]) => parsePublicationFromPath(filePath, url))
  .sort((a, b) => b.year.localeCompare(a.year));
