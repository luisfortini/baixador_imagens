# Backend local de carros

Este projeto usa `Node.js + Express` para manter um backend local apoiado exclusivamente nos arquivos dentro de `downloads/`.

## Estrutura atual dos dados

Cada carro continua sendo uma subpasta dentro de `downloads/`:

```text
downloads/
  VW Nivus GTS__vw-nivus-gts/
    metadata.json
    01.webp
    02.webp
    03.webp
```

Regras atuais:

- `downloads/` continua sendo a fonte de verdade.
- Cada subpasta representa um carro.
- `metadata.json` continua guardando os dados extraidos.
- As imagens continuam salvas dentro da pasta do carro.

## Nova arquitetura

```text
index.js
src/
  config/
    appConfig.js
  routes/
    carRoutes.js
    healthRoutes.js
    refreshRoutes.js
  scraper/
    downloader.js
    runScraper.js
    scraperCore.js
  server/
    createApp.js
    startServer.js
  services/
    carInventoryService.js
    carNormalizer.js
    refreshService.js
  utils/
    filesystem.js
    logger.js
    scraperUtils.js
    slug.js
    sort.js
downloads/
  ...pastas dos carros...
  inventory.json
  _resumo.json
```

## Como rodar localmente

Instale as dependencias e suba o backend:

```bash
npm install
npx playwright install chromium
npm start
```

O backend sobe por padrao em:

```text
http://127.0.0.1:3000
```

Scripts disponiveis:

- `npm start`: sobe a API Express local.
- `npm run dev`: sobe a API em modo watch.
- `npm run refresh`: executa scraping + atualiza `downloads/inventory.json`.
- `npm run inventory`: somente rele a pasta `downloads/` e regenera o inventario consolidado.

Observacao importante:

- o refresh usa Playwright para renderizar as paginas do estoque;
- no primeiro setup local, execute `npx playwright install chromium` depois do `npm install`;
- em Docker, o browser ja fica instalado na imagem durante o build.

## Como rodar com Docker

Monte a imagem e suba o backend:

```bash
docker build -t baixador-imagens .
docker run --rm -p 3000:3000 baixador-imagens
```

Se voce alterar o `Dockerfile`, dependencias ou a versao do Playwright, reconstrua a imagem antes de testar o refresh novamente.

## Como o inventory.json funciona

O arquivo consolidado e gerado em:

```text
downloads/inventory.json
```

Formato atual:

```json
{
  "generatedAt": "2026-03-30T01:23:45.000Z",
  "totalCars": 2,
  "skippedFolders": [],
  "cars": [
    {
      "id": "vw-nivus-gts",
      "folderName": "VW Nivus GTS__vw-nivus-gts",
      "name": "VW Nivus GTS",
      "description": "...",
      "price": "R$ 165.890,",
      "url": "https://svintermed.com.br/veiculos/vw-nivus-gts/",
      "images": [
        "/downloads/VW Nivus GTS__vw-nivus-gts/01.webp"
      ],
      "coverImage": "/downloads/VW Nivus GTS__vw-nivus-gts/01.webp",
      "totalImages": 1,
      "status": "active",
      "updatedAt": "2026-03-30T00:56:35.001Z"
    }
  ]
}
```

Normalizacao aplicada:

- `id` estavel a partir do slug da pasta ou da URL.
- `images` com caminhos acessiveis pelo frontend.
- `coverImage` usando a primeira imagem disponivel.
- ordenacao natural de imagens por nome.
- suporte a `.webp`, `.jpg`, `.jpeg` e `.png`.
- `updatedAt` usando `collectedAt` quando disponivel.
- `status` inicial em `active`, preparado para evoluir para `inactive`.

## Endpoints da API

### `GET /api/health`

Retorna um status simples da API.

### `GET /api/cars`

Retorna todos os carros normalizados.

Comportamento:

- usa `downloads/inventory.json` quando ele estiver valido;
- regenera automaticamente quando detectar mudancas nas pastas de `downloads/`.

### `GET /api/cars/:id`

Retorna os detalhes de um carro especifico pelo `id`.

### `POST /api/refresh`

Dispara a sincronizacao completa:

1. executa o scraper existente;
2. atualiza `metadata.json` e imagens nas pastas dos carros;
3. regenera `downloads/inventory.json`.

Corpo opcional:

```json
{
  "maxVehicles": 10,
  "maxPages": 2,
  "headless": true
}
```

### `GET /downloads/...`

Serve as imagens e outros arquivos da pasta `downloads/` como arquivos estaticos.

Exemplo:

```text
/downloads/VW Nivus GTS__vw-nivus-gts/01.webp
```

## Como adicionar novos carros via scraping

Sem frontend, voce pode usar qualquer uma destas opcoes:

```bash
npm run refresh
```

ou chamar:

```http
POST /api/refresh
```

O refresh reaproveita o scraper atual, atualiza carros existentes, cria novos carros quando necessario e nao apaga automaticamente pastas que deixarem de aparecer no site.

## Consumo futuro pelo frontend

O backend ja esta pronto para um frontend React/Vite/TypeScript consumir:

- `GET /api/cars` para listagem;
- `GET /api/cars/:id` para detalhe;
- `POST /api/refresh` para o botao futuro `Sincronizar carros`;
- `/downloads/...` para carregar imagens diretamente.

Fluxo esperado no frontend futuro:

1. buscar `GET /api/cars`;
2. renderizar cards, stories e catalogo usando `coverImage`, `images`, `price` e `description`;
3. disparar `POST /api/refresh` no painel administrativo quando quiser sincronizar os carros.

## Frontend administrativo

A etapa do frontend foi implementada em:

```text
web/
```

Stack:

- React
- Vite
- TypeScript
- html-to-image para exportacao em PNG/JPG

### Como rodar o frontend

Com o backend local ligado em `http://127.0.0.1:3000`:

```bash
cd web
npm install
npm run dev
```

URL local:

```text
http://127.0.0.1:5173
```

### Como conectar ao backend local

O frontend usa proxy do Vite para encaminhar:

- `/api`
- `/downloads`

O alvo do proxy e configurado por:

```env
VITE_BACKEND_URL=http://127.0.0.1:3000
```

Arquivo de exemplo:

```text
web/.env.example
```

### Como trocar a logo

Substitua o arquivo:

```text
web/public/brand/logo-overtake.png
```

Se a logo ainda nao existir, o preview usa um fallback textual para nao quebrar a interface.

### Como trocar o WhatsApp

Voce pode alterar por variavel de ambiente:

```env
VITE_WHATSAPP_DISPLAY=(24) 99911-9977
VITE_WHATSAPP_LINK=5524999119977
```

ou diretamente em:

```text
web/src/config/brand.ts
```

### Como personalizar cores

As cores principais do painel e do story ficam centralizadas em:

```text
web/src/styles/theme.css
```

O layout e os estilos de componentes ficam em:

```text
web/src/styles/app.css
```

### Como exportar os stories

No painel:

- selecione um carro
- escolha a imagem
- ajuste preco, selos e descricoes
- clique em `Baixar PNG` ou `Baixar JPG`

### O que o frontend atual entrega

- busca em tempo real por `name`, `description`, `pageTitle` e `folderName`
- selecao de carro
- selecao de imagem por miniaturas
- formulario do story
- preview em tempo real
- exportacao em PNG e JPG
- base separada em `web/` pronta para evoluir para catalogo publico
