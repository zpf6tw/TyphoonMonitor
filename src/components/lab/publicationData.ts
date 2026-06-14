import publicationsData from '../../data/publications.json';
import type { ViewType } from '../../types';

export type PublicationType = 'journal' | 'conference' | 'preprint';

export type PublicationRecord = {
  id: string;
  slug: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  type: PublicationType;
  paperUrl: string;
  sourceCodeUrl: string;
  repositoryName: string;
  tags: string[];
  featured: boolean;
  featuredOrder: number;
  visualView?: ViewType;
};

export type PublicationYearGroup = {
  year: number;
  items: PublicationRecord[];
};

const typedPublications = publicationsData as PublicationRecord[];

const sortPublications = (a: PublicationRecord, b: PublicationRecord) => {
  if (b.year !== a.year) return b.year - a.year;
  if (a.featuredOrder !== b.featuredOrder) {
    return (a.featuredOrder || Number.MAX_SAFE_INTEGER) - (b.featuredOrder || Number.MAX_SAFE_INTEGER);
  }
  return a.title.localeCompare(b.title);
};

export const publications = [...typedPublications].sort(sortPublications);

export const featuredPublications = publications.slice(0, 6);

export const publicationsByYear: PublicationYearGroup[] = Array.from(
  publications.reduce<Map<number, PublicationRecord[]>>((groups, publication) => {
    const items = groups.get(publication.year) || [];
    items.push(publication);
    groups.set(publication.year, items);
    return groups;
  }, new Map())
).map(([year, items]) => ({
  year,
  items: items.sort(sortPublications),
})).sort((a, b) => b.year - a.year);

export const publicationTypeLabels: Record<PublicationType, string> = {
  journal: '期刊',
  conference: '会议',
  preprint: '预印本',
};
