# Proposta: verba inicial pelo over (ZC 50)

Data: 23/11/2026. **Status: APROVADA a alternativa B (fórmula linear) pelo Robson em 23/11/2026; aplicada em config/libertadores.json.**

Decisão do Robson: refazer a verba inicial dos 50 clubes pelo over do elenco, de forma inversa (maior over, menor verba). Isso substitui a regra anterior (os 40 mantêm a verba e os 10 novos ganham €200–400 mi).

## Como o over do time foi medido

- **Over usado: média dos 18 maiores overs do elenco.** É o mesmo critério da regra de verbas original dos 40 (out/2026: "ranking da média dos 18 maiores overs") e o mesmo que o jogo usa para definir a força na montagem da tabela (`season.js`).
- Fonte: elenco inicial FC27 do jogo (`data/game.db`, gerado pelo `import.js`), já com os ajustes herdados (overrides de jogador, potenciais, elencos brasileiros, clubes divididos). Os jogadores do leilão ficam fora dos elencos.
- Desempate: quando o over dos 18 empata, vale a média dos 11 maiores (o "over do time" que o site mostra).
- Observação: o campo `overall` que a API `/api/libertadores/clubs` devolve hoje está desatualizado para alguns clubes (por exemplo América 75,5 contra 73,2 real; Universitario 70,5 contra 72,4). Ele foi gravado antes de alguns ajustes do import. A coluna "Over 11" abaixo foi recalculada com o elenco real.

## Economia atual

- 40 originais: mín. €0, máx. €500 mi, média €231 mi, total €9.250 mi.
- 50 clubes (40 + novos €200–400 mi): média €243 mi, **total €12.150 mi**.

## Proposta principal (A): faixas por ranking de over

É a mesma lógica da regra original que o Robson já conhece, agora estendida para 50 clubes:

| Ranking pelo over | Clubes | Verba |
|---|---|---|
| 1º–5º | 5 | €0 |
| 6º–10º | 5 | €50 mi |
| 11º–15º | 5 | €100 mi |
| 16º–25º | 10 | €200 mi |
| 26º–35º | 10 | €300 mi |
| 36º–45º | 10 | €400 mi |
| 46º–50º | 5 | €500 mi |

- Total: **€12.250 mi** (+€100 mi, +0,8% em relação a hoje). Média €245 mi.
- Pontos de corte decididos no desempate pelo over dos 11:
  - Boca (5º, €0) e Atlético-MG (6º, €50 mi) empatam com 75,06.
  - Corinthians (10º, €50 mi), São Paulo e Internacional (11º–12º, €100 mi) empatam com 74,17.

## Alternativa (B): fórmula linear pelo over

- **Verba = €55 mi por ponto de over abaixo do melhor (Flamengo, 76,56)**, ou seja, €5,5 mi por cada 0,1 de over. Arredonda para múltiplo de €25 mi, com teto de €500 mi.
- Total: **€12.075 mi** (−€75 mi, −0,6%). Média €241,5 mi.
- Vantagem: sem degraus. Clubes de over parecido recebem verbas parecidas, e um empate nunca separa dois clubes em €50 mi.
- Desvantagem: a verba fica mais "achatada" no meio da tabela (vários clubes entre €275 e €375 mi), e os mais fracos recebem um pouco menos que na A (exceto o Caracas).

## Tabela (ordenada pelo over dos 18)

`*` = clube novo da versão 50.

