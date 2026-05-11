declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: string | [number, number];
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    bufferPages?: boolean;
  }

  interface PDFDocument {
    pipe(destination: NodeJS.WritableStream): PDFDocument;
    fontSize(size: number): PDFDocument;
    text(text: string, options?: {
      align?: 'left' | 'center' | 'right';
      continued?: boolean;
    }): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    addPage(): PDFDocument;
    fillColor(color: string): PDFDocument;
    font(font: string): PDFDocument;
    end(): void;
    on(event: string, callback: Function): void;
    page: {
      height: number;
    };
    switchToPage(pageNumber: number): PDFDocument;
    bufferedPageRange(): {
      start: number;
      count: number;
    };
    y: number;
  }

  function PDFDocument(options?: PDFDocumentOptions): PDFDocument;
  export = PDFDocument;
}