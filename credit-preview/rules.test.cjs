const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('./rules.js');
const state=(patch={})=>({platform:'android',remaining:20,riskRejected:true,inLock:true,fdc:true,enabled:true,stars:0,faults:{},...patch});
const loan={id:1,name:'贷款',productType:'loan',client:'android',enabled:true,listed:true,rank:1,lockOp:'>=',lockDays:15,linkAndroid:'https://example.com/loan'};
const report={id:2,name:'报告',productType:'credit_report',client:'android',enabled:true,listed:true,rank:2,lockOp:'<=',lockDays:60,linkAndroid:'https://example.com/report',productImage:'https://example.com/banner.png'};
test('配置区间可重叠，信用报告可展示给剩余40天用户，无固定30天隔离',()=>{
 for(const remaining of [20,30,40,60])assert.deepEqual(R.evaluate(state({remaining}),[report,loan]).products.map(p=>p.id),[1,2]);
 assert.deepEqual(R.evaluate(state({remaining:61}),[report,loan]).products.map(p=>p.id),[1]);
});
test('三个入口不受五星评价门槛影响',()=>{
 for(const entry of ['lock','review','success'])for(const stars of [0,4,5])assert.equal(R.evaluate(state({entry,stars}),[report]).layout,'single-report');
});
test('仅总列表一个信用报告用旧样式，混排与多个信用报告用列表',()=>{
 assert.equal(R.layout([report]),'single-report');assert.equal(R.layout([loan,report]),'list');assert.equal(R.layout([report,{...report,id:3}]),'list');assert.equal(R.layout([loan]),'list');assert.equal(R.layout([]),'none');
});
test('故障与展示开关仅过滤信用报告，贷款不受影响；单端隔离',()=>{
 for(const patch of [{enabled:false},{faults:{shared:true}},{faults:{android:true}}])assert.deepEqual(R.evaluate(state(patch),[loan,report]).products.map(p=>p.id),[1]);
 assert.equal(R.evaluate(state({faults:{ios:true}}),[report]).products.length,1);
});
test('终端、产品启用、位置上下架与AND曝光条件生效',()=>{
 for(const patch of [{client:'ios'},{enabled:false},{listed:false},{fdc:true,lockOp:'<',lockDays:20}])assert.equal(R.evaluate(state(),[{...report,...patch}]).products.length,0);
 assert.equal(R.evaluate(state({fdc:false}),[{...report,fdc:true}]).products.length,0);
});
test('配置导入拒绝错配位置、重复编号、不安全链接及非图片素材',()=>{
 const config={format:'reject-console-demo-v1',products:[loan,report],placements:{applying:[],submitted:[],locked:[{id:2,listed:true,rank:0}]}};
 assert.doesNotThrow(()=>R.validateConfig(config));
 for(const patch of [{products:[loan,loan]},{products:[{...report,productImage:'javascript:alert(1)'}]},{products:[{...loan,linkAndroid:'http://example.com'}]},{placements:{applying:[],submitted:[],locked:[{id:999,listed:true,rank:0}]}}])assert.throws(()=>R.validateConfig({...config,...patch}));
});
test('申请中首页每端最多上架一个报告，校验上架状态且不按用户曝光结果放宽',()=>{
 const second={...report,id:3,lockDays:1};
 assert.throws(()=>R.evaluate(state({entry:'review'}),[report,second]),/最多上架一个/);
 assert.doesNotThrow(()=>R.evaluate(state({entry:'review'}),[report,{...second,listed:false}]));
 const config={format:'reject-console-demo-v1',products:[loan,report,second],placements:{applying:[{id:2,listed:true,rank:0},{id:3,listed:true,rank:9999}],submitted:[],locked:[]}};
 assert.throws(()=>R.validateConfig(config),/最多上架一个/);
 assert.doesNotThrow(()=>R.validateConfig({...config,placements:{...config.placements,applying:[],submitted:config.placements.applying}}));
 assert.doesNotThrow(()=>R.validateConfig({...config,products:[loan,report,{...second,client:'ios',linkIos:'https://example.com/ios'}]}));
});
test('申请中首页报告固定在顶部且不在贷款列表重复；排序变化与故障过滤',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(__dirname+'/app.js','utf8');
 const audit=source.slice(source.indexOf('function auditPage()'),source.indexOf('function successPage()'));
 const context={s:state({entry:'review'}),R,renderedProducts:()=>[],header:()=>'',overview:on=>on?'TOP_REPORT':'POINTS',productList:items=>'LIST:'+items.map(p=>p.id).join(','),privacy:()=>'',bottom:()=>'',btn:()=>''};
 vm.createContext(context);vm.runInContext(audit,context);
 for(const rank of [0,9999]){
  context.renderedProducts=()=>R.evaluate(context.s,[{...report,rank},loan]).products;
  const html=context.auditPage();assert.equal((html.match(/TOP_REPORT/g)||[]).length,1);assert.ok(html.indexOf('TOP_REPORT')<html.indexOf('order-card'));assert.ok(html.includes('LIST:1'));assert.ok(!html.includes('LIST:2'));
 }
 context.s.faults={shared:true};assert.ok(context.auditPage().includes('POINTS'));assert.ok(context.auditPage().includes('LIST:1'));
});
test('控台上架、启用、跨页覆盖均拦截申请中首页第二个报告',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
 const pick=(start,end)=>src.slice(src.indexOf('function '+start+'('),src.indexOf('function '+end+'('));
 const data={products:[{...report,id:2},{...report,id:3,enabled:false}],placements:{applying:[{id:2,listed:true,rank:0},{id:3,listed:false,rank:9999}],submitted:[{id:2,listed:true,rank:0},{id:3,listed:true,rank:9999}],locked:[]}};
 const c={data,position:'applying',clone:structuredClone,positions:{applying:'申请中',submitted:'提交',locked:'锁定'},toast:()=>{},confirmAction:(_a,_b,run)=>run(),persist:()=>true,render:()=>{},appendRecord:()=>{},clients:{android:'安卓'},placementItems:(pos)=>data.placements[pos]};vm.createContext(c);
 vm.runInContext(pick('applyingConflict','listing')+pick('listing','movePlacement')+pick('copyPlacementConfig','applyPlacements')+src.slice(src.indexOf('function toggleEntity('),src.indexOf("document.addEventListener('click'")),c);
 c.listing(3);assert.equal(data.placements.applying[1].listed,false);
 c.toggleEntity('product',3);assert.equal(data.products[1].enabled,false);
 assert.equal(c.copyPlacementConfig('android','submitted',['applying']),false);assert.equal(data.placements.applying[1].listed,false);
});
test('添加页面产品继承启用状态、排序999，并在添加时校验报告数量',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
 const code=src.slice(src.indexOf('function addPlacement(){'),src.indexOf('function copyPlacementConfig('))+src.slice(src.indexOf('function applyingConflict('),src.indexOf('function listing('));
 const form={},data={products:[{...loan,id:1,enabled:true},{...loan,id:2,enabled:false},{...report,id:3},{...report,id:4}],placements:{applying:[]}};
 let chosen=['1','2'];const c={data,position:'applying',placementClient:'android',clients:{android:'安卓'},positions:{applying:'申请中'},$:()=>form,FormData:class{getAll(){return chosen;}},logo:()=>'',esc:String,footer:()=>'',openModal:(_a,html)=>c.html=html,toast:()=>{},persist:()=>true,closeModal:()=>{},render:()=>{}};
 vm.createContext(c);vm.runInContext(code,c);c.addPlacement();assert.ok(c.html.includes('禁用 · 添加后未上架'));form.onsubmit({preventDefault(){}});
 assert.deepEqual(JSON.parse(JSON.stringify(data.placements.applying)),[{id:1,rank:999,listed:true},{id:2,rank:999,listed:false}]);
 chosen=['3','4'];c.addPlacement();form.onsubmit({preventDefault(){}});assert.equal(data.placements.applying.length,2);
 chosen=['3'];c.addPlacement();form.onsubmit({preventDefault(){}});assert.equal(data.placements.applying[2].listed,true);assert.equal(data.placements.applying[2].rank,999);
 chosen=['4'];c.addPlacement();form.onsubmit({preventDefault(){}});assert.equal(data.placements.applying.length,3);
});
test('页面开关独立于产品状态，产品开关联动所有位置，展示要求两者开启',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
 const data={products:[{...loan,enabled:false}],placements:{applying:[{id:1,listed:false}],submitted:[{id:1,listed:true}],locked:[{id:1,listed:false}]}};
 const c={data,position:'applying',clients:{android:'安卓'},toast:()=>{},confirmAction:(_a,_b,run)=>run(),persist:()=>true,render:()=>{},appendRecord:()=>{}};vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function applyingConflict('),src.indexOf('function movePlacement('))+src.slice(src.indexOf('function toggleEntity('),src.indexOf("document.addEventListener('click'")),c);
 c.listing(1);assert.equal(data.placements.applying[0].listed,true);assert.equal(data.products[0].enabled,false);
 const shown=()=>R.evaluate(state(),[{...data.products[0],...data.placements.applying[0]}]).products.length;
 assert.equal(shown(),0);
 c.toggleEntity('product',1);assert.equal(data.products[0].enabled,true);for(const items of Object.values(data.placements))assert.equal(items[0].listed,true);assert.equal(shown(),1);
 c.listing(1);assert.equal(shown(),0);assert.equal(data.products[0].enabled,true);assert.equal(data.placements.submitted[0].listed,true);
 c.toggleEntity('product',1);for(const items of Object.values(data.placements))assert.equal(items[0].listed,false);
});
test('图片加载失败仅隐藏对应报告，贷款与其他报告保留，按剩余数量选样式',()=>{
 const other={...report,id:3,rank:3};
 const failed={...report,imageFailed:true};
 assert.deepEqual(R.evaluate(state(),[failed,loan,other]).products.map(p=>p.id),[1,3]);
 assert.equal(R.evaluate(state(),[failed,other]).layout,'single-report');
 assert.equal(R.evaluate(state(),[failed]).layout,'none');
 assert.deepEqual(R.evaluate(state({entry:'review'}),[failed,loan]).products.map(p=>p.id),[1]);
});
test('原型图片失败按产品与素材记录，重复失败不循环刷新且重新进入清除',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/app.js','utf8');
 let draws=0;const c={failedReportImages:new Set(),imageKey:p=>JSON.stringify([p.client,p.id,p.productImage]),view:'app',draw:()=>draws++,rawProducts:()=>[report],R,s:state(),staleProducts:null,modal:'',activeProduct:null,returnScroll:0,pageCycle:1};vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function result(){'),src.indexOf('function formatAmount('))+src.slice(src.indexOf('function resetView(){'),src.indexOf('function exitH5(')),c);
 c.failReportImage(report);assert.equal(draws,1);assert.equal(c.result().products.length,0);
 c.failReportImage(report);assert.equal(draws,1);
 c.rawProducts=()=>[{...report,productImage:'https://example.com/replaced.png'}];assert.equal(c.result().products.length,1);
 c.resetView();assert.equal(c.failedReportImages.size,0);
});
test('报告当前终端链接为空或无效时隐藏该产品，不借用另一终端链接',()=>{
 for(const linkAndroid of ['',null,undefined,'   ','https://','https://bad host/report','http://example.com/report','javascript:alert(1)','example.com/report']){
  const bad={...report,linkAndroid,linkIos:'https://example.com/ios'};
  assert.deepEqual(R.evaluate(state(),[loan,bad]).products.map(p=>p.id),[1]);
  assert.equal(R.evaluate(state(),[bad]).layout,'none');
 }
 const ios={...report,client:'ios',linkAndroid:'https://example.com/android',linkIos:''};
 assert.equal(R.evaluate(state({platform:'ios'}),[ios]).products.length,0);
 assert.equal(R.evaluate(state(),[{...report,linkAndroid:'https://example.com/report?channel=bt'}]).products.length,1);
});
test('复制权限独立于编辑，并在复制表单提交时重新校验',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
 const form={};let opens=0,validations=0;const c={permission:'edit',toast:()=>{},data:{products:[{...report}]},editFields:[['name'],['productType']],clone:structuredClone,editor:null,$:()=>form,openProductPage:()=>opens++,productFields:()=>'',footer:()=>'',bindLogo:()=>{},bindProductExtras:()=>{},validateProduct:()=>{validations++;return false;}};
 vm.createContext(c);vm.runInContext(src.match(/function canCopyProduct\(\)\{[^\n]+/)[0]+src.slice(src.indexOf('function copyProduct('),src.indexOf('function showDetails(')),c);
 c.copyProduct(2);assert.equal(opens,0);assert.equal(c.editor,null);
 c.permission='copy';c.copyProduct(2);assert.equal(opens,1);assert.equal(c.editor.copySource,2);
 c.permission='read';form.onsubmit({preventDefault(){}});assert.equal(validations,0);
 c.permission='copy';form.onsubmit({preventDefault(){}});assert.equal(validations,1);
});
test('已有产品提交时禁止改变类型，历史未标类型产品仍按贷款维护',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(__dirname+'/../app.js','utf8');
 const code=src.slice(src.indexOf('function saveProductEdit(){'),src.indexOf('function addProduct(){'));
 const original={id:1,name:'原贷款',productType:'loan'};let saves=0;
 const c={data:{products:[original]},editor:{id:1,draft:{name:'新名称',productType:'credit_report'}},changes:()=>[],clone:structuredClone,toast:()=>{},persist:()=>{saves++;return true;},closeModal:()=>{},render:()=>{}};
 vm.createContext(c);vm.runInContext(code,c);c.saveProductEdit();assert.equal(original.productType,'loan');assert.equal(original.name,'原贷款');assert.equal(saves,0);
 c.editor.draft={name:'新名称',productType:'loan'};c.saveProductEdit();assert.equal(original.name,'新名称');assert.equal(saves,1);
 delete original.productType;c.editor.draft={name:'历史贷款',productType:'loan'};c.saveProductEdit();assert.equal(original.productType,'loan');assert.equal(saves,2);
});
