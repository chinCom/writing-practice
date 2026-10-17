import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const pass = process.argv[2] ?? 'baseline';
const output = fileURLToPath(new URL(`./${pass}/`, import.meta.url));
await mkdir(output, {recursive:true});
const pages = [
 ['today','/dev/preview/today',1448,1086],
 ['login','/login',1448,1086],
 ['studio','/dev/preview/live-write',1448,1086],
 ['progress','/dev/preview/progress',1448,1086],
 ['portfolio','/dev/preview/portfolio',1586,992],
 ['settings','/dev/preview/settings',1586,992],
 ['practice','/dev/preview/practice-page',1586,992],
 ['landing','/',873,1801],
];
const browser = await chromium.launch({headless:true});
const report=[];
for(const [name,url,width,height] of pages) {
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(`http://127.0.0.1:3000${url}`,{waitUntil:'domcontentloaded',timeout:90000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(1200);
 await page.addStyleTag({content:'nextjs-portal { display: none; }'});
 if(name==='studio') {
  await page.getByRole('textbox',{name:'Your writing',exact:true}).fill('AI is accelerating and advancing very fast, and big companies like OpenAI, Anthropic, and Google are training their models to achieve AGI. So with the best yet to come, some of the impossible things we thought could not be done are now possible.');
 }
 if(name==='studio') await page.waitForTimeout(800);
 await page.screenshot({path:`${output}/${name}.png`,fullPage:true,animations:'disabled'});
 report.push({name,url,width,height,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 console.log(`${pass}: ${name} ${width}px`);
 await context.close();
}
await writeFile(`${output}/viewports.json`,JSON.stringify(report,null,2)+'\n');
await browser.close();
