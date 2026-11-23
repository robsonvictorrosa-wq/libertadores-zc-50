// Mede o peso do over: joga todos os pares dos 50 clubes (ida e volta, N vezes) e agrupa pela diferença de over do XI.
// Uso: node scripts/sim-peso-over.js [div] [reps]   (div = OVR.div do sim.js; padrão = o do código)
const uni=require('better-sqlite3')(__dirname+'/../data/game.db',{readonly:true});
const S=require('../sim'),L=require('../libertadores');L.loadClubs(uni);const R=require('../roster')(uni);
if(process.argv[2])S.OVR.div=+process.argv[2];const REPS=+(process.argv[3]||6);
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
(async()=>{const fakeDb={query:async()=>({rows:[]})};const T=new Map();
 for(const c of L.CLUBS){let sq=await R.squad(fakeDb,0,c);if(sq.length<11)sq=[...sq,...L.virtualSquad(c)];const xi=S.autoXI(sq,'4-3-3');T.set(c,{club_id:c,xi,bench:sq.filter(p=>!xi.includes(p)),form:null,alt:0,ovr:xi.reduce((a,p)=>a+(+p.overall||0),0)/xi.length});}
 const B={};const add=(k,res)=>{const b=B[k]||(B[k]={n:0,w:0,d:0,l:0,gd:0});b.n++;b[res]++;};
 const C=[...T.values()];
 for(let i=0;i<C.length;i++)for(let j=i+1;j<C.length;j++){const a=C[i],b=C[j];const g=Math.abs(a.ovr-b.ovr);const k=g<0.5?'0':g<1.5?'1':g<2.5?'2':g<3.5?'3':g<4.5?'4':g<5.5?'5':'6+';
  const fav=a.ovr>=b.ovr?a:b;
  for(let r=0;r<REPS;r++)for(const [H,A] of [[a,b],[b,a]]){const m=S.playMatch(H,A,rnd);const fg=fav===H?m.hg:m.ag,og=fav===H?m.ag:m.hg;add(k,fg>og?'w':fg===og?'d':'l');add('todos',fg>og?'w':fg===og?'d':'l');}}
 const pct=(x,n)=>(100*x/n).toFixed(1);
 console.log('div',S.OVR.div,'reps',REPS);
 for(const k of ['0','1','2','3','4','5','6+','todos'])if(B[k])console.log(`dif ${k.padEnd(5)} jogos ${String(B[k].n).padStart(6)}  favorito vence ${pct(B[k].w,B[k].n)}%  empate ${pct(B[k].d,B[k].n)}%  perde ${pct(B[k].l,B[k].n)}%`);
})();
