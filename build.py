import os
d=os.path.dirname(os.path.abspath(__file__))
r=lambda f:open(os.path.join(d,'src',f),encoding='utf-8').read()
html=r('styles-head.html')+'\n<div id="app"></div>\n<div id="ov" class="ov" hidden></div>\n<div id="toast" role="status" aria-live="polite"></div>\n<script>\n'+'\n'.join(r(f) for f in ['data.js','app1.js','app2.js','app3.js','auth.js','app5.js','app4.js'])+'\n</script>\n'
open(os.path.join(d,'index.html'),'w',encoding='utf-8').write(html)
print(len(html))
