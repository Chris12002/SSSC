import * as Diff from 'diff';
import * as Diff2Html from 'diff2html';
import * as fs from 'fs';

export function generateDiffHtml(oldStr: string, newStr: string, objectName: string, fullFile: boolean = false, contextWindow?: number): string {
  


  if (fullFile){
    contextWindow = Number.MAX_SAFE_INTEGER;
  } else {
    contextWindow = contextWindow ? contextWindow : 3;
  }
  
  const diffText = Diff.createTwoFilesPatch(objectName, objectName, oldStr, newStr, undefined, undefined, { context: contextWindow });
  return Diff2Html.html(diffText, { drawFileList: false, matching: 'lines' }); 
}

