# Libertadores ZC 50 clubes – decisões do Robson (22/11/2026 20:10)
Horários de Brasília. Agenda automática ainda **pausada** (`"paused": true` em `config/agenda-zc.json`) até o Robson testar; as datas abaixo já estão no arquivo.

## Verba inicial pelo over (opção B, Robson 23/11; substitui a opção A de 22/11)
Maior over, menor verba. Over do time = média dos 18 maiores overs do elenco inicial (mesmo critério da regra original de out/2026). **Verba = €55 mi por ponto de over abaixo do melhor clube (Flamengo, 76,56), arredondada a múltiplo de €25 mi, teto €500 mi.** Total da liga: €12.075 mi (antes €12.150 mi). Tabela completa em `PROPOSTA-VERBAS-OVER.md` (coluna "Alternativa B"); valores em `config/libertadores.json` `clubs[].budget`; `test/zc50.test.js` confere a fórmula contra o `game.db`.
Exemplos: Flamengo e Palmeiras €0 · River €50 mi · Fluminense, Boca, Atlético-MG, Cruzeiro €75 mi · Botafogo €150 mi · Toluca €175 mi · Cruz Azul €225 mi · Monterrey, Belgrano €250 mi · América, Tigres, Ind. Rivadavia €300 mi · Platense €325 mi · Huracán, Talleres €350 mi · Caracas €500 mi.
Banco já no ar: migração única `verbas-over-2311` (`temporadas.js`) troca as verbas da sala LIGA e do snapshot inicial do reset. Só roda se não houver transferências, propostas, lances nem competições (contas e técnicos podem existir e não são alterados; Robson 23/11 11:46) e se cada verba ainda for a antiga (`config/verbas-over-2311.json`); senão, avisa no log e não altera nada.

## Prêmios por posição (fim da rodada 49)
1º 100 mi · 2º 50 mi · 3º 30 mi · 4º–8º 20 mi · 9º–24º 10 mi · 25º–50º 0. Por jogo: vitória 1 mi, empate 0,3 mi.

## Leilões
Refeitos do zero com as listas de `config/leilao-pre.json`, `leilao-surpresa.json` e `leilao-mid.json`; nenhum resultado do leilão antigo conta (inclusive o Hugo Bueno no Santos, removido).

## Calendário (2 jogos por dia, 12:00 e 19:00) – atualizado pelo Robson em 23/11/2026
Pré-temporada começa em 10/01/2027; rodada 1 em 15/01/2027.

| Etapa | Data |
|---|---|
| Leilão de pré-temporada | dom 10/01/2027, 12:00–20:00 |
| Mercado de pré-temporada | 10/01 21:40 → qui 14/01 23:59 |
| Leilão surpresa | ter 12/01 16:00 → qua 13/01 12:00 |
| Rodadas 1–24 | sex 15/01 12:00 → ter 26/01 19:00 |
| Janela do meio | mercado 26/01 21:00 → sex 29/01 20:00; leilão do meio qua 27/01, 12:00–20:00 |
| Rodadas 25–49 | sáb 30/01 12:00 → qui 11/02 12:00 |
| Janela do fim | leilão sex 12/02, 12:00–21:00; mercado até sáb 13/02 21:00 |
| Playoffs (ida/volta) | dom 14/02, 12:00 e 19:00 |
| Oitavas | seg 15/02 |
| Quartas | ter 16/02 |
| Semifinais | qua 17/02 |
| Final | qui 18/02, 19:00 |

Carnaval 2027 (sáb 06/02 → ter 09/02): caem as rodadas 39 a 46 da liga (2 por dia). Janelas e mata-mata ficam fora. Datas mantidas até o Robson decidir.

## Painel da temporada (Robson 23/11) – só administradores
Fica na Central da liga (e um aviso na tela Campeonato quando a temporada acaba). Só quem é admin (`admins.js`: Robshow, Duque + `ADMIN_APELIDOS`, ou marcado como admin na Central) usa; o servidor confere em todas as rotas (`/zc/admin/season*`), não só a tela. Cada ação pede duas confirmações (caixa de confirmação + digitar `NOVA TEMPORADA` ou `RESETAR`) e fica no log da liga.

