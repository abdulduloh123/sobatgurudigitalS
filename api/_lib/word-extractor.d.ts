declare module 'word-extractor' {
  interface TextOptions { filterUnicode?: boolean }
  interface WordDocument {
    getBody(options?: TextOptions): string
    getTextboxes(options?: TextOptions & { includeHeadersAndFooters?: boolean; includeBody?: boolean }): string
  }
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<WordDocument>
  }
}
