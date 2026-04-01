# Overtake Stories Admin

Frontend administrativo em `React + Vite + TypeScript` para gerar stories da Overtake Motors a partir do backend local.

## Rodando localmente

1. Garanta que o backend esteja rodando em `http://127.0.0.1:3000`.
2. Copie `.env.example` para `.env` se quiser alterar o backend ou o WhatsApp.
3. Instale as dependencias:

```bash
npm install
```

4. Rode o frontend:

```bash
npm run dev
```

5. Abra:

```text
http://127.0.0.1:5173
```

## Variaveis de ambiente

```env
VITE_BACKEND_URL=http://127.0.0.1:3000
VITE_WHATSAPP_DISPLAY=(24) 99911-9977
VITE_WHATSAPP_LINK=5524999119977
```

O Vite faz proxy de `/api` e `/downloads` para o backend configurado em `VITE_BACKEND_URL`.

## Logo da marca

Coloque a logo oficial em:

```text
public/brand/logo-overtake.png
```

Se o arquivo ainda nao existir, o preview mostra um wordmark textual como fallback.

## Onde personalizar

- WhatsApp: `.env` ou `src/config/brand.ts`
- cores e atmosfera visual: `src/styles/theme.css`
- layout do painel: `src/styles/app.css`
- integracao com backend: `src/lib/api.ts` e `vite.config.ts`

## Exportacao

- `Baixar PNG`: exporta a arte final em alta resolucao
- `Baixar JPG`: exporta versao JPEG para usos alternativos

O preview e exportado a partir do layout 1080 x 1920 do componente `StoryPreview`.
