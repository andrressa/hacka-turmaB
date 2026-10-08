'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {stages,files}=require('./config');
const ROOT=__dirname,PORT=Number(process.env.PORT||3000),ADMIN_USER=process.env.ADMIN_USER||'professora',PASSWORD=process.env.ADMIN_PASSWORD;
if(!PASSWORD||PASSWORD.length<12){console.error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres. Consulte LEIA_PRIMEIRO.md.');process.exit(1);}
const stateDir=path.resolve(process.env.STATE_DIR||path.join(ROOT,'runtime'));fs.mkdirSync(stateDir,{recursive:true});const statePath=path.join(stateDir,'estado.json');
const token=crypto.randomBytes(32).toString('hex');const fresh=()=>({version:1,released:[0],active:0,closed:false,messages:[],updatedAt:new Date().toISOString()});
function save(s){const tmp=statePath+'.tmp';fs.writeFileSync(tmp,JSON.stringify(s));fs.renameSync(tmp,statePath);state=s;}
let state;
if(fs.existsSync(statePath)){try{state=JSON.parse(fs.readFileSync(statePath,'utf8'));if(!Number.isInteger(state.version)||!Array.isArray(state.released)||!state.released.includes(0)||state.released.some(x=>!Number.isInteger(x)||x<0||x>3)||!state.released.includes(state.active)||!Array.isArray(state.messages)||typeof state.closed!=='boolean')throw new Error('estado inválido');}catch{console.error('Arquivo de estado inválido. Restaure um backup ou remova estado.json para iniciar nova atividade.');process.exit(1);}}else save(fresh());
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function auth(req){const h=req.headers.authorization||'';if(!h.startsWith('Basic '))return false;const v=Buffer.from(h.slice(6),'base64').toString();const at=v.indexOf(':');return at>=0&&equal(v.slice(0,at),ADMIN_USER)&&equal(v.slice(at+1),PASSWORD);}
function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");}
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function stageView(s){return {...s,files:s.files.map(([name,label])=>({name,label,url:`/downloads/${s.id}-${name}`}))};}
function view(admin=false){const s={version:state.version,active:state.active,closed:state.closed,updatedAt:state.updatedAt,messages:state.messages,stages:stages.filter(x=>admin||state.released.includes(x.id)).map(x=>({...stageView(x),released:state.released.includes(x.id)}))};return s;}
function page(res,name){let html=fs.readFileSync(path.join(ROOT,name),'utf8');if(name==='professora.html')html=html.replace('CONTROL_TOKEN_PLACEHOLDER',token);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
function body(req){return new Promise((resolve,reject)=>{let b='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>8192){reject(new Error('Comando muito grande.'));return;}b+=chunk;});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'));}catch{reject(new Error('JSON inválido.'));}});req.on('error',reject);});}
const assetNames=new Map([['/assets/style.css',['style.css','text/css']],['/assets/alunos.js',['alunos.js','text/javascript']],['/assets/professora.js',['professora.js','text/javascript']]]);
const server=http.createServer(async(req,res)=>{headers(res);try{
 let url;try{url=new URL(req.url,'http://localhost');}catch{return json(res,400,{error:'Endereço inválido.'});}const route=url.pathname;
 if(req.method==='GET'&&route==='/health')return json(res,200,{status:'ok'});
 if(req.method==='GET'&&(route==='/'||route==='/alunos'))return page(res,'alunos.html');
 const adminRoute=route==='/professora'||route.startsWith('/api/admin/');
 if(adminRoute&&!auth(req)){if(route==='/professora')res.setHeader('WWW-Authenticate','Basic realm="Fraude Lab - Professora", charset="UTF-8"');return json(res,401,{error:'Acesso exclusivo da professora.'});}
 if(req.method==='GET'&&route==='/professora')return page(res,'professora.html');
 if(req.method==='GET'&&assetNames.has(route)){const [file,type]=assetNames.get(route);res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(fs.readFileSync(path.join(ROOT,file)));}
 if(req.method==='GET'&&route==='/api/state')return json(res,200,view());
 if(req.method==='GET'&&route==='/api/admin/state')return json(res,200,view(true));
 if(req.method==='POST'&&route==='/api/admin/control'){
  if(!equal(req.headers['x-control-token']||'',token))return json(res,403,{error:'Reabra o painel para atualizar a autorização.'});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Origem não autorizada.'});}catch{return json(res,403,{error:'Origem inválida.'});}}
  const c=await body(req);const next=JSON.parse(JSON.stringify(state));
  if(c.action==='release'){
   if(!Number.isInteger(c.stage)||c.stage<1||c.stage>3)return json(res,400,{error:'Desafio inválido.'});
   if(next.closed)return json(res,409,{error:'Reabra a atividade antes de liberar um desafio.'});
   if(next.released.includes(c.stage))return json(res,200,view(true));
   if(!next.released.includes(c.stage-1))return json(res,409,{error:'Libere o desafio anterior primeiro.'});
   next.released.push(c.stage);next.active=c.stage;
  }else if(c.action==='message'){
   if(typeof c.text!=='string'||!c.text.trim()||c.text.length>800)return json(res,400,{error:'Escreva um aviso de 1 a 800 caracteres.'});
   next.messages=[...next.messages,{id:crypto.randomUUID(),text:c.text.trim(),at:new Date().toISOString()}].slice(-20);
  }else if(c.action==='close')next.closed=true;
  else if(c.action==='reopen')next.closed=false;
  else if(c.action==='reset'){
   if(c.confirm!=='REINICIAR')return json(res,400,{error:'Confirmação obrigatória.'});
   const reset=fresh();reset.version=state.version+1;save(reset);return json(res,200,view(true));
  }else return json(res,400,{error:'Comando desconhecido.'});
  next.version++;next.updatedAt=new Date().toISOString();save(next);return json(res,200,view(true));
 }
 if(req.method==='GET'&&route.startsWith('/downloads/')){
  let id;try{id=decodeURIComponent(route.slice('/downloads/'.length));}catch{return json(res,400,{error:'Arquivo inválido.'});}
  const file=files.get(id);if(!file)return json(res,404,{error:'Arquivo não encontrado.'});
  if(!state.released.includes(file.stage))return json(res,403,{error:'Aguarde a liberação da professora.'});
  const full=path.join(ROOT,file.path);res.writeHead(200,{'Content-Type':file.name.endsWith('.zip')?'application/zip':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${file.name}"`,'Content-Length':fs.statSync(full).size});const stream=fs.createReadStream(full);stream.on('error',()=>res.destroy());return stream.pipe(res);
 }
 return json(res,404,{error:'Página não encontrada.'});
 }catch(err){console.error('Falha ao processar pedido:',err.message);if(!res.headersSent)json(res,400,{error:'Não foi possível processar o comando.'});else res.destroy();}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(PORT,'0.0.0.0',()=>console.log(`Fraude Lab disponível na porta ${PORT}. Painel: /professora`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
