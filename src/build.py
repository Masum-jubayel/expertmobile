"""Rebuild dist/index.html from src/template.html and src/images/.
Usage:  python3 src/build.py
Replace an image by overwriting the file in src/images/ (same name), then run this."""
import base64,json,os,mimetypes
here=os.path.dirname(os.path.abspath(__file__))
t=open(os.path.join(here,'template.html'),encoding='utf-8').read()
mp=json.load(open(os.path.join(here,'images','manifest.json')))
for key,fn in mp.items():
    p=os.path.join(here,'images',fn);mime='image/jpeg' if fn.endswith('.jpg') else 'image/png'
    t=t.replace('{{%s}}'%key,'data:%s;base64,%s'%(mime,base64.b64encode(open(p,'rb').read()).decode()))
assert '{{' not in t, 'missing image placeholder'
out=os.path.join(here,'..','dist','index.html')
open(out,'w',encoding='utf-8').write('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+t+'\n</html>')
print('Built',os.path.normpath(out),round(os.path.getsize(out)/1e6,2),'MB')
