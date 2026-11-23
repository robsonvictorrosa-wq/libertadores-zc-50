// Painel da temporada (Robson 23/11), só para administradores (admins.js / ADMIN_APELIDOS), checado no servidor:
//  1) "Começar nova temporada": depois da final (status 'finished'), abre a temporada seguinte com continuidade
//     (técnicos, elencos, caixa e evolução dos jogadores) e um calendário novo no mesmo padrão da temporada 1.
//  2) "Resetar a temporada do zero": volta a sala ao snapshot salvo no início da temporada atual (elencos, verbas,
//     leilões, tabela), numa transação. Contas, sessões e técnicos donos dos clubes são mantidos.
// Snapshot: tabela lib_season_snapshots (uma linha por sala+temporada), gravado no 1º boot (temporada 1, ainda em pré-temporada)
// e dentro da mesma transação que cria cada temporada nova.
const A=require('./agenda');
module.exports=({app,uni,q,pool,auth,wrap,fail,member,R,ready})=>{
 const SNAP_TABLES=['room_clubs','room_players','lineups','offers','negotiations','transfers','auction_lots'];
 const ROOM_SKIP=new Set(['id','code','name','owner_id','max_managers','created_at','version']);
 const LOT_CHILD=['auction_bids','auction_bid_log'];
 const adminOnly=r=>{if(!r.user?.admin)throw fail('Só administradores',403);};
 const note=(db,rid,t,uid)=>db.query('INSERT INTO room_events(room_id,text,user_id) VALUES($1,$2,$3)',[rid,t,uid||null]);
 const cols=async(db,t)=>(await db.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema=current_schema() ORDER BY ordinal_position',[t])).rows.map(x=>x.column_name);
 const qi=c=>'"'+c.replace(/"/g,'""')+'"';
 const brt=d=>new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
 const tomorrow=()=>A.addDays(new Date(Date.now()-3*3600e3).toISOString().slice(0,10),1);
 async function ensureTable(db){await db.query('CREATE TABLE IF NOT EXISTS lib_season_snapshots(room_id INT REFERENCES rooms(id) ON DELETE CASCADE,season INT NOT NULL,created_at TIMESTAMPTZ DEFAULT now(),data JSONB NOT NULL,agenda JSONB,PRIMARY KEY(room_id,season))');}
 async function takeSnapshot(db,roomId){const data={tables:{}};
  data.room=(await db.query('SELECT to_jsonb(r) j FROM rooms r WHERE id=$1',[roomId])).rows[0].j;
  for(const t of SNAP_TABLES)data.tables[t]=(await db.query(`SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) j FROM ${t} t WHERE room_id=$1`,[roomId])).rows[0].j;
  for(const t of LOT_CHILD)data.tables[t]=(await db.query(`SELECT COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb) j FROM ${t} t WHERE lot_id IN (SELECT id FROM auction_lots WHERE room_id=$1)`,[roomId])).rows[0].j;
  data.migs=(await db.query('SELECT name FROM lib_migrations')).rows.map(x=>x.name);return data;}
 async function saveSnapshot(db,roomId,season,agenda){const data=await takeSnapshot(db,roomId);
  await db.query('INSERT INTO lib_season_snapshots(room_id,season,data,agenda) VALUES($1,$2,$3,$4) ON CONFLICT(room_id,season) DO UPDATE SET data=EXCLUDED.data,agenda=EXCLUDED.agenda,created_at=now()',[roomId,season,data,agenda?JSON.stringify(agenda):null]);
  return {players:data.tables.room_players.length,lots:data.tables.auction_lots.length};}
 async function insertRows(db,t,rows){if(!rows||!rows.length)return 0;const have=new Set(await cols(db,t));const keys=Object.keys(rows[0]).filter(k=>have.has(k));if(!keys.length)return 0;
  const k=keys.map(qi).join(',');await db.query(`INSERT INTO ${t}(${k}) SELECT ${k} FROM jsonb_populate_recordset(NULL::${t},$1::jsonb)`,[JSON.stringify(rows)]);return rows.length;}
 // ---------- boot: snapshot da temporada 1 e agenda da temporada atual ----------
 async function boot(){try{await ensureTable(pool);const [room]=(await pool.query('SELECT * FROM rooms WHERE code=$1',[A.AG.room||'LIGA'])).rows;if(!room)return;
   const [sn]=(await pool.query('SELECT season,agenda IS NOT NULL has_ag,agenda FROM lib_season_snapshots WHERE room_id=$1 AND season=$2',[room.id,room.season])).rows;
   if(sn&&sn.has_ag){A.apply(sn.agenda);console.log('temporadas: agenda da temporada',room.season,'carregada do banco (pré-temporada',A.startOf(),')');}
   if(!sn){const [cp]=(await pool.query('SELECT count(*)::int n FROM competitions WHERE room_id=$1 AND season=$2',[room.id,room.season])).rows;
    if(room.status==='lobby'&&!cp.n){const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM rooms WHERE id=$1 FOR UPDATE',[room.id]);const x=await saveSnapshot(c,room.id,room.season,null);await c.query('COMMIT');console.log('temporadas: snapshot inicial da temporada',room.season,JSON.stringify(x));}catch(e){await c.query('ROLLBACK');console.error('temporadas snapshot',e.message)}finally{c.release()}}
    else console.warn('temporadas: sem snapshot da temporada',room.season,'(já começou antes deste recurso); reset indisponível nesta temporada');}
  }catch(e){console.error('temporadas boot',e.message)}}
 // ---------- migração única verbas-over-2311 (Robson 23/11, opção B: verba pelo over, inversa) ----------
 // Troca as verbas da sala LIGA e do snapshot inicial (usado pelo reset) pelas de config/libertadores.json.
 // Só roda se não houver transferências, propostas, lances nem competições e se cada verba ainda for exatamente a antiga
 // (contas e técnicos podem existir e não são alterados); senão, avisa no log e não faz nada.
 async function migVerbasOver2311(){const NAME='verbas-over-2311';try{
  await pool.query('CREATE TABLE IF NOT EXISTS lib_migrations(name TEXT PRIMARY KEY,at TIMESTAMPTZ DEFAULT now())');
  if((await pool.query('SELECT 1 FROM lib_migrations WHERE name=$1',[NAME])).rows.length)return;
  const [room]=(await pool.query('SELECT * FROM rooms WHERE code=$1',[A.AG.room||'LIGA'])).rows;if(!room)return;
  const CF=JSON.parse(require('fs').readFileSync(__dirname+'/config/libertadores.json','utf8'));const OLD=require('./config/verbas-over-2311.json').old_by_ord;
  const L=uni.prepare('SELECT ord,club_id FROM lib_clubs ORDER BY ord').all();const NEW=new Map(),OLDM=new Map();
  for(const x of L){NEW.set(+x.club_id,+CF.clubs[x.ord].budget);OLDM.set(+x.club_id,+OLD[x.ord]);}
  const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM rooms WHERE id=$1 FOR UPDATE',[room.id]);
   const rc=(await c.query('SELECT club_id,budget FROM room_clubs WHERE room_id=$1 AND club_id=ANY($2::int[])',[room.id,[...NEW.keys()]])).rows;
   const done=()=>c.query('INSERT INTO lib_migrations(name) VALUES($1) ON CONFLICT DO NOTHING',[NAME]);
   if(rc.length===NEW.size&&rc.every(r=>+r.budget===NEW.get(+r.club_id))){await done();await c.query('COMMIT');console.log(NAME,'já estava com as verbas novas (banco novo)');return;}
   const n=async sql=>(await c.query(sql,[room.id])).rows[0].n;
   // Robson 23/11 11:46: pode rodar com contas/técnicos já criados (eles não são alterados); só trava se houve movimentação de dinheiro
   const why=[];
   for(const [t,sql] of [['transferências','SELECT count(*)::int n FROM transfers WHERE room_id=$1'],['propostas','SELECT count(*)::int n FROM offers WHERE room_id=$1'],['lances','SELECT count(*)::int n FROM auction_bids b JOIN auction_lots l ON l.id=b.lot_id WHERE l.room_id=$1'],['competições','SELECT count(*)::int n FROM competitions WHERE room_id=$1']]){const k=await n(sql);if(k)why.push(k+' '+t);}
   if(room.status!=='lobby')why.push('sala em '+room.status);
   const diff=rc.filter(r=>+r.budget!==OLDM.get(+r.club_id));if(diff.length)why.push(diff.length+' verba(s) diferentes da antiga');if(rc.length!==NEW.size)why.push('sala com '+rc.length+'/'+NEW.size+' clubes');
   if(why.length){await c.query('ROLLBACK');console.warn(NAME,'PULADA (nada alterado):',why.join(', '));return;}
   const ids=[...NEW.keys()];await c.query('UPDATE room_clubs rc SET budget=u.b FROM unnest($2::int[],$3::bigint[]) u(c,b) WHERE rc.room_id=$1 AND rc.club_id=u.c',[room.id,ids,ids.map(i=>NEW.get(i))]);
   await ensureTable(c);const [sn]=(await c.query('SELECT data FROM lib_season_snapshots WHERE room_id=$1 AND season=$2',[room.id,room.season])).rows;let snap=0;
   if(sn){const d=sn.data;for(const r of (d.tables?.room_clubs||[]))if(NEW.has(+r.club_id)){r.budget=NEW.get(+r.club_id);snap++;}d.migs=[...new Set([...(d.migs||[]),NAME])];
    await c.query('UPDATE lib_season_snapshots SET data=$3 WHERE room_id=$1 AND season=$2',[room.id,room.season,d]);}
   await done();await note(c,room.id,'Verbas iniciais refeitas pelo over (maior over, menor verba)');await c.query('COMMIT');
   console.log(NAME,'OK',JSON.stringify({clubes:ids.length,snapshot:snap,total_mi:ids.reduce((a,i)=>a+NEW.get(i),0)/1e6}));
  }catch(e){await c.query('ROLLBACK');console.error(NAME,e.message)}finally{c.release()}
 }catch(e){console.error(NAME,e.message)}}
 (ready||Promise.resolve()).then(boot).then(migVerbasOver2311);
 // ---------- status para o painel ----------
 app.get('/api/rooms/:code/zc/admin/season',auth,wrap(async(r,s)=>{const room=await member(r);adminOnly(r);await ensureTable(pool);
  const [sn]=await q('SELECT season,created_at,agenda IS NOT NULL custom FROM lib_season_snapshots WHERE room_id=$1 AND season=$2',[room.id,room.season]);
  const first=(await q('SELECT min(season) s FROM lib_season_snapshots WHERE room_id=$1',[room.id]))[0]?.s;
  const [comp]=await q('SELECT current_round,rounds_total,champion FROM competitions WHERE room_id=$1 AND season=$2 ORDER BY id LIMIT 1',[room.id,room.season]);
  const cur=A.startOf();const def=cur&&cur>=A.addDays(new Date(Date.now()-3*3600e3).toISOString().slice(0,10),0)?cur:tomorrow();
  s.json({season:room.season,status:room.status,finished:room.status==='finished',champion:comp?.champion?(R.C.get(comp.champion)?.name||null):null,round:comp?.current_round||0,rounds_total:comp?.rounds_total||null,
   can_new:room.status==='finished',can_reset:!!sn,snapshot_at:sn?.created_at||null,first_season:first!=null?+first===room.season:true,
   agenda:{paused:!!A.AG.paused,pre_start:cur,round1:A.AG.matches_start,final_at:A.AG.final_at},default_new_start:tomorrow(),default_reset_start:def,preview:(()=>{try{return A.build(tomorrow())}catch(e){return null}})()});}));
 app.get('/api/rooms/:code/zc/admin/season/preview',auth,wrap(async(r,s)=>{await member(r);adminOnly(r);try{s.json(A.build(String(r.query.start||'')));}catch(e){throw fail(e.message)}}));
 // ---------- 1) nova temporada ----------
 app.post('/api/rooms/:code/zc/admin/season/new',auth,wrap(async(r,s)=>{const room0=await member(r);adminOnly(r);
  if(String(r.body?.confirm||'').trim().toUpperCase()!=='NOVA TEMPORADA')throw fail('Confirmação inválida: digite NOVA TEMPORADA');
  const start=String(r.body?.start||tomorrow());let ag;try{ag=A.build(start,{paused:r.body?.auto===undefined?!!A.AG.paused:!r.body.auto});}catch(e){throw fail(e.message)}
  const c=await pool.connect();let out;try{await c.query('BEGIN');await ensureTable(c);const [room]=(await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE',[room0.id])).rows;
   if(room.status!=='finished')throw fail('A temporada ainda não acabou (o botão aparece depois da final)');
   const [comp]=(await c.query('SELECT champion FROM competitions WHERE room_id=$1 AND season=$2 ORDER BY id LIMIT 1',[room.id,room.season])).rows;
   const ns=room.season+1;
   // empréstimos voltam ao clube de origem
   const back=(await c.query('UPDATE room_players SET club_id=loan_from,loan_from=NULL,loan_until=NULL,role=NULL WHERE room_id=$1 AND loan_from IS NOT NULL RETURNING player_id,club_id',[room.id])).rows;
   if(back.length)await c.query('UPDATE lineups SET starters=NULL,slotted=false WHERE room_id=$1 AND starters && $2::int[]',[room.id,back.map(x=>x.player_id)]);
   // propostas pendentes expiram; negociações recomeçam
   const exp=(await c.query("UPDATE offers SET status='expired',reason='Fim da temporada',updated_at=now() WHERE room_id=$1 AND status IN ('pending','countered','club_accepted') RETURNING id",[room.id])).rowCount;
   await c.query('DELETE FROM negotiations WHERE room_id=$1',[room.id]);
   // evolução: o over atual vira a base da nova temporada (ninguém perde over)
   await c.query('UPDATE room_players SET ovr_start=NULL WHERE room_id=$1',[room.id]);
   // punições de pontos da pré-temporada anterior zeram (caixa é mantido)
   await c.query('UPDATE room_clubs SET penalty_pts=0 WHERE room_id=$1',[room.id]);
   const rc=await cols(c,'rooms');const extra=rc.includes('zc_mkt_fixed')?',zc_mkt_fixed=false':'';
   await c.query(`UPDATE rooms SET season=$2,status='lobby',mkt_stage='pre',mkt_state='waiting',mkt_until=NULL,auction_open=false,auction_excl='{}',fixtures=NULL,market_day=0,window_override=NULL,window_was_open=false${extra},version=version+1 WHERE id=$1`,[room.id,ns]);
   await c.query('UPDATE room_managers SET ready=false WHERE room_id=$1',[room.id]);
   await note(c,room.id,`🆕 ${r.user.nick} (admin) começou a temporada ${ns}/${ns+1}${comp?.champion?` (campeão de ${room.season}/${room.season+1}: ${R.C.get(comp.champion)?.name})`:''}. Mantidos: técnicos, elencos, caixa e evolução. ${back.length} empréstimo(s) voltaram, ${exp} proposta(s) expiraram. Pré-temporada em ${start.split('-').reverse().join('/')}, rodada 1 em ${ag.matches_start.split('-').reverse().join('/')}, final ${brt(ag.final_at)}. Leilão de pré-temporada sem lista fixa: os lotes são escolhidos pela administração.`,r.user.id);
   const x=await saveSnapshot(c,room.id,ns,ag);await c.query('COMMIT');
   A.apply(ag);app.locals.zcOvCacheClear?.(room.id);
   out={ok:1,season:ns,loans_back:back.length,offers_expired:exp,agenda:ag,snapshot:x};}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  console.log('temporadas: nova temporada',out.season,'por',r.user.nick);s.json(out);}));
 // ---------- 2) reset da temporada atual ----------
 app.post('/api/rooms/:code/zc/admin/season/reset',auth,wrap(async(r,s)=>{const room0=await member(r);adminOnly(r);
  if(String(r.body?.confirm||'').trim().toUpperCase()!=='RESETAR')throw fail('Confirmação inválida: digite RESETAR');
  const c=await pool.connect();let out,ag=null;try{await c.query('BEGIN');await ensureTable(c);const [room]=(await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE',[room0.id])).rows;
   const [sn]=(await c.query('SELECT * FROM lib_season_snapshots WHERE room_id=$1 AND season=$2',[room.id,room.season])).rows;if(!sn)throw fail('Não há snapshot do início desta temporada; reset indisponível');
   const D=sn.data;const oldAg=sn.agenda||A.BASE;
   if(r.body?.start){try{ag=A.build(String(r.body.start),{paused:r.body?.auto===undefined?!!A.AG.paused:!r.body.auto,prev:oldAg});}catch(e){throw fail(e.message)}}
   // 1. resultados da temporada (e de qualquer temporada posterior): jogos, estatísticas e bolão saem junto (ON DELETE CASCADE)
   const dc=(await c.query('DELETE FROM competitions WHERE room_id=$1 AND season>=$2',[room.id,room.season])).rowCount;
   // 2. estado da sala volta ao snapshot
   await c.query('DELETE FROM auction_lots WHERE room_id=$1',[room.id]);
   for(const t of SNAP_TABLES)if(t!=='auction_lots')await c.query(`DELETE FROM ${t} WHERE room_id=$1`,[room.id]);
   const n={};for(const t of [...SNAP_TABLES,...LOT_CHILD])n[t]=await insertRows(c,t,D.tables[t]);
   const rc=new Set(await cols(c,'rooms'));const keys=Object.keys(D.room).filter(k=>rc.has(k)&&!ROOM_SKIP.has(k));
   await c.query(`UPDATE rooms SET (${keys.map(qi).join(',')})=(SELECT ${keys.map(qi).join(',')} FROM jsonb_populate_record(NULL::rooms,$2::jsonb)) WHERE id=$1`,[room.id,JSON.stringify(D.room)]);
   await c.query('UPDATE rooms SET version=version+1 WHERE id=$1',[room.id]);
   await c.query('UPDATE room_managers SET ready=false WHERE room_id=$1',[room.id]);
   // 3. marcas de migração criadas durante a temporada (leilão do meio da lista fixa, punição da pré-temporada) voltam a valer
   const keep=new Set(D.migs||[]);const dm=(await c.query("DELETE FROM lib_migrations WHERE (name='leilao-mid-1111b' OR name LIKE 'penalty-pre-%') AND NOT (name=ANY($1::text[])) RETURNING name",[[...keep]])).rows.map(x=>x.name);
   // 4. datas: com data nova, a agenda é refeita e os lotes do leilão surpresa (se houver) andam junto
   if(ag){const delta=Date.parse(ag.auction_start)-Date.parse(oldAg.auction_start);
    if(delta)await c.query("UPDATE auction_lots SET opens_at=opens_at+make_interval(secs=>$2::double precision/1000),closes_at=closes_at+make_interval(secs=>$2::double precision/1000) WHERE room_id=$1 AND season=$3 AND stage='surpresa' AND status='open'",[room.id,delta,room.season]);
    await c.query('UPDATE lib_season_snapshots SET agenda=$3 WHERE room_id=$1 AND season=$2',[room.id,room.season,JSON.stringify(ag)]);}
   await note(c,room.id,`♻️ ${r.user.nick} (admin) resetou a temporada ${room.season}/${room.season+1} do zero: elencos, verbas, leilões, mercado e tabela voltaram ao início dela (snapshot de ${brt(sn.created_at)}). ${dc} competição(ões) apagada(s). Contas e técnicos mantidos.`+(ag?` Novas datas: pré-temporada em ${String(r.body.start).split('-').reverse().join('/')}, rodada 1 em ${ag.matches_start.split('-').reverse().join('/')}.`:''),r.user.id);
   await c.query('COMMIT');out={ok:1,season:room.season,restored:n,competitions_deleted:dc,migs_cleared:dm,agenda:ag||sn.agenda||null};}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  A.apply(ag||out.agenda||A.BASE);app.locals.zcOvCacheClear?.(room0.id);console.log('temporadas: reset da temporada',out.season,'por',r.user.nick,JSON.stringify(out.restored));s.json(out);}));
 return {takeSnapshot,saveSnapshot};
};
