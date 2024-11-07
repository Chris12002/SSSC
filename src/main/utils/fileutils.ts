// fileutils.ts
import fs from 'fs/promises';
import path from 'path';
import htmlValidator from 'html-validator';

async function saveFile (outputPath: string, content: string) {
    try {       
        await fs.writeFile(outputPath, content)
        return `File saved successfully to ${outputPath}`;
    } catch (err) {
        throw new Error(`Failed to save file: ${err}`);
    }
}

export async function saveHtmlFile (outputPath: string, content: string) {
    //HTML specific validation
    const isValid = await isValidHtml(content);

    if (!isValid) {
        throw new Error('Invalid HTML content');
    }

    await saveFile(outputPath, content);
    
}

async function isValidHtml(content: string) {
    try {
      const result = await htmlValidator({
        data: content,
        format: 'text',
      });
      console.log('HTML validation result:', result);
      return true; 
    } catch (error) {
      console.error('HTML validation error:', error);
      return false;
    }
  }
  