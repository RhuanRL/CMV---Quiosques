# Fast Açaí — Painel de CMV

Dashboard que lê o `CMVFastAcaiV9.xlsx` diretamente no navegador (sem backend, sem banco de dados) e apresenta CMV, margem e preço sugerido por produto, loja e cenário de margem desejada.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Como atualizar os dados

Coloque o arquivo `CMVFastAcaiV9.xlsx` atualizado dentro da pasta `data/` na raiz do projeto (substituindo o existente) e recarregue a página — ou use o botão **"Importar nova planilha"** no topo do dashboard para trocar o arquivo sem mexer em nada no código. O arquivo importado fica salvo no navegador (localStorage) até você importar outro ou clicar em "Restaurar padrão".

A planilha precisa manter as abas `Receitas`, `Toppings`, `Rateio` e `Configuracoes` com o mesmo layout de colunas.

## Tema claro/escuro

O botão de sol/lua no topo alterna entre modo claro e escuro. A escolha fica salva no navegador (localStorage) e, na primeira visita, o dashboard segue a preferência do sistema operacional automaticamente. Todas as cores usam variáveis CSS (`src/index.css`), então qualquer ajuste de paleta deve ser feito lá para valer nos dois temas.

## Build de produção

```bash
npm run build
```

Gera a pasta `dist/` com os arquivos estáticos (incluindo a planilha padrão), prontos para publicar em qualquer hospedagem estática.
