import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(d,'src',f),encoding='utf-8').read()
FAV="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%234A0E24'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Georgia,serif' font-size='30' fill='%23D4A798'%3EBH%3C/text%3E%3C/svg%3E"
head=('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
 '<meta name="color-scheme" content="light">\n<meta name="theme-color" content="#4A0E24">\n'
 '<meta name="description" content="Beauty Hub: o ponto de encontro do mercado da beleza.">\n'
 '<link rel="icon" href="'+FAV+'">\n')
body=('\n</head>\n<body>\n<div id="app"></div>\n<div id="ov" class="ov" hidden></div>\n<div id="toast" role="status" aria-live="polite"></div>\n<script>\n'
 +'\n'.join(r(f) for f in ['data.js','app1.js','app2.js','app3.js','auth.js','app5.js','app4.js'])+'\n</script>\n</body>\n</html>\n')
html=head+r('styles-head.html')+body
open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(html)
print(len(html))
