# Libertadores ZC – 50 clubes
Nova versão do Libertadores ZC (cópia limpa de `modo-carreira-libertadores` @ b267ca7, sem ligação com o repositório, o serviço ou o banco originais).
Salas multiplayer (apelido + PIN), temporada simulada rodada a rodada, mercado, leilões e PWA.

- **50 clubes** (`config/libertadores.json`): os 40 da versão original + Belgrano, Independiente Rivadavia, Platense, Huracán, Talleres (ARG) e Toluca, América, Cruz Azul, Monterrey, Tigres (MEX), adicionados no fim da lista (ids dos 40 originais inalterados). Elencos FC27 de `data/fc27.json.gz`.
- **Formato**: todos contra todos em turno único, **49 rodadas**. 1º–8º direto às oitavas; 9º–24º playoffs ida e volta (9×24, 10×23…); 25º–50º eliminados. Oitavas, quartas e semi ida e volta, final única. Total: 58 rodadas. Regras em `libertadores.js` (CFG); o número de rodadas vem do número de clubes (`plan()`).
- **Janelas**: meio da liga após a rodada 24, fim da liga após a 49 (`config/agenda-zc.json`).
- **Agenda**: pré-temporada (leilão) em 10/01/2027, rodada 1 em 15/01/2027 (datas em `config/agenda-zc.json`, resumo em `DECISOES-50.md`). Agenda automática ainda pausada (`"paused": true`) até o Robson testar.
- Stack: Node 20 + Express, SQLite somente leitura (universo FC27, gerado por `node import.js`) e Postgres (`DATABASE_URL`). Deploy: `render.yaml` (web Free). Sem keep-awake.

Local: `npm ci && node import.js && DATABASE_URL=postgres://... PGSSL=0 node server.js` · testes: `for t in test/*.test.js; do node $t; done`

## Herdado x desativado (banco novo)
Herdado (vem do `config/` e entra no SQLite no build): elencos brasileiros, sorteio ZC (30 jogadores), potenciais corrigidos (37), `player_overrides`, Armani/Perri e Coates/Otávio (correções do sorteio), as listas dos três leilões (pré, surpresa, meio), verbas dos 40 clubes, prêmios, meta do onze.

No Postgres novo, na subida:
- A sala `LIGA` é criada **antes** das migrações (`createLiga`), com as verbas do config (verba pelo over, opção B de 23/11; banco já existente recebe a migração única `verbas-over-2311`). Assim o leilão de pré-temporada herdado vira 22 lotes da sala nova.
- Leilão surpresa: criado na subida quando `config/leilao-surpresa.json` tem datas futuras (12/01 16:00 → 13/01 12:00).
- Leilão do meio: os 22 lotes são criados quando a janela do meio abre (`mkt_stage='mid'`), para não se misturarem ao leilão de pré-temporada.
- Mantidos (genéricos): idades BR, `syncIdades`, recálculo de valores, tabelas de camisa, `koFormato`, `ovrZero`, `evoReplay`, `evoPontas`.

Desativados (correções de **estado da sala antiga**, dependem de ids de lote/lance/proposta ou horários de 26/10–15/11/2026):
- `mp.js`: `clubs-2610` (troca Belgrano/Always Ready → Nacional; com Belgrano de volta ela desvincularia o técnico do Belgrano), `verbas-2610` (somaria a verba duas vezes numa sala nova), `restore-unbid-1311`, `reopen-mid-unsold-2015`, `reopen-mid-2030`, `mid-close-2025`. Marcados como aplicados em `lib_migrations` (`skipLegacy`).
- `extras.js`: `moveLot` (Kaiki, Talisca), `suspendLots`, `unsuspend` (Jair, Marcos Leonardo), `taliscaLog`, `savinho90`, `assignLot` ×7 (Yan Couto, Luiz Henrique, David Neres, Gabriel Sara, Brian Rodríguez, Vanderson, Valentín Gómez), `zeroOffers`, `auditMoney`, `cancelAll2209`, `clearCooldowns`, `auditSwaps`, `hugoBueno` (removido junto com o ajuste do import: Hugo Bueno no Santos era decisão ligada ao leilão antigo; ele fica no Wolves, clube de origem do FC27, fora da liga), `fixLancesRemovidos` (lotes 9 e 10), `evoGomez4` (notas do Andrés Gómez).

## Painel da temporada e leilão FC27 (só admin)
- Central da liga: **Começar nova temporada** (depois da final) e **Resetar a temporada do zero**, com dupla confirmação, checagem de admin no servidor, log e transação. Snapshot do início de cada temporada em `lib_season_snapshots`; calendário de temporadas novas gerado por `agenda.js` no padrão da temporada 1. Detalhes em `DECISOES-50.md`.
- Leilão: busca em toda a base FC27 (`/zc/admin/fc27`), adicionar lote no leilão aberto ou no próximo, remover lote sem lance.
- Teste: `node test/temporadas.test.js` (unidade); E2E com servidor e Postgres descartáveis: `E2E_BASE=http://localhost:3150 DATABASE_URL=postgres://... node test/temporadas.test.js`.
