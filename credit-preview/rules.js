(function(root){
  const DAY=86400000;
  const compare=(value,op,target)=>({'>=':value>=target,'>':value>target,'<=':value<=target,'<':value<target,'=':value===target})[op]??false;
  const link=(p,platform)=>p[platform==='ios'?'linkIos':'linkAndroid']||'';
  const validLink=value=>{if(typeof value!=='string'||!/^https:\/\/\S+$/i.test(value))return false;try{const url=new URL(value);return url.protocol==='https:'&&!!url.hostname;}catch{return false;}};
  const blocked=(s)=>!!(s.faults?.shared||s.faults?.[s.platform]);
  function evaluate(s,products){
    if(s.entry==='review'&&products.filter(p=>p.client===s.platform&&p.listed&&p.productType==='credit_report').length>1)throw new Error('申请中首页同一终端最多上架一个信用报告产品');
    const shown=products.filter(p=>{
      if(!p.enabled||!p.listed||p.client!==s.platform)return false;
      if(!s.riskRejected||!s.inLock)return false;
      if(p.lockDays!==null&&p.lockDays!==undefined&&p.lockDays!==''){
        if(!Number.isFinite(s.remaining)||!compare(s.remaining,p.lockOp||'>=',Number(p.lockDays)))return false;
      }
      if(p.fdc&&!s.fdc)return false;
      if(p.productType==='credit_report'&&(!s.enabled||blocked(s)||p.imageFailed||!validLink(link(p,s.platform))))return false;
      return true;
    }).sort((a,b)=>Number(a.rank)-Number(b.rank));
    return {products:shown,layout:layout(shown)};
  }
  function layout(products){return products.length===1&&products[0].productType==='credit_report'?'single-report':products.length?'list':'none';}
  function validateConfig(config){
    if(config?.format!=='reject-console-demo-v1'||!Array.isArray(config.products)||!config.placements)throw new Error('请选择控台导出的配置文件');
    const ids=new Set();
    for(const p of config.products){
      if(!Number.isInteger(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name)throw new Error('产品编号或名称无效');
      ids.add(p.id);
      if(!['android','ios'].includes(p.client)||!['loan','credit_report'].includes(p.productType))throw new Error('产品终端或类型无效');
      if(p.lockDays!==null&&p.lockDays!==undefined&&(!Number.isInteger(p.lockDays)||p.lockDays<0||!['>=','>','<=','<','='].includes(p.lockOp)))throw new Error('曝光条件无效');
      if(!validLink(link(p,p.client)))throw new Error('所选终端链接须为有效 HTTPS 地址');
      if(p.productType==='credit_report'&&!/^data:image\/(png|jpeg|webp);base64,|^https:\/\//.test(p.productImage||''))throw new Error('信用报告缺少有效图片');
    }
    for(const client of ['android','ios']){
      if(config.placements.applying?.filter(o=>o.listed&&config.products.some(p=>p.id===o.id&&p.client===client&&p.productType==='credit_report')).length>1)throw new Error('申请中首页同一终端最多上架一个信用报告产品');
    }
    for(const key of ['applying','submitted','locked']){
      if(!Array.isArray(config.placements[key]))throw new Error('缺少页面上架配置');
      const seen=new Set();
      for(const item of config.placements[key]){if(!ids.has(item.id)||seen.has(item.id)||typeof item.listed!=='boolean'||!Number.isInteger(item.rank)||item.rank<0||item.rank>9999)throw new Error('上架配置无效');seen.add(item.id);}
    }
  }
  const api={DAY,evaluate,layout,link,validLink,validateConfig};
  if(typeof module!=='undefined')module.exports=api;else root.CreditRules=api;
})(globalThis);
