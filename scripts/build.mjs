import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd(), dist = path.join(root, 'dist');
const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const script = await readFile('app.js', 'utf8');
const revision = content => createHash('sha256').update(content).digest('hex').slice(0,12);
const revisions = { stylesheet: revision(css), script: revision(script) };
const ids = [...html.matchAll(/id="(scene\d+)"/g)].map(match=>match[1]);
if (ids.length !== 23 || new Set(ids).size !== 23) throw new Error('Expected 23 unique scene anchors.');
if (/DecompressionStream|V5 ONLINE|VISUAL INTEGRATION|data:image\/svg\+xml;charset/.test(html)) throw new Error('Legacy loader or placeholder remains.');
if (/<img\b[^>]*src="https?:|\bonerror=/.test(html)) throw new Error('External image or error placeholder remains.');
const anchorIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) if (!anchorIds.has(anchor)) throw new Error(`Broken anchor ${anchor}`);
const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(match=>match[1]).filter(ref=>!ref.startsWith('http')&&!ref.startsWith('data:'));
for (const ref of refs) await readFile(ref.split('#')[0]);
for (const [, ref] of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)) {
  if (/^https?:/.test(ref)) throw new Error(`External background image ${ref}`);
  if (!ref.startsWith('data:')) await readFile(ref);
}
const sources = JSON.parse(await readFile('docs/source-links.json','utf8')).sources;
for (const source of sources) if (!html.includes(source.url.replaceAll('&','&amp;'))) throw new Error(`Source ${source.id} not linked`);
await rm(dist, { recursive:true, force:true });
await mkdir(dist, { recursive:true });
for (const file of ['index.html','styles.css','app.js','assets']) await cp(file,path.join(dist,file),{recursive:true});
// A newly deployed document must not reuse an earlier release's cached CSS/JS.
// Content-derived query versions also stay stable for documentation-only releases.
if (!html.includes('href="styles.css"') || !html.includes('src="app.js"')) throw new Error('Expected entry-point stylesheet and script.');
const publishedHtml = html.replace('href="styles.css"', `href="styles.css?v=${revisions.stylesheet}"`).replace('src="app.js"', `src="app.js?v=${revisions.script}"`);
await writeFile(path.join(dist,'index.html'), publishedHtml);
await writeFile(path.join(dist,'.nojekyll'),'');
async function size(dir) { let bytes=0,files=0; for(const entry of await readdir(dir,{withFileTypes:true})) {const p=path.join(dir,entry.name); if(entry.isDirectory()){const s=await size(p);bytes+=s.bytes;files+=s.files;}else{bytes+=(await readFile(p)).length;files++;}} return {bytes,files}; }
console.log(JSON.stringify({scenes:ids.length,sourceEntries:sources.length,output:'dist',revisions,...await size(dist)}));
