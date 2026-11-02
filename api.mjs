export const config=window.STUDEXA_CONFIG;
export const demo=new URLSearchParams(location.search).get('demo')==='1';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessionKey='onelearn-staff';
export function identity(){try{return JSON.parse(sessionStorage.getItem(sessionKey)||'null')}catch{return null}}
function store(s){sessionStorage.setItem(sessionKey,JSON.stringify({...s,expires_at:Date.now()/1000+(s.expires_in||3600)}))}
async function request(path,body,authenticated=false,method='POST',token){
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(config.supabaseUrl)||!config.supabaseKey)throw Error('Add your Supabase project details to config.js.');
 let s=identity();if(authenticated&&!token){if(!s)throw Error('Please sign in first.');if(s.expires_at<Date.now()/1000+60){const refreshed=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});store(refreshed);s=identity()}token=s.access_token}
 const headers={apikey:config.supabaseKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
 const r=await fetch(config.supabaseUrl+path,{method,headers,body:JSON.stringify(body)}).catch(()=>{throw Error('We could not connect. Please check your connection and try again.')});
 const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.message||data?.msg||data?.error_description||'The request could not be completed.');return data;
}
export const central=(name,args={})=>request('/rest/v1/rpc/'+name,args,true);
export const api=(action,data={})=>demo?demoApi(action,data):request('/rest/v1/rpc/sx_api',{p_action:action,p_data:data},!['request','school','news'].includes(action));
export async function login(email,password){if(demo){sessionStorage.setItem('sx-demo-owner','yes');return {owner:true,schools:[]}}store(await request('/auth/v1/token?grant_type=password',{email,password}));return api('me')}
export async function signup(email,password){if(password.length<12)throw Error('Choose a password with at least 12 characters.');if(demo)return false;const data=await request('/auth/v1/signup',{email,password});if(data.access_token)store(data);return !!data.access_token}
export async function logout(){const token=identity()?.access_token;sessionStorage.removeItem(sessionKey);sessionStorage.removeItem('sx-demo-owner');if(token)request('/auth/v1/logout',{},false,'POST',token).catch(()=>{})}
let recoveryToken;const callback=new URLSearchParams(location.hash.slice(1));
if(callback.get('access_token')){if(callback.get('type')==='recovery')recoveryToken=callback.get('access_token');history.replaceState(null,'',location.pathname+location.search+'#signin')}
export const recovering=()=>!!recoveryToken;
export async function recover(email){if(demo)return;await request('/auth/v1/recover?redirect_to='+encodeURIComponent(new URL('index.html#signin',location.href).href),{email})}
export async function changePassword(password){if(!recoveryToken||password.length<12)throw Error('Use your recovery email link and a password of at least 12 characters.');await request('/auth/v1/user',{password},false,'PUT',recoveryToken);recoveryToken=null;await logout()}
export function appURL(service,school=''){const u=new URL(service==='maths'?config.mathsUrl:config.readingUrl,location.href);if(!['http:','https:'].includes(u.protocol))throw Error('Invalid website address in config.js.');if(school)u.searchParams.set('school',school);if(demo)u.searchParams.set('demo','1');return u.href}
function demoData(){try{const d=JSON.parse(sessionStorage.getItem('sx-demo-data')||'null');if(d)return d}catch{}return {requests:[{id:'demo-request',school:'Meadow Park School',contact:'Sam Patel',email:'sam@example.test',role:'Head of Maths',products:['maths','reading'],message:'We would like to explore both services for Years 7–11.',status:'new',created_at:new Date().toISOString()}],schools:[{id:'demo-school',slug:'example-academy',name:'Example Academy',active:true,connected:true,products:['maths','reading']}],news:[]}}
async function demoApi(action,data){const db=demoData();let out;
 if(action==='news')return db.news.filter(n=>n.published);
 if(action==='request'){db.requests.unshift({...data,id:crypto.randomUUID(),status:'new',created_at:new Date().toISOString()});out={received:true}}
 else if(action==='school')return {name:'Example Academy',slug:data.slug,products:['maths','reading']};
 else{if(sessionStorage.getItem('sx-demo-owner')!=='yes')throw Error('Use the demo sign-in first.');
 if(action==='me')return {owner:true,schools:db.schools.map(s=>({...s,role:'admin'})),services:{}};
 if(action==='dashboard')return db;
 if(action==='decline'){db.requests.find(r=>r.id===data.id).status='declined';out={saved:true}}
 if(['connect','approve','create'].includes(action)){const req=db.requests.find(r=>r.id===data.request);let school=db.schools.find(s=>s.id===data.school);if(action==='create'){school={id:crypto.randomUUID(),slug:data.slug,name:req.school,active:true};db.schools.push(school)}school.connected=true;school.products=data.products;if(req)req.status='approved';out={id:school.id,slug:school.slug,...(action==='create'?{code:'DEMO-CODE-NOT-A-LIVE-INVITATION'}:{})}}
 if(action==='invite')out={code:'DEMO-CODE-NOT-A-LIVE-INVITATION'};
 if(action==='news_save'){const row={...data,id:data.id||crypto.randomUUID(),updated_at:new Date().toISOString()};db.news=db.news.filter(n=>n.id!==row.id);db.news.unshift(row);out=row}
 }
 if(!out)throw Error('Unknown demo action.');sessionStorage.setItem('sx-demo-data',JSON.stringify(db));return out;
}
