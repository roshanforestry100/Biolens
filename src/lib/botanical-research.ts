// Botanical research service.
//
// Queries multiple open botanical sources in parallel:
//   - Wikipedia / MediaWiki REST API (descriptions, characteristics)
//   - Wikimedia Commons (reference images)
//   - Plants of the World Online (POWO) - accepted names, distribution
//   - International Plant Names Index (IPNI) - nomenclatural records
//   - PubMed / NCBI E-utilities - scientific literature
//
// Each source is queried independently. One source failing does not
// prevent others from contributing. All failures are handled gracefully.

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const POWO_API = 'https://powo.science.kew.org/api/v2';
const IPNI_API = 'https://www.ipni.org/api/v1';
const PUBMED_API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_SUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

const USER_AGENT = 'BioLens/1.0 (contact: support@junglektak.in)';

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Wikipedia / MediaWiki
// ---------------------------------------------------------------------------

export interface WikipediaArticle {
  title: string;
  extract: string;
  extractHtml?: string;
  pageid: number;
  description?: string;
  thumbnail?: { url: string; width: number; height: number };
  categories: string[];
  url: string;
  sources: string[];
}

export async function fetchWikipediaArticle(
  scientificName: string,
): Promise<WikipediaArticle | null> {
  // First try page summary
  const summary = await fetchJson(
    `${WIKIPEDIA_SUMMARY}/${encodeURIComponent(scientificName)}`,
    { headers: { 'User-Agent': USER_AGENT } },
  );

  if (!summary || !summary.extract) {
    // Try MediaWiki search API
    const search = await fetchJson(
      `${WIKIPEDIA_API}?action=query&list=search&srsearch=${encodeURIComponent(scientificName)}&format=json&srlimit=5`,
      { headers: { 'User-Agent': USER_AGENT } },
    );

    if (!search?.query?.search?.[0]) return null;

    const pageTitle = search.query.search[0].title;
    const pageData = await fetchJson(
      `${WIKIPEDIA_API}?action=query&prop=extracts|pageprops|pageimages&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json&pithumbsize=400`,
      { headers: { 'User-Agent': USER_AGENT } },
    );

    if (!pageData?.query?.pages) return null;

    const page = Object.values(pageData.query.pages)[0] as any;
    if (!page?.extract) return null;

    return {
      title: page.title,
      extract: page.extract,
      pageid: page.pageid,
      description: page.description,
      thumbnail: page.thumbnail
        ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height }
        : undefined,
      categories: [],
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      sources: ['Wikipedia'],
    };
  }

  return {
    title: summary.title || scientificName,
    extract: summary.extract,
    pageid: summary.pageid || 0,
    description: summary.description,
    thumbnail: summary.thumbnail
      ? { url: summary.thumbnail.source, width: summary.thumbnail.width, height: summary.thumbnail.height }
      : undefined,
    categories: [],
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title || scientificName)}`,
    sources: ['Wikipedia'],
  };
}

// ---------------------------------------------------------------------------
// Wikimedia Commons (reference images)
// ---------------------------------------------------------------------------

export interface CommonsImage {
  title: string;
  url: string;
  description: string;
  license: string;
  taxon?: string;
}

export async function fetchCommonsImages(
  scientificName: string,
  limit: number = 5,
): Promise<CommonsImage[]> {
  const data = await fetchJson(
    `${COMMONS_API}?action=query&generator=search&gsearch=${encodeURIComponent(scientificName)}&gnamespace=6&gpslimit=${limit}&prop=imageinfo&iiparam=url&iiextractmetadata=1&format=json`,
    { headers: { 'User-Agent': USER_AGENT } },
  );

  if (!data?.query?.pages) return [];

  const images: CommonsImage[] = [];
  for (const page of Object.values(data.query.pages) as any[]) {
    const imageInfo = page.imageinfo?.[0];
    if (!imageInfo) continue;

    images.push({
      title: page.title,
      url: imageInfo.url || '',
      description: imageInfo.metadata?.ObjectDescription || '',
      license: imageInfo.metadata?.LicenseShortName || 'Unknown',
      taxon: scientificName,
    });
  }

  return images;
}

// ---------------------------------------------------------------------------
// Plants of the World Online (POWO)
// ---------------------------------------------------------------------------

export interface POWOResult {
  acceptedName: string;
  author: string;
  lsid?: string;
  family?: string;
  genus?: string;
  distribution?: string[];
  nativeDistribution?: string[];
  url?: string;
  sources: string[];
}

export async function fetchPOWO(
  scientificName: string,
): Promise<POWOResult | null> {
  const encoded = encodeURIComponent(scientificName);
  const data = await fetchJson(
    `${POWO_API}/search?q=${encoded}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!data?.results?.length) return null;

  const result = data.results[0];
  const lsid = result.lsid || result.id;

  // Fetch detailed record for distribution
  let distribution: string[] | undefined;
  let nativeDistribution: string[] | undefined;
  if (lsid) {
    const detail = await fetchJson(`${POWO_API}/record/${lsid}`);
    if (detail) {
      distribution = detail.distribution ? detail.distribution.split(';') : undefined;
      nativeDistribution = detail.nativeDistribution ? detail.nativeDistribution.split(';') : undefined;
    }
  }

  return {
    acceptedName: result.scientificName || scientificName,
    author: result.author || '',
    lsid,
    family: result.family,
    genus: result.genus,
    distribution,
    nativeDistribution,
    url: lsid ? `https://powo.science.kew.org/result/${lsid}` : undefined,
    sources: ['Plants of the World Online (Kew)'],
  };
}

