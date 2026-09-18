import fs from 'fs'; import jsdomPkg from 'jsdom'; const { JSDOM }=jsdomPkg;
const lines=fs.readFileSync('artifact_v16.7.html','utf8').split('\n');
const block=lines.slice(10348, 10624).join('\n');
const dom=new JSDOM('<!DOCTYPE html><body><button id="fr-btn"></button><div id="fr-panel" style="display:none"></div></body>');
const win=dom.window, doc=win.document;
const SALES={ 'UP':{'2026_07':40,'2026_06':35,'2026_05':30,'2025_07':12,'2025_06':10,'2025_05':9},
  'DOWN':{'2026_07':6,'2026_06':7,'2026_05':8,'2025_07':50,'2025_06':48,'2025_05':47},
  'GOOD':{'2026_07':20,'2026_06':22,'2026_05':21,'2025_07':19,'2025_06':20,'2025_05':21} };
const LOCKED={sku:{}}; ['2026_07','2026_06','2026_05'].forEach(m=>LOCKED.sku['UP|UK|DTC|'+m]=200);
LOCKED.sku['GOOD|UK|DTC|2026_07']=20; LOCKED.sku['GOOD|UK|DTC|2026_06']=21; LOCKED.sku['GOOD|UK|DTC|2026_05']=21;
const SKUM={ 'UP':{s:'Bag',ti:'A',av:{uk:'d'},inv:{}}, 'DOWN':{s:'Bag',ti:'B',av:{uk:'d'},inv:{}}, 'GOOD':{s:'Bag',ti:'C',av:{uk:'d'},inv:{}} };
const ctx={window:win,document:doc,fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),SKUM,CUR:'UK',CF:'DTC',TODAY:'2026-08-31',CUR_DAYS:{elapsed:16,total:31},CUR_MONTH:'2026_08',LIVE_FC_MONTHS:['2026_08','2026_09','2026_10','2026_11'],lyYearMonths:undefined,LOCKED_FC:LOCKED,calc:()=>({fu:{}}),buildSkuShares:()=>({}),skuMonthlyMap:()=>({}),skuOvGetK:()=>null,skuSales:(s)=>SALES[s]||{},skuWh:()=>'uk',renderMain:()=>{},console};
const api=new Function(...Object.keys(ctx),block+'\nreturn {filterMatch,excComputeMaps};')(...Object.values(ctx));
const M=api.excComputeMaps('UK','DTC');
let pass=0,fail=0; function ok(n,c){ if(c)pass++; else{fail++;console.log('FAIL '+n);} }
ok('yoy UP numeric > 200',   M.yoy['UP']>200);
ok('yoy DOWN numeric < -80', M.yoy['DOWN']<-80);
ok('yoy GOOD ~ small',       Math.abs(M.yoy['GOOD'])<20);
ok('wmape UP high',          M.wmape['UP']>400);
ok('wmape GOOD low',         M.wmape['GOOD']<10);
ok('bias UP over(+)',        M.bias['UP']>400);
ok('values are numbers',     typeof M.yoy['UP']==='number' && typeof M.wmape['UP']==='number');
const rule=cs=>({def:{conditions:cs}});
ok('yoy gte20 -> UP',   api.filterMatch('UP','UK','DTC',rule([{field:'trend.yoy',op:'gte',value:20}]),M)===true);
ok('yoy gte20 !-> DOWN',api.filterMatch('DOWN','UK','DTC',rule([{field:'trend.yoy',op:'gte',value:20}]),M)===false);
ok('yoy lte-20 -> DOWN', api.filterMatch('DOWN','UK','DTC',rule([{field:'trend.yoy',op:'lte',value:-20}]),M)===true);
ok('yoy between -20..20 -> GOOD', api.filterMatch('GOOD','UK','DTC',rule([{field:'trend.yoy',op:'between',value:[-20,20]}]),M)===true);
ok('yoy between -20..20 !-> UP',  api.filterMatch('UP','UK','DTC',rule([{field:'trend.yoy',op:'between',value:[-20,20]}]),M)===false);
ok('wmape gte60 -> UP',  api.filterMatch('UP','UK','DTC',rule([{field:'trend.wmape',op:'gte',value:60}]),M)===true);
ok('wmape gte60 !-> GOOD',api.filterMatch('GOOD','UK','DTC',rule([{field:'trend.wmape',op:'gte',value:60}]),M)===false);
ok('AND yoy+wmape -> UP', api.filterMatch('UP','UK','DTC',rule([{field:'trend.yoy',op:'gte',value:20},{field:'trend.wmape',op:'gte',value:60}]),M)===true);
ok('missing value -> excluded', api.filterMatch('GOOD','UK','DTC',rule([{field:'trend.bias',op:'gte',value:20}]),M)===(M.bias['GOOD']>=20));
console.log('RESULT pass='+pass+' fail='+fail); process.exit(fail?1:0);
