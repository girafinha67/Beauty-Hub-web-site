"""Teste de ponta a ponta no navegador (Chromium sem tela). Uso: python3 test/e2e.py"""
import os, subprocess, tempfile, time, sys, re, datetime, urllib.request
from playwright.sync_api import sync_playwright

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = tempfile.mkdtemp(prefix='bh-e2e-')
PORT = 3111
env = dict(os.environ, DATA_DIR=data, PORT=str(PORT), BASE_URL=f'http://127.0.0.1:{PORT}')
srv = subprocess.Popen(['node', '--disable-warning=ExperimentalWarning', 'server.js'], cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
base = f'http://127.0.0.1:{PORT}'
for _ in range(50):
    try: urllib.request.urlopen(base + '/api/me'); break
    except Exception: time.sleep(0.1)

problems = []
shots = os.path.join(data, 'shots'); os.makedirs(shots)
def watch(page, who):
    page.on('console', lambda m: problems.append(f'[{who}] console.{m.type}: {m.text}') if m.type in ('error', 'warning') and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'status of 401' not in m.text and 'status of 409' not in m.text else None)
    page.on('pageerror', lambda e: problems.append(f'[{who}] pageerror: {e}'))
def step(msg): print('•', msg, flush=True)
def fill(page, sel, val): page.fill(sel, val)

def signup(page, who, nome, doc, email, divulgar):
    page.goto(base)
    page.wait_for_url(re.compile(r'#entrar$'))
    page.click('[data-auth=signup]')
    if divulgar: page.click('[data-obj=divulgar]')
    fill(page, '#s-nome', nome); fill(page, '#s-tel', '41999998888'); fill(page, '#s-doc', doc)
    fill(page, '#s-email', email); fill(page, '#s-senha', 'Senha@123'); page.check('[data-au=aceite]')
    page.click('#signup-form button[type=submit]')
    page.wait_for_url(re.compile(r'#configurar-perfil$'))

def address(page):
    fill(page, '#x-rua', 'Rua das Flores'); fill(page, '#x-num', '120'); fill(page, '#x-cidade', 'Curitiba'); page.select_option('#x-uf', 'PR')

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        mob = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        A = b.new_context(**mob).new_page(); watch(A, 'pro')
        B = b.new_context(**mob).new_page(); watch(B, 'cliente')
        C = b.new_context(viewport={'width': 1280, 'height': 900}).new_page(); watch(C, 'admin')

        step('login protegido: sem conta cai em #entrar e mostra erro real com senha errada')
        A.goto(base); A.wait_for_url(re.compile(r'#entrar$'))
        fill(A, '#l-email', 'ninguem@gmail.com'); fill(A, '#l-senha', 'Senha@123'); A.click('#login-form button[type=submit]')
        A.wait_for_selector('#l-err:has-text("incorretos")')

        step('profissional cria conta e completa o perfil (dados vão para o servidor)')
        signup(A, 'pro', 'Helena Duarte', '52998224725', 'helena.duarte@gmail.com', True)
        address(A)
        fill(A, '#x-nomeProf', 'Helena Lash'); A.select_option('#x-spec', 'Lash Designer')
        A.click('[data-xaddsvc]'); A.fill('#sp0', '260')
        A.click('[data-xfinish]'); A.wait_for_url(re.compile(r'#home$'))
        A.wait_for_selector('.pk:has-text("Helena Lash")')
        A.screenshot(path=f'{shots}/pro-home.png')

        step('cliente cria conta, completa e vê a profissional real (nenhuma fictícia)')
        signup(B, 'cli', 'Ana Souza', '11144477735', 'ana.souza@gmail.com', False)
        address(B); B.click('[data-xfinish]'); B.wait_for_url(re.compile(r'#home$'))
        B.wait_for_selector('.pk:has-text("Helena Lash")')
        n = B.locator('.pk').count(); assert n == 1, f'esperava 1 profissional, achei {n}'

        step('cliente abre o perfil e solicita horário com horários livres vindos do servidor')
        B.click('.pk:has-text("Helena Lash") .pk-ph'); B.click('[data-xbook]')
        d0 = datetime.date.today() + datetime.timedelta(days=2)
        while (d0.weekday() + 1) % 7 not in (2, 3, 4, 5, 6): d0 += datetime.timedelta(days=1)  # dias de atendimento padrão: ter a sáb
        day = d0.isoformat()
        B.fill('#b-dt', day); B.dispatch_event('#b-dt', 'change')
        B.wait_for_selector('#b-ok:not([disabled])')
        B.screenshot(path=f'{shots}/cli-book.png')
        B.click('#b-ok'); B.wait_for_url(re.compile(r'#agendamentos$'))
        B.wait_for_selector('.pc.ag:has-text("Solicitado")')

        step('profissional recebe notificação e confirma o horário')
        A.goto(base + '/#agendamentos'); A.reload()
        A.wait_for_selector('.pc.ag:has-text("Ana Souza")')
        A.click('[data-aact$=":confirmado"]'); A.wait_for_selector('.pc.ag:has-text("Confirmado")')
        B.reload(); B.wait_for_selector('.pc.ag:has-text("Confirmado")')
        A.click('[data-xnotif]'); A.wait_for_selector('.nrow:has-text("solicitou")'); A.keyboard.press('Escape')

        step('mensagens: cliente escreve, profissional recebe com contador')
        B.goto(base + '/#home'); B.reload(); B.click('.pk:has-text("Helena Lash") .pk-ph'); B.click('[data-msg]')
        B.wait_for_selector('#msg-t'); B.fill('#msg-t', 'Oi! Posso levar uma amiga?'); B.press('#msg-t', 'Enter') if False else B.click('#msg-form button')
        B.wait_for_selector('.bub.me:has-text("amiga")')
        B.screenshot(path=f'{shots}/cli-chat.png')
        A.goto(base + '/#mensagens'); A.reload(); A.wait_for_selector('.conv:has-text("Ana Souza")')
        A.click('.conv'); A.wait_for_selector('.bub:has-text("amiga")')
        A.fill('#msg-t', 'Pode sim!'); A.click('#msg-form button'); A.wait_for_selector('.bub.me:has-text("Pode sim")')
        B.wait_for_selector('.bub:has-text("Pode sim")', timeout=12000)

        step('profissional faz cadastro de divulgação (3 passos) e fica em análise')
        A.goto(base + '/#cadastro'); A.reload(); A.wait_for_selector('[data-tipo]')
        A.click('[data-snext]'); A.wait_for_selector('#b-np'); A.click('[data-snext]')
        A.wait_for_selector('[data-plan]'); A.click('[data-plan="profissional"]'); A.click('[data-sfinish]')
        A.wait_for_selector('.success'); A.click('[data-go="meu-perfil"]'); A.wait_for_selector('.status:has-text("Em análise")')
        A.screenshot(path=f'{shots}/pro-plano.png', full_page=True)

        step('admin real: só entra quem é admin; aprova e confirma pagamento')
        subprocess.run(['node', '--disable-warning=ExperimentalWarning', 'scripts/make-admin.js', 'x@gmail.com'], cwd=root, env=env, capture_output=True)
        signup(C, 'adm', 'Admin Geral', '39053344705', 'admin.geral@gmail.com', False)
        subprocess.run(['node', '--disable-warning=ExperimentalWarning', 'scripts/make-admin.js', 'admin.geral@gmail.com'], cwd=root, env=env, check=True, capture_output=True)
        C.fill('#x-rua', 'Rua B'); C.fill('#x-num', '1'); C.fill('#x-cidade', 'Curitiba'); C.select_option('#x-uf', 'PR'); C.click('[data-xfinish]'); C.wait_for_url(re.compile(r'#home$'))
        C.reload(); C.goto(base + '/#admin'); C.reload(); C.wait_for_selector('h1:has-text("Painel administrativo")')
        C.click('[data-atab=cad]'); C.wait_for_selector('tr:has-text("Helena")')
        C.click('[data-reg$=":aprovado"]'); C.wait_for_selector('.status:has-text("Aprovado")')
        C.click('[data-regpay$=":pago"]'); C.wait_for_selector('td:has-text("até")')
        C.screenshot(path=f'{shots}/admin.png')
        A.reload(); A.wait_for_selector('.status:has-text("Aprovado")'); A.wait_for_selector('text=Plano pago até')
        B.goto(base + '/#admin'); B.reload(); B.wait_for_url(lambda u: not u.endswith('#admin'))

        step('conclusão do atendimento libera avaliação (plano pago com avaliações)')
        subprocess.run(['node', '--disable-warning=ExperimentalWarning', '-e', "const {run}=require('./lib/db');run(\"UPDATE appointments SET date='2020-01-01'\")"], cwd=root, env=env, check=True, capture_output=True)
        A.goto(base + '/#agendamentos'); A.reload(); A.click('[data-aact$=":concluido"]'); A.wait_for_selector('.pc.ag:has-text("Concluído")')
        B.goto(base + '/#agendamentos'); B.reload(); B.click('[data-review]'); B.click('[data-star="5"]'); B.fill('#rv-t', 'Amei o resultado!'); B.click('[data-sendreview]')
        B.wait_for_selector('#toast .toast:has-text("Avalia")')
        B.goto(base + '/#home'); B.reload(); B.wait_for_selector('.pk:has-text("Helena Lash") .pk-rev u')

        step('network: pergunta publicada e visível')
        B.goto(base + '/#network'); B.reload(); B.click('[data-newthread]'); B.fill('#nt-q', 'Qual cola vocês recomendam para volume?'); B.click('#thread-form button')
        B.wait_for_selector('.row-card:has-text("Qual cola")')
        B.screenshot(path=f'{shots}/cli-network.png', full_page=True)

        step('sair da conta derruba a sessão no servidor')
        B.goto(base + '/#perfil'); B.reload(); B.click('[data-logout]'); B.wait_for_url(re.compile(r'#entrar$'))
        B.reload(); B.wait_for_url(re.compile(r'#entrar$'))
        b.close()
    print('\nRESULTADO: fluxo completo OK')
except Exception:
    import traceback; traceback.print_exc(); problems.append('o teste parou antes do fim')
finally:
    srv.terminate()
    if problems:
        print('\nPROBLEMAS NO NAVEGADOR:'); [print(' ', x) for x in dict.fromkeys(problems)]
    else: print('Sem erros de console nem violações de segurança.')
    print('Capturas em', shots)
    sys.exit(1 if problems else 0)
