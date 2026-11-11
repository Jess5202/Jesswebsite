const CATALOG_KEY='property-manager/catalog-v1.json';
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:JSON_HEADERS});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function owner(request){const id=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email');return Boolean(id&&email&&email.toLowerCase()===OWNER_EMAIL);}
function requireOwner(request){if(!owner(request))throw new HttpError(403,'请使用网站主人的 ChatGPT 账号登录。');}
function requireMutation(request){requireOwner(request);const url=new URL(request.url),origin=request.headers.get('origin');if(origin!==url.origin)throw new HttpError(403,'请求来源不正确，请从管理页面操作。');if(request.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'不允许跨站操作。');}
function bucket(env){if(!env.BUCKET)throw new HttpError(503,'云端储存尚未就绪，请稍后再试。');return env.BUCKET;}
async function readCatalog(env){const object=await bucket(env).get(CATALOG_KEY);if(!object)return {revision:0,records:SEED_RECORDS,etag:null};const data=await object.json();if(!Number.isInteger(data.revision)||!Array.isArray(data.records))throw new Error('Invalid catalog');return {...data,etag:object.etag};}
function publicRecord(record){return {...record,features:getPropertyFeatures(record),url:'/property/'+encodeURIComponent(record.id),photo:record.images?.[0]||null};}
function validImage(url){return typeof url==='string'&&(url.startsWith('/media/')&&/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url)||/^https:\/\//.test(url)&&url.length<2500);}
function cleanRecord(input,id){
 if(!input||typeof input!=='object')throw new HttpError(400,'房源资料格式不正确。');
 const text=(key,max=500)=>{if(typeof input[key]!=='string'&&input[key]!=null)throw new HttpError(400,'字段格式不正确：'+key);const value=String(input[key]??'').trim();if(value.length>max)throw new HttpError(400,'文字过长：'+key);return value;};
 const title=text('title',160),location=text('location',220),description=text('description',12000),type=text('type',100),category=text('category',40),mode=text('mode',10),status=text('status',20);
 const price=Number(input.price);if(!title||!location||!Number.isFinite(price)||price<=0||price>1e10)throw new HttpError(400,'请填写房源标题、地点及有效价格。');
 if(!['Buy','Rent'].includes(mode)||!['Residential','Commercial'].includes(category)||!['draft','published','archived'].includes(status)||!type)throw new HttpError(400,'请选择房源类型、出售／出租及状态。');
 const numeric=(key,max,integer=false)=>{if(input[key]===''||input[key]==null)return null;const n=Number(input[key]);if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n)))throw new HttpError(400,'数值不正确：'+key);return n;};
 const beds=text('beds',20);if(beds&&!/^(Studio|[0-9]+(?:\+[0-9]+)?)$/i.test(beds))throw new HttpError(400,'房间数请输入例如 3、3+1 或 Studio。');
 const images=input.images;if(!Array.isArray(images)||images.length>20||images.some(x=>!validImage(x)))throw new HttpError(400,'照片格式不正确，每套最多20张。');
 const features=input.features===undefined?detectPropertyFeatures([title,type,description].join('\n')):input.features;if(!Array.isArray(features)||features.length>PROPERTY_FEATURES.length||features.some(id=>!PROPERTY_FEATURES.some(f=>f.id===id)))throw new HttpError(400,'房屋特色选项不正确。');
 const sourceUrl=text('sourceUrl',2500);if(sourceUrl&&!/^https:\/\//.test(sourceUrl))throw new HttpError(400,'来源链接须以 https:// 开头。');
 return {id,features:[...new Set(features)],reference:text('reference',40),title,price,beds:beds||null,baths:numeric('baths',100,true),size:numeric('size',1e8),landSize:text('landSize',100),tenure:text('tenure',100),location,type,category,mode,status,description,images:[...new Set(images)],sourceUrl,updatedAt:new Date().toISOString()};
}
async function saveCatalog(env,current,records){const next={revision:current.revision+1,records};const result=await bucket(env).put(CATALOG_KEY,JSON.stringify(next),{onlyIf:current.etag?{etagMatches:current.etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!result)throw new HttpError(409,'资料已被另一页面更新，请刷新后再保存。');return next;}
async function bodyJSON(request){if(!request.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'请使用 JSON 格式。');const raw=await request.text();if(raw.length>150000)throw new HttpError(413,'房源资料过大。');try{return JSON.parse(raw);}catch{throw new HttpError(400,'资料无法读取。');}}
function htmlResponse(html,status=200){return new Response(html,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});}
function signInPage(){return '<!doctype html><html lang="zh-Hans"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>房源管理登录</title><body style="font:16px/1.8 system-ui;background:#f7f4ed;color:#213e35;padding:50px"><h1>房源管理</h1><p>请使用网站主人的 ChatGPT 账号登录。</p><a style="background:#213e35;color:white;padding:13px 20px;display:inline-block" target="_top" href="/signin-with-chatgpt?return_to=%2Fadmin">使用 ChatGPT 登录</a><p><a href="/">返回网站</a></p></body></html>';}
function propertyPage(p){
 const price='RM '+Number(p.price).toLocaleString('en-MY')+(p.mode==='Rent'?' / month':'');
 return '<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(p.title)+' · Jess绝世好屋</title><style>*{box-sizing:border-box}body{margin:0;background:#f7f4ed;color:#213e35;font:16px/1.8 system-ui}main{width:min(1000px,calc(100% - 36px));margin:30px auto}h1{font-size:clamp(28px,5vw,45px);line-height:1.3}.price{font-size:30px}.facts{display:flex;gap:20px;flex-wrap:wrap;padding:20px 0;border-block:1px solid #ccc}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin:30px 0}.gallery img{width:100%;max-height:650px;object-fit:contain;background:#e5e9df}.description{white-space:pre-wrap}.btn{background:#168b45;color:white;padding:12px 20px;text-decoration:none;display:inline-block}a{color:inherit}@media(max-width:600px){.gallery{grid-template-columns:1fr}}</style></head><body><main><a href="/#listings">← 返回房源 / Back to properties</a><p>Jess绝世好屋'+(p.reference?' · '+esc(p.reference):'')+' · '+(p.mode==='Rent'?'出租 / FOR RENT':'出售 / FOR SALE')+'</p><h1>'+esc(p.title)+'</h1><p>'+esc(p.location)+'</p><p class="price">'+price+'</p><div class="facts"><span>'+esc(p.beds??'待确认')+' 房 / beds</span><span>'+esc(p.baths??'待确认')+' 厕 / baths</span><span>建筑面积 / Built-up: '+(p.size?esc(p.size)+' sqft':'待确认')+'</span>'+(p.landSize?'<span>土地 / Land: '+esc(p.landSize)+'</span>':'')+(p.tenure?'<span>'+esc(p.tenure)+'</span>':'')+'</div><p>'+PROPERTY_FEATURES.filter(f=>getPropertyFeatures(p).includes(f.id)).map(f=>'<span style="display:inline-block;padding:4px 10px;margin:4px;border:1px solid #c2cdbb;font-size:12px">'+esc(f.zh+' · '+f.en)+'</span>').join('')+'</p><p class="description">'+esc(p.description)+'</p><a class="btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/601110977925?text='+encodeURIComponent('Hi Jess, I am interested in '+p.title+' ('+(p.reference||p.id)+').')+'">WhatsApp 预约看房 ↗</a><div class="gallery">'+(p.images||[]).map((src,i)=>'<img src="'+esc(src)+'" loading="lazy" alt="'+esc(p.title)+' — property photo '+(i+1)+'">').join('')+'</div><p>售价及供应情况以 Jess 确认为准。</p></main></body></html>';
}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/listings'&&request.method==='GET'){const catalog=await readCatalog(env);return json({revision:catalog.revision,records:catalog.records.filter(p=>p.status==='published').map(publicRecord)});}
  if(path==='/api/admin/session'&&request.method==='GET'){requireOwner(request);return json({owner:true,email:request.headers.get('oai-authenticated-user-email')});}
  if(path==='/api/admin/records'&&request.method==='GET'){requireOwner(request);const c=await readCatalog(env);return json({revision:c.revision,records:c.records});}
  if(path==='/api/admin/records'&&request.method==='POST'){
   requireMutation(request);const data=await bodyJSON(request),current=await readCatalog(env);if(data.expectedRevision!==current.revision)throw new HttpError(409,'资料已更新，请刷新后再保存。');
   const id=data.record?.id||crypto.randomUUID();if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new HttpError(400,'无效房源编号。');const existing=current.records.find(p=>p.id===id);const record=cleanRecord(data.record,id);record.createdAt=existing?(existing.createdAt||null):record.updatedAt;const records=current.records.filter(p=>p.id!==id);records.unshift(record);const saved=await saveCatalog(env,current,records);return json({revision:saved.revision,record},201);
  }
  const statusMatch=path.match(/^\/api\/admin\/records\/([a-zA-Z0-9-]{1,80})\/status$/);
  if(statusMatch&&request.method==='POST'){
   requireMutation(request);const data=await bodyJSON(request),current=await readCatalog(env);if(data.expectedRevision!==current.revision)throw new HttpError(409,'资料已更新，请刷新后再操作。');if(!['draft','published','archived'].includes(data.status))throw new HttpError(400,'状态不正确。');const found=current.records.find(p=>p.id===statusMatch[1]);if(!found)throw new HttpError(404,'找不到房源。');const records=current.records.map(p=>p.id===found.id?{...p,status:data.status,updatedAt:new Date().toISOString()}:p);const saved=await saveCatalog(env,current,records);return json({revision:saved.revision});
  }
  if(path==='/api/admin/photos'&&request.method==='POST'){
   requireMutation(request);const max=8*1024*1024;if(Number(request.headers.get('content-length'))>max+100000)throw new HttpError(413,'每张照片请小于8MB。');const data=await request.formData(),file=data.get('photo');if(!file||typeof file.arrayBuffer!=='function'||file.size===0||file.size>max)throw new HttpError(400,'请选择小于8MB的照片。');
   const bytes=new Uint8Array(await file.arrayBuffer());let type,ext;
   if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';ext='jpg';}else if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){type='image/png';ext='png';}else if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){type='image/webp';ext='webp';}else throw new HttpError(400,'仅支持 JPG、PNG 或 WebP 照片，请先转换其他格式。');
   const key='media/'+crypto.randomUUID()+'.'+ext;await bucket(env).put(key,bytes,{httpMetadata:{contentType:type}});return json({url:'/'+key},201);
  }
  if(path.startsWith('/api/'))return json({error:'Not found'},404);
  if(path.startsWith('/media/')&&request.method==='GET'){
   if(!/^\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(path))throw new HttpError(404,'Not found');const object=await bucket(env).get(path.slice(1));if(!object)throw new HttpError(404,'Photo not found');const headers=new Headers({'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'});object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);return new Response(object.body,{headers});
  }
  if(path==='/admin'||path==='/admin/'){
   if(!owner(request))return htmlResponse(signInPage(),request.headers.get('oai-authenticated-user-id')?403:200);return htmlResponse(ADMIN_HTML);
  }
  const property=path.match(/^\/property\/([a-zA-Z0-9-]{1,80})$/);if(property){const c=await readCatalog(env),p=c.records.find(p=>p.id===property[1]&&p.status==='published');return p?htmlResponse(propertyPage(p)):htmlResponse('<h1>房源已下架或不存在</h1><a href="/#listings">返回房源</a>',404);}
  if(path==='/'||path==='/index.html')return htmlResponse(PUBLIC_HTML);
  return new Response('Not found',{status:404});
 }catch(error){return json({error:error.status?error.message:'暂时无法完成操作，请稍后再试。'},error.status||500);}
}};
