(function(){
  'use strict';
  /* ================= Expert Mobile CMS: click-to-edit + dashboard + access ================= */
  var SECS=[['nav','Navigation','#nav'],['top','Hero','#top'],['companies','Our companies','#companies'],['hytera','Dealer brands','#hytera'],['network','Dealer network','#network'],['solutions','Solutions','#solutions'],['rentals','Rentals & accessories','#rentals'],['work','Projects & installations','#work'],['industries','Industries','#industries'],['process','Process','#process'],['team','Our team','#team'],['contact','Contact','#contact'],['foot','Footer','#foot']];
  var SECNAME={};SECS.forEach(function(s){SECNAME[s[0]]=s[1]});SECNAME.teamdir='Team directory (people)';
  var SKIP='#brands,#i1,#i2,#nwLinks,#nwNodes,#eq,#viz,#tmR1,#tmR2,#rot,#brandCycle,#statusTxt,#clock,#capN,#chname,#platname,#svcW,#svcL,#phCount,#dlCount,#footStatus,#weekTxt,#days,#seg,#sdots,#rpLine,canvas,svg,script,style,.tw-sig,.dl-rings,.hub-orb,.cms-ui,.links .pill';
  var BLOCK='h1,h2,h3,h4,h5,p,li,a,button,small,address,label,figcaption,td,th,.tag,.meta';
  var units={},imgs={},bySec={};
  function texts(u){var out=[],w=document.createTreeWalker(u,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){var p=n.parentElement;if(!p||p.closest('svg,script,style'))continue;if(!n.nodeValue.trim())continue;out.push(n)}return out}
  SECS.forEach(function(s){var root=document.querySelector(s[2]);if(!root)return;var b=bySec[s[0]]={t:[],i:[]};
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,found=[];
    while((n=w.nextNode())){if(!n.nodeValue.trim())continue;var p=n.parentElement;if(!p||p.closest(SKIP))continue;var u=p.closest(BLOCK);if(!u||!root.contains(u))u=p;if(found.indexOf(u)<0)found.push(u)}
    found=found.filter(function(u){return !found.some(function(o){return o!==u&&o.contains(u)})});
    found.forEach(function(u,i){var k=s[0]+'-t'+i,rec={k:k,el:u,sec:s[0],orig:u.innerHTML,origT:texts(u).map(function(x){return x.nodeValue.trim()})};units[k]=rec;u.setAttribute('data-cms',k);b.t.push(rec)});
    [].slice.call(root.querySelectorAll('img,[style*="background-image"],.pslide')).filter(function(e){return !e.closest(SKIP)}).forEach(function(e,i){
      var k=s[0]+'-i'+i,isImg=e.tagName==='IMG',rec={k:k,el:e,sec:s[0],kind:isImg?'img':'bg',orig:isImg?e.getAttribute('src'):e.style.backgroundImage};imgs[k]=rec;e.setAttribute('data-cms-img',k);b.i.push(rec)});
  });

  /* ---------- apply ---------- */
  function ws(old,nw){var a=old.match(/^\s*/)[0],z=old.match(/\s*$/)[0];return a+nw+z}
  function syncCount(el){[].concat(el.matches('[data-count]')?[el]:[],[].slice.call(el.querySelectorAll('[data-count]'))).forEach(function(c){var m=(c.textContent||'').trim().match(/^(\d+)(.*)$/);if(m){c.dataset.count=m[1];c.dataset.suf=m[2]}else c.removeAttribute('data-count')})}
  function applyText(rec,val){
    if(!val){if(rec.applied){rec.el.innerHTML=rec.orig;rec.applied=false;syncCount(rec.el)}return}
    var ns=texts(rec.el);
    if(Array.isArray(val.t)&&val.t.length===rec.origT.length){if(ns.length!==val.t.length){rec.el.innerHTML=rec.orig;ns=texts(rec.el)}ns.forEach(function(n,i){n.nodeValue=ws(n.nodeValue,String(val.t[i]))})}
    else if(typeof val.plain==='string'){rec.el.innerHTML=rec.orig;ns=texts(rec.el);ns.forEach(function(n,i){n.nodeValue=i?'':val.plain})}
    rec.applied=true;syncCount(rec.el)}
  function imgUrl(v){if(!v)return'';if(v.asset&&/^[0-9a-f]{32}$/.test(v.asset))return'/_blob/'+v.asset;if(v.url&&/^https:\/\//.test(v.url))return v.url;return''}
  function applyImg(rec,v){var u=imgUrl(v),el=rec.el;
    if(rec.kind==='img')el.setAttribute('src',u||rec.orig);else el.style.backgroundImage=u?'url("'+u.replace(/"/g,'%22')+'")':rec.orig;
    if(el.classList.contains('pslide')){var m=el.className.match(/\br(\d+)\b/),sl=m&&document.querySelector('#indBg .slide.r'+m[1]);if(sl)sl.style.backgroundImage=u?'url("'+u.replace(/"/g,'%22')+'")':''}}
  function curImg(rec){var el=rec.el;if(rec.kind==='img')return el.currentSrc||el.src;var b=getComputedStyle(el).backgroundImage;var m=b.match(/url\("?(.*?)"?\)/);return m?m[1]:''}

  /* ---------- runtime wiring ---------- */
  var db,user,assets,isOwner=false,myId=null,access={editors:[]},content={},lastJ={},team=null,BUILTIN=[],TEAMDEF=null,allowed=null,canWrite=null,editing=false;
  var useP=function(n){return window.claude.use(n).catch(function(){return null})};
  function start(){if(!window.claude||!window.claude.use||start.done)return;start.done=true;
  Promise.all([useP('db'),useP('user'),useP('assets')]).then(function(r){return new Promise(function(ok){(function w(){if(window.EM_TEAM&&window.EM_DEPTS)ok(r);else setTimeout(w,40)})()})}).then(function(r){db=r[0];user=r[1];assets=r[2];if(!db)return;
    snapshotTeamDefaults();
    db.collection('cms_content').onSnapshot(function(qs){var next={};qs.docs.forEach(function(d){var x=d.data();if(x)next[d.id]=x.v});content=next;applyAll()},function(){});
    db.collection('cms_lists').onSnapshot(function(qs){var n={};qs.docs.forEach(function(d){var x=d.data();if(x&&Array.isArray(x.order))n[d.id]=x.order});listData=n;applyLists()},function(){});
    db.doc('cms/team').onSnapshot(function(s){team=s.exists?s.data():null;applyTeam();if(ui.tab==='team')renderTab()},function(){});
    if(!user)return;
    Promise.all([user.isOwner(),user.id(),user.can?user.can('data.write'):null]).then(function(v){isOwner=!!v[0];myId=v[1];canWrite=v[2];
      db.doc('cms/access').onSnapshot(function(s){access=(s.exists&&s.data())||{editors:[]};if(!Array.isArray(access.editors))access.editors=[];computeAllowed();if(ui.tab==='access')renderTab()},function(){computeAllowed()});
      db.collection('cms_invites').onSnapshot(function(qs){invites=qs.docs.map(function(d){var x=d.data()||{};return{code:d.id,active:!!x.active,role:x.role||'editor',at:x.at||0}});if(ui.tab==='access')renderTab();checkJoin()},function(){});
      if(myId)db.doc('cms_requests/'+myId).onSnapshot(function(s){myReq=s.exists?s.data():null;checkJoin()},function(){});
      computeAllowed()})})}
  var invites=[],requests=[],myReq=null,reqSub=null;
  start();if(!start.done)window.addEventListener('load',start);
  function applyAll(){Object.keys(units).forEach(function(k){var v=content[k],j=JSON.stringify(v||null);if(lastJ[k]===j)return;if(document.activeElement===units[k].el)return;lastJ[k]=j;applyText(units[k],v)});
    Object.keys(imgs).forEach(function(k){var v=content[k],j=JSON.stringify(v||null);if(lastJ[k]===j)return;lastJ[k]=j;applyImg(imgs[k],v)});
    if(ui.open&&ui.tab==='content')renderTab()}
  function snapshotTeamDefaults(){var T=window.EM_TEAM||{};TEAMDEF={};Object.keys(T).forEach(function(k){TEAMDEF[k]=T[k].map(function(p){var c={name:p.name||'',title:p.title||'',email:p.email||'',phone:p.phone||'',photo:''};if(p.photo){var i=BUILTIN.indexOf(p.photo);if(i<0){BUILTIN.push(p.photo);i=BUILTIN.length-1}c.photo='builtin:'+i}return c})})}
  function photoSrc(ph){if(!ph)return'';if(ph.indexOf('builtin:')===0)return BUILTIN[+ph.slice(8)]||'';if(ph.indexOf('asset:')===0&&/^[0-9a-f]{32}$/.test(ph.slice(6)))return'/_blob/'+ph.slice(6);return''}
  function teamData(){var m=team&&team.members;return clone(m&&typeof m==='object'?m:TEAMDEF)}
  function applyTeam(){var T=window.EM_TEAM;if(!T||!TEAMDEF)return;var m=teamData();Object.keys(T).forEach(function(k){if(!m[k])m[k]=[]});
    Object.keys(m).forEach(function(k){T[k]=(m[k]||[]).map(function(p){return{name:String(p.name||''),title:String(p.title||''),email:String(p.email||''),phone:String(p.phone||''),photo:photoSrc(p.photo)}}).filter(function(p){return p.name})});
    if(window.EM_orbit)window.EM_orbit()}
  var ROLES={super:'Super admin',editor:'Editor',team:'Team manager'};
  function roleOf(e){return e.role||(e.sections&&e.sections.indexOf('all')>-1?'super':'editor')}
  function computeAllowed(){if(isOwner){allowed={all:true,team:true,access:true,role:'owner'}}else{var e=myId&&access.editors.filter(function(x){return x.id===myId})[0];
      if(!e)allowed=null;else{var r=roleOf(e),secs=e.sections||[];allowed=r==='super'?{all:true,team:true,access:true,role:r}:r==='team'?{all:false,secs:[],team:true,role:r}:{all:false,secs:secs,team:secs.indexOf('teamdir')>-1,role:r}}}
    ui.launcher.hidden=!allowed;if(!allowed){setEditing(false);closeDash()}
    if(allowed&&allowed.access&&!reqSub&&db)reqSub=db.collection('cms_requests').onSnapshot(function(qs){requests=qs.docs.map(function(d){var x=d.data()||{};return{id:d.id,dept:x.dept||'',note:x.note||'',code:x.code||'',status:x.status||'pending',at:x.at||0}});if(ui.tab==='access')renderTab();var n=requests.filter(function(r){return r.status==='pending'}).length;badge.textContent=n?n:'';badge.hidden=!n},function(){});
    var who=root.querySelector('.cms-who');if(who&&allowed){who.textContent=allowed.role==='owner'?'Main admin':ROLES[allowed.role]}}
  function mayEdit(sec){return allowed&&(allowed.all||allowed.secs.indexOf(sec)>-1)}

  /* ---------- writes ---------- */
  var chains={};
  function write(path,fn){var c=(chains[path]||Promise.resolve()).then(fn).catch(function(e){toast(e&&e.code==='invalid_argument'?'Not saved. You need Contributor access in the Share menu.':e&&e.code==='quota_exceeded'?'Storage is full.':'Could not save. Try again.','err');throw e});chains[path]=c.catch(function(){});return c}
  function saveKey(k,v){content[k]=v;lastJ[k]=JSON.stringify(v||null);var ref=db.doc('cms_content/'+k);return write(ref.path,function(){return v?ref.set({v:v,by:myId||'',at:Date.now()}):ref.delete()}).then(function(){toast('Saved')})}
  function collect(rec){var ns=texts(rec.el),vals=ns.map(function(n){return n.nodeValue.trim()});if(vals.length===rec.origT.length){if(vals.every(function(x,i){return x===rec.origT[i]}))return null;return{t:vals}}var p=(rec.el.innerText||'').trim();return p===rec.origT.join(' ')?null:{plain:p}}
  function upload(file){if(!assets)return Promise.reject({message:'Uploads are not available here.'});if(!/^image\//.test(file.type))return Promise.reject({message:'Choose an image file.'});if(file.size>20*1024*1024)return Promise.reject({message:'Image is over 20 MB.'});toast('Uploading…');return assets.upload(file)}
  function pickFile(cb){var i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=function(){if(i.files[0])cb(i.files[0])};i.click()}
  function replaceImg(rec){pickFile(function(f){upload(f).then(function(r){var v={asset:r.id};applyImg(rec,v);return saveKey(rec.k,v)}).catch(function(e){toast((e&&e.message)||'Upload failed','err')})})}

  /* ---------- UI shell ---------- */
  var ui={open:false,tab:'content',sec:'top',dept:null};
  var root=document.createElement('div');root.className='cms-ui';root.setAttribute('data-native-scroll','');
  root.innerHTML='<div class="cms-launch" hidden><button type="button" class="cms-main" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg><span>Admin</span><i class="cms-badge" hidden></i></button><div class="cms-bar"><button type="button" data-act="edit">Edit on page</button><button type="button" data-act="dash">Dashboard</button></div></div>'+
   '<aside class="cms-dash" hidden aria-label="Site admin"><header><div><small>Expert Mobile · <span class="cms-who"></span></small><b>Site admin</b></div><button type="button" class="cms-x" aria-label="Close dashboard">×</button></header><nav class="cms-tabs"><button type="button" data-tab="content">Content</button><button type="button" data-tab="team">Team</button><button type="button" data-tab="access">Access</button></nav><div class="cms-body"></div></aside>'+
   '<button type="button" class="cms-imgbtn" hidden>Replace image</button><div class="cms-toast" role="status" aria-live="polite"></div>';
  document.body.appendChild(root);
  ui.launcher=root.querySelector('.cms-launch');var badge=root.querySelector('.cms-badge');var dash=root.querySelector('.cms-dash'),body=root.querySelector('.cms-body'),imgBtn=root.querySelector('.cms-imgbtn'),tst=root.querySelector('.cms-toast'),tt;
  function toast(m,kind){tst.textContent=m;tst.className='cms-toast show'+(kind?' '+kind:'');clearTimeout(tt);tt=setTimeout(function(){tst.className='cms-toast'},2600)}
  root.querySelector('.cms-main').onclick=function(){var o=ui.launcher.classList.toggle('open');this.setAttribute('aria-expanded',o)};
  root.querySelector('[data-act=edit]').onclick=function(){setEditing(!editing)};
  root.querySelector('[data-act=dash]').onclick=function(){openDash()};
  root.querySelector('.cms-x').onclick=closeDash;
  root.querySelector('.cms-tabs').onclick=function(e){var b=e.target.closest('[data-tab]');if(b){ui.tab=b.dataset.tab;draft=null;accDraft=null;renderTab()}};
  function openDash(){if(!allowed)return;draft=null;accDraft=null;dash.hidden=false;ui.open=true;document.body.classList.add('cms-dash-open');renderTab()}
  function closeDash(){dash.hidden=true;ui.open=false;document.body.classList.remove('cms-dash-open')}

  /* ---------- click-to-edit ---------- */
  function setEditing(on){editing=!!on&&!!allowed;document.body.classList.toggle('cms-editing',editing);root.querySelector('[data-act=edit]').textContent=editing?'Done editing':'Edit on page';
    Object.keys(units).forEach(function(k){var r=units[k];if(editing&&mayEdit(r.sec)){r.el.setAttribute('contenteditable','true');r.el.setAttribute('spellcheck','true')}else{r.el.removeAttribute('contenteditable')}});
    listEditable();if(!editing){imgBtn.hidden=true;lbar.hidden=true}if(editing)toast('Click any text to edit it. Hover an image to replace it.')}
  document.addEventListener('click',function(e){if(!editing||e.target.closest('.cms-ui'))return;if(e.target.closest('[contenteditable=true]')||e.target.closest('a[href]')){e.preventDefault();e.stopPropagation()}},true);
  document.addEventListener('keydown',function(e){var u=editing&&e.target.closest&&e.target.closest('[data-cms][contenteditable=true]');if(!u)return;if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();u.blur()}if(e.key==='Escape'){var r=units[u.getAttribute('data-cms')];applyText(r,content[r.k]);if(!content[r.k]){u.innerHTML=r.orig}u.blur()}},true);
  document.addEventListener('paste',function(e){if(!editing||!e.target.closest||!e.target.closest('[contenteditable=true]'))return;e.preventDefault();var t=(e.clipboardData||window.clipboardData).getData('text/plain').replace(/\s+/g,' ');document.execCommand('insertText',false,t)},true);
  document.addEventListener('focusout',function(e){if(!editing)return;var u=e.target.closest&&e.target.closest('[data-cms]');if(!u)return;var r=units[u.getAttribute('data-cms')];if(!r||!mayEdit(r.sec))return;var v=collect(r),j=JSON.stringify(v||null);if(j===JSON.stringify(content[r.k]||null))return;saveKey(r.k,v);r.applied=!!v},true);
  var hovImg=null;
  document.addEventListener('mousemove',function(e){if(!editing)return;if(e.target.closest('.cms-ui'))return;var el=e.target.closest&&e.target.closest('[data-cms-img]');if(!el){var under=document.elementsFromPoint(e.clientX,e.clientY);for(var i=0;i<under.length&&!el;i++)if(under[i].hasAttribute&&under[i].hasAttribute('data-cms-img'))el=under[i]}
    var rec=el&&imgs[el.getAttribute('data-cms-img')];if(!rec||!mayEdit(rec.sec)){if(!el)imgBtn.hidden=true;return}hovImg=rec;var b=el.getBoundingClientRect();imgBtn.hidden=false;imgBtn.style.left=Math.max(8,b.left+b.width/2-60)+'px';imgBtn.style.top=Math.max(8,b.top+Math.min(b.height/2,60)-16)+'px'},{passive:true});
  imgBtn.onclick=function(){if(hovImg)replaceImg(hovImg)};

  /* ---------- dashboard ---------- */
  function h(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function clone(o){return JSON.parse(JSON.stringify(o||{}))}
  function label(rec){var el=rec.el,t=el.tagName.toLowerCase(),m={h1:'Main heading',h2:'Heading',h3:'Title',h4:'Subtitle',p:'Text',li:'List item',a:'Link / button',button:'Button',small:'Small text',address:'Address'};return m[t]||(el.classList.contains('tag')?'Label':'Text')}
  function renderTab(){if(!ui.open)return;[].forEach.call(root.querySelectorAll('.cms-tabs button'),function(b){b.classList.toggle('on',b.dataset.tab===ui.tab);if(b.dataset.tab==='access')b.hidden=!(allowed&&allowed.access);if(b.dataset.tab==='team')b.hidden=!(allowed&&allowed.team)});
    if(ui.tab==='team'&&!(allowed&&allowed.team))ui.tab='content';if(ui.tab==='access'&&!(allowed&&allowed.access))ui.tab='content';
    if(ui.tab==='content')renderContent();else if(ui.tab==='team')renderTeam();else renderAccess()}
  function renderContent(){var secs=SECS.filter(function(s){return bySec[s[0]]&&mayEdit(s[0])});if(!secs.length){body.innerHTML='<p class="cms-empty">You have no sections to edit yet.</p>';return}
    if(!secs.some(function(s){return s[0]===ui.sec}))ui.sec=secs[0][0];var b=bySec[ui.sec];
    var html='<div class="cms-secs">'+secs.map(function(s){return'<button type="button" data-sec="'+s[0]+'" class="'+(s[0]===ui.sec?'on':'')+'">'+h(s[1])+'</button>'}).join('')+'</div>';
    html+='<div class="cms-sechead"><b>'+h(SECNAME[ui.sec])+'</b><span>'+b.t.length+' text fields · '+b.i.length+' images</span><button type="button" class="cms-go" data-goto="'+ui.sec+'">Show on page</button></div>';
    if(b.i.length)html+='<h5>Images</h5><div class="cms-imgs">'+b.i.map(function(r){var src=curImg(r),ch=!!content[r.k];return'<div class="cms-im'+(ch?' ch':'')+'"><div class="th" style="background-image:url(&quot;'+h(src)+'&quot;)"></div><div class="ib"><button type="button" data-rep="'+r.k+'">Replace</button>'+(ch?'<button type="button" data-rst="'+r.k+'">Reset</button>':'')+'<button type="button" data-loc="'+r.k+'" aria-label="Show on page">◎</button></div></div>'}).join('')+'</div>';
    html+='<h5>Text</h5><div class="cms-fields">'+b.t.map(function(r){var cur=texts(r.el).map(function(n){return n.nodeValue.trim()}),parts=cur.length===r.origT.length?cur:[(r.el.innerText||'').trim()],ch=!!content[r.k];
      return'<div class="cms-f'+(ch?' ch':'')+'" data-k="'+r.k+'"><div class="fh"><span>'+label(r)+'</span><button type="button" data-loc="'+r.k+'">Show</button>'+(ch?'<button type="button" data-rst="'+r.k+'">Reset</button>':'')+'</div>'+parts.map(function(p,i){return'<textarea rows="'+(p.length>70?3:1)+'" data-part="'+i+'" aria-label="'+label(r)+(parts.length>1?' part '+(i+1):'')+'">'+h(p)+'</textarea>'}).join('')+'</div>'}).join('')+'</div>';
    html+=listsHtml(ui.sec);
    html+='<div class="cms-foot"><button type="button" class="cms-save">Save changes</button></div>';
    body.innerHTML=html}
  body.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;
    if(t.dataset.sec){ui.sec=t.dataset.sec;renderContent();body.scrollTop=0;return}
    if(t.dataset.goto){var el=document.querySelector(SECS.filter(function(s){return s[0]===t.dataset.goto})[0][2]);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(t.dataset.loc){var r=units[t.dataset.loc]||imgs[t.dataset.loc];if(r){r.el.scrollIntoView({behavior:'smooth',block:'center'});r.el.classList.remove('cms-flash');void r.el.offsetWidth;r.el.classList.add('cms-flash')}return}
    if(t.dataset.rep){replaceImg(imgs[t.dataset.rep]);return}
    if(t.dataset.rst){var k=t.dataset.rst;if(units[k]){units[k].applied=true;applyText(units[k],null)}else applyImg(imgs[k],null);saveKey(k,null).then(renderContent);return}
    if(t.classList.contains('cms-save')){var jobs=[];[].forEach.call(body.querySelectorAll('.cms-f'),function(f){var r=units[f.dataset.k],vals=[].map.call(f.querySelectorAll('textarea'),function(a){return a.value.trim()}),v;
      if(vals.length===r.origT.length)v=vals.every(function(x,i){return x===r.origT[i]})?null:{t:vals};else v={plain:vals[0]};
      if(JSON.stringify(v||null)!==JSON.stringify(content[r.k]||null)){r.applied=true;applyText(r,v);lastJ[r.k]=JSON.stringify(v||null);jobs.push(saveKey(r.k,v))}});
      if(!jobs.length)toast('No changes');else Promise.all(jobs).then(function(){toast('Saved '+jobs.length+' change'+(jobs.length>1?'s':''));renderContent()},function(){});return}
    listClick(t);teamClick(t);accessClick(t)});

  /* ---------- team directory editor ---------- */
  var draft=null;
  var DEPTS=function(){var D=window.EM_DEPTS||[];return D};
  function renderTeam(){if(!draft)draft=teamData();var D=DEPTS();if(!ui.dept)ui.dept=D[0]&&D[0].k;
    var html='<p class="cms-note">Add, edit or remove people. They appear in the team pop-ups and the photo orbit.</p><div class="cms-secs">'+D.map(function(d){var n=(draft[d.k]||[]).length;return'<button type="button" data-dept="'+d.k+'" class="'+(d.k===ui.dept?'on':'')+'">'+h(d.n)+' <i>'+n+'</i></button>'}).join('')+'</div>';
    var list=draft[ui.dept]||(draft[ui.dept]=[]);
    html+='<div class="cms-people">'+list.map(function(p,i){var src=photoSrc(p.photo);return'<div class="cms-p" data-i="'+i+'"><div class="ph" style="'+(src?'background-image:url(&quot;'+h(src)+'&quot;)':'')+'">'+(src?'':'<span>No photo</span>')+'</div><div class="pf">'+
      ['name','title','phone','email'].map(function(f){return'<label><span>'+{name:'Name',title:'Job title',phone:'Phone / ext.',email:'Email'}[f]+'</span><input data-f="'+f+'" value="'+h(p[f])+'"'+(f==='email'?' type="email"':'')+'></label>'}).join('')+
      '<div class="pb"><button type="button" data-pphoto="'+i+'">Photo</button><button type="button" data-pup="'+i+'" aria-label="Move up">↑</button><button type="button" data-pdn="'+i+'" aria-label="Move down">↓</button><button type="button" class="del" data-pdel="'+i+'">Remove</button></div></div></div>'}).join('')+'</div>';
    html+='<div class="cms-foot"><button type="button" class="cms-add" data-padd="1">+ Add person</button><button type="button" class="cms-save-team">Save team</button></div>';
    body.innerHTML=html}
  body.addEventListener('input',function(e){var i=e.target.closest('.cms-p input');if(!i||!draft)return;var c=i.closest('.cms-p');draft[ui.dept][+c.dataset.i][i.dataset.f]=i.value});
  function teamClick(t){if(ui.tab!=='team')return;var L=draft&&draft[ui.dept];
    if(t.dataset.dept){ui.dept=t.dataset.dept;renderTeam();return}
    if(t.dataset.padd){L.push({name:'',title:(DEPTS().filter(function(d){return d.k===ui.dept})[0]||{}).title||'',phone:'',email:'',photo:''});renderTeam();var ins=body.querySelectorAll('.cms-p');if(ins.length)ins[ins.length-1].querySelector('input').focus();return}
    if(t.dataset.pdel){L.splice(+t.dataset.pdel,1);renderTeam();return}
    if(t.dataset.pup){var a=+t.dataset.pup;if(a>0){L.splice(a-1,0,L.splice(a,1)[0]);renderTeam()}return}
    if(t.dataset.pdn){var b=+t.dataset.pdn;if(b<L.length-1){L.splice(b+1,0,L.splice(b,1)[0]);renderTeam()}return}
    if(t.dataset.pphoto){var idx=+t.dataset.pphoto;pickFile(function(f){upload(f).then(function(r){L[idx].photo='asset:'+r.id;renderTeam();toast('Photo added. Click Save team.')}).catch(function(e){toast((e&&e.message)||'Upload failed','err')})});return}
    if(t.classList.contains('cms-save-team')){var clean={};Object.keys(draft).forEach(function(k){clean[k]=draft[k].filter(function(p){return(p.name||'').trim()}).map(function(p){return{name:p.name.trim(),title:(p.title||'').trim(),phone:(p.phone||'').trim(),email:(p.email||'').trim(),photo:p.photo||''}})});
      var ref=db.doc('cms/team');write(ref.path,function(){return ref.set({members:clean,by:myId||'',at:Date.now()})}).then(function(){team={members:clean};draft=clone(clean);applyTeam();renderTeam();toast('Team saved')},function(){})}}

  /* ---------- access: roles, invite links, join requests ---------- */
  var accDraft=null,names={},ART='https://claude.ai/artifact/DxiFF78xognbosDMvaw1vt';
  var OPTS=SECS.map(function(s){return[s[0],s[1]]}).concat([['teamdir','Team directory (people)']]);
  function nameOf(id){return names[id]||'Team member'}
  function resolveNames(ids){if(!user||!ids.length)return;user.profiles(ids).then(function(ps){ids.forEach(function(id){names[id]=(ps[id]&&ps[id].name)||'Team member'});[].forEach.call(body.querySelectorAll('[data-name]'),function(b){b.textContent=nameOf(b.dataset.name)})})}
  function roleSel(i,r){return'<select data-erole="'+i+'" aria-label="Role">'+Object.keys(ROLES).map(function(k){return'<option value="'+k+'"'+(k===r?' selected':'')+'>'+ROLES[k]+'</option>'}).join('')+'</select>'}
  function renderAccess(){if(!accDraft)accDraft=clone(access);accDraft.editors.forEach(function(e){e.role=roleOf(e);if(!e.sections)e.sections=[]});
    var pend=requests.filter(function(r){return r.status==='pending'}),act=invites.filter(function(i){return i.active}),ids=accDraft.editors.map(function(e){return e.id}).concat(pend.map(function(r){return r.id}));
    var html='<div class="cms-owner"><b>'+(isOwner?'You are the main admin':'You are a super admin')+'</b><span>Sign-in uses each person’s Claude account, so nobody shares or stores passwords here.</span></div>';
    html+='<h5>1 · Invite links</h5><p class="cms-note">Create a link and send it to a team member. They open it, sign in, and send you a request.</p><div class="cms-inv"><button type="button" class="cms-add" data-newinv="1">+ Create invite link</button></div>';
    html+=act.length?'<div class="cms-invs">'+act.map(function(i){var u=ART+'#join-'+i.code;return'<div class="cms-iv"><code>'+h(u)+'</code><div class="pb"><button type="button" data-copy="'+h(u)+'">Copy link</button><button type="button" class="del" data-revoke="'+h(i.code)+'">Revoke</button></div></div>'}).join('')+'</div>':'<p class="cms-empty">No active invite links.</p>';
    html+='<h5>2 · Requests waiting for you'+(pend.length?' <i class="cms-cnt">'+pend.length+'</i>':'')+'</h5>'+(pend.length?'<div class="cms-eds">'+pend.map(function(r,i){return'<div class="cms-ed req" data-rid="'+h(r.id)+'"><div class="eh"><b data-name="'+h(r.id)+'">'+h(nameOf(r.id))+'</b><span class="when">'+(r.at?new Date(r.at).toLocaleDateString():'')+'</span></div>'+(r.dept?'<span class="rq">Team: '+h(r.dept)+'</span>':'')+(r.note?'<span class="rq">“'+h(r.note)+'”</span>':'')+'<div class="pb"><label class="rsel">Give role '+roleSel('r'+i,'editor').replace('data-erole','data-rrole')+'</label><button type="button" class="ok" data-approve="'+h(r.id)+'">Approve</button><button type="button" class="del" data-decline="'+h(r.id)+'">Decline</button></div></div>'}).join('')+'</div>':'<p class="cms-empty">No pending requests.</p>');
    html+='<h5>3 · People with admin access</h5><p class="cms-note"><b>Super admin</b>: edits everything and manages people. <b>Editor</b>: only the sections you tick. <b>Team manager</b>: only the team directory. Super admins also need <b>Editor</b> access in the Share menu; everyone else needs <b>Contributor</b>.</p>';
    html+='<label class="cms-search"><span>Or add someone directly</span><input type="search" placeholder="Search name or email" autocomplete="off"></label><div class="cms-hits"></div>';
    html+='<div class="cms-eds">'+(accDraft.editors.length?accDraft.editors.map(function(e,i){var r=e.role;return'<div class="cms-ed" data-i="'+i+'"><div class="eh"><b data-name="'+h(e.id)+'">'+h(nameOf(e.id))+'</b>'+roleSel(i,r)+'<button type="button" class="del" data-edel="'+i+'">Remove</button></div>'+
      (r==='editor'?'<div class="chk">'+OPTS.map(function(o){return'<label><input type="checkbox" data-esec="'+i+'" value="'+o[0]+'"'+(e.sections.indexOf(o[0])>-1?' checked':'')+'> '+h(o[1])+'</label>'}).join('')+'</div>':'<span class="rq">'+(r==='super'?'Full access to every section, the team directory and admin people.':'Can add, edit and remove people in the team directory.')+'</span>')+'</div>'}).join(''):'<p class="cms-empty">No one else has admin access yet.</p>')+'</div>';
    html+='<div class="cms-foot"><button type="button" class="cms-save-acc">Save access</button></div>';body.innerHTML=html;resolveNames(ids);
    var inp=body.querySelector('.cms-search input'),hits=body.querySelector('.cms-hits');
    function run(){if(!user||!user.search){hits.innerHTML='<p class="cms-empty">People search is not available here.</p>';return}user.search(inp.value.trim()).then(function(res){hits.innerHTML='';res.filter(function(p){return!p.isMe&&accDraft.editors.every(function(x){return x.id!==p.id})}).forEach(function(p){var b=document.createElement('button');b.type='button';b.className='hit';b.dataset.add=p.id;var nm=document.createElement('b');nm.textContent=p.name;var em=document.createElement('span');em.textContent=p.email||'';b.appendChild(nm);b.appendChild(em);names[p.id]=p.name;hits.appendChild(b)})})}
    inp.addEventListener('input',run);inp.addEventListener('focus',run)}
  body.addEventListener('change',function(e){if(ui.tab!=='access'||!accDraft)return;var t=e.target;
    if(t.dataset.erole!=null){var ed=accDraft.editors[+t.dataset.erole];ed.role=t.value;if(t.value==='super')ed.sections=['all'];else if(t.value==='team')ed.sections=['teamdir'];else ed.sections=ed.sections.filter(function(x){return x!=='all'});renderAccess();return}
    if(t.dataset.esec!=null){var ed2=accDraft.editors[+t.dataset.esec];var s=ed2.sections.filter(function(x){return x!==t.value&&x!=='all'});if(t.checked)s.push(t.value);ed2.sections=s}});
  function cleanAccess(src){return{editors:src.editors.map(function(e){var r=roleOf(e);return{id:e.id,role:r,sections:r==='super'?['all']:r==='team'?['teamdir']:(e.sections||[]).slice(0,40)}})}}
  function saveAccess(next,msg){var ref=db.doc('cms/access'),clean=cleanAccess(next);return write(ref.path,function(){return ref.set(clean)}).then(function(){access=clean;accDraft=clone(clean);toast(msg||'Access saved');renderAccess()})}
  function newCode(){var a=new Uint8Array(9);(window.crypto||{}).getRandomValues?crypto.getRandomValues(a):a.forEach(function(_,i){a[i]=Math.random()*256});return[].map.call(a,function(x){return('0'+x.toString(36)).slice(-2)}).join('').slice(0,14)}
  function accessClick(t){if(ui.tab!=='access'||!(allowed&&allowed.access))return;
    if(t.dataset.newinv){var c=newCode(),ref=db.doc('cms_invites/'+c);write(ref.path,function(){return ref.set({active:true,by:myId||'',at:Date.now()})}).then(function(){toast('Invite link created. Copy and send it.')},function(){});return}
    if(t.dataset.copy){var u=t.dataset.copy;var done=function(){toast('Link copied')};try{navigator.clipboard.writeText(u).then(done,function(){sel(t)})}catch(_){sel(t)}return}
    if(t.dataset.revoke){var r=db.doc('cms_invites/'+t.dataset.revoke);write(r.path,function(){return r.set({active:false,at:Date.now()})}).then(function(){toast('Link revoked')},function(){});return}
    if(t.dataset.approve){var id=t.dataset.approve,box=t.closest('.req'),role=box.querySelector('select').value,base=clone(access);base.editors=base.editors.filter(function(x){return x.id!==id});base.editors.push({id:id,role:role,sections:role==='super'?['all']:role==='team'?['teamdir']:[]});
      saveAccess(base,role==='editor'?'Approved. Tick the sections they can edit, then Save access.':'Approved as '+ROLES[role]).then(function(){var q=db.doc('cms_requests/'+id);return write(q.path,function(){return q.update({status:'approved',role:role,decidedAt:Date.now()})})}).catch(function(){});return}
    if(t.dataset.decline){var q2=db.doc('cms_requests/'+t.dataset.decline);write(q2.path,function(){return q2.update({status:'declined',decidedAt:Date.now()})}).then(function(){toast('Request declined')},function(){});return}
    if(t.dataset.add){accDraft.editors.push({id:t.dataset.add,role:'team',sections:['teamdir']});renderAccess();toast('Added. Choose their role, then Save access.');return}
    if(t.dataset.edel){accDraft.editors.splice(+t.dataset.edel,1);renderAccess();return}
    if(t.classList.contains('cms-save-acc')){saveAccess(accDraft).catch(function(){})}}
  function sel(el){var c=el.closest('.cms-iv').querySelector('code'),r=document.createRange();r.selectNodeContents(c);var s=getSelection();s.removeAllRanges();s.addRange(r);toast('Press Ctrl+C or Cmd+C to copy')}

  /* ---------- join flow (invite link) ---------- */
  var joinBox=null,joinCode=(location.hash.match(/^#join-([a-z0-9]{6,20})$/)||[])[1]||null;
  function checkJoin(){if(!joinCode||!db)return;if(allowed&&!joinBox){return}
    if(!joinBox){joinBox=document.createElement('div');joinBox.className='cms-join';joinBox.setAttribute('role','dialog');joinBox.setAttribute('aria-modal','true');joinBox.setAttribute('aria-label','Join the admin team');root.appendChild(joinBox)}
    var inv=invites.filter(function(i){return i.code===joinCode})[0],html='<div class="cms-jcard"><small>Expert Mobile · Site admin</small>';
    if(allowed){html+='<h3>You already have admin access</h3><p>Use the gold Admin button in the bottom-left corner.</p><button type="button" class="cms-save" data-jclose>Got it</button>'}
    else if(!myId){html+='<h3>Sign in to continue</h3><p>Open this link while signed in to your Claude account.</p>'}
    else if(myReq&&myReq.status==='pending'){html+='<h3>Request sent</h3><p>The main admin will review it. The Admin button appears here once you’re approved.</p><button type="button" class="cms-add" data-jclose>Close</button>'}
    else if(myReq&&myReq.status==='declined'){html+='<h3>Request declined</h3><p>Contact the main admin if you think this is a mistake.</p><button type="button" class="cms-add" data-jclose>Close</button>'}
    else if(!inv||!inv.active){html+='<h3>This invite link isn’t active</h3><p>Ask the main admin for a new link.</p><button type="button" class="cms-add" data-jclose>Close</button>'}
    else{html+='<h3>Request admin access</h3><p>You’re signed in with your Claude account. Tell the main admin which team you’re on; they’ll choose what you can edit.</p><label><span>Your team</span><select class="jdept">'+(window.EM_DEPTS||[]).map(function(d){return'<option>'+h(d.n)+'</option>'}).join('')+'</select></label><label><span>Message (optional)</span><textarea class="jnote" rows="2" maxlength="300" placeholder="e.g. I manage the rental fleet"></textarea></label><div class="pb"><button type="button" class="cms-save" data-jsend>Send request</button><button type="button" class="cms-add" data-jclose>Cancel</button></div>'}
    joinBox.innerHTML=html+'</div>'}
  root.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||!joinBox||!joinBox.contains(b))return;
    if(b.hasAttribute('data-jclose')){joinBox.remove();joinBox=null;joinCode=null;return}
    if(b.hasAttribute('data-jsend')){var ref=db.doc('cms_requests/'+myId);b.disabled=true;write(ref.path,function(){return ref.set({code:joinCode,dept:joinBox.querySelector('.jdept').value,note:joinBox.querySelector('.jnote').value.trim().slice(0,300),status:'pending',at:Date.now()})}).then(function(){toast('Request sent')},function(){b.disabled=false})}});

  /* ---------- add / delete / reorder items in lists ---------- */
  var LISTS=[['.bento','.co','Company cards'],['.stats','.stat','Number tiles'],['.pills','li','Tags'],['.sols','.sol','Solution cards'],['.uses','div','Rental uses'],['.acc-grid','div','Accessory items'],['.rp-grid','.rp-step','Rental steps'],['.work','.shot,.vehicle','Project cards'],['.veh-list','li','Install checklist'],['.steps','.step','Process steps'],['.lines','.line','Contact cards'],['.dl-copy ul','li','Brand bullet points'],['.nw-stats','div','Network numbers'],['.nw-flags','.fl','Countries'],['.foot-col','a','Footer links']];
  var lists={},listData={},lastL={},cid=0;
  SECS.forEach(function(s){var r=document.querySelector(s[2]);if(!r)return;var n=0;
    LISTS.forEach(function(L){[].forEach.call(r.querySelectorAll(L[0]),function(c){if(c.closest('.cms-ui'))return;var items=[].filter.call(c.children,function(ch){return ch.matches(L[1])});if(!items.length)return;
      var k=s[0]+'-L'+(n++),mk=document.createComment('cms-list');c.insertBefore(mk,items[0]);
      items.forEach(function(it,i){it.setAttribute('data-li',k);it.setAttribute('data-lo',i)});
      lists[k]={k:k,sec:s[0],label:L[2],c:c,mk:mk,orig:items,def:items.map(function(_,i){return{o:i}})}})})});
  function curOrder(k){return listData[k]||lists[k].def}
  function firstImg(el){if(el.tagName==='IMG')return el;return el.querySelector('img,[style*="background-image"],.pslide,.ph')}
  function buildClone(L,rec){var src=L.orig[rec.from]||L.orig[0],n=src.cloneNode(true);
    [n].concat([].slice.call(n.querySelectorAll('*'))).forEach(function(e){if(e.hasAttribute('data-cms')){e.removeAttribute('data-cms');e.setAttribute('data-cmsc','')}e.removeAttribute('data-cms-img');e.removeAttribute('id');e.removeAttribute('contenteditable');e.classList.remove('pre','pre-up','on','hot','cms-flash')});
    n.setAttribute('data-li',L.k);n.setAttribute('data-lc',rec.id);n.removeAttribute('data-lo');
    if(n.matches('[data-cms]')){n.removeAttribute('data-cms');n.setAttribute('data-cmsc','')}
    var ns=texts(n);if(Array.isArray(rec.t)&&rec.t.length===ns.length)ns.forEach(function(x,i){x.nodeValue=ws(x.nodeValue,String(rec.t[i]))});
    if(rec.img&&/^[0-9a-f]{32}$/.test(rec.img)){var im=firstImg(n),u='/_blob/'+rec.img;if(im){if(im.tagName==='IMG')im.src=u;else im.style.backgroundImage='url("'+u+'")'}}
    return n}
  function applyLists(){Object.keys(lists).forEach(function(k){var L=lists[k],o=curOrder(k),j=JSON.stringify(o);if(lastL[k]===j)return;lastL[k]=j;
      if(document.activeElement&&L.c.contains(document.activeElement)&&editing)return;
      [].slice.call(L.c.querySelectorAll('[data-li="'+k+'"]')).forEach(function(e){if(e.parentNode===L.c)e.remove()});
      var ref=L.mk.nextSibling,frag=document.createDocumentFragment();
      o.forEach(function(r){if(r.o!=null){if(L.orig[r.o])frag.appendChild(L.orig[r.o])}else frag.appendChild(buildClone(L,r))});
      L.c.insertBefore(frag,ref)});
    listEditable();if(window.EM_orbit)try{}catch(_){}}
  function listEditable(){[].forEach.call(document.querySelectorAll('[data-lc] [data-cmsc],[data-lc][data-cmsc]'),function(e){var L=lists[e.closest('[data-li]').getAttribute('data-li')];if(editing&&L&&mayEdit(L.sec))e.setAttribute('contenteditable','true');else e.removeAttribute('contenteditable')})}
  function snapshotClone(el){var k=el.getAttribute('data-li'),o=clone(curOrder(k)),id=el.getAttribute('data-lc');o.forEach(function(r){if(r.id===id)r.t=texts(el).map(function(x){return x.nodeValue.trim()})});return o}
  function saveList(k,order,msg){listData[k]=order;var ref=db.doc('cms_lists/'+k);lastL[k]=null;applyLists();
    return write(ref.path,function(){return ref.set({order:order,by:myId||'',at:Date.now()})}).then(function(){toast(msg||'Saved');if(ui.open&&ui.tab==='content')renderContent()})}
  function newId(){return'n'+Date.now().toString(36)+(cid++)}
  function posOf(k,el){var o=curOrder(k),id=el.getAttribute('data-lc'),oi=el.getAttribute('data-lo');for(var i=0;i<o.length;i++){if(id&&o[i].id===id)return i;if(!id&&oi!=null&&o[i].o===+oi)return i}return -1}
  function fromOf(k,el){var lc=el.getAttribute('data-lc');if(lc){var r=curOrder(k).filter(function(x){return x.id===lc})[0];return r?r.from:0}return +el.getAttribute('data-lo')}
  function act(kind,k,i){var o=clone(curOrder(k)),L=lists[k];if(i<0)return;
    if(kind==='del'){if(o.length<=1){toast('A list needs at least one item','err');return}o.splice(i,1);saveList(k,o,'Item deleted');return}
    if(kind==='up'&&i>0){o.splice(i-1,0,o.splice(i,1)[0]);saveList(k,o,'Moved');return}
    if(kind==='dn'&&i<o.length-1){o.splice(i+1,0,o.splice(i,1)[0]);saveList(k,o,'Moved');return}
    if(kind==='dup'){var r=o[i],el=r.o!=null?L.orig[r.o]:L.c.querySelector('[data-lc="'+r.id+'"]'),nr={id:newId(),from:r.o!=null?r.o:r.from,t:el?texts(el).map(function(x){return x.nodeValue.trim()}):null,img:r.img||null};
      o.splice(i+1,0,nr);saveList(k,o,'Item added. Click its text to edit it.')}}
  /* floating toolbar on page */
  var lbar=document.createElement('div');lbar.className='cms-lbar';lbar.hidden=true;lbar.innerHTML='<button type="button" data-b="dup" title="Add a copy after this">+ Add</button><button type="button" data-b="up" title="Move up">↑</button><button type="button" data-b="dn" title="Move down">↓</button><button type="button" data-b="img" title="Replace image">Image</button><button type="button" data-b="del" class="del" title="Delete">Delete</button>';root.appendChild(lbar);var lcur=null;
  document.addEventListener('mousemove',function(e){if(!editing)return;if(e.target.closest&&e.target.closest('.cms-ui'))return;var el=e.target.closest&&e.target.closest('[data-li]');
    if(!el){return}var L=lists[el.getAttribute('data-li')];if(!L||!mayEdit(L.sec))return;lcur=el;var b=el.getBoundingClientRect();lbar.hidden=false;
    lbar.querySelector('[data-b=img]').hidden=!firstImg(el);lbar.style.top=Math.max(8,b.top+4)+'px';lbar.style.left=Math.max(8,Math.min(innerWidth-lbar.offsetWidth-8,b.right-lbar.offsetWidth-4))+'px';
    el.classList.add('cms-lhov');if(lbar._p&&lbar._p!==el)lbar._p.classList.remove('cms-lhov');lbar._p=el},{passive:true});
  lbar.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||!lcur)return;var k=lcur.getAttribute('data-li'),i=posOf(k,lcur);
    if(b.dataset.b==='img'){var el=lcur;pickFile(function(f){upload(f).then(function(r){var o=clone(curOrder(k)),j=posOf(k,el);if(j<0)return;var rec=o[j];
        if(rec.o!=null){var nr={id:newId(),from:rec.o,t:texts(el).map(function(x){return x.nodeValue.trim()}),img:r.id};o[j]=nr}else rec.img=r.id;return saveList(k,o,'Image replaced')}).catch(function(er){toast((er&&er.message)||'Upload failed','err')})});return}
    if(b.dataset.b==='del'&&!lbar.classList.contains('confirm')){lbar.classList.add('confirm');b.textContent='Confirm delete';setTimeout(function(){lbar.classList.remove('confirm');b.textContent='Delete'},2500);return}
    lbar.classList.remove('confirm');lbar.querySelector('[data-b=del]').textContent='Delete';act(b.dataset.b,k,i)});
  document.addEventListener('focusout',function(e){if(!editing)return;var u=e.target.closest&&e.target.closest('[data-lc]');if(!u||!e.target.closest('[data-cmsc]'))return;var k=u.getAttribute('data-li');if(!mayEdit(lists[k].sec))return;var o=snapshotClone(u);listData[k]=o;lastL[k]=JSON.stringify(o);var ref=db.doc('cms_lists/'+k);write(ref.path,function(){return ref.set({order:o,by:myId||'',at:Date.now()})}).then(function(){toast('Saved')},function(){})},true);
  /* dashboard list editor */
  function itemLabel(k,r){var L=lists[k],el=r.o!=null?L.orig[r.o]:L.c.querySelector('[data-lc="'+r.id+'"]');var tx=el?texts(el).map(function(x){return x.nodeValue.trim()}).filter(Boolean):[];var s=(tx[0]||'Item');if(tx[1]&&s.length<14)s+=' · '+tx[1];return s.length>60?s.slice(0,58)+'…':s}
  function listsHtml(sec){var ks=Object.keys(lists).filter(function(k){return lists[k].sec===sec});if(!ks.length)return'';
    return'<h5>Lists · add, delete, reorder</h5>'+ks.map(function(k){var L=lists[k],o=curOrder(k),ch=!!listData[k];return'<div class="cms-list'+(ch?' ch':'')+'"><div class="fh"><span>'+h(L.label)+' ('+o.length+')</span>'+(ch?'<button type="button" data-lrst="'+k+'">Restore original</button>':'')+'</div>'+
      o.map(function(r,i){return'<div class="cms-li"><b>'+h(itemLabel(k,r))+'</b>'+(r.o==null?'<i>new</i>':'')+'<button type="button" data-lk="'+k+'" data-la="up" data-li2="'+i+'" aria-label="Move up">↑</button><button type="button" data-lk="'+k+'" data-la="dn" data-li2="'+i+'" aria-label="Move down">↓</button><button type="button" data-lk="'+k+'" data-la="dup" data-li2="'+i+'">+ Copy</button><button type="button" class="del" data-lk="'+k+'" data-la="del" data-li2="'+i+'">Delete</button></div>'}).join('')+'</div>'}).join('')+'<p class="cms-note">New items start as a copy. Use “Edit on page” to change their text, or hover them to replace the image.</p>'}
  function listClick(t){if(t.dataset.lrst){var k=t.dataset.lrst;delete listData[k];lastL[k]=null;var ref=db.doc('cms_lists/'+k);write(ref.path,function(){return ref.delete()}).then(function(){applyLists();toast('Original list restored');renderContent()},function(){});return}
    if(t.dataset.lk){if(t.dataset.la==='del'&&!t.classList.contains('sure')){t.classList.add('sure');t.textContent='Sure?';return}act(t.dataset.la,t.dataset.lk,+t.dataset.li2)}}
})();
