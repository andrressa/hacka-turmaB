const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');const ROOT=__dirname;
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function start(dir,p){const proc=spawn(process.execPath,[path.join(ROOT,'server.js')],{env:{...process.env,PORT:String(p),ADMIN_USER:'professora',ADMIN_PASSWORD:'senha-exclusiva-testes-123',STATE_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Servidor não iniciou')),5000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve();});proc.once('exit',c=>{clearTimeout(timer);reject(Error('Saída inesperada '+c));});});return proc;}
async function stop(p){await new Promise(r=>{p.once('exit',r);p.kill('SIGTERM');});}
test('Liberação compartilhada, autorização, arquivos protegidos e persistência',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fraude-lab-test-'));const p=await port(),base=`http://127.0.0.1:${p}`;let proc=await start(dir,p);const authorization='Basic '+Buffer.from('professora:senha-exclusiva-testes-123').toString('base64');
 try{
  assert.equal((await fetch(base+'/health')).status,200);
  let a=await(await fetch(base+'/api/state')).json();assert.deepEqual(a.stages.map(s=>s.id),[0]);assert.equal(JSON.stringify(a).includes('Nova plataforma'),false);
  assert.equal((await fetch(base+'/professora')).status,401);assert.equal((await fetch(base+'/api/admin/state')).status,401);
  assert.equal((await fetch(base+'/downloads/1-desafio1.csv')).status,403);
  assert.equal((await fetch(base+'/downloads/3-desafio3.zip')).status,403);
  assert.equal((await fetch(base+'/data/desafio1/desafio1.csv')).status,404);
  assert.equal((await fetch(base+'/config.js')).status,404);
  assert.equal((await fetch(base+'/desafio1.csv')).status,404);
  assert.equal((await fetch(base+'/professora.html')).status,404);
  const html=await(await fetch(base+'/professora',{headers:{authorization}})).text();const token=html.match(/name="control-token" content="([a-f0-9]+)"/)[1];
  const command=async c=>fetch(base+'/api/admin/control',{method:'POST',headers:{authorization,'content-type':'application/json','x-control-token':token,Origin:base},body:JSON.stringify(c)});
  assert.equal((await fetch(base+'/api/admin/control',{method:'POST',headers:{authorization},body:'{"action":"release","stage":1}'})).status,403);
  assert.equal((await fetch(base+'/api/admin/control',{method:'POST',headers:{authorization,'x-control-token':token,Origin:'https://outro-site.invalid'},body:'{}'})).status,403);
  assert.equal((await command({action:'release',stage:2})).status,409);
  assert.equal((await command({action:'release',stage:1})).status,200);
  a=await(await fetch(base+'/api/state')).json();const b=await(await fetch(base+'/api/state')).json();assert.deepEqual(a,b);assert.equal(a.active,1);assert.deepEqual(a.stages.map(s=>s.id),[0,1]);
  let d=await fetch(base+'/downloads/1-desafio1.csv');assert.equal(d.status,200);assert.equal((await d.text()).split('\n').length,8002);
  assert.equal((await command({action:'message',text:'Entreguem a rodada atual.'})).status,200);assert.equal((await(await fetch(base+'/api/state')).json()).messages[0].text,'Entreguem a rodada atual.');
  assert.equal((await command({action:'close'})).status,200);assert.equal((await command({action:'release',stage:2})).status,409);assert.equal((await command({action:'reopen'})).status,200);
  assert.equal((await command({action:'release',stage:2})).status,200);assert.equal((await command({action:'release',stage:3})).status,200);assert.equal((await fetch(base+'/downloads/3-desafio3.zip')).status,200);
  const version=(await(await fetch(base+'/api/state')).json()).version;
  await stop(proc);proc=await start(dir,p);a=await(await fetch(base+'/api/state')).json();assert.equal(a.active,3);assert.equal(a.version,version);assert.equal(a.messages.length,1);
  const html2=await(await fetch(base+'/professora',{headers:{authorization}})).text();const token2=html2.match(/name="control-token" content="([a-f0-9]+)"/)[1];
  assert.equal((await command({action:'reset',confirm:'REINICIAR'})).status,403); // antigo token invalida após reinício
  const reset=await fetch(base+'/api/admin/control',{method:'POST',headers:{authorization,'x-control-token':token2},body:JSON.stringify({action:'reset',confirm:'REINICIAR'})});assert.equal(reset.status,200);a=await(await fetch(base+'/api/state')).json();assert.deepEqual(a.stages.map(s=>s.id),[0]);assert.equal(a.messages.length,0);assert.equal((await fetch(base+'/downloads/3-desafio3.csv')).status,403);
  assert.equal((await fetch(base+'/downloads/..%2Fgabaritos%2Fdesafio3.csv')).status,404);
 }finally{await stop(proc);fs.rmSync(dir,{recursive:true,force:true});}
});
