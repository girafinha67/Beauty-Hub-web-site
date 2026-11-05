"""Monta o site: junta os arquivos de web/src em public/index.html, public/styles.css e public/app.js.
Sem scripts nem estilos dentro do HTML (o servidor usa uma política de segurança que bloqueia script inline)."""
import os, re
d = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(d, '..', 'public')
os.makedirs(out, exist_ok=True)
r = lambda f: open(os.path.join(d, 'src', f), encoding='utf-8').read()

FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%234A0E24'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Georgia,serif' font-size='30' fill='%23D4A798'%3EBH%3C/text%3E%3C/svg%3E"
head = r('styles-head.html')
font = re.search(r'<link rel="stylesheet"[^>]*>', head).group(0)
css = re.search(r'<style>(.*)</style>', head, re.S).group(1) + '\n' + r('extra.css')

html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
 '<meta name="color-scheme" content="light">\n<meta name="theme-color" content="#4A0E24">\n'
 '<meta name="description" content="Beauty Hub: o ponto de encontro do mercado da beleza.">\n'
 '<title>Beauty Hub</title>\n<link rel="icon" href="' + FAV + '">\n' + font + '\n<link rel="stylesheet" href="/styles.css">\n'
 '</head>\n<body>\n<div id="app"></div>\n<div id="ov" class="ov" hidden></div>\n<div id="toast" role="status" aria-live="polite"></div>\n'
 '<script src="/app.js"></script>\n</body>\n</html>\n')
rules = open(os.path.join(d, '..', 'lib', 'rules.js'), encoding='utf-8').read()
js = rules + '\n' + '\n'.join(r(f) for f in ['data.js', 'api.js', 'app1.js', 'app2.js', 'app3.js', 'auth.js', 'app5.js', 'pubs.js', 'app4.js'])
for name, text in (('index.html', html), ('styles.css', css), ('app.js', js)):
    open(os.path.join(out, name), 'w', encoding='utf-8').write(text)
print('ok', len(html), len(css), len(js))
