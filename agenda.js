// Agenda (calendário) da sala LIGA, compartilhada por season.js, extras.js, market.js e mp.js.
// - Temporada 1: config/agenda-zc.json (datas aprovadas pelo Robson).
// - Temporadas seguintes (botão "Começar nova temporada") e resets com data nova: a agenda é gerada por build()
//   no mesmo padrão da temporada 1 e gravada no banco (lib_season_snapshots.agenda); no boot e após cada troca
//   ela substitui este objeto em memória (apply), então todos os módulos passam a ver as datas novas.
const AG=require('./config/agenda-zc.json');
const BASE=JSON.parse(JSON.stringify(AG));
const L=require('./libertadores');
function apply(a){const src=JSON.parse(JSON.stringify(a||BASE));for(const k of Object.keys(AG))delete AG[k];Object.assign(AG,src);return AG;}
const addDays=(ymd,n)=>{const d=new Date(ymd+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const at=(ymd,hm)=>`${ymd}T${hm}:00-03:00`;
const validYmd=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
// start = primeiro dia da pré-temporada (AAAA-MM-DD, horário de Brasília). Padrão (igual à temporada 1, que começa em 10/01/2027):
//  dia 0: leilão de pré-temporada 12:00–20:00, mercado abre 21:40 e fecha no dia 4 às 23:59; rodada 1 no dia 5 às 12:00;
//  2 rodadas por dia (12:00 e 19:00); janela do meio depois da R24 (mercado abre 21:00 no dia da R24, leilão no dia seguinte 12:00–20:00,
//  mercado fecha 3 dias depois da R24 às 20:00, liga volta no dia seguinte 12:00); janela do fim depois da R49 (leilão no dia seguinte
//  12:00–21:00, mercado até o outro dia 21:00), mata-mata 2 jogos por dia a partir do dia seguinte e final no dia depois das semis, 19:00.
function build(start,{paused=false,prev=BASE}={}){if(!validYmd(start))throw new Error('Data inválida (use AAAA-MM-DD)');
 const PLAN=L.plan(),LEAGUE=PLAN.filter(s=>s.stage==='league').length;const slots=(prev.slots&&prev.slots.length?prev.slots:['12:00','19:00']).slice(),n=slots.length;
 const after=+(prev.windows?.mid?.after_round)||L.TURNO1_END();
 const m0=addDays(start,5);                                   // rodada 1
 const r24=addDays(m0,Math.floor((after-1)/n));               // dia da última rodada antes da janela do meio
 const midResume=addDays(r24,4);
 const r49=addDays(midResume,Math.floor((LEAGUE-after-1)/n)); // dia da última rodada da liga
 const endResume=addDays(r49,3);
 const koRounds=PLAN.length-LEAGUE-1;                         // mata-mata sem a final
 const finalDay=addDays(endResume,Math.ceil(koRounds/n));
 return {_doc_season:`Agenda gerada pelo painel da temporada: pré-temporada em ${start}, rodada 1 em ${m0}. Mesmo padrão da temporada 1.`,
  paused:!!paused,room:prev.room||'LIGA',
  auction_start:at(start,'12:00'),auction_close:at(start,'20:00'),market_close:at(addDays(start,4),'23:59'),
  pre_market_during_rounds:prev.pre_market_during_rounds!==undefined?!!prev.pre_market_during_rounds:true,
  penalty_at_market_close:prev.penalty_at_market_close!==undefined?!!prev.penalty_at_market_close:true,
  market_open:at(start,'21:40'),matches_start:m0,start_slot:0,slots,
  windows:{mid:{after_round:after,market_open:at(r24,'21:00'),auction_start:at(addDays(r24,1),'12:00'),auction_close:at(addDays(r24,1),'20:00'),market_close:at(addDays(r24,3),'20:00'),resume:midResume,resume_slot:0},
   end:{after_round:LEAGUE,auction_start:at(addDays(r49,1),'12:00'),auction_close:at(addDays(r49,1),'21:00'),market_close:at(addDays(r49,2),'21:00'),resume:endResume}},
  final_at:at(finalDay,slots[n-1])};}
const startOf=a=>String((a||AG).auction_start||'').slice(0,10)||null; // 1º dia da pré-temporada de uma agenda
module.exports={AG,BASE,apply,build,addDays,validYmd,startOf};
