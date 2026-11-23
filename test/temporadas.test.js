// Painel da temporada (nova temporada / reset) + leilão com jogadores da base FC27.
// Parte 1 (sempre): calendário gerado pelo mesmo padrão da temporada 1.
// Parte 2 (E2E, só com E2E_BASE e DATABASE_URL apontando para um servidor e um Postgres DESCARTÁVEIS):
//   E2E_BASE=http://localhost:3150 DATABASE_URL=postgres://... PGSSL=0 node test/temporadas.test.js
const assert=require('assert');const A=require('../agenda');
{const strip=o=>{const x=JSON.parse(JSON.stringify(o));for(const k of ['_doc','_doc_50','_doc_season'])delete x[k];return x};
 const cfg=JSON.parse(require('fs').readFileSync(__dirname+'/../config/agenda-zc.json','utf8'));
 assert.deepStrictEqual(strip(A.build('2027-01-10',{paused:true})),strip(cfg),'build(10/01/2027) tem que reproduzir a agenda aprovada da temporada 1');
 const b=A.build('2027-03-01');assert.strictEqual(b.matches_start,'2027-03-06');assert.strictEqual(b.windows.mid.after_round,24);assert.strictEqual(b.windows.end.after_round,49);
 assert.strictEqual(b.windows.mid.resume,'2027-03-21');assert.strictEqual(b.windows.end.resume,'2027-04-05');assert.strictEqual(b.final_at,'2027-04-09T19:00:00-03:00');assert.strictEqual(b.paused,false);
 assert.throws(()=>A.build('2027-02-30'));assert.throws(()=>A.build('amanhã'));
 const src=require('fs').readFileSync(__dirname+'/../temporadas.js','utf8');for(const r of ['season/new','season/reset'])assert.match(src,new RegExp(r.replace('/','\\/')));
 assert.match(src,/adminOnly\(r\)/);assert.match(src,/'RESETAR'/);assert.match(src,/'NOVA TEMPORADA'/);assert.match(src,/BEGIN/);
 const ex=require('fs').readFileSync(__dirname+'/../extras.js','utf8');assert.match(ex,/zc\/admin\/fc27/);assert.match(ex,/já tem lance e não pode ser removido/);
 console.log('temporadas: agenda e rotas OK');}
