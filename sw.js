const C='imsakiya-v11';
const FILES=['./','./index.html','./manifest.webmanifest','./media/club_logo_720.png','./media/club_logo_3d_final_white.webp','./media/club_logo_3d_final_white.png','./media/logo_layer_sun.webp','./media/logo_layer_sun.png','./media/logo_layer_wheel.webp','./media/logo_layer_wheel.png','./media/logo_layer_waves.webp','./media/logo_layer_waves.png','./media/logo_layer_emblem.webp','./media/logo_layer_emblem.png','./media/logo_layer_stars.webp','./media/logo_layer_stars.png','./media/logo_layer_text.webp','./media/logo_layer_text.png','./media/club_name_gold.webp','./media/club_name_gold.png','./media/ramadan_mubarak_gold.webp','./media/ramadan_mubarak_gold.png','./media/kul_aam_gold.webp','./media/kul_aam_gold.png','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
const KEEP=new Set([C]);

function isFontUrl(u){return u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';}
function isHtmlNav(req,url){
  if(req.mode==='navigate'||req.destination==='document') return true;
  if(url.origin!==self.location.origin) return false;
  const p=url.pathname;
  return p.endsWith('/index.html')||p.endsWith('/');
}
function isSwScript(url){return url.origin===self.location.origin&&/(?:^|\/)sw\.js$/.test(url.pathname);}
function isMedia(url){return url.origin===self.location.origin&&/\/media\//.test(url.pathname);}

async function networkFirstHtml(req){
  const cache=await caches.open(C);
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res&&res.ok){
      cache.put(req,res.clone());
      if((res.headers.get('content-type')||'').includes('text/html')){
        cache.put(new Request('./index.html'),res.clone());
        cache.put(new Request('./'),res.clone());
      }
    }
    return res;
  }catch(e){
    return (await cache.match(req))||(await cache.match('./index.html'))||(await cache.match('./'));
  }
}
async function staleWhileRevalidate(req){
  const cache=await caches.open(C);
  const cached=await cache.match(req);
  const net=fetch(req).then(res=>{if(res&&res.ok)cache.put(req,res.clone());return res;}).catch(()=>undefined);
  if(cached){net.catch(()=>{});return cached;}
  const res=await net;
  if(res) return res;
  throw new Error('offline');
}

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>!KEEP.has(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(isFontUrl(url)){
    e.respondWith(caches.open(C).then(c=>c.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{if(res&&res.ok)c.put(e.request,res.clone());return res;});
    })));
    return;
  }
  if(url.origin!==self.location.origin) return;
  if(isSwScript(url)) return;
  if(isMedia(url)){ // الشعار: من الكاش حتى لو الرابط فيه ?r= لإعادة التشغيل
    e.respondWith(caches.open(C).then(c=>c.match(url.pathname.replace(/^.*\/media\//,'./media/')).then(hit=>hit||c.match(e.request,{ignoreSearch:true})).then(hit=>hit||fetch(e.request))));
    return;
  }
  if(isHtmlNav(e.request,url)){e.respondWith(networkFirstHtml(e.request));return;}
  e.respondWith(staleWhileRevalidate(e.request));
});
