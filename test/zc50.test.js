// Versão 50 clubes: plano de rodadas e calendário da fase de liga
const assert=require('assert');const L=require('../libertadores'),{leagueSchedule}=require('../leaguesched');
assert.strictEqual(L.N_CLUBS,50,'config com 50 clubes');
const P=L.plan();assert.strictEqual(P.filter(x=>x.stage==='league').length,49);assert.strictEqual(P.length,58);
assert.strictEqual(L.LEAGUE_ROUNDS(),49);assert.strictEqual(L.TURNO1_END(),24);
assert.deepStrictEqual(P.slice(49).map(x=>x.stage+x.leg),['playin1','playin2','r161','r162','qf1','qf2','sf1','sf2','final1']);
const ids=Array.from({length:50},(_,i)=>1000+i),avg=new Map(ids.map((id,i)=>[id,80-i*0.2]));
const R=leagueSchedule(ids,avg,20261122);assert.strictEqual(R.length,49);
const seen=new Set(),home=new Map();for(const g of R){assert.strictEqual(g.length,25);const inR=new Set();for(const [h,a] of g){assert(!inR.has(h)&&!inR.has(a));inR.add(h);inR.add(a);const k=[h,a].sort().join('-');assert(!seen.has(k),'confronto repetido '+k);seen.add(k);home.set(h,(home.get(h)||0)+1);}}
assert.strictEqual(seen.size,50*49/2);
const strong=[...ids].sort((a,b)=>avg.get(b)-avg.get(a)).slice(0,25);for(const id of ids)assert.strictEqual(home.get(id),strong.includes(id)?24:25);
const zones=L.standings([],ids,String,null).map(t=>t.zone);assert.strictEqual(zones.filter(z=>z==='oitavas').length,8);assert.strictEqual(zones.filter(z=>z==='playin').length,16);assert.strictEqual(zones.filter(z=>z==='fora').length,26);
console.log('zc50 OK: 58 rodadas (49 liga + 9 mata-mata), 1225 jogos, 24/25 mandos, zonas 8/16/26');