| # | Clube | País | Over 18 | Over 11 | Verba atual | **Proposta A** | Alternativa B |
|---|---|---|---|---|---|---|---|
| 1 | Flamengo | Brasil | 76.56 | 77.64 | €0 | **€0** | €0 |
| 2 | Palmeiras | Brasil | 76.50 | 77.45 | €0 | **€0** | €0 |
| 3 | River Plate | Argentina | 75.67 | 77.09 | €0 | **€0** | €50 mi |
| 4 | Fluminense | Brasil | 75.11 | 75.82 | €0 | **€0** | €75 mi |
| 5 | Boca Juniors | Argentina | 75.06 | 76.27 | €50 mi | **€0** | €75 mi |
| 6 | Atlético Mineiro | Brasil | 75.06 | 76.00 | €0 | **€50 mi** | €75 mi |
| 7 | Cruzeiro | Brasil | 75.00 | 76.27 | €50 mi | **€50 mi** | €75 mi |
| 8 | Santos | Brasil | 74.94 | 76.09 | €50 mi | **€50 mi** | €100 mi |
| 9 | Grêmio | Brasil | 74.39 | 75.18 | €50 mi | **€50 mi** | €125 mi |
| 10 | Corinthians | Brasil | 74.17 | 75.09 | €50 mi | **€50 mi** | €125 mi |
| 11 | São Paulo | Brasil | 74.17 | 75.00 | €100 mi | **€100 mi** | €125 mi |
| 12 | Internacional | Brasil | 74.17 | 74.91 | €100 mi | **€100 mi** | €125 mi |
| 13 | Vasco | Brasil | 74.11 | 74.73 | €100 mi | **€100 mi** | €125 mi |
| 14 | Estudiantes | Argentina | 73.94 | 74.91 | €100 mi | **€100 mi** | €150 mi |
| 15 | Athletico-PR | Brasil | 73.72 | 74.64 | €100 mi | **€100 mi** | €150 mi |
| 16 | Botafogo | Brasil | 73.61 | 75.27 | €200 mi | **€200 mi** | €150 mi |
| 17 | Toluca * | México | 73.33 | 74.64 | €200 mi | **€200 mi** | €175 mi |
| 18 | Rosario Central | Argentina | 73.00 | 74.36 | €200 mi | **€200 mi** | €200 mi |
| 19 | Bahia | Brasil | 72.72 | 73.82 | €200 mi | **€200 mi** | €200 mi |
| 20 | Racing | Argentina | 72.39 | 73.73 | €200 mi | **€200 mi** | €225 mi |
| 21 | Cruz Azul * | México | 72.28 | 74.18 | €200 mi | **€200 mi** | €225 mi |
| 22 | Atlético Nacional | Colômbia | 72.17 | 74.18 | €200 mi | **€200 mi** | €250 mi |
| 23 | Monterrey * | México | 72.17 | 73.55 | €200 mi | **€200 mi** | €250 mi |
| 24 | Belgrano * | Argentina | 71.94 | 74.27 | €300 mi | **€200 mi** | €250 mi |
| 25 | Lanús | Argentina | 71.83 | 73.45 | €300 mi | **€200 mi** | €250 mi |
| 26 | Vélez Sarsfield | Argentina | 71.78 | 74.27 | €300 mi | **€300 mi** | €275 mi |
| 27 | Peñarol | Uruguai | 71.17 | 72.09 | €300 mi | **€300 mi** | €300 mi |
| 28 | América * | México | 71.11 | 73.18 | €300 mi | **€300 mi** | €300 mi |
| 29 | Tigres * | México | 71.11 | 72.91 | €300 mi | **€300 mi** | €300 mi |
| 30 | Independiente | Argentina | 71.11 | 72.64 | €300 mi | **€300 mi** | €300 mi |
| 31 | Independiente Rivadavia * | Argentina | 71.06 | 72.18 | €300 mi | **€300 mi** | €300 mi |
| 32 | Nacional | Uruguai | 71.00 | 72.91 | €400 mi | **€300 mi** | €300 mi |
| 33 | Indep. Santa Fe | Colômbia | 70.94 | 72.45 | €400 mi | **€300 mi** | €300 mi |
| 34 | Cerro Porteño | Paraguai | 70.83 | 72.36 | €300 mi | **€300 mi** | €325 mi |
| 35 | Olimpia | Paraguai | 70.83 | 72.18 | €300 mi | **€300 mi** | €325 mi |
| 36 | Independiente del Valle | Equador | 70.67 | 72.09 | €300 mi | **€400 mi** | €325 mi |
| 37 | Platense * | Argentina | 70.67 | 71.64 | €300 mi | **€400 mi** | €325 mi |
| 38 | LDU Quito | Equador | 70.61 | 71.55 | €300 mi | **€400 mi** | €325 mi |
| 39 | San Lorenzo | Argentina | 70.50 | 71.64 | €300 mi | **€400 mi** | €325 mi |
| 40 | Universitario | Peru | 70.33 | 72.36 | €500 mi | **€400 mi** | €350 mi |
| 41 | Huracán * | Argentina | 70.28 | 71.64 | €400 mi | **€400 mi** | €350 mi |
| 42 | Talleres * | Argentina | 70.17 | 72.73 | €400 mi | **€400 mi** | €350 mi |
| 43 | Argentinos Juniors | Argentina | 70.17 | 71.91 | €300 mi | **€400 mi** | €350 mi |
| 44 | Universidad Católica | Chile | 70.17 | 71.73 | €400 mi | **€400 mi** | €350 mi |
| 45 | Libertad | Paraguai | 69.89 | 71.82 | €500 mi | **€400 mi** | €375 mi |
| 46 | Bolívar | Bolívia | 69.78 | 71.36 | €500 mi | **€500 mi** | €375 mi |
| 47 | Sporting Cristal | Peru | 69.72 | 71.18 | €400 mi | **€500 mi** | €375 mi |
| 48 | Barcelona de Guayaquil | Equador | 69.50 | 71.09 | €400 mi | **€500 mi** | €400 mi |
| 49 | Coquimbo Unido | Chile | 68.72 | 70.64 | €500 mi | **€500 mi** | €425 mi |
| 50 | Caracas FC | Venezuela | 67.11 | 69.09 | €500 mi | **€500 mi** | €500 mi |
| | **Total** | | | | **€12150 mi** | **€12250 mi** | **€12075 mi** |

## Para aplicar (depois da aprovação)

1. Trocar `clubs[].budget` em `config/libertadores.json` e atualizar `_doc_budget`/`_doc_50` e `DECISOES-50.md`.
2. Ainda não há contas nem movimentações no site novo. A sala LIGA já foi criada com as verbas antigas, então as verbas dela vão ser atualizadas por uma migração única (ou pelo reset da temporada, que restaura o snapshot inicial, que também precisa receber as verbas novas).
3. Testes, commit, push e autodeploy no Render.