**Começar nova temporada** (aparece depois da final): roda numa transação e
- mantém técnicos/donos dos clubes, elencos, caixa (verbas) e over atual (evolução);
- devolve todos os empréstimos ao clube de origem, expira propostas pendentes, zera negociações e punições de pontos;
- o over atual vira a base da evolução da nova temporada; idades seguem a data de nascimento (sobem sozinhas); contratos não vencem (o jogo não tem salários/vencimento ativos);
- temporada +1, pré-temporada com leilão de pré bloqueado, tabela nova de 49 rodadas (sorteio novo) e calendário novo no mesmo padrão (`agenda.js`), a partir da data escolhida no painel (padrão: amanhã). Agenda automática ligada/desligada pelo painel;
- a temporada anterior (jogos, tabela, estatísticas) fica no histórico; um snapshot do início da nova temporada é salvo.

Calendário gerado (dia 0 = data escolhida): leilão de pré 12:00–20:00 no dia 0, mercado até o dia 4 às 23:59, rodada 1 no dia 5 às 12:00, 2 jogos por dia (12:00 e 19:00), janela do meio depois da R24 (mercado 21:00 do dia da R24 até 3 dias depois às 20:00, leilão no dia seguinte 12:00–20:00), janela do fim depois da R49 (leilão no dia seguinte 12:00–21:00, mercado até o outro dia 21:00), mata-mata 2 jogos por dia e final às 19:00 no dia depois das semis (dia 39). Com 10/01/2027 isso reproduz exatamente o calendário aprovado da temporada 1.

**Leilões nas temporadas seguintes**: os três leilões (pré, meio, fim) continuam nas mesmas janelas e com as mesmas regras (lances abertos, cada clube leva no máximo 1, os 5 maiores overs não dão lance no de pré). As listas fixas (pré, meio e surpresa) e o leilão surpresa foram só da temporada 1. Nas seguintes os lotes são escolhidos pela administração na busca FC27; se uma janela chegar sem lotes, o leilão é pulado e o mercado abre direto. Jogadores travados no Leilão ZC continuam lá até a administração definir o clube ou colocá-los num leilão.

**Resetar a temporada do zero** (no painel a qualquer momento; destaque depois da final): numa transação, volta a sala ao snapshot do início da temporada atual: elencos, verbas, punições, leilões e lances, propostas, transferências, escalações e estado do mercado; apaga jogos, tabela, estatísticas e bolão dessa temporada. Mantém contas, sessões, técnicos donos dos clubes, uniformes/números e o log. Na temporada 1 isso é o estado inicial do jogo (snapshot salvo no 1º boot, ainda na pré-temporada). Opcional: escolher datas novas (o calendário é refeito e o leilão surpresa anda junto).

## Leilão com jogadores da base FC27 (Robson 23/11) – só administradores
Na Central da liga, a busca do leilão procura em toda a base FC27 (21.915 jogadores; filtro por nome, clube, posição, over mínimo/máximo; feminino só marcando a opção). O lote entra no leilão aberto ou, se não houver, no próximo da temporada (pré → meio → fim). Lance mínimo: o admin digita; padrão = regra atual (50% do valor de mercado, mínimo € 0,1 mi). Jogador de clube da liga: a tela avisa (e mostra o técnico); se arrematado, sai do clube de origem, que recebe o valor do lance (mesma regra dos lotes atuais); continua valendo no máximo 1 jogador por clube da liga em cada leilão. Jogador de clube de fora da liga ou livre: só sai do clube. Emprestado ou já em lote: não pode. Lote sem lance pode ser removido (com lance, não). Tudo checado no servidor e registrado no log.

## Peso do over na simulação (Robson 23/11)
"O peso do over na simulação estava muito pouco, aumenta um pouco". Em `sim.js`, o placar esperado usa gols ~ exp(diferença de força / `OVR.div`). O `OVR.div` passou de 16 para **12**, então a diferença de força pesa cerca de 33% mais. Mando, forma, táticas e altitude não mudaram.
Medição (`node scripts/sim-peso-over.js <div> 20`): todos os pares dos 50 clubes, em ida e volta, 20 vezes cada, somando 49.000 jogos. A diferença considerada é a do over médio do XI. Favorito vence / empata:
| Diferença de over | Antes (16) | Agora (12) |
|---|---|---|
| ~1 ponto | 41,5% / 25,5% | 42,3% / 25,5% |
| ~3 pontos | 47,9% / 24,4% | 52,3% / 23,4% |
| ~5 pontos | 57,2% / 22,1% | 63,9% / 20,0% |
| 6+ pontos | 64,3% / 20,3% | 69,2% / 17,1% |
Gols por jogo: 2,79 → 2,88. Mandante vence: 45,1% nos dois.
