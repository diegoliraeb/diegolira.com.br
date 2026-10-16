# Diego Lira

Site pessoal em React e Vite, baseado no mockup aprovado. Mantém a identidade azul e escura e a fotografia original de diegolira.com.br.

Prévias da implementação: [desktop](docs/desktop.jpg) e [mobile](docs/mobile.jpg).

## Executar

Requer Node.js 20.19+ ou 22.12+ e pnpm.

```sh
pnpm install
pnpm dev
```

Abra a URL informada pelo Vite, normalmente http://127.0.0.1:5173.

```sh
pnpm build
pnpm preview
```

O build estático fica em `dist/`. Não há backend nem variáveis de ambiente obrigatórias.

## Layout e interações

- Layout responsivo com hero, biografia, áreas de atuação, Ebrothers e contato.
- Órbitas e cristal animados, luz que acompanha o cursor, movimento sutil da foto, entradas ao rolar e hover nos cards.
- Preferência `prefers-reduced-motion` respeitada; efeito de cursor desativado em dispositivos de toque.
- Menu mobile, navegação por âncoras, biografia expansível e detalhes de serviços em modal nativo com foco contido e fechamento por Escape.
- Português, inglês, espanhol, francês e alemão em `/`, `/en`, `/es`, `/fr` e `/de`; histórico do navegador e metadados acompanham a seleção.
- Links originais para Ebrothers, Loja 3D, Instagram, LinkedIn e Facebook. O contato usa o Instagram público existente; nenhum telefone foi inventado.

## Editar

- `src/content.js`: textos e traduções.
- `src/App.jsx`: seções, comportamento e links.
- `src/styles.css`: identidade, breakpoints e animações.
- `public/assets/diego-lira.svg`: fotografia original, baixada do site público em 16/10/2026.

As fontes DM Sans e Manrope são carregadas do Google Fonts, com fallback sans-serif. Ícones: Lucide. A escultura geométrica é SVG próprio, sem dependência de canvas ou WebGL.

## Publicar

### Lira Mail no subdomínio

O menu inclui **Lira Mail**, direcionado a `https://webmail.diegolira.com.br`.
O `vercel.json` serve a interface compilada de `public/webmail/` quando o hostname é esse subdomínio. O domínio principal continua servindo o site pessoal. A função `api/webmail-auth.js` valida o login no servidor.

O código-fonte independente fica na pasta irmã `../lira-mail`. Para atualizá-lo nesta publicação, execute `pnpm export:site ../diegolira.com.br` a partir do projeto Lira Mail. Nunca edite o JavaScript compilado em `public/webmail/`.

Antes de usar o login na Vercel, configure `WEBMAIL_USERNAME`, `WEBMAIL_PASSWORD_HASH`, `WEBMAIL_SESSION_SECRET` e `WEBMAIL_ACCOUNTS` nas variáveis de ambiente do projeto, a partir do arquivo privado `.env.local` do Lira Mail, e faça Redeploy. Sem configuração, o login permanece bloqueado. Senhas e segredos não estão neste repositório.

O Lira Mail ainda usa mensagens fictícias, sugestões locais de IA e envio simulado. As contas cadastradas ainda precisam de autorização OAuth; nenhum monitoramento real está ativo.

Configure o comando de build `pnpm build` e a pasta de saída `dist`. O domínio existente não foi alterado por este projeto.

- **Vercel:** `vercel.json` fornece o fallback para as rotas de idioma.
- **Netlify / Cloudflare Pages:** `public/_redirects` é copiado para o build.
- **Apache / cPanel:** publique o conteúdo de `dist`, incluindo `.htaccess`, com `mod_rewrite` habilitado.
- **Outros servidores:** sirva os arquivos existentes normalmente e encaminhe rotas não encontradas para `index.html`.

O site é uma SPA renderizada no cliente. Se for necessário indexar todo o conteúdo traduzido sem JavaScript, adicione pré-renderização ou SSR antes da publicação.

## Verificação

Build de produção e revisão no navegador: desktop, mobile de 390 px e 320 px, idiomas, menu com Escape, expansão da biografia e modal de serviços. As configurações dos provedores de hospedagem ainda precisam ser validadas no destino escolhido.
