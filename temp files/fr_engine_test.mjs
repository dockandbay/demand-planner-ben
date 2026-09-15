import fs from 'fs'; import jsdomPkg from 'jsdom'; const { JSDOM }=jsdomPkg;
const lines=fs.readFileSync('artifact_v16.7.html','utf8').split('\n');
const block=lines.slice(10348, 10624).join('\n');
const dom=new JSDOM('<!DOCTYPE html><body><button id="fr-btn"></button><div id="fr-panel" style="display:none"></div></body>');
const win=dom.window, doc=win.document;
const SKUM={
  'A-RED':{c:'Towel',s:'Towel - Beach',ti:'A',cs:'C',rw:'SS27',rep:false,av:{uk:'d'},inv:{}},
  'C-BLU':{c:'Bag',s:'Bag - Beach',ti:'C',cs:'S',rw:'AW26',rep:true,av:{uk:'d'},inv:{}},
};
const ctx={window:win,document:doc,fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),SKUM,CUR:'UK',CF:'DTC',TODAY:'2026-08-31',CUR_DAYS:{elapsed:16,total:31},CUR_MONTH:'2026_08',LIVE_FC_MONTHS:['2026_08','2026_09','2026_10','2026_11'],calc:()=>({fu:{}}),buildSkuShares:()=>({}),skuMonthlyMap:()=>({}),skuOvGetK:()=>null,skuSales:()=>({}),skuWh:()=>'uk',renderMain:function(){ctx.__r=(ctx.__r||0)+1;},console,__r:0};
const api=new Function(...Object.keys(ctx),block+'\nreturn {filterMatch,FILTER_FIELDS,_filterFieldDef,FR,get FR_ACTIVE(){return FR_ACTIVE;}};')(...Object.values(ctx));
let pass=0,fail=0; function ok(n,c){ if(c)pass++; else{fail++;console.log('FAIL '+n);} }
const M={fclt:{},fgtr:{}}; // attribute tests don't need maps
// --- attribute evaluator ---
ok('tier in A', api.filterMatch('A-RED','UK','DTC',{def:{conditions:[{field:'tier',op:'in',value:['A']}]}},M)===true);
ok('tier in A rej C', api.filterMatch('C-BLU','UK','DTC',{def:{conditions:[{field:'tier',op:'in',value:['A']}]}},M)===false);
ok('cat not_in Bag rej', api.filterMatch('C-BLU','UK','DTC',{def:{conditions:[{field:'category',op:'not_in',value:['Bag']}]}},M)===false);
ok('from_replacement yes', api.filterMatch('C-BLU','UK','DTC',{def:{conditions:[{field:'from_replacement',op:'is',value:['yes']}]}},M)===true);
ok('release SS27', api.filterMatch('A-RED','UK','DTC',{def:{conditions:[{field:'release_window',op:'in',value:['SS27']}]}},M)===true);
ok('empty conditions = all', api.filterMatch('A-RED','UK','DTC',{def:{conditions:[]}},M)===true);
// --- registry: metrics are numeric now ---
ok('fgtr is num type', api._filterFieldDef('metric.fgtr').type==='num');
ok('yoy is num type', api._filterFieldDef('trend.yoy').type==='num');
ok('fgtr has presets', api._filterFieldDef('metric.fgtr').presets.length>=2);
// --- builder UI: please-select, num field, presets, apply ---
api.FR.add();
ok('opens unselected', doc.querySelector('#fr-conds .fr-rule .fr-field').value==='');
const sel=doc.querySelector('#fr-conds .fr-rule .fr-field'); sel.value='metric.fgtr'; api.FR.fieldChange(0);
ok('num editor: operator select', !!doc.querySelector('#fr-conds .fr-rule .fr-op'));
ok('num editor: number input default 50', doc.querySelector('#fr-conds .fr-rule .fr-num1').value==='50');
ok('num editor: preset buttons', doc.querySelectorAll('#fr-conds .fr-rule button[onclick^="FR.preset"]').length>=2);
// pick the Amber preset (index 1 = between [25,50])
api.FR.preset(0,1);
ok('preset -> between shows 2 inputs', doc.querySelectorAll('#fr-conds .fr-rule .fr-num1, #fr-conds .fr-rule .fr-num2').length===2);
ok('preset op = between (op select value)', doc.querySelector('#fr-conds .fr-rule .fr-op').value==='between');
// switch back to gte, set 40, name + apply
doc.querySelector('#fr-conds .fr-rule .fr-op').value='gte'; api.FR.opChange(0);
doc.querySelector('#fr-conds .fr-rule .fr-num1').value='40';
doc.getElementById('fr-name').value='over-fc';
const before=ctx.__r; api.FR.apply();
const cond=api.FR_ACTIVE && api.FR_ACTIVE.def.conditions[0];
ok('apply set FR_ACTIVE', !!api.FR_ACTIVE);
ok('apply captured field', cond && cond.field==='metric.fgtr');
ok('apply captured op gte', cond && cond.op==='gte');
ok('apply captured value 40', cond && cond.value===40);
ok('apply called renderMain', ctx.__r===before+1);
// evaluator honours the captured numeric threshold
const M2={fgtr:{'A-RED':55,'C-BLU':10}};
ok('fgtr>=40 -> A-RED(55)', api.filterMatch('A-RED','UK','DTC',api.FR_ACTIVE,M2)===true);
ok('fgtr>=40 !-> C-BLU(10)', api.filterMatch('C-BLU','UK','DTC',api.FR_ACTIVE,M2)===false);
api.FR.clear(); ok('clear resets', !api.FR_ACTIVE);
console.log('RESULT pass='+pass+' fail='+fail); process.exit(fail?1:0);
