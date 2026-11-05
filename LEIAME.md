# Beauty Hub — site + backend

Site completo com servidor próprio. **Nada é simulado**: contas, perfis, agendamentos, mensagens, avaliações, anúncios, planos e painel admin ficam num banco de dados (SQLite) e passam pelo servidor.

## Rodar

Requer **Node 22.5 ou mais novo** (não precisa de `npm install`: não há dependências).

```bash
cp .env.example .env     # opcional
npm start                # http://localhost:3000
```

Primeira administradora: crie a conta pelo site e depois rode

```bash
npm run make-admin -- email@dominio.com
```

O link "Painel administrativo" aparece no menu dessa conta.

## O que o servidor faz

| Área | Como funciona |
|---|---|
| Conta | Cadastro com CPF/CNPJ validado no servidor, senha com scrypt, sessão em cookie HttpOnly, limite de tentativas de login, redefinição de senha por e-mail, exclusão da própria conta (LGPD) |
| Perfil | Endereço, serviços, horários, contatos; foto e galeria enviadas de verdade (JPG/PNG/WebP, conferidas pelo conteúdo do arquivo) |
| Busca | Só aparecem profissionais reais com perfil completo; filtros, favoritos e seguidores salvos por conta |
| Agendamento | Horários livres calculados no servidor (dias, expediente, duração do serviço, conflitos); a profissional confirma, recusa ou conclui; o cliente cancela |
| Avaliações | Só quem teve atendimento concluído avalia, uma vez; depende do plano da profissional; admin pode remover |
| Mensagens | Conversa entre contas, contador de não lidas, atualização automática |
| Notificações | Geradas pelos eventos reais (pedido de horário, confirmação, mensagem, aprovação, pagamento…) |
| Planos | Cadastro de divulgação → análise do admin → pagamento → recursos do plano liberados (selo, galeria, avaliações, link de agenda, prioridade). Planos e permissões são editáveis no admin |
| Anúncios | Cursos, eventos, campeonatos, lojas, marcas, tecnologia e meetups criados por quem tem cadastro aprovado do tipo certo; aprovados pelo admin |
| Network | Grupos, conversas e respostas reais, com moderação |
| Admin | Visão geral, cadastros (aprovar, recusar, suspender, confirmar pagamento, verificar), conteúdo, planos, moderação — só para contas administradoras |

## Configurar (arquivo `.env`)

- `BASE_URL`, `NODE_ENV=production` (cookie Secure + HSTS; use HTTPS), `TRUST_PROXY=1` atrás de proxy.
- `DATA_DIR`: pasta do banco e das fotos. **Em hospedagem, aponte para um disco persistente** e faça backup dela.
- `RESEND_API_KEY` e `MAIL_FROM`: e-mails de redefinição de senha. Sem a chave, o link aparece só no log do servidor.
- `MP_ACCESS_TOKEN`: pagamento dos planos pelo Mercado Pago (Checkout Pro). O servidor cria o checkout, recebe o aviso em `/api/webhooks/mercadopago` e **confere o pagamento direto na API** antes de liberar o plano (valor e referência). Sem o token, o botão de pagar some e o admin confirma o pagamento manualmente.
- `CONTACT_EMAIL`: aparece na página Contato (sem ele, o link Contato some).
- Textos de **Termos de uso** e **Privacidade**: arquivos em `content/`. São rascunhos; peça revisão jurídica antes de publicar.

## Produção

- `GET /api/health` para monitoramento; `Dockerfile` e `render.yaml` prontos (disco persistente em `/data`).
- Rotinas automáticas (a cada hora): aviso de plano vencendo/vencido, lembrete de atendimento no dia anterior, backup diário do banco em `DATA_DIR/backups` (guarda 7) e limpeza.
- Respostas de texto comprimidas (gzip) e encerramento seguro do banco ao parar o servidor.

## Editar o site (front-end)

Os fontes ficam em `web/src`. Depois de mexer, gere os arquivos servidos:

```bash
npm run build     # escreve public/index.html, styles.css e app.js
```

## Testes

```bash
npm test                  # API: 15 testes (cadastro, agenda, planos, pagamento com Mercado Pago de mentira, chat, admin…)
python3 test/e2e.py       # navegador de verdade (Playwright + Chromium): fluxo completo e erros de console/CSP
```

## Limites conhecidos

- Um único servidor (SQLite). Para vários servidores, trocar o banco.
- Mensagens e contadores atualizam por consulta periódica (5 s / 30 s), não em tempo real.
- O pagamento pelo Mercado Pago foi testado contra um simulador local; faça uma compra de teste com as suas credenciais antes de abrir ao público.
- Endereço e CEP usam os serviços públicos Nominatim e ViaCEP direto do navegador.
