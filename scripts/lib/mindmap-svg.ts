export interface MindMapNode {
  name: string;
  children?: MindMapNode[];
  height?: number;
  x?: number;
  y?: number;
}

interface NodeColor {
  fill: string;
  stroke: string;
}

const ROW_HEIGHT = 24;
const HORIZONTAL_GAP = 250;

const colors: NodeColor[] = [
  { fill: 'rgba(8, 51, 68, 0.4)', stroke: '#22d3ee' },
  { fill: 'rgba(6, 78, 59, 0.4)', stroke: '#34d399' },
  { fill: 'rgba(76, 29, 149, 0.4)', stroke: '#a78bfa' },
  { fill: 'rgba(120, 53, 15, 0.3)', stroke: '#fbbf24' },
];

export function toLeafNodes(names: string[]): MindMapNode[] {
  return names.map((name) => ({ name }));
}

function calculateSize(node: MindMapNode): number {
  if (!node.children || node.children.length === 0) {
    node.height = ROW_HEIGHT;
  } else {
    node.height = node.children.reduce((sum, child) => sum + calculateSize(child), 0);
  }

  return Math.max(node.height ?? ROW_HEIGHT, ROW_HEIGHT);
}

function calculatePositions(node: MindMapNode, x: number, y: number, depth: number): void {
  node.x = x;
  node.y = y + (node.height ?? ROW_HEIGHT) / 2;

  if (!node.children) {
    return;
  }

  let currentY = y;

  for (const child of node.children) {
    calculatePositions(child, x + HORIZONTAL_GAP, currentY, depth + 1);
    currentY += child.height ?? ROW_HEIGHT;
  }
}

function getMaxX(node: MindMapNode): number {
  let max = node.x ?? 0;

  if (node.children) {
    for (const child of node.children) {
      max = Math.max(max, getMaxX(child));
    }
  }

  return max;
}

export function buildMindMapSvg(root: MindMapNode, title: string): string {
  calculateSize(root);
  calculatePositions(root, 50, 50, 0);

  const viewWidth = getMaxX(root) + 220;
  const viewHeight = (root.height ?? ROW_HEIGHT) + 100;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}">
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&amp;display=swap');
  text { font-family: 'JetBrains Mono', 'Noto Sans SC', 'PingFang SC', sans-serif; }
</style>
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5"/>
  </pattern>
</defs>
<rect width="100%" height="100%" fill="#0f172a"/>
<rect width="100%" height="100%" fill="url(#grid)"/>
`;

  function drawLinks(node: MindMapNode): void {
    if (!node.children || node.x === undefined || node.y === undefined) {
      return;
    }

    for (const child of node.children) {
      if (child.x === undefined || child.y === undefined) {
        continue;
      }

      svg += `<path d="M ${node.x + 120} ${node.y} C ${node.x + 180} ${node.y}, ${child.x - 60} ${child.y}, ${child.x} ${child.y}" fill="none" stroke="#475569" stroke-width="1.5"/>\n`;
      drawLinks(child);
    }
  }

  function drawNodes(node: MindMapNode, depth: number, index: number): void {
    if (node.x === undefined || node.y === undefined) {
      return;
    }

    let color = colors[index % colors.length] ?? colors[0];

    if (depth === 0) {
      color = { fill: 'rgba(136, 19, 55, 0.4)', stroke: '#fb7185' };
    }

    const width = depth === 0 ? 160 : depth === 1 ? 140 : depth === 2 ? 140 : 180;
    const height = depth === 0 ? 50 : 22;
    const fontSize = depth === 0 ? 14 : depth === 1 ? 12 : depth === 2 ? 10 : 9;
    const fontWeight = depth <= 1 ? 600 : 400;
    const textColor = depth <= 1 ? 'white' : depth === 2 ? '#e2e8f0' : '#94a3b8';
    const rectY = node.y - height / 2;

    if (depth <= 2) {
      svg += `<rect x="${node.x}" y="${rectY}" width="${width}" height="${height}" rx="6" fill="#0f172a"/>\n`;
      svg += `<rect x="${node.x}" y="${rectY}" width="${width}" height="${height}" rx="6" fill="${color.fill}" stroke="${color.stroke}" stroke-width="1.5"/>\n`;
    }

    svg += `<text x="${node.x + (depth <= 2 ? width / 2 : 10)}" y="${node.y + fontSize / 3}" fill="${textColor}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${depth <= 2 ? 'middle' : 'start'}">${node.name}</text>\n`;

    if (!node.children) {
      return;
    }

    for (let i = 0; i < node.children.length; i += 1) {
      drawNodes(node.children[i], depth + 1, depth === 0 ? i : index);
    }
  }

  drawLinks(root);
  drawNodes(root, 0, 0);

  const titleWidth = Math.max(title.length * 9 + 40, 200);

  svg += `
<rect x="20" y="20" width="${titleWidth}" height="40" rx="6" fill="#0f172a" fill-opacity="0.8"/>
<text x="30" y="45" fill="white" font-size="16" font-weight="700">${title}</text>
`;

  svg += '</svg>';

  return svg;
}
