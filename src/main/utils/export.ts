// export.ts

import { DiffItem } from "../../shared/types";


async function getCssContent(cssUrl: string): Promise<string> {
    try {
      const response = await fetch(cssUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSS. Status code: ${response.status}`);
      }
      const cssContent = await response.text();
      return cssContent;
    } catch (error) {
      console.error('Error fetching CSS:', error);
      return '';
    }
  }
  
  export async function prepareHtmlContent(diffHtml: string): Promise<string> {
    const cssUrl = 'https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css';
    const cssContent = await getCssContent(cssUrl);
  
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Diff View</title>
        <style>
          ${cssContent}
        </style>
      </head>
      <body>
        ${diffHtml}
      </body>
      </html>`;
  
    return htmlContent;
  }

  // Generate file name based on snapshot names
export function generateFileName(diffs: DiffItem[], snapshot1Id: string, snapshot2Id: string): string {
    const date = new Date().toISOString().split('T')[0];

    const procNames = diffs.map(diff => diff.description).join('_');
    if (diffs.length === 1) {
      // Include snapshot Ids for single diffs
      return `${procNames}_${snapshot1Id}_${snapshot2Id}_${date}.html`;
    } else {
      // Omit snapshot Ids for multiples to keep the file name shorter
      return `${procNames}_${date}.html`;
    }
    
  }
