/** Build world atlas + compressed sky (TexturePacker-style for YaGames). */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = [
  ['silk-banner', 'art-banner.png'],
  ['orb-amber', 'art-firefly-amber.png'],
  ['orb-teal', 'art-firefly-teal.png'],
  ['orb-coral', 'art-firefly-coral.png'],
  ['void', 'art-void.png'],
  ['portal-amber', 'art-portal-amber.png'],
  ['portal-teal', 'art-portal-teal.png'],
  ['portal-coral', 'art-portal-coral.png'],
  ['shard', 'art-shard.png'],
];

await mkdir(path.join(root, 'public/atlases'), { recursive: true });
await mkdir(path.join(root, 'public/backgrounds'), { recursive: true });

const py = `
from PIL import Image
import json, os
src=${JSON.stringify(path.join(root, 'assets/source/art'))}
out=${JSON.stringify(path.join(root, 'public/atlases'))}
bg=${JSON.stringify(path.join(root, 'public/backgrounds'))}
os.makedirs(out, exist_ok=True); os.makedirs(bg, exist_ok=True)
sprites=${JSON.stringify(SPRITES)}
imgs=[(k, Image.open(os.path.join(src,f)).convert('RGBA')) for k,f in sprites]
pad=2; x=pad; y=pad; row_h=0; max_w=512; positions={}
for key,im in imgs:
    w,h=im.size
    if x+w+pad>max_w:
        x=pad; y+=row_h+pad; row_h=0
    positions[key]=(x,y,w,h); x+=w+pad; row_h=max(row_h,h)
np2=lambda n: 1<<(n-1).bit_length()
aw,ah=np2(max_w),np2(y+row_h+pad)
atlas=Image.new('RGBA',(aw,ah),(0,0,0,0)); frames={}
for key,im in imgs:
    px,py,w,h=positions[key]
    atlas.paste(im,(px,py),im)
    frames[key]={'frame':{'x':px,'y':py,'w':w,'h':h},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':w,'h':h},'sourceSize':{'w':w,'h':h}}
atlas.save(os.path.join(out,'world.png'), optimize=True)
json.dump({'frames':frames,'meta':{'app':'stay-lit-atlas','version':'1.0','image':'world.png','format':'RGBA8888','size':{'w':aw,'h':ah},'scale':'1'}}, open(os.path.join(out,'world.json'),'w'), separators=(',',':'))
sky=Image.open(os.path.join(src,'bg-sky.png')).convert('RGB')
if sky.size[0]>480:
    sky=sky.resize((480,int(480*sky.size[1]/sky.size[0])), Image.Resampling.LANCZOS)
sky.save(os.path.join(bg,'bg-sky.webp'),'WEBP', quality=82, method=6)
print('OK atlas',aw,'x',ah,'webp',os.path.getsize(os.path.join(bg,'bg-sky.webp')))
`
const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
console.log(r.stdout.trim());