if(!process.env.E2E_BASE||!process.env.DATABASE_URL){console.log('temporadas E2E: pulado (defina E2E_BASE e DATABASE_URL de um ambiente descartável)');return;}
(async()=>{const B=process.env.E2E_BASE+'/api';const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});const q=async(s,p)=>(await pool.query(s,p)).rows;
 const call=async(tok,m,u,b)=>{const r=await fetch(B+u,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));return {st:r.status,j};};
 const ok=async(...a)=>{const r=await call(...a);if(r.st!==200)throw new Error(a[1]+' '+a[2]+' -> '+r.st+' '+JSON.stringify(r.j));return r.j;};
 const reg=async n=>{const r=await fetch(B+'/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nick:n,pin:'4321'})});const j=await r.json();if(!j.token){const l=await fetch(B+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nick:n,pin:'4321'})});return (await l.json()).token;}return j.token;};
 const adm=await reg('Robshow'),usr=await reg('Fulano');await ok(adm,'GET','/liga');await ok(usr,'GET','/liga');
 const [room]=await q("SELECT * FROM rooms WHERE code='LIGA'");const uid=n=>q('SELECT id FROM users WHERE nick=$1',[n]).then(r=>r[0].id);
 const TOLUCA=747,FLU=768;await ok(adm,'POST','/rooms/LIGA/zc/admin/assign',{user_id:await uid('Robshow'),club_id:FLU});await ok(adm,'POST','/rooms/LIGA/zc/admin/assign',{user_id:await uid('Fulano'),club_id:TOLUCA});
 const md5=async(sql)=>(await q(`SELECT md5(COALESCE(string_agg(x::text,'|' ORDER BY x::text),'')) h,count(*)::int n FROM (${sql}) x`,[room.id]))[0];
 const FP=async()=>({room:(await q('SELECT season,status,mkt_stage,mkt_state,auction_open,auction_excl,fixtures IS NULL nofx,market_day FROM rooms WHERE id=$1',[room.id]))[0],
  clubs:await md5('SELECT club_id,budget,penalty_pts FROM room_clubs WHERE room_id=$1'),players:await md5('SELECT player_id,club_id,overall,potential,contract_end,loan_from,loan_until FROM room_players WHERE room_id=$1'),
  lots:await md5('SELECT id,player_id,status,from_club,min_bid,stage,winner_club FROM auction_lots WHERE room_id=$1'),bids:await md5('SELECT b.lot_id,b.club_id,b.amount FROM auction_bids b JOIN auction_lots l ON l.id=b.lot_id WHERE l.room_id=$1'),
  transfers:await md5('SELECT id,player_id,from_club,to_club,fee FROM transfers WHERE room_id=$1'),offers:await md5('SELECT id,status FROM offers WHERE room_id=$1'),lineups:await md5('SELECT club_id,starters FROM lineups WHERE room_id=$1')});
 const comps=async()=>(await q('SELECT season,current_round FROM competitions WHERE room_id=$1 ORDER BY season',[room.id]));
 const FP0=await FP();
 // ---- não-admin: tudo negado no servidor ----
 for(const [m,u,b] of [['GET','/rooms/LIGA/zc/admin/season'],['POST','/rooms/LIGA/zc/admin/season/new',{confirm:'NOVA TEMPORADA'}],['POST','/rooms/LIGA/zc/admin/season/reset',{confirm:'RESETAR'}],['GET','/rooms/LIGA/zc/admin/fc27?q=messi'],['POST','/rooms/LIGA/zc/admin/auction/add',{player_id:231747}],['POST','/rooms/LIGA/zc/admin/auction/remove',{lot_id:1}]]){
  const r=await call(usr,m,u,b);assert.strictEqual(r.st,403,`não-admin ${m} ${u} deveria dar 403 (deu ${r.st})`);}
 console.log('E2E: não-admin negado nas 6 rotas (403)');
 let S=await ok(adm,'GET','/rooms/LIGA/zc/admin/season');assert.strictEqual(S.can_reset,true);assert.strictEqual(S.first_season,true);assert.strictEqual(S.can_new,false);
 // ---- leilão: busca FC27 + add/remove ----
 let f=await ok(adm,'GET','/rooms/LIGA/zc/admin/fc27?q=mbapp');const mb=f.players[0];assert.ok(mb&&!mb.in_league,'Mbappé (fora da liga) encontrado');assert.strictEqual(f.target,'pre');
 const a1=await ok(adm,'POST','/rooms/LIGA/zc/admin/auction/add',{player_id:mb.id,min_bid:50e6});assert.strictEqual(a1.stage,'pre');assert.strictEqual(a1.min_bid,50e6);
 assert.strictEqual((await call(adm,'POST','/rooms/LIGA/zc/admin/auction/add',{player_id:mb.id})).st,400,'duplicado negado');
 f=await ok(adm,'GET','/rooms/LIGA/zc/admin/fc27?club=fluminense&pos=ATA');const fl=f.players.find(p=>p.in_league&&!p.in_lot);assert.ok(fl&&fl.manager==='Robshow','jogador de clube da liga com aviso de técnico');
 const a2=await ok(adm,'POST','/rooms/LIGA/zc/admin/auction/add',{player_id:fl.id});assert.strictEqual(a2.in_league,true);assert.strictEqual(a2.min_bid,fl.min_default,'lance mínimo padrão = regra atual');
 const fl2=f.players.find(p=>p.in_league&&p.id!==fl.id&&!p.in_lot);assert.strictEqual((await call(adm,'POST','/rooms/LIGA/zc/admin/auction/add',{player_id:fl2.id})).st,400,'2º do mesmo clube da liga negado');
 f=await ok(adm,'GET','/rooms/LIGA/zc/admin/fc27?omin=85&pos=GOL');assert.ok(f.players.length&&f.players.every(p=>p.overall>=85&&p.pos==='GOL'),'filtro over/posição');
 assert.strictEqual((await call(adm,'GET','/rooms/LIGA/zc/admin/fc27')).st,400,'busca sem filtro negada');
 await ok(adm,'POST','/rooms/LIGA/zc/admin/auction/remove',{lot_id:a2.lot_id});assert.strictEqual((await q('SELECT count(*)::int n FROM auction_lots WHERE id=$1',[a2.lot_id]))[0].n,0,'lote sem lance removido');
 await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'auction_start'});await ok(usr,'POST','/rooms/LIGA/zc/auction/bid',{lot_id:a1.lot_id,amount:60e6});
 assert.strictEqual((await call(adm,'POST','/rooms/LIGA/zc/admin/auction/remove',{lot_id:a1.lot_id})).st,400,'lote com lance não pode ser removido');
 const cl=await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'auction_close'});assert.ok(cl.sold>=1);
 assert.strictEqual((await q('SELECT club_id FROM room_players WHERE room_id=$1 AND player_id=$2',[room.id,mb.id]))[0].club_id,TOLUCA,'Mbappé arrematado pelo Toluca');
 assert.strictEqual((await ok(adm,'GET','/rooms/LIGA/zc/admin/fc27?q=mbapp')).target,'mid','depois do leilão de pré, novos lotes vão para o leilão do meio');
 const ev=(await q("SELECT text FROM room_events WHERE room_id=$1 AND text LIKE '%(admin)%' ORDER BY id",[room.id])).map(x=>x.text);assert.ok(ev.some(t=>/colocou .*Mbapp/.test(t))&&ev.some(t=>/tirou/.test(t)),'log de add/remove');
 console.log('E2E: busca FC27, add (fora/dentro da liga), regras, remoção sem lance, arremate e log OK');
 // ---- temporada 1: algumas rodadas e reset com datas novas -> volta ao estado inicial ----
 await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'market_close'});await ok(adm,'POST','/rooms/LIGA/season/start',{confirm:true});
 for(let i=0;i<3;i++)await ok(adm,'POST','/rooms/LIGA/advance',{});assert.strictEqual((await comps())[0].current_round,3);
 assert.strictEqual((await call(adm,'POST','/rooms/LIGA/zc/admin/season/reset',{confirm:'resetar já'})).st,400,'confirmação errada negada');
 const sur0=(await q("SELECT id,opens_at FROM auction_lots WHERE room_id=$1 AND stage='surpresa' ORDER BY id LIMIT 1",[room.id]))[0];
 let R=await ok(adm,'POST','/rooms/LIGA/zc/admin/season/reset',{confirm:'RESETAR',start:'2027-02-01',auto:false});
 assert.deepStrictEqual(await FP(),FP0,'reset da temporada 1 = estado inicial do jogo');assert.strictEqual((await comps()).length,0);
 assert.strictEqual(R.agenda.matches_start,'2027-02-06');
 if(sur0){const s1=(await q('SELECT opens_at FROM auction_lots WHERE id=$1',[sur0.id]))[0];assert.strictEqual(new Date(s1.opens_at)-new Date(sur0.opens_at),22*864e5,'leilão surpresa andou junto com as datas');}
 const fx=await ok(adm,'GET','/rooms/LIGA/zc/fixtures');assert.strictEqual(fx.rounds[0].at,'2027-02-06T15:00:00.000Z','tabela usa a agenda nova');
 assert.strictEqual((await q('SELECT count(*)::int n FROM room_managers WHERE room_id=$1 AND club_id IS NOT NULL',[room.id]))[0].n,2,'técnicos mantidos');
 console.log('E2E: reset da temporada 1 (com datas novas) voltou ao estado inicial; técnicos mantidos');
 // ---- temporada 1 até a final ----
 await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'open_market'});await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'market_close'});await ok(adm,'POST','/rooms/LIGA/season/start',{confirm:true});
 for(let i=0;i<80;i++){const r=await call(adm,'POST','/rooms/LIGA/advance',{});if(r.st!==200){const [x]=await q('SELECT status,mkt_stage,mkt_state FROM rooms WHERE id=$1',[room.id]);if(x.status==='finished')break;
   if(x.mkt_state==='waiting'){await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'open_market'});await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'market_close'});continue;}throw new Error('advance: '+JSON.stringify(r.j));}}
 S=await ok(adm,'GET','/rooms/LIGA/zc/admin/season');assert.strictEqual(S.finished,true);assert.ok(S.champion);assert.strictEqual(S.can_new,true);
 // um empréstimo ativo para checar a volta na virada
 const lp={player_id:fl2.id};await pool.query('INSERT INTO room_players(room_id,player_id,club_id,loan_from,loan_until) VALUES($1,$2,$3,$4,99) ON CONFLICT(room_id,player_id) DO UPDATE SET club_id=$3,loan_from=$4,loan_until=99',[room.id,lp.player_id,TOLUCA,FLU]);
 const before={squads:await md5('SELECT player_id,club_id FROM room_players WHERE room_id=$1 AND player_id<>'+lp.player_id),clubs:await md5('SELECT club_id,budget FROM room_clubs WHERE room_id=$1'),ovr:await md5('SELECT player_id,overall FROM room_players WHERE room_id=$1')};
 assert.strictEqual((await call(usr,'POST','/rooms/LIGA/zc/admin/season/new',{confirm:'NOVA TEMPORADA'})).st,403);assert.strictEqual((await call(adm,'POST','/rooms/LIGA/zc/admin/season/new',{confirm:'nova'})).st,400);
 const start=A.addDays(new Date(Date.now()-3*3600e3).toISOString().slice(0,10),1);
 const N=await ok(adm,'POST','/rooms/LIGA/zc/admin/season/new',{confirm:'NOVA TEMPORADA',start,auto:false});assert.strictEqual(N.season,2027);assert.strictEqual(N.agenda.matches_start,A.addDays(start,5));assert.ok(N.loans_back>=1);
 const [r2]=await q('SELECT season,status,mkt_stage,mkt_state FROM rooms WHERE id=$1',[room.id]);assert.deepStrictEqual(r2,{season:2027,status:'lobby',mkt_stage:'pre',mkt_state:'waiting'});
 assert.deepStrictEqual((await md5('SELECT club_id,budget FROM room_clubs WHERE room_id=$1')),before.clubs,'caixa mantido');assert.deepStrictEqual((await md5('SELECT player_id,overall FROM room_players WHERE room_id=$1')),before.ovr,'evolução (over) mantida');
 assert.deepStrictEqual(await md5('SELECT player_id,club_id FROM room_players WHERE room_id=$1 AND player_id<>'+lp.player_id),before.squads,'elencos mantidos');
 assert.strictEqual((await q('SELECT club_id FROM room_players WHERE room_id=$1 AND player_id=$2',[room.id,lp.player_id]))[0].club_id,FLU,'empréstimo voltou');
 assert.strictEqual((await q('SELECT count(*)::int n FROM room_managers WHERE room_id=$1 AND club_id IS NOT NULL',[room.id]))[0].n,2);
 const c26=(await comps()).find(c=>c.season===2026);assert.ok(c26&&c26.current_round===58,'temporada 1 fica no histórico');
 console.log('E2E: nova temporada 2027 criada com continuidade (caixa, over, elencos, técnicos), empréstimo voltou, calendário',N.agenda.matches_start);
 const FP1=await FP();
 // ---- temporada 2: lote FC27 no pré, algumas rodadas, reset -> volta ao início da temporada 2 ----
 f=await ok(adm,'GET','/rooms/LIGA/zc/admin/fc27?q=haaland');assert.strictEqual(f.target,'pre');await ok(adm,'POST','/rooms/LIGA/zc/admin/auction/add',{player_id:f.players[0].id});
 await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'auction_start'});await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'auction_close'});await ok(adm,'POST','/rooms/LIGA/zc/admin/cal',{action:'market_close'});
 await ok(adm,'POST','/rooms/LIGA/season/start',{confirm:true});for(let i=0;i<4;i++)await ok(adm,'POST','/rooms/LIGA/advance',{});
 assert.strictEqual((await comps()).find(c=>c.season===2027).current_round,4);const fx2=await ok(adm,'GET','/rooms/LIGA/zc/fixtures');assert.strictEqual(fx2.rounds[0].at.slice(0,10),N.agenda.matches_start,'R1 da temporada 2 na data escolhida');
 assert.strictEqual((await call(usr,'POST','/rooms/LIGA/zc/admin/season/reset',{confirm:'RESETAR'})).st,403);
 R=await ok(adm,'POST','/rooms/LIGA/zc/admin/season/reset',{confirm:'RESETAR'});assert.strictEqual(R.season,2027);
 assert.deepStrictEqual(await FP(),FP1,'reset da temporada 2 = início da temporada 2');const cs=await comps();assert.deepStrictEqual(cs.map(c=>c.season),[2026],'só a temporada 2026 (histórico) fica');
 const ev2=(await q("SELECT text FROM room_events WHERE room_id=$1 AND (text LIKE '🆕%' OR text LIKE '♻️%') ORDER BY id",[room.id])).map(x=>x.text);assert.strictEqual(ev2.length,3,'log: reset, nova temporada, reset');
 console.log('E2E: temporada 2 jogada (4 rodadas) e resetada; voltou ao início dela; log OK');
 await pool.end();console.log('temporadas E2E OK');})().catch(e=>{console.error(e);process.exit(1)});
