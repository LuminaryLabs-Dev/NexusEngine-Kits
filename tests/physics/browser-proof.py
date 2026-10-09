import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import os
root=Path(__file__).resolve().parents[2]
out=Path(os.environ.get('NEXUS_PHYSICS_EVIDENCE', str(root/'artifacts/physics-proof')))
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('NEXUS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1120,'height':900});errors=[];console=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:console.append({'type':m.type,'text':m.text}))
 # Browser network is policy-blocked. Run the same local modules offline without changing policy.
 page.goto('about:blank#manual&renderer=svg')
 import re
 html=(root/'examples/physics-runtime/index.html').read_text()
 html=re.sub(r'<script.*?</script>','',html,flags=re.S)
 page.set_content(html)
 bundle=json.loads((out/'offline-modules.json').read_text())
 page.evaluate("""({modules,entry})=>{const imports={};for(const [id,code]of Object.entries(modules))imports[id]=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);const app=document.createElement('script');app.type='module';app.textContent='import '+JSON.stringify(entry)+';';document.body.append(app);} """,bundle)
 try:page.wait_for_function('!!window.physicsProof',timeout=15000)
 except Exception:
  print(json.dumps({'errors':errors,'console':console},indent=2));raise
 start=page.evaluate('physicsProof.inspect()');page.screenshot(path=str(out/'physics-before.png'))
 page.evaluate('physicsProof.step(90)');saved=page.evaluate('physicsProof.save()')
 page.evaluate('physicsProof.step(120)');end=page.evaluate('physicsProof.inspect()');page.screenshot(path=str(out/'physics-after.png'))
 assert not errors,errors
 assert end['tick']['frame']==211
 assert end['receipt']['rendered'] and end['receipt']['drawCalls']>=6
 box=lambda x: next(b for b in x['bodies'] if b['identity']['id']=='box')
 assert box(start)['pose']['position'][1]>3
 assert abs(box(end)['pose']['position'][1]-.5)<.03
 assert end['meshBox']==end['transforms']['box']['position']==box(end)['pose']['position']
 page.evaluate('physicsProof.restore()');page.evaluate('physicsProof.step(120)');again=page.evaluate('physicsProof.inspect()')
 assert again['bodies']==end['bodies'],'browser replay differs'
 page.click('#reset');page.click('#step');assert page.evaluate('physicsProof.inspect().tick.frame')==2
 # Inspect pixels, not just console or metadata.
 a=Image.open(out/'physics-before.png').convert('RGB');b=Image.open(out/'physics-after.png').convert('RGB')
 changed=sum(px!=(0,0,0) for px in ImageChops.difference(a,b).getdata());assert changed>1500,changed
 report={'browser':browser.version,'renderer':'Three.js r180 SVGRenderer rasterized by Chromium; WebGL2 context unavailable','transport':'Offline Blob module graph; localhost server available but browser network policy blocks navigation','actualEngineTicks':211+120+2,'initialBoxY':box(start)['pose']['position'][1],'finalBoxY':box(end)['pose']['position'][1],'meshMatchesCore':True,'browserReplayExact':True,'drawCalls':end['receipt']['drawCalls'],'triangles':end['receipt']['triangles'],'changedPixels':changed,'pageErrors':errors,'console':console}
 (out/'browser-proof.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));browser.close()
