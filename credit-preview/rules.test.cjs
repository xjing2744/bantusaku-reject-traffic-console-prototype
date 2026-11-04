const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('./rules.js');
const state=(patch={})=>({platform:'android',remaining:20,riskRejected:true,inLock:true,fdc:true,enabled:true,stars:0,faults:{},...patch});
const loan={id:1,name:'贷款',productType:'loan',client:'android',enabled:true,listed:true,rank:999,lockOp:'>=',lockDays:15,linkAndroid:'https://example.com/loan'};
const report={id:2,name:'报告',productType:'credit_report',client:'android',enabled:true,listed:true,rank:888,lockOp:'<=',lockDays:60,linkAndroid:'https://example.com/report',productImage:'https://example.com/banner.png'};
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
