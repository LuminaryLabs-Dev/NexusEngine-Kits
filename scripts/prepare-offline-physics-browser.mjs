import ts from '@typescript/typescript6';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import{createHash}from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=process.env.NEXUS_PHYSICS_EVIDENCE??path.join(root,'artifacts/physics-proof');fs.mkdirSync(evidence,{recursive:true});
const pkg=JSON.parse(fs.readFileSync(path.join(root,'node_modules/nexusengine/package.json')));
const resolve=(s,from)=>s.startsWith('.')?path.resolve(path.dirname(from),s):s.startsWith('@luminarylabs/nexusengine-kits/')?path.join(root,JSON.parse(fs.readFileSync(path.join(root,'package.json'))).exports['./'+s.slice('@luminarylabs/nexusengine-kits/'.length)]):s==='nexusengine'?path.join(root,'node_modules/nexusengine/src/index.js'):s.startsWith('nexusengine/')?path.join(root,'node_modules/nexusengine',pkg.exports['./'+s.slice(12)]):s.startsWith('three/addons/')?path.join(root,'node_modules/three/examples/jsm',s.slice(13)):s==='three'?path.join(root,'node_modules/three/build/three.module.js'):s==='@dimforge/rapier3d-compat'?path.join(root,'node_modules/@dimforge/rapier3d-compat/rapier.mjs'):null;
const modules={},hashes={};
const key=file=>'offline:'+path.relative(root,file).split(path.sep).join('/');
function walk(file){const id=key(file);if(modules[id]!==undefined)return;modules[id]='';const source=fs.readFileSync(file,'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS), edits=[];
 function visit(n){let literal=null;if(ts.isImportDeclaration(n)||ts.isExportDeclaration(n))literal=n.moduleSpecifier;else if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword)literal=n.arguments[0];
  if(literal&&ts.isStringLiteralLike(literal)){const target=resolve(literal.text,file);if(target){walk(target);edits.push({start:literal.getStart(ast),end:literal.end,value:JSON.stringify(key(target))});}else if(ts.isImportDeclaration(n))throw new Error('Unresolved browser dependency '+literal.text+' in '+file);}
  ts.forEachChild(n,visit);
 }visit(ast);let output=source;for(const e of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.value+output.slice(e.end);modules[id]=output+'\n//# sourceURL='+id;
 hashes[path.relative(root,file)]={sha256:createHash('sha256').update(source).digest('hex'),specifierEdits:edits.length};
}
walk(path.join(root,'examples/physics-runtime/app.mjs'));
fs.writeFileSync(path.join(evidence,'offline-modules.json'),JSON.stringify({entry:'offline:examples/physics-runtime/app.mjs',modules}));fs.writeFileSync(path.join(evidence,'browser-source-hashes.json'),JSON.stringify(hashes,null,2));console.log(Object.keys(modules).length+' exact modules; only module specifiers rewritten for offline Blob URLs');
