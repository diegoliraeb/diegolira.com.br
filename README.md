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

Configure o comando de build `pnpm build` e a pasta de saída `dist`. O domínio existente não foi alterado por este projeto.

- **Vercel:** `vercel.json` fornece o fallback para as rotas de idioma.
- **Netlify / Cloudflare Pages:** `public/_redirects` é copiado para o build.
- **Apache / cPanel:** publique o conteúdo de `dist`, incluindo `.htaccess`, com `mod_rewrite` habilitado.
- **Outros servidores:** sirva os arquivos existentes normalmente e encaminhe rotas não encontradas para `index.html`.

O site é uma SPA renderizada no cliente. Se for necessário indexar todo o conteúdo traduzido sem JavaScript, adicione pré-renderização ou SSR antes da publicação.

## Verificação

Build de produção e revisão no navegador: desktop, mobile de 390 px e 320 px, idiomas, menu com Escape, expansão da biografia e modal de serviços. As configurações dos provedores de hospedagem ainda precisam ser validadas no destino escolhido.
