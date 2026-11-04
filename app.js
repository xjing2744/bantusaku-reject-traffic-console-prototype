'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = v => JSON.parse(JSON.stringify(v));
const money = v => Number(v).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const num = v => Number(v).toLocaleString('zh-CN');
const now = () => new Date().toLocaleString('sv-SE',{hour12:false});
const dateAgo = d => {const t=new Date();t.setDate(t.getDate()-d);return t.toLocaleString('sv-SE',{hour12:false});};
const methods={download:'按下载计费',register:'按注册计费',loan:'按放款计费'};
const clients={android:'安卓',ios:'苹果'};
const productTypes={loan:'贷款产品',credit_report:'信用报告产品'};
const loanFields=['logo','color','minLoan','maxLoan','minTerm','maxTerm','rate','passRate','riskLockDays','description','steps','conditions','repaymentType','repaymentMethod','speed','tags'];
const positions={applying:'申请中首页',submitted:'借款已提交页',locked:'拒绝锁定页'};
const pageNames={products:'产品管理',sorting:'产品上架排序',merchants:'商户管理',accounts:'账户管理'};
const STORAGE='reject-traffic-prototype-v1';
function seed(){
  const products=[
    {id:44,name:'智慧信贷',client:'android',accountId:1,price:'0.4000',method:'download',minLoan:2000000,maxLoan:50000000,minTerm:91,maxTerm:360,rate:'0.1000',color:'#37bb60',glyph:'智'},
    {id:41,name:'快捷借款',client:'ios',accountId:1,price:'0.7000',method:'download',minLoan:1000000,maxLoan:30000000,minTerm:91,maxTerm:180,rate:'0.0800',color:'#6650d9',glyph:'快'},
    {id:36,name:'安心借',client:'ios',accountId:2,price:'20.0000',method:'loan',minLoan:500000,maxLoan:20000000,minTerm:30,maxTerm:360,rate:'0.1200',color:'#4aaf55',glyph:'安'},
    {id:35,name:'安心借',client:'android',accountId:2,price:'20.0000',method:'loan',minLoan:500000,maxLoan:20000000,minTerm:30,maxTerm:360,rate:'0.1200',color:'#4aaf55',glyph:'安'},
    {id:31,name:'安心借',client:'ios',accountId:1,price:'0.7000',method:'download',minLoan:500000,maxLoan:20000000,minTerm:30,maxTerm:360,rate:'0.1200',color:'#4aaf55',glyph:'安'},
    {id:30,name:'快捷借款',client:'android',accountId:1,price:'0.4000',method:'download',minLoan:1000000,maxLoan:30000000,minTerm:91,maxTerm:180,rate:'0.0800',color:'#6650d9',glyph:'快'},
    {id:20,name:'轻松借',client:'android',accountId:1,price:'0.1000',method:'download',minLoan:2000000,maxLoan:50000000,minTerm:91,maxTerm:360,rate:'0.1000',color:'#51bfce',glyph:'轻'},
    {id:18,name:'闪电贷',client:'ios',accountId:2,price:'12.0000',method:'loan',minLoan:800000,maxLoan:15000000,minTerm:30,maxTerm:180,rate:'0.1300',color:'#e9a744',glyph:'闪'}
  ].map((p,i)=>({...p,productType:"loan",enabled:i!==7,user:'运营人员',time:dateAgo(i+1),logo:'',speed:'最快当天',passRate:80,linkAndroid:'https://example.com/android',linkIos:'https://example.com/ios',description:'',steps:'',conditions:'',repaymentType:'',repaymentMethod:'',tags:'',lockOp:'>=',lockDays:30,fdc:false}));
  return {products,merchants:[{id:1,name:'维信商户',type:'referral',enabled:true,remark:'引流合作商户',user:'运营人员',time:dateAgo(2)},{id:2,name:'恒昌商户',type:'referral',enabled:true,remark:'引流合作商户',user:'运营人员',time:dateAgo(4)},{id:3,name:'采量合作商户',type:'acquisition',enabled:true,remark:'',user:'运营人员',time:dateAgo(8)}],accounts:[{id:1,name:'维信结算账户',merchantId:1,enabled:true,balance:2728.92,warning:500,emails:'',remark:'主要结算账户',user:'运营人员',time:dateAgo(2)},{id:2,name:'恒昌结算账户',merchantId:2,enabled:true,balance:0,warning:null,emails:'',remark:'',user:'运营人员',time:dateAgo(4)},{id:3,name:'采量结算账户',merchantId:3,enabled:true,balance:0,warning:null,emails:'',remark:'',user:'运营人员',time:dateAgo(8)}],placements:{applying:[],submitted:[{id:44,rank:999,listed:true},{id:41,rank:888,listed:true},{id:36,rank:889,listed:false}],locked:[{id:35,rank:999,listed:true},{id:30,rank:888,listed:true},{id:20,rank:0,listed:false}]},tasks:{44:[{id:1,repeat:'daily',start:'09:00',end:'19:00'}]},records:Object.fromEntries(products.map(p=>[p.id,[{time:dateAgo(20),type:'新增产品',operator:'运营人员',summary:'创建产品',remark:'',images:[]}]])),transactions:[{id:1,accountId:1,type:'充值',amount:3000,time:dateAgo(12),operator:'运营人员',remark:'演示充值'},{id:2,accountId:1,type:'消耗',amount:271.08,time:dateAgo(2),operator:'系统',remark:'演示日消耗'}]};
}
let data;
try{data=JSON.parse(localStorage.getItem(STORAGE))||seed();}catch{data=seed();}
for(const product of data.products)product.productType??='loan';
for(const key of Object.keys(positions))data.placements[key]??=[];
let placementClient='android';
let page='products',position='submitted',productPage=1,recordPage=1;
let filters={products:{name:'',status:'enabled',productType:'',client:'',merchant:''},merchants:{name:'',status:''},accounts:{name:'',merchant:'',status:''}};
let permission='all',failure='none',editor=null,recordId=null,transactionAccount=null;
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(data));return true;}catch{toast('本地存储空间不足，请减少图片或恢复演示数据',true);return false;}}
function commit(){if(persist())toast('已保存');}
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.className='visible'+(error?' error-toast':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className='',3000);}
function accountName(id){const a=data.accounts.find(a=>a.id===Number(id));if(!a)return '—';const m=data.merchants.find(m=>m.id===a.merchantId);return `${m?.name||'—'} · ${a.name}`;}
function merchantName(id){return data.merchants.find(m=>m.id===Number(id))?.name||'—';}
function logo(p,size=''){if(p.productType==='credit_report')return `<span class="report-thumb">${p.productImage?`<img src="${esc(p.productImage)}" alt="${esc(p.name)}的产品图片">`:'信用报告'}</span>`;return `<span class="logo ${size}" style="--logo:${esc(p.color||'#409eff')}">${p.logo?`<img src="${esc(p.logo)}" alt="${esc(p.name)}的产品图标">`:esc(p.glyph||p.name[0]||'借')}</span>`;}
function options(opts,val){return opts.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(t)}</option>`).join('');}
function action(label,act,id,extra=''){return `<button type="button" class="link ${extra}" data-action="${act}" data-id="${id}">${label}</button>`;}
function statusButton(type,o){return `<span class="status"><button class="switch ${o.enabled?'on':''}" role="switch" aria-checked="${o.enabled}" aria-label="${o.enabled?'禁用':'启用'}${esc(o.name)}" data-action="toggle-${type}" data-id="${o.id}"></button>${type==='product'?'':o.enabled?'启用':'禁用'}</span>`;}
function heading(sub,addLabel,addAction,showActions=true){return `<div class="page-title"><div><h1>${pageNames[page]}</h1><p>${sub}</p></div>${showActions?`<div class="actions">${addLabel?`<button class="primary" data-action="${addAction}">＋ ${addLabel}</button>`:''}<button data-action="refresh">↻ 刷新</button></div>`:''}</div>`;}
function filterInput(key,label,val,wide=false,list=''){return `<label class="filter ${wide?'wide':''}">${label}<input name="${key}" value="${esc(val)}" placeholder="请输入${label}" ${list?`list="${list}"`:''}></label>`;}
function filterSelect(key,label,val,opts){return `<label class="filter">${label}<select name="${key}">${options([['','全部'],...opts],val)}</select></label>`;}
function filterButtons(){return '<button class="primary" type="submit">查询</button><button type="button" data-action="reset-filters">重置</button>';}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td class="empty" colspan="${headers.length}">暂无符合条件的数据</td></tr>`}</tbody></table></div>`;}
function render(){
  if($('#main #modalForm')){ $('#modal').append($('#modalForm')); editor=null; }
  $('#breadcrumb').textContent=pageNames[page];$$('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#main').innerHTML=({products:productsView,sorting:sortingView,merchants:merchantsView,accounts:accountsView}[page])();
  const f=$('#filters');if(f)f.onsubmit=e=>{e.preventDefault();filters[page]=Object.fromEntries(new FormData(f));productPage=1;render();};
  if(page==='sorting')bindDrag();
}
function productsView(){
  const f=filters.products;
  const merchantMatches=q=>data.merchants.filter(m=>m.name.includes(q)||data.accounts.some(a=>a.merchantId===m.id&&accountName(a.id).includes(q))).map(m=>m.id);
  const matches=merchantMatches(f.merchant);
  const found=data.products.filter(p=>(!f.name||p.name===f.name)&&(!f.status||p.enabled===(f.status==='enabled'))&&(!f.productType||(p.productType||'loan')===f.productType)&&(!f.client||p.client===f.client)&&(!f.merchant||matches.includes(data.accounts.find(a=>a.id===p.accountId)?.merchantId)));
  productPage=Math.max(1,Math.min(productPage,Math.ceil(found.length/10)||1));
  const rows=found.slice((productPage-1)*10,productPage*10).map(p=>`<tr><td class="muted number">${p.id}</td><td><button class="link image-preview" data-action="logo-preview" data-id="${p.id}" aria-label="预览${esc(p.name)}图标">${logo(p)}</button></td><td class="product-name">${esc(p.name)}</td><td>${productTypes[p.productType||'loan']}</td><td>${esc(accountName(p.accountId))}</td><td class="number">${Number(p.price).toFixed(4)} <span class="muted">美元</span></td><td>${methods[p.method]}</td><td>${statusButton('product',p)}</td><td><span class="tag ${p.client==='ios'?'gray':''}">${clients[p.client]}</span></td><td class="muted">${esc(p.user)}</td><td class="muted number">${esc(p.time).replace(' ','<br>')}</td><td><div class="row-actions">${['all','edit'].includes(permission)?action('编辑','edit-product',p.id):''}${['all','edit'].includes(permission)?action('复制','copy-product',p.id):''}${action('详情','details',p.id)}${['all','record'].includes(permission)?action('操作记录','records',p.id):''}${action('定时任务','tasks',p.id)}</div></td></tr>`).join('');
  return heading('维护引流产品信息、展示终端与合作配置','新增产品','add-product')+`<form class="panel filters" id="filters">${filterInput('name','产品名称',f.name)}${filterSelect('productType','产品类型',f.productType,Object.entries(productTypes))}${filterSelect('status','状态',f.status,[['enabled','启用'],['disabled','禁用']])}${filterSelect('client','展示终端',f.client,[['android','安卓'],['ios','苹果']])}${filterInput('merchant','商户或结算账户',f.merchant,true,'merchantOptions')}<datalist id="merchantOptions">${data.merchants.filter(m=>m.type==='referral').map(m=>`<option value="${esc(m.name)}">${esc(data.accounts.filter(a=>a.merchantId===m.id).map(a=>a.name).join('、'))}</option>`).join('')}</datalist>${filterButtons()}</form><section class="panel"><div class="table-bar">产品列表 <span class="muted">共 ${found.length} 个产品</span></div>${table(['编号','产品图标','产品名称','产品类型','结算账户','结算单价','结算方式','状态','展示终端','最后操作人','最后操作时间','操作'],rows)}<div class="pagination"><span>共 ${found.length} 条</span><span>每页 10 条</span><button data-action="prev-products" ${productPage<=1?'disabled':''}>‹</button><button class="current">${productPage}</button><button data-action="next-products" ${productPage*10>=found.length?'disabled':''}>›</button></div></section>`;
}
function placementItems(pos=position,client=placementClient){return data.placements[pos].filter(o=>data.products.some(p=>p.id===o.id&&p.client===client));}
function sortedPlacements(){return [...placementItems()].sort((a,b)=>Number(b.listed)-Number(a.listed)||b.rank-a.rank);}
function sortingView(){
  const items=sortedPlacements();
  const rows=items.map(o=>{const p=data.products.find(p=>p.id===o.id);return `<tr draggable="true" data-sort-id="${p.id}" class="${o.listed?'':'off-row'}"><td><span class="drag-handle" title="拖动调整排序">⠿</span></td><td>${logo(p)}</td><td class="product-name">${esc(p.name)} <span class="tag">${clients[p.client]}</span></td><td>${esc(merchantName(data.accounts.find(a=>a.id===p.accountId)?.merchantId))}</td><td><span class="tag ${o.listed?'':'gray'}">${o.listed?'已上架':'已下架'}</span></td><td><input class="sort-input" type="number" min="0" max="9999" step="1" value="${o.rank}" aria-label="${esc(p.name)}排序值" data-rank-id="${p.id}"></td><td><div class="row-actions">${action(o.listed?'下架':'上架','listing',p.id)}${action('删除','remove-placement',p.id,'danger')}${action('上移','move-up',p.id)}${action('下移','move-down',p.id)}</div></td></tr>`;}).join('');
  return heading('按展示终端和页面分别维护产品上下架与排序',null,null,false)+`<section class="panel"><div class="placement-toolbar"><div class="terminal-switch" role="group" aria-label="展示终端">${Object.entries(clients).map(([key,label])=>`<button data-action="placement-client" data-id="${key}" class="${placementClient===key?'active':''}" aria-pressed="${placementClient===key}">${label==='苹果'?'iOS（苹果）':'安卓'}</button>`).join('')}</div></div><div class="placement-pagebar"><div class="tabs">${Object.entries(positions).map(([key,label])=>`<button data-action="position" data-id="${key}" class="${position===key?'active':''}">${label}</button>`).join('')}</div><div class="placement-actions"><button class="primary" data-action="add-placement">＋ 添加产品</button><button data-action="refresh">↻ 刷新</button><button data-action="apply-placements">应用到其他页面</button></div></div><div class="table-bar"><span>${clients[placementClient]} · ${positions[position]}的产品</span><span class="muted">排序值越大越靠前 · 下架产品置底 · 可拖动排序</span></div>${table(['','产品图标','产品名称','商户名称','上架状态','排序值','操作'],rows)}<div class="pagination">共 ${items.length} 个产品</div></section>`;
}
function merchantsView(){
  const f=filters.merchants;
  const found=data.merchants.filter(m=>(!f.name||m.name===f.name)&&(!f.status||m.enabled===(f.status==='enabled')));
  const rows=found.map(m=>`<tr><td class="muted">${m.id}</td><td class="product-name">${esc(m.name)}</td><td><span class="tag ${m.type==='acquisition'?'gray':''}">${m.type==='referral'?'引流商户':'采量商户'}</span></td><td>${statusButton('merchant',m)}</td><td title="${esc(m.remark)}">${esc(m.remark.length>25?m.remark.slice(0,25)+'…':m.remark||'—')}</td><td class="muted">${esc(m.user)}</td><td class="muted">${esc(m.time)}</td><td>${action('编辑','edit-merchant',m.id)}</td></tr>`).join('');
  return heading('维护合作商户及商户状态','新增商户','add-merchant')+`<form class="panel filters" id="filters">${filterInput('name','商户名称',f.name)}${filterSelect('status','状态',f.status,[['enabled','启用'],['disabled','禁用']])}${filterButtons()}</form><section class="panel"><div class="table-bar">商户列表<span class="muted">共 ${found.length} 个商户</span></div>${table(['编号','商户名称','商户类型','状态','备注','最后操作人','最后操作时间','操作'],rows)}</section>`;
}
function accountsView(){
  const f=filters.accounts;
  const found=data.accounts.filter(a=>(!f.name||a.name.includes(f.name))&&(!f.merchant||merchantName(a.merchantId).includes(f.merchant))&&(!f.status||a.enabled===(f.status==='enabled')));
  const rows=found.map(a=>`<tr><td class="muted">${a.id}</td><td class="product-name">${esc(a.name)}</td><td>${esc(merchantName(a.merchantId))}</td><td>${statusButton('account',a)}</td><td class="number balance ${a.warning!==null&&a.balance<a.warning?'danger':''}">${money(a.balance)} <span class="muted small">美元</span></td><td>${a.warning===null?'<span class="muted">未设置</span>':money(a.warning)+' 美元'}</td><td class="muted" title="${esc(a.remark)}">${esc(a.remark.slice(0,20)||'—')}</td><td class="muted">${esc(a.time)}</td><td><div class="row-actions">${action('编辑','edit-account',a.id)}${action('余额预警','warning',a.id)}${action('充值','recharge',a.id)}${action('提现','withdraw',a.id)}${action('交易记录','transactions',a.id)}</div></td></tr>`).join('');
  return heading('维护结算账户、余额与预警配置','新增账户','add-account')+`<form class="panel filters" id="filters">${filterInput('name','账户名称',f.name)}${filterInput('merchant','商户名称',f.merchant)}${filterSelect('status','状态',f.status,[['enabled','启用'],['disabled','禁用']])}${filterButtons()}</form><section class="panel"><div class="table-bar">账户列表<span class="muted">金额单位：美元</span></div>${table(['编号','账户名称','所属商户','状态','账户余额','预警值','备注','最后操作时间','操作'],rows)}<div class="pagination">共 ${found.length} 个账户</div></section>`;
}
function openModal(title,body,footer,subtitle='',wide=false){
  const d=$('#modal');$('#modalForm').classList.remove('product-editor');d.classList.toggle('wide',wide);$('#modalTitle').textContent=title;$('#modalSubtitle').textContent=subtitle;$('#modalSubtitle').hidden=!subtitle;$('#modalBody').innerHTML=body;$('#modalFooter').innerHTML=footer;$('#modalForm').onsubmit=e=>e.preventDefault();if(!d.open)d.showModal();$('#modalBody').scrollTop=0;
}
function closeModal(){
  const inline=!!$('#main #modalForm');
  if(inline)$('#modal').append($('#modalForm'));
  $('#modal').close();editor=null;
  if(inline)render();
}
function openProductPage(title,body,buttons,subtitle=''){
  const form=$('#modalForm');form.remove();
  $('#main').innerHTML='';$('#main').append(form);form.classList.add('product-editor');
  $('#modalTitle').textContent=title;$('#modalSubtitle').textContent=subtitle;$('#modalSubtitle').hidden=!subtitle;
  $('#modalBody').innerHTML=body;$('#modalFooter').innerHTML=buttons;
  $('#breadcrumb').textContent='产品管理 / '+title;
  form.onsubmit=ev=>ev.preventDefault();window.scrollTo(0,0);
}

function footer(label='保存',id='save'){return `<button type="button" data-close>取消</button><button class="primary" type="submit" id="${id}">${label}</button>`;}
function field(key,label,value='',type='text',attrs='',help=''){
  const required=attrs.includes('required');
  return `<div class="field-row"><label for="f-${key}" class="${required?'required':''}">${label}</label><div class="field-content"><input id="f-${key}" name="${key}" type="${type}" value="${esc(value)}" ${attrs}>${help?`<div class="help">${help}</div>`:''}</div></div>`;
}
function selectField(key,label,value,opts,attrs=''){return `<div class="field-row"><label for="f-${key}" class="${attrs.includes('required')?'required':''}">${label}</label><div class="field-content"><select id="f-${key}" name="${key}" ${attrs}>${options(opts,value)}</select></div></div>`;}
function textField(key,label,value='',maxlength=1000){return `<div class="field-row"><label for="f-${key}">${label}</label><div class="field-content"><textarea id="f-${key}" name="${key}" maxlength="${maxlength}" placeholder="请输入${label}">${esc(value)}</textarea><div class="help">最多 ${maxlength} 字</div></div></div>`;}
function confirmAction(title,text,run){
  $('#confirmTitle').textContent=title;$('#confirmText').textContent=text;const d=$('#confirmDialog');d.showModal();$('#confirmOk').onclick=()=>{d.close();run();};$('#confirmCancel').onclick=()=>d.close();
}
function appendRecord(p,type,summary,remark='',images=[]){data.records[p.id]??=[];data.records[p.id].unshift({time:now(),type,summary,remark,operator:'运营人员',images:clone(images)});p.time=now();p.user='运营人员';}
const editFields=[['productType','产品类型'],['productImage','产品图片'],['name','产品名称'],['client','展示终端'],['cooperation','合作方式'],['logo','产品图标'],['color','主题颜色'],['minLoan','最低借款额度'],['maxLoan','最高借款额度'],['minTerm','最短借款期限'],['maxTerm','最长借款期限'],['rate','日利率'],['passRate','通过率'],['riskLockDays','风控锁定天数'],['description','产品描述'],['steps','贷款步骤'],['conditions','借款条件'],['repaymentType','还款类型'],['repaymentMethod','还款方式'],['speed','放款速度'],['accountId','结算商户与账户'],['method','结算方式'],['price','结算单价'],['tags','产品标签'],['linkAndroid','安卓产品链接'],['linkIos','苹果产品链接'],['lockOp','拒绝锁定期比较方式'],['lockDays','拒绝锁定期天数'],['fdc','非白名单用户']];
function productFields(p){
  const isReport=p.productType==='credit_report';
  const accounts=data.accounts.filter(a=>a.id===p.accountId||(a.enabled&&data.merchants.some(m=>m.id===a.merchantId&&m.enabled&&m.type==='referral')));
  const section=(title,body,cls='')=>`<section class="product-section ${cls}"><h3>${title}</h3><div class="product-section-body">${body}</div></section>`;
  return '<p class="unsaved-warning">刷新页面后，未保存的数据将丢失，请及时保存。</p><div class="product-sections">'+
  section('基础信息',selectField('productType','产品类型',p.productType||'loan',Object.entries(productTypes),'required')+field('name','产品名称',p.name,'text','required maxlength="100"')+selectField('client','展示终端',p.client,Object.entries(clients),'required')+selectField('cooperation','合作方式',p.cooperation||'h5',[['h5','网页合作']],'required')+['android','ios'].map(client=>`<div data-product-link="${client}" ${p.client===client?'':'hidden'}>${field(client==='android'?'linkAndroid':'linkIos',clients[client]+'产品链接',p[client==='android'?'linkAndroid':'linkIos'],'url',p.client===client?'required':'disabled','以 https:// 开头')}</div>`).join(''))+
  (isReport?section('产品图片',`<div class="field-row"><label class="required">产品图片</label><div class="field-content"><label class="upload report-upload" aria-label="上传产品图片"><span id="productImageBox">${p.productImage?`<img src="${esc(p.productImage)}" alt="产品图片预览">`:'<span class="upload-plus">＋</span>'}</span><input type="file" id="productImageFile" accept="image/png,image/jpeg,image/webp"></label><div class="help">推荐尺寸：340 × 120 像素；支持 PNG、JPG、WebP，尺寸不作强制限制</div></div></div>`,'report-image-section'):section('图标与颜色',`<div class="field-row"><label class="required">产品图标</label><div class="field-content"><label class="upload" aria-label="上传产品图标"><span id="logoBox">${p.logo||editor.id?logo(p):'<span class="upload-plus">＋</span>'}</span><input type="file" id="logoFile" accept="image/png"></label><div class="help">点击上传或更换，支持 PNG，不超过 100 千字节</div></div></div>`+field('color','主题颜色',p.color||'#409eff','color','required'),'brand-section'))+
  (isReport?'':section('额度与期限',field('minLoan','最低借款额度',p.minLoan,'number','min="0" step="1" required','单位：印尼盾')+field('maxLoan','最高借款额度',p.maxLoan,'number','min="1" step="1" required','单位：印尼盾')+field('minTerm','最短借款期限',p.minTerm,'number','min="1" step="1" required','单位：天')+field('maxTerm','最长借款期限',p.maxTerm,'number','min="1" step="1" required','单位：天')+field('rate','日利率',p.rate,'number','min="0" step="0.0001" required','单位：百分比')+field('passRate','通过率',p.passRate??'','number','min="0" max="100" step="0.01" required','单位：百分比')+field('riskLockDays','风控锁定天数',p.riskLockDays??'','number','min="0" step="1" required','单位：天'))+
  section('产品详情',field('description','产品描述',p.description)+field('steps','贷款步骤',p.steps)+field('conditions','借款条件',p.conditions)+field('repaymentType','还款类型',p.repaymentType)+field('repaymentMethod','还款方式',p.repaymentMethod)+field('speed','放款速度',p.speed,'text','required','例如：最快当天')))+
  section('结算配置',selectField('accountId','结算商户与账户',p.accountId||'',[['','请选择'],...accounts.map(a=>[a.id,accountName(a.id)])],'required')+selectField('method','结算方式',p.method||'download',Object.entries(methods),'required')+field('price','结算单价',p.price??'','number','min="0" step="0.0001" required','单位：美元，最多 4 位小数；对应所选展示终端'))+
  (isReport?'':section('产品标签',`<div class="field-row"><label>产品标签</label><div class="field-content"><div id="productTags" class="product-tags"></div><div class="tag-entry"><input id="newProductTag" aria-label="新增标签内容" maxlength="30" placeholder="请输入中文标签"><button type="button" id="addProductTag" class="link">＋ 添加标签</button></div><input type="hidden" name="tags" id="f-tags" value="${esc(p.tags||'')}"></div></div>`,'tags-section'))+
  section('曝光条件',`<div class="field-row"><label for="f-lockDays">拒绝锁定期</label><div class="field-content"><div class="exposure-inputs"><select name="lockOp" aria-label="拒绝锁定期比较方式">${options([['>=','大于等于'],['>','大于'],['<=','小于等于'],['<','小于'],['=','等于']],p.lockOp||'>=')}</select><input id="f-lockDays" type="number" name="lockDays" min="0" step="1" value="${esc(p.lockDays??'')}" placeholder="请输入天数（选填）"><span>天</span></div></div></div><div class="field-row"><label>其他条件</label><div class="field-content"><label class="exposure-check"><input type="checkbox" name="fdc" ${p.fdc?'checked':''}> 非白名单用户</label><div class="help">多个曝光条件同时满足时生效</div></div></div>`,'full-section exposure-section')+'</div>';
}
function bindProductExtras(){
  $('#f-productType').onchange=()=>{Object.assign(editor.draft,readProductFields());if(editor.id)renderEdit();else renderAddProduct();};
  $('#f-client').onchange=ev=>{
    $$('[data-product-link]').forEach(row=>{const active=row.dataset.productLink===ev.target.value;row.hidden=!active;const input=row.querySelector('input');input.disabled=!active;input.required=active;});
  };
  if(editor.draft.productType==='credit_report')return;
  let tags=String(editor.draft.tags||'').split(/[，,]/).map(t=>t.trim()).filter(Boolean);
  const draw=()=>{$('#f-tags').value=tags.join('，');$('#productTags').innerHTML=tags.map((t,i)=>`<span class="product-tag">${esc(t)}<button type="button" data-remove-tag="${i}" aria-label="删除标签 ${esc(t)}">×</button></span>`).join('')||'<span class="muted small">暂无标签</span>';$$('[data-remove-tag]').forEach(b=>b.onclick=()=>{tags.splice(Number(b.dataset.removeTag),1);draw();});};
  const add=()=>{const input=$('#newProductTag'),values=input.value.split(/[，,]/).map(t=>t.trim()).filter(Boolean);if(!values.length){input.focus();return;}tags=[...new Set([...tags,...values])];input.value='';draw();};
  $('#addProductTag').onclick=add;$('#newProductTag').onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();add();}};draw();
  $('#f-color').oninput=ev=>{editor.draft.color=ev.target.value;if(editor.draft.logo||editor.id)$('#logoBox').innerHTML=logo(editor.draft);};
}
function editProduct(id){
  const p=data.products.find(p=>p.id===id);editor={id,original:clone(p),draft:clone(p),remark:'',images:[],step:1};renderEdit();
}
function renderEdit(){
  const e=editor;
  openProductPage('编辑产品','<div class="steps"><span class="selected">① 编辑内容</span><span class="line"></span><span>② 确认变更</span></div>'+productFields(e.draft),footer('下一步'),'产品编号：'+e.id);
  bindLogo();bindProductExtras();$('#modalForm').onsubmit=ev=>{ev.preventDefault();if(!validateProduct())return;Object.assign(e.draft,readProductFields());e.step=2;reviewEdit();};
}
function readProductFields(){
  const fd=new FormData($('#modalForm')),v=Object.fromEntries(fd);
  for(const key of ['linkAndroid','linkIos'])v[key]=$('#f-'+key).value;
  for(const key of ['minLoan','maxLoan','minTerm','maxTerm','passRate','riskLockDays','accountId'])if(key in v)v[key]=Number(v[key]);
  v.name=String(v.name).trim();v.lockDays=v.lockDays===''?null:Number(v.lockDays);v.fdc=fd.has('fdc');return v;
}
function validateProduct(){
  if(!$('#modalForm').reportValidity())return false;
  const p=readProductFields();
  if(!p.name){toast('请输入产品名称',true);return false;}
  if(!p[p.client==='android'?'linkAndroid':'linkIos'].startsWith('https://')){toast('产品链接必须以 https:// 开头',true);return false;}
  if(p.productType==='credit_report'&&!editor.draft.productImage){toast('请上传产品图片',true);return false;}
  if(p.productType!=='credit_report'&&(p.minLoan>p.maxLoan||p.minTerm>p.maxTerm)){toast('最低额度及最短期限不能大于对应的最大值',true);return false;}return true;
}
function bindLogo(){
  if(editor.draft.productType==='credit_report'){
    $('#productImageFile').onchange=async ev=>{const e=editor,file=ev.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('请选择 PNG、JPG 或 WebP 图片',true);ev.target.value='';return;}try{const url=await readFile(file);if(editor!==e)return;e.draft.productImage=url;if($('#productImageBox'))$('#productImageBox').innerHTML=`<img src="${esc(url)}" alt="产品图片预览">`;}catch{toast('图片读取失败，请重新选择',true);}};return;
  }
  $('#logoFile').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;if(file.type!=='image/png'||file.size>100*1024){toast('请选择不超过 100 千字节的 .png 图片',true);ev.target.value='';return;}const e=editor;const url=await readFile(file);if(editor!==e)return;e.draft.logo=url;if($('#logoBox'))$('#logoBox').innerHTML=logo(e.draft);};
}
function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('无法读取图片'));reader.readAsDataURL(file);});}
function valueLabel(key,value){if(key==='productType')return productTypes[value||'loan'];if(key==='accountId')return accountName(value);if(key==='method')return methods[value];if(key==='cooperation')return value==='h5'?'网页合作':value||'—';if(key==='fdc')return value?'是':'否';if(key==='lockOp')return {'>=':'大于等于','>':'大于','<=':'小于等于','<':'小于','=':'等于'}[value]||'—';if(value===undefined||value===null||value==='')return '—';if(key==='client')return clients[value];if(['minLoan','maxLoan'].includes(key))return num(value)+' 印尼盾';if(['minTerm','maxTerm'].includes(key))return value+' 天';if(key==='rate')return Number(value).toFixed(4)+'%';return value;}
function changes(){return editFields.filter(([key])=>!(editor.draft.productType==='credit_report'&&loanFields.includes(key))&&!(editor.draft.productType!=='credit_report'&&key==='productImage')).filter(([key])=>['logo','productImage'].includes(key)?editor.draft[key]!==editor.original[key]:['minLoan','maxLoan','minTerm','maxTerm','rate'].includes(key)?Number(editor.draft[key])!==Number(editor.original[key]):editor.draft[key]!==editor.original[key]);}
function reviewEdit(){
  const e=editor,changed=changes();
  const body='<div class="steps"><span>① 编辑内容</span><span class="line"></span><span class="selected">② 确认变更</span></div>'+(changed.length?table(['变更字段','修改前','修改后'],changed.map(([key,label])=>`<tr><td>${label}</td><td>${key==='productImage'?(e.original.productImage?`<img class="report-review-image" src="${esc(e.original.productImage)}" alt="修改前产品图片">`:'—'):key==='logo'?logo(e.original):esc(valueLabel(key,e.original[key]))}</td><td>${key==='productImage'?(e.draft.productImage?`<img class="report-review-image" src="${esc(e.draft.productImage)}" alt="修改后产品图片">`:'—'):key==='logo'?logo(e.draft):esc(valueLabel(key,e.draft[key]))}</td></tr>`).join(''))+`<div style="height:24px"></div>${textField('remark','变更备注',e.remark)}<div class="field-row"><label>备注图片</label><div class="field-content"><label class="upload" style="width:100%;height:47px">＋ 上传图片<input id="remarkFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div class="help">文字和图片至少填写一项；最多 3 张，每张不超过 5 兆字节</div><div class="thumbs" id="remarkThumbs"></div><div id="remarkError" class="error"></div></div></div>`:'<div class="empty">产品信息未发生变化，无需保存。</div>');
  openProductPage('编辑产品',body,`<button type="button" id="backEdit">上一步</button>${changed.length?'<button type="submit" class="primary">确认保存</button>':''}`,'产品编号：'+e.id);
  $('#backEdit').onclick=()=>{if(changed.length)e.remark=$('#f-remark').value;e.step=1;renderEdit();};
  if(changed.length){
    $('#f-remark').oninput=()=>e.remark=$('#f-remark').value;
    renderRemarkThumbs();$('#remarkFiles').onchange=async ev=>{
      const files=[...ev.target.files];
      if(e.images.length+files.length>3){toast('每次最多上传 3 张备注图片',true);ev.target.value='';return;}
      if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024)){toast('请选择不超过 5 兆字节的静态图片，支持常见照片与网页图片格式',true);ev.target.value='';return;}
      try{const images=await Promise.all(files.map(async f=>({url:await readFile(f),name:f.name})));if(editor!==e)return;e.images.push(...images);renderRemarkThumbs();}catch{toast('图片读取失败，请重新选择',true);}ev.target.value='';
    };
    $('#modalForm').onsubmit=ev=>{ev.preventDefault();e.remark=$('#f-remark').value.trim();if(!e.remark&&!e.images.length){$('#remarkError').textContent='请填写变更备注或上传至少一张图片';return;}if(failure==='save'){toast('保存失败，请重试。已保留本次编辑内容。',true);return;}saveProductEdit();};
  }
}
function renderRemarkThumbs(){const e=editor;$('#remarkThumbs').innerHTML=e.images.map((im,i)=>`<button type="button" data-image-index="${i}" aria-label="预览备注图片 ${i+1}"><img src="${esc(im.url)}" alt="备注图片 ${i+1}"></button>`).join('');$$('[data-image-index]').forEach(b=>b.onclick=()=>previewImage(e.images[Number(b.dataset.imageIndex)],()=>{e.images.splice(Number(b.dataset.imageIndex),1);$('#imageDialog').close();renderRemarkThumbs();}));}
function saveProductEdit(){
  const e=editor,changed=changes(),p=data.products.find(p=>p.id===e.id),previous=clone(data);
  Object.assign(p,e.draft);if(changed.length)appendRecord(p,'编辑产品',changed.map(([k,l])=>`${l}：${k==='productImage'?'产品图片已更换':k==='logo'?'图标已更换':valueLabel(k,e.original[k])+' → '+valueLabel(k,e.draft[k])}`).join('；'),e.remark,e.images);
  if(!persist()){data=previous;return;}closeModal();render();toast('产品已保存');
}
function addProduct(){
  const blank={productType:'loan',productImage:'',name:'',client:'android',minLoan:'',maxLoan:'',minTerm:'',maxTerm:'',rate:'',logo:'',color:'#409eff',glyph:'借',lockDays:null,fdc:false};
  editor={draft:blank};renderAddProduct();
}
function copyProduct(id){
  const source=data.products.find(p=>p.id===id);
  const draft=Object.fromEntries(editFields.filter(([key])=>key in source).map(([key])=>[key,clone(source[key])]));
  draft.productType=source.productType||'loan';draft.name=source.name.slice(0,96)+'（副本）';draft.glyph=source.glyph;
  editor={draft,copySource:id};renderAddProduct();
}
function renderAddProduct(){
  openProductPage(editor.copySource?'复制产品':'新增产品',productFields(editor.draft),footer('新增产品'),editor.copySource?'来源产品编号：'+editor.copySource:'');
  bindLogo();bindProductExtras();$('#modalForm').onsubmit=ev=>{
    ev.preventDefault();if(!validateProduct())return;
    if($('#f-productType').value!=='credit_report'&&!editor.draft.logo&&!(editor.copySource&&editor.draft.glyph)){toast('请上传产品图标',true);return;}
    const p={...editor.draft,...readProductFields(),id:Math.max(0,...data.products.map(p=>p.id))+1,enabled:true,user:'运营人员',time:now()};
    const previous=clone(data);data.products.unshift(p);appendRecord(p,'新增产品',editor.copySource?'复制自产品编号：'+editor.copySource:'创建产品');if(!persist()){data=previous;return;}closeModal();filters.products={name:'',status:'enabled',productType:'',client:'',merchant:''};render();toast('产品已新增');
  };
}
function showDetails(id){
  const p=data.products.find(p=>p.id===id),items=[['产品编号',p.id],['产品名称',p.name],['产品类型',productTypes[p.productType||'loan']],['展示终端',clients[p.client]],['状态',p.enabled?'启用':'禁用'],['借款额度',`${num(p.minLoan)} ～ ${num(p.maxLoan)} 印尼盾`],['借款期限',`${p.minTerm} ～ ${p.maxTerm} 天`],['日利率',Number(p.rate).toFixed(4)+'%'],['结算商户与账户',accountName(p.accountId)],['结算单价',Number(p.price).toFixed(4)+' 美元'],['结算方式',methods[p.method]],['合作方式','网页合作'],['放款速度',p.speed||'—'],['通过率',p.passRate+'%'],['风控锁定天数',p.riskLockDays===undefined?'—':p.riskLockDays+' 天'],['主题颜色',p.color],['安卓产品链接',p.linkAndroid],['苹果产品链接',p.linkIos],['产品描述',p.description||'—'],['贷款步骤',p.steps||'—'],['借款条件',p.conditions||'—'],['还款类型',p.repaymentType||'—'],['还款方式',p.repaymentMethod||'—'],['产品标签',p.tags||'—'],['曝光条件',`${p.lockDays===null?'未设置锁定期条件':`拒绝锁定期 ${{'>=':'大于等于','>':'大于','<=':'小于等于','<':'小于','=':'等于'}[p.lockOp]} ${p.lockDays} 天`}${p.fdc?'；同时为非白名单用户':''}`]];
  openModal('产品详情',`<div style="margin-bottom:24px">${p.productType==='credit_report'&&p.productImage?`<img class="detail-report-image" src="${esc(p.productImage)}" alt="产品图片">`:logo(p)}</div><dl class="detail-grid">${items.filter(([k])=>!(p.client==='android'&&k==='苹果产品链接')&&!(p.client==='ios'&&k==='安卓产品链接')).filter(([k])=>p.productType!=='credit_report'||!['借款额度','借款期限','日利率','放款速度','通过率','风控锁定天数','主题颜色','产品描述','贷款步骤','借款条件','还款类型','还款方式','产品标签'].includes(k)).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`,'<button type="button" data-close>关闭</button>','产品编号：'+id);
}
function records(id){recordId=id;recordPage=1;renderRecords();}
function renderRecords(){
  const p=data.products.find(p=>p.id===recordId),cutoff=dateAgo(90),records=(data.records[recordId]||[]).filter(r=>r.time>=cutoff).sort((a,b)=>b.time.localeCompare(a.time));
  const rows=records.slice((recordPage-1)*10,recordPage*10).map((r,index)=>`<tr><td class="muted number">${esc(r.time).replace(' ','<br>')}</td><td><span class="tag">${esc(r.type)}</span></td><td>${esc(r.operator)}</td><td class="record-summary">${esc(r.summary)}</td><td>${esc(r.remark||'—')}<div class="thumbs">${(r.images||[]).map((im,i)=>`<button type="button" data-record-image="${index}-${i}" aria-label="查看记录备注图片"><img src="${esc(im.url)}" alt="备注图片"></button>`).join('')}</div></td></tr>`).join('');
  openModal('操作记录',failure==='records'?'<div class="error-state">记录加载失败，请重试。<br><button id="retryRecords">重试</button></div>':`<div class="notice">展示近 90 天的产品操作记录，按操作时间倒序排列。</div><div class="table-wrap">${table(['操作时间','操作类型','操作人','变更摘要','备注'],rows)}</div><div class="pagination">共 ${records.length} 条<button id="prevRecord" ${recordPage<=1?'disabled':''}>上一页</button><span>${recordPage}</span><button id="nextRecord" ${recordPage*10>=records.length?'disabled':''}>下一页</button></div>`,'<button type="button" data-close>关闭</button>',`${p.name} · 产品编号：${p.id}`,true);
  if(failure==='records'){$('#retryRecords').onclick=()=>{toast('加载失败，请在原型演示设置中切换为正常场景',true);};return;}
  $('#modalBody table').classList.add('record-table');$('#prevRecord').onclick=()=>{recordPage--;renderRecords();};$('#nextRecord').onclick=()=>{recordPage++;renderRecords();};
  $$('[data-record-image]').forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.recordImage.split('-').map(Number);previewImage(records[(recordPage-1)*10+i].images[j],null,true);});
}
function previewImage(im,remove=null,download=false){
  $('#largeImage').src=im.url;$('#imageFooter').innerHTML=`<button id="imageClose">关闭</button>${remove?'<button class="danger" id="imageRemove">删除图片</button>':''}${download?'<button class="primary" id="imageDownload">下载图片</button>':''}`;$('#imageDialog').showModal();$('#imageClose').onclick=()=>$('#imageDialog').close();if(remove)$('#imageRemove').onclick=remove;if(download)$('#imageDownload').onclick=()=>downloadFile(im.url,im.name||'备注图片.png');
}
function downloadFile(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function addPlacement(){
  const available=data.products.filter(p=>p.enabled&&p.client===placementClient&&!data.placements[position].some(o=>o.id===p.id));
  openModal('添加产品',available.length?available.map(p=>`<label class="check-row"><input name="productIds" type="checkbox" value="${p.id}">${logo(p)}<span>${esc(p.name)}</span><span class="tag">${clients[p.client]}</span></label>`).join(''):'<div class="empty">没有可添加的启用产品</div>',footer('添加所选产品'),`${clients[placementClient]} · ${positions[position]}`);
  $('#modalForm').onsubmit=e=>{e.preventDefault();const ids=new FormData($('#modalForm')).getAll('productIds').map(Number);if(!ids.length){toast('请先选择产品',true);return;}ids.forEach(id=>data.placements[position].push({id,rank:0,listed:false}));persist();closeModal();render();toast('产品已添加，可继续设置排序并上架');};
}
function copyPlacementConfig(client,sourcePosition,targets){
  const previous=clone(data.placements),source=clone(placementItems(sourcePosition,client));
  for(const target of targets){
    if(target===sourcePosition||!Object.hasOwn(positions,target))continue;
    const other=data.placements[target].filter(o=>!data.products.some(p=>p.id===o.id&&p.client===client));
    data.placements[target]=[...other,...clone(source)];
  }
  if(!persist()){data.placements=previous;return false;}return true;
}
function applyPlacements(){
  const client=placementClient,sourcePosition=position,source=placementItems(),targets=Object.keys(positions).filter(key=>key!==sourcePosition);
  openModal('应用到其他页面',`<div class="notice">来源：${clients[client]} · ${positions[sourcePosition]}（${source.length} 个产品）<br>将覆盖所选页面的产品列表、排序值及上下架状态，仅影响${clients[client]}端。${source.length?'':'<br>当前列表为空，应用后将清空所选页面的同端产品。'}</div><div class="section-label">选择目标页面</div>${targets.map(key=>`<label class="check-row"><input type="checkbox" name="targetPositions" value="${key}" checked><span>${positions[key]}</span><span class="muted">当前 ${placementItems(key,client).length} 个产品</span></label>`).join('')}<p class="help">目标页面独有的产品也将移除；另一终端的配置保持不变。</p>`,footer('确认覆盖并应用'),`${clients[client]} · ${positions[sourcePosition]}`);
  $('#modalForm').onsubmit=ev=>{
    ev.preventDefault();const selected=new FormData($('#modalForm')).getAll('targetPositions').filter(key=>targets.includes(key));
    if(!selected.length){toast('请至少选择一个目标页面',true);return;}
    if(!copyPlacementConfig(client,sourcePosition,selected))return;
    closeModal();render();toast(`已应用到${selected.map(key=>positions[key]).join('、')}`);
  };
}
function listing(id){const o=data.placements[position].find(o=>o.id===id),p=data.products.find(p=>p.id===id);if(!o.listed&&!p.enabled){toast('该产品已禁用，请先在产品管理中启用',true);return;}confirmAction(`确认${o.listed?'下架':'上架'}产品？`,`${p.name} · ${clients[p.client]}\n仅影响当前终端的当前页面`,()=>{o.listed=!o.listed;persist();render();toast(o.listed?'已上架':'已下架');});}
function movePlacement(id,direction,targetId){
  const items=sortedPlacements(),i=items.findIndex(o=>o.id===id),j=targetId===undefined?i+direction:items.findIndex(o=>o.id===targetId);
  if(j<0||j>=items.length||i===j)return; if(items[i].listed!==items[j].listed){toast('请在相同上架状态的产品之间调整顺序',true);return;}
  const [item]=items.splice(i,1);items.splice(j,0,item);
  // 演示约定：拖动后为当前状态组重新分配整数排序值；真实算法未核实。
  const group=items.filter(o=>o.listed===item.listed),start=Math.min(9999,Math.max(...group.map(o=>o.rank),group.length));group.forEach((o,index)=>o.rank=start-index);persist();render();toast('排序已更新');
}
function bindDrag(){
  let dragged;
  $$('[data-sort-id]').forEach(row=>{row.ondragstart=e=>{if(e.target.closest('input,button')){e.preventDefault();return;}dragged=Number(row.dataset.sortId);e.dataTransfer.effectAllowed='move';row.classList.add('dragging');};row.ondragend=()=>row.classList.remove('dragging');row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();if(dragged)movePlacement(dragged,0,Number(row.dataset.sortId));};});
  $$('[data-rank-id]').forEach(input=>{
    let dirty=false;
    input.oninput=()=>{dirty=true;};
    const saveRank=()=>{if(!dirty)return;dirty=false;const value=Number(input.value),o=data.placements[position].find(o=>o.id===Number(input.dataset.rankId));if(input.value===''||!Number.isInteger(value)||value<0||value>9999){toast('排序值必须是 0 至 9999 的整数',true);input.value=o.rank;return;}o.rank=value;persist();render();toast('排序值已保存');};
    input.onblur=saveRank;input.onchange=saveRank;
    input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();saveRank();}};
  });
}
function tasks(id){
  const p=data.products.find(p=>p.id===id);let draft=clone(data.tasks[id]||[]);
  function draw(){
    openModal('定时任务',`<div class="notice">为产品配置定时上架与下架时段，可添加多条任务。</div><div id="taskRows">${draft.length?draft.map((t,i)=>`<div class="task"><div class="task-top"><strong class="small">任务 ${i+1}</strong><button type="button" class="link danger" data-remove-task="${i}">删除</button></div><div class="grid-two"><label>执行方式<select data-task-index="${i}" data-key="repeat">${options([['daily','每天循环'],['once','单次执行']],t.repeat)}</select></label><span></span><label>上架时间<input data-task-index="${i}" data-key="start" type="${t.repeat==='daily'?'time':'datetime-local'}" value="${esc(t.start)}" required></label><label>下架时间<input data-task-index="${i}" data-key="end" type="${t.repeat==='daily'?'time':'datetime-local'}" value="${esc(t.end)}" required></label></div></div>`).join(''):'<div class="empty">尚未设置定时任务</div>'}</div><button type="button" id="addTask">＋ 添加任务</button>`,footer('保存任务'),`${p.name} · 产品编号：${id}`);
    $('#addTask').onclick=()=>{draft.push({id:Date.now(),repeat:'daily',start:'09:00',end:'19:00'});draw();};
    $$('[data-remove-task]').forEach(b=>b.onclick=()=>{draft.splice(Number(b.dataset.removeTask),1);draw();});
    $$('[data-task-index]').forEach(el=>el.onchange=()=>{const t=draft[Number(el.dataset.taskIndex)];t[el.dataset.key]=el.value;if(el.dataset.key==='repeat'){t.start='';t.end='';draw();}});
    $('#modalForm').onsubmit=e=>{e.preventDefault();if(!$('#modalForm').reportValidity())return;$$('[data-task-index]').forEach(el=>{draft[Number(el.dataset.taskIndex)][el.dataset.key]=el.value;});if(draft.some(t=>!t.start||!t.end)){toast('请补全上架和下架时间',true);return;}if(draft.some(t=>t.repeat==='once'&&t.end<=t.start)){toast('单次任务的下架时间必须晚于上架时间',true);return;}data.tasks[id]=clone(draft);persist();closeModal();toast('定时任务配置已保存');};
  }draw();
}
function merchantForm(id=null){
  const m=id?data.merchants.find(m=>m.id===id):{name:'',type:'referral',remark:''};
  openModal(id?'编辑商户':'新增商户',field('name','商户名称',m.name,'text','required maxlength="50"')+selectField('type','商户类型',m.type,[['referral','引流商户'],['acquisition','采量商户']],id?'disabled':'required')+textField('remark','备注',m.remark),footer());
  $('#modalForm').onsubmit=e=>{e.preventDefault();if(!$('#modalForm').reportValidity())return;const v=Object.fromEntries(new FormData($('#modalForm')));if(!v.name.trim()){toast('请输入商户名称',true);return;}if(id)Object.assign(m,{name:v.name.trim(),remark:v.remark,user:'运营人员',time:now()});else data.merchants.push({...v,name:v.name.trim(),id:Math.max(0,...data.merchants.map(m=>m.id))+1,enabled:true,user:'运营人员',time:now()});persist();closeModal();render();toast('商户已保存');};
}
function accountForm(id=null){
  const a=id?data.accounts.find(a=>a.id===id):{name:'',merchantId:'',remark:''};
  openModal(id?'编辑账户':'新增账户',field('name','账户名称',a.name,'text','required maxlength="50"')+selectField('merchantId','所属商户',a.merchantId,[['','请选择'],...data.merchants.filter(m=>m.enabled||m.id===a.merchantId).map(m=>[m.id,m.name])],id?'disabled':'required')+textField('remark','备注',a.remark),footer());
  $('#modalForm').onsubmit=e=>{e.preventDefault();if(!$('#modalForm').reportValidity())return;const v=Object.fromEntries(new FormData($('#modalForm')));if(!v.name.trim()){toast('请输入账户名称',true);return;}if(id)Object.assign(a,{name:v.name.trim(),remark:v.remark,user:'运营人员',time:now()});else data.accounts.push({...v,name:v.name.trim(),merchantId:Number(v.merchantId),id:Math.max(0,...data.accounts.map(a=>a.id))+1,enabled:true,balance:0,warning:null,emails:'',user:'运营人员',time:now()});persist();closeModal();render();toast('账户已保存');};
}
function warningForm(id){
  const a=data.accounts.find(a=>a.id===id);
  openModal('余额预警设置',`<div class="notice">余额小于预警值时，向指定邮箱发送提醒。留空表示不设置。</div>`+field('warning','预警值',a.warning??'','number','step="0.01"','单位：美元')+field('emails','通知邮箱',a.emails,'text','','多个邮箱用英文分号分隔'),footer(),a.name);
  $('#modalForm').onsubmit=e=>{e.preventDefault();if(!$('#modalForm').reportValidity())return;const v=Object.fromEntries(new FormData($('#modalForm')));if(v.emails&&v.emails.split(';').some(x=>!/^\S+@\S+\.\S+$/.test(x.trim()))){toast('请检查邮箱格式，多个邮箱用英文分号分隔',true);return;}a.warning=v.warning===''?null:Number(v.warning);a.emails=v.emails.trim();a.time=now();persist();closeModal();render();toast('余额预警配置已保存');};
}
function balanceForm(id,type){
  const a=data.accounts.find(a=>a.id===id);
  openModal(type,`<div class="notice">${esc(a.name)} · 当前余额：${money(a.balance)} 美元</div>`+field('amount',type+'金额','','number','min="0.01" max="9999999.99" step="0.01" required','单位：美元')+textField('remark','备注'),footer('确认'+type));
  $('#modalForm').onsubmit=e=>{e.preventDefault();if(!$('#modalForm').reportValidity())return;const v=Object.fromEntries(new FormData($('#modalForm'))),amount=Number(v.amount);a.balance=Math.round((a.balance+(type==='充值'?amount:-amount))*100)/100;a.time=now();data.transactions.unshift({id:Date.now(),accountId:id,type,amount,remark:v.remark,operator:'运营人员',time:now()});persist();closeModal();render();toast(type+'已完成');};
}
function transactions(id){transactionAccount=id;renderTransactions();}
function renderTransactions(f={type:'',start:'',end:''}){
  const a=data.accounts.find(a=>a.id===transactionAccount),rows=data.transactions.filter(t=>t.accountId===a.id&&(!f.type||t.type===f.type)&&(!f.start||t.time.slice(0,10)>=f.start)&&(!f.end||t.time.slice(0,10)<=f.end)).sort((a,b)=>b.time.localeCompare(a.time));
  openModal('交易记录',`<div class="filters" style="padding:0"><label class="filter">交易类型<select id="txType">${options([['','全部'],['充值','充值'],['提现','提现'],['消耗','消耗']],f.type)}</select></label><label class="filter">开始日期<input type="date" id="txStart" value="${f.start}"></label><label class="filter">结束日期<input type="date" id="txEnd" value="${f.end}"></label><button type="button" id="searchTx" class="primary">查询</button><button type="button" id="exportTx">导出</button></div>${table(['交易时间','账户名称','交易类型','发生金额','操作人','备注'],rows.map(t=>`<tr><td class="muted">${esc(t.time)}</td><td>${esc(a.name)}</td><td>${t.type}</td><td class="number">${t.type==='充值'?'+':'−'}${money(t.amount)} 美元</td><td>${esc(t.operator)}</td><td style="white-space:normal;min-width:160px">${esc(t.remark||'—')}</td></tr>`).join(''))}`,'<button type="button" data-close>关闭</button>',a.name,true);
  $('#searchTx').onclick=()=>{const start=$('#txStart').value,end=$('#txEnd').value;if(start&&end&&start>end){toast('开始日期不能晚于结束日期',true);return;}renderTransactions({type:$('#txType').value,start,end});};
  $('#exportTx').onclick=()=>{const cell=s=>'"'+String(s??'').replace(/^[=+@\-]/,"'$&").replace(/"/g,'""')+'"';const lines=[['交易时间','账户名称','交易类型','发生金额（美元）','操作人','备注'],...rows.map(t=>[t.time,a.name,t.type,(t.type==='充值'?1:-1)*t.amount,t.operator,t.remark])];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(cell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}));downloadFile(url,'交易记录.csv');setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
function toggleEntity(type,id){
  if(type==='product'){
    const p=data.products.find(p=>p.id===id);
    const run=()=>{const before=p.enabled;p.enabled=!p.enabled;Object.values(data.placements).forEach(items=>items.forEach(o=>{if(o.id===id)o.listed=p.enabled;}));appendRecord(p,'状态变更',`状态：${before?'启用':'禁用'} → ${p.enabled?'启用':'禁用'}`);persist();render();toast(p.enabled?'产品已启用，关联位置已上架':'产品已禁用，关联位置已下架');};run();
  }else if(type==='merchant'){
    const m=data.merchants.find(m=>m.id===id);if(m.enabled&&data.accounts.some(a=>a.merchantId===id&&a.balance!==0)){toast('该商户下存在余额不为零的账户，无法禁用',true);return;}
    confirmAction(`确认${m.enabled?'禁用':'启用'}商户？`,m.name,()=>{m.enabled=!m.enabled;m.time=now();persist();render();toast('商户状态已更新');});
  }else{
    const a=data.accounts.find(a=>a.id===id);confirmAction(`确认${a.enabled?'禁用':'启用'}账户？`,a.name,()=>{a.enabled=!a.enabled;a.time=now();persist();render();toast('账户状态已更新');});
  }
}
document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-page]');if(nav){page=nav.dataset.page;render();return;}
  if(e.target.closest('[data-close]')){closeModal();return;}
  const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action,id=Number(b.dataset.id);
  if(act.startsWith('toggle-')){toggleEntity(act.slice(7),id);return;}
  const actions={
    refresh:()=>{render();toast('已刷新');},
    'reset-filters':()=>{filters[page]=page==='products'?{name:'',status:'',productType:'',client:'',merchant:''}:page==='merchants'?{name:'',status:''}:{name:'',merchant:'',status:''};productPage=1;render();},
    'add-product':addProduct,'edit-product':()=>editProduct(id),'copy-product':()=>copyProduct(id),details:()=>showDetails(id),records:()=>records(id),tasks:()=>tasks(id),
    'prev-products':()=>{productPage--;render();},'next-products':()=>{productPage++;render();},
    'logo-preview':()=>{const p=data.products.find(p=>p.id===id);if(p.productType==='credit_report'){if(p.productImage)previewImage({url:p.productImage});return;}if(p.logo)previewImage({url:p.logo});else toast('此演示产品使用文字图标，上传图片后可预览');},
    position:()=>{position=b.dataset.id;render();},'placement-client':()=>{placementClient=b.dataset.id;render();},'apply-placements':applyPlacements,'add-placement':addPlacement,listing:()=>listing(id),
    'remove-placement':()=>{const p=data.products.find(p=>p.id===id);confirmAction('确认从当前展示位置删除？',p.name+'\n产品管理中的产品仍会保留。',()=>{data.placements[position]=data.placements[position].filter(o=>o.id!==id);persist();render();toast('已从当前展示位置删除');});},
    'move-up':()=>movePlacement(id,-1),'move-down':()=>movePlacement(id,1),
    'add-merchant':()=>merchantForm(),'edit-merchant':()=>merchantForm(id),'add-account':()=>accountForm(),'edit-account':()=>accountForm(id),warning:()=>warningForm(id),recharge:()=>balanceForm(id,'充值'),withdraw:()=>balanceForm(id,'提现'),transactions:()=>transactions(id)
  };actions[act]?.();
});
$('#permission').onchange=e=>{permission=e.target.value;render();};$('#failure').onchange=e=>failure=e.target.value;
$('#resetDemo').onclick=()=>confirmAction('恢复全部演示数据？','本地保存的产品、排序、商户、账户、任务与记录将恢复初始值。',()=>{data=seed();persist();filters={products:{name:'',status:'enabled',productType:'',client:'',merchant:''},merchants:{name:'',status:''},accounts:{name:'',merchant:'',status:''}};productPage=1;render();toast('已恢复演示数据');});
$('#closeImage').onclick=()=>$('#imageDialog').close();
for(const d of $$('dialog'))d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){d.close();if(d.id==='modal')editor=null;}});
$('#modal').addEventListener('cancel',()=>editor=null);
render();
