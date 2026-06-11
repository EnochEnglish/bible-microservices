const F=require("fs"),P=require("path");
const D=P.resolve(__dirname,"../frontend"),B="http://127.0.0.1:8080/api/v1";
let p=0,f=0,e=[];const l=console.log.bind(console);
function o(m){p++;l("  OK  "+m);}function x(m){f++;l(" FAIL "+m);}
const el=()=>({className:"",innerHTML:"",style:{},classList:{add(){},remove(){}},appendChild(){},addEventListener(){},setAttribute(){},getAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],insertBefore(){},cloneNode:()=>el()});
globalThis.document={createElement:()=>el(),getElementById:()=>el(),querySelector:()=>el(),querySelectorAll:()=>[],documentElement:{style:{}},head:el(),body:el(),createTextNode:t=>t,addEventListener:()=>{}};
globalThis.window=globalThis;
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
globalThis.console={log:()=>{},error:(...a)=>{e.push(a.join(" "));},warn:()=>{}};
globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({translations:[{id:"kjv",name:"KJV"}],verses:[]})});
globalThis.AbortSignal={timeout:()=>{}};
globalThis.setTimeout=setTimeout;globalThis.clearTimeout=clearTimeout;
globalThis.API_BASE=B;globalThis.APP_CONFIG={apiBase:B,mode:"test"};
globalThis.state={currentTranslation:"kjv",currentBook:{id:"gen"},currentChapter:1,lang:"zh"};
(async()=>{
l("\n-- E2E Frontend Init Test --\n");
o("API_BASE="+globalThis.API_BASE);
// eval runs in the async IIFE scope, so functions/var become local
var _c=F.readFileSync(P.join(D,"js","api.js"),"utf-8").replace("class BibleAPI {","globalThis.BibleAPI = class {");eval(_c);
o("api.js loaded");
o(typeof apiGet==="function"?"apiGet() ok":"apiGet MISSING");
eval(F.readFileSync(P.join(D,"js","app.js"),"utf-8"));
o("app.js loaded");
o(typeof t==="function"?"t() I18N ok":"t() MISSING");
if(typeof loadBooks==="function"){try{var r=loadBooks();if(r&&typeof r.then==="function")await r;o("loadBooks() ok");}catch(e){x("loadBooks: "+(e.message||e));}}else x("loadBooks MISSING");
if(typeof loadChapter==="function"){try{var r2=loadChapter();if(r2&&typeof r2.then==="function")await r2;o("loadChapter() ok");}catch(e){x("loadChapter: "+(e.message||e));}}else x("loadChapter MISSING");
if(e.length>0)x("Console errors: "+e.slice(0,3).join(" | "));else o("No console errors");
var a=F.readFileSync(P.join(D,"js","app.js"),"utf-8");
if(a.includes("/api/v1/bible/"))x("app.js has /api/v1/bible/ residue");else o("No /api/v1/bible/ residue in app.js");
var i=F.readFileSync(P.join(D,"js","api.js"),"utf-8");
o(i.includes("function apiGet")?"api.js has apiGet()":"api.js MISSING apiGet()");
l("\n-- Results: "+p+" passed, "+f+" failed --\n");
process.exit(f>0?1:0);
})().catch(e=>{l("\nFATAL: "+(e.message||e));process.exit(1);});