// ---------------------------------------------------------------------------
// International Plant Names Index (IPNI)
// ---------------------------------------------------------------------------

export interface IPNIResult {
  name: string;
  author?: string;
  publishedIn?: string;
  year?: number;
  type?: string;
  rank?: string;
  sources: string[];
}

export async function fetchIPNI(
  scientificName: string,
): Promise<IPNIResult | null> {
  const encoded = encodeURIComponent(scientificName);
  const data = await fetchJson(
    `${IPNI_API}/names?query=${encoded}&limit=5`,
    { headers: { Accept: 'application/json' } },
  );

  if (!data?.results?.length) return null;

  const result = data.results[0];
  return {
    name: result.name || scientificName,
    author: result.author,
    publishedIn: result.publishedIn,
    year: result.year,
    type: result.type,
    rank: result.rank,
    sources: ['International Plant Names Index'],
  };
}

// ---------------------------------------------------------------------------
// PubMed / NCBI E-utilities
// ---------------------------------------------------------------------------

export interface PubMedResult {
  pmid: string;
  title: string;
  abstract?: string;
  journal?: string;
  year?: number;
  doi?: string;
  url: string;
  sources: string[];
}

export async function fetchPubMed(
  scientificName: string,
  limit: number = 5,
): Promise<PubMedResult[]> {
  const encoded = encodeURIComponent(scientificName);
  const searchData = await fetchJson(
    `${PUBMED_API}?db=pubmed&term=${encoded}&retmax=${limit}&retmode=json`,
  );

  if (!searchData?.esearchresult?.idlist?.length) return [];

  const pmids = searchData.esearchresult.idlist;

  // Fetch summaries
  const summaryData = await fetchJson(
    `${PUBMED_SUMMARY}?db=pubmed&id=${pmids.join(',')}&retmode=json`,
  );

  if (!summaryData?.result) return [];

  const results: PubMedResult[] = [];
  for (const pmid of pmids) {
    const item = summaryData.result[pmid];
    if (!item) continue;

    results.push({
      pmid,
      title: item.title || '',
      abstract: item.publicationstatus ? `Status: ${item.publicationstatus}` : undefined,
      journal: item.fulljournalname || item.source,
      year: item.pubdate ? parseInt(item.pubdate, 10) : undefined,
      doi: item.elocationid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      sources: ['PubMed / NCBI'],
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Aggregate all botanical sources in parallel
// ---------------------------------------------------------------------------

export interface BotanicalResearchPackage {
  scientificName: string;
  wikipedia: WikipediaArticle | null;
  commonsImages: CommonsImage[];
  powo: POWOResult | null;
  ipni: IPNIResult | null;
  pubmed: PubMedResult[];
  sources: string[];
  retrievalErrors: string[];
}

/**
 * Query all botanical sources in parallel for a resolved scientific name.
 * Returns a unified research package with provenance tracking.
 */
export async function collectBotanicalResearch(
  scientificName: string,
): Promise<BotanicalResearchPackage> {
  const retrievalErrors: string[] = [];
  const allSources: string[] = [];

  const [wiki, commons, powo, ipni, pubmed] = await Promise.allSettled([
    fetchWikipediaArticle(scientificName).catch((err) => {
      retrievalErrors.push(`Wikipedia: ${err.message}`);
      return null;
    }),
    fetchCommonsImages(scientificName).catch((err) => {
      retrievalErrors.push(`Wikimedia Commons: ${err.message}`);
      return [];
    }),
    fetchPOWO(scientificName).catch((err) => {
      retrievalErrors.push(`POWO: ${err.message}`);
      return null;
    }),
    fetchIPNI(scientificName).catch((err) => {
      retrievalErrors.push(`IPNI: ${err.message}`);
      return null;
    }),
    fetchPubMed(scientificName).catch((err) => {
      retrievalErrors.push(`PubMed: ${err.message}`);
      return [];
    }),
  ]);

  const wikipedia = wiki.status === 'fulfilled' ? wiki.value : null;
  const commonsImages = commons.status === 'fulfilled' ? commons.value : [];
  const powoResult = powo.status === 'fulfilled' ? powo.value : null;
  const ipniResult = ipni.status === 'fulfilled' ? ipni.value : null;
  const pubmedResults = pubmed.status === 'fulfilled' ? pubmed.value : [];

  if (wikipedia) allSources.push(...wikipedia.sources);
  if (commonsImages.length > 0) allSources.push('Wikimedia Commons');
  if (powoResult) allSources.push(...powoResult.sources);
  if (ipniResult) allSources.push(...ipniResult.sources);
  if (pubmedResults.length > 0) allSources.push(...pubmedResults[0].sources);

  return {
    scientificName,
    wikipedia,
    commonsImages,
    powo: powoResult,
    ipni: ipniResult,
    pubmed: pubmedResults,
    sources: Array.from(new Set(allSources)),
    retrievalErrors,
  };
}
