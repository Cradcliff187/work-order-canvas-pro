// Google Vision API spatial data extraction and processing

export interface BoundingPoly {
  vertices: Array<{ x: number; y: number }>;
}

export interface Word {
  boundingBox: BoundingPoly;
  text: string;
  confidence: number;
}

export interface Paragraph {
  boundingBox: BoundingPoly;
  words: Word[];
  text: string;
  confidence: number;
}

export interface Block {
  boundingBox: BoundingPoly;
  paragraphs: Paragraph[];
  text: string;
  confidence: number;
  blockType: string;
}

export interface Page {
  width: number;
  height: number;
  blocks: Block[];
  confidence: number;
}

export interface VisionApiResponse {
  pages: Page[];
  text: string;
  confidence: number;
}

// Parse Google Vision API fullTextAnnotation response
export function parseVisionApiResponse(visionData: any): VisionApiResponse {
  const response = visionData.responses?.[0];
  
  if (!response?.fullTextAnnotation) {
    throw new Error('No fullTextAnnotation found in Vision API response');
  }

  const fullTextAnnotation = response.fullTextAnnotation;
  const pages: Page[] = fullTextAnnotation.pages?.map((page: any) => ({
    width: page.width || 0,
    height: page.height || 0,
    confidence: page.confidence || 0,
    blocks: page.blocks?.map((block: any) => ({
      boundingBox: block.boundingBox,
      blockType: block.blockType || 'TEXT',
      confidence: block.confidence || 0,
      text: extractTextFromBlock(block),
      paragraphs: block.paragraphs?.map((paragraph: any) => ({
        boundingBox: paragraph.boundingBox,
        confidence: paragraph.confidence || 0,
        text: extractTextFromParagraph(paragraph),
        words: paragraph.words?.map((word: any) => ({
          boundingBox: word.boundingBox,
          confidence: word.confidence || 0,
          text: word.symbols?.map((s: any) => s.text).join('') || ''
        })) || []
      })) || []
    })) || []
  })) || [];

  return {
    pages,
    text: fullTextAnnotation.text || '',
    confidence: response.confidence || 0
  };
}

function extractTextFromBlock(block: any): string {
  return block.paragraphs?.map((p: any) => 
    p.words?.map((w: any) => 
      w.symbols?.map((s: any) => s.text).join('')
    ).join(' ')
  ).join('\n') || '';
}

function extractTextFromParagraph(paragraph: any): string {
  return paragraph.words?.map((w: any) => 
    w.symbols?.map((s: any) => s.text).join('')
  ).join(' ') || '';
}

// Extract all words with confidence filtering
export function getAllWords(visionResponse: VisionApiResponse, minConfidence: number = 0.5): Word[] {
  const words: Word[] = [];
  
  for (const page of visionResponse.pages) {
    for (const block of page.blocks) {
      for (const paragraph of block.paragraphs) {
        for (const word of paragraph.words) {
          if (word.confidence >= minConfidence && word.text.trim()) {
            words.push(word);
          }
        }
      }
    }
  }
  
  return words;
}

// Get blocks in top percentage of document (for merchant name extraction)
export function getTopBlocks(visionResponse: VisionApiResponse, percentage: number = 0.2): Block[] {
  if (visionResponse.pages.length === 0) return [];
  
  const page = visionResponse.pages[0];
  const cutoffY = page.height * percentage;
  
  return page.blocks.filter(block => {
    const topY = Math.min(...block.boundingBox.vertices.map(v => v.y));
    return topY <= cutoffY;
  });
}

// Calculate font size approximation from bounding box
export function calculateFontSize(boundingBox: BoundingPoly): number {
  const heights = boundingBox.vertices.map(v => v.y);
  return Math.max(...heights) - Math.min(...heights);
}

// Check if two bounding boxes overlap horizontally (same line)
export function isSameHorizontalLine(box1: BoundingPoly, box2: BoundingPoly, tolerance: number = 10): boolean {
  const y1_center = (Math.max(...box1.vertices.map(v => v.y)) + Math.min(...box1.vertices.map(v => v.y))) / 2;
  const y2_center = (Math.max(...box2.vertices.map(v => v.y)) + Math.min(...box2.vertices.map(v => v.y))) / 2;
  
  return Math.abs(y1_center - y2_center) <= tolerance;
}

// Get rightmost x-coordinate of bounding box
export function getRightmostX(boundingBox: BoundingPoly): number {
  return Math.max(...boundingBox.vertices.map(v => v.x));
}

// Get leftmost x-coordinate of bounding box
export function getLeftmostX(boundingBox: BoundingPoly): number {
  return Math.min(...boundingBox.vertices.map(v => v.x));
}

// Calculate distance between two bounding boxes
export function calculateDistance(box1: BoundingPoly, box2: BoundingPoly): number {
  const center1 = {
    x: box1.vertices.reduce((sum, v) => sum + v.x, 0) / box1.vertices.length,
    y: box1.vertices.reduce((sum, v) => sum + v.y, 0) / box1.vertices.length
  };
  
  const center2 = {
    x: box2.vertices.reduce((sum, v) => sum + v.x, 0) / box2.vertices.length,
    y: box2.vertices.reduce((sum, v) => sum + v.y, 0) / box2.vertices.length
  };
  
  return Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2));
}