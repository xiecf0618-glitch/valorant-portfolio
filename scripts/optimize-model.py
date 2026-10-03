"""Derive the web model: retain geometry/rig, resize embedded maps to 1024.
Usage: python scripts/optimize-model.py path/to/original.glb
Requires Pillow. Original author/license metadata is preserved.
"""
import io,json,struct,sys,pathlib
from PIL import Image
source=pathlib.Path(sys.argv[1]).read_bytes()
n=struct.unpack_from('<I',source,12)[0]; doc=json.loads(source[20:20+n]); binary=source[28+n:]
images={im['bufferView']:im for im in doc['images']}; output=bytearray()
for i,view in enumerate(doc['bufferViews']):
    chunk=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    if i in images:
        img=Image.open(io.BytesIO(chunk)).convert('RGB'); img.thumbnail((1024,1024),Image.Resampling.LANCZOS)
        out=io.BytesIO();img.save(out,format='JPEG',quality=93,subsampling=0,optimize=True);chunk=out.getvalue();images[i]['mimeType']='image/jpeg'
    while len(output)%4:output.append(0)
    view['byteOffset']=len(output);view['byteLength']=len(chunk);output.extend(chunk)
while len(output)%4:output.append(0)
doc['buffers'][0]['byteLength']=len(output)
doc['asset']['extras']['webChanges']='Embedded maps resized to 1024px and JPEG quality 93; geometry, UVs, rig, and original attribution retained.'
meta=json.dumps(doc,separators=(',',':')).encode();meta+=b' '*((-len(meta))%4)
result=struct.pack('<III',0x46546c67,2,28+len(meta)+len(output))+struct.pack('<II',len(meta),0x4e4f534a)+meta+struct.pack('<II',len(output),0x004e4942)+output
path=pathlib.Path('assets/models/reaver-vandal.glb');path.write_bytes(result)
print(f'{len(source):,} → {len(result):,} bytes')
