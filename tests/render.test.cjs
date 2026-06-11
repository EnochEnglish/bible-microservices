const F=require("fs"),P=require("path");
const D=P.resolve(__dirname,"../frontend");
let p=0,f=0,e=[];const l=console.log.bind(console);
function o(m){p++;l("  OK  "+m);}function x(m){f++;l(" FAIL "+m);}
const el=()=>({className:"",innerHTML:"",textContent:"",children:[],style:{},classList:{add(){},remove(){}},appendChild(c){this.children.push(c);this.innerHTML+=typeof c=="string"?c:c.innerHTML||"";},addEventListener(){},setAttribute(){},getAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],insertBefore(){},cloneNode:()=>el(),remove(){}});
const docEls={};
globalThis.document={createElement:(t)=>{var e=el();if(t==="option"){e.value="";e.text="";e.selected=false;}return e;},getElementById:(id)=>{if(!docEls[id]){docEls[id]=el();docEls[id].id=id;}return docEls[id];},querySelector:()=>null,querySelectorAll:()=>[],documentElement:{style:{}},head:el(),body:el(),createTextNode:t=>t,addEventListener:()=>{}};
globalThis.window=globalThis;
globalThis.window.location={hostname:"localhost",href:"http://localhost:3000/"};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
globalThis.console={log:()=>{},error:(...a)=>{e.push(a.join(" "));},warn:()=>{}};

// REAL fetch - talk to actual services
globalThis.fetch=async(url,opts)=>{
  const u=typeof url=="string"?url:url.url||"";
  try{
    const r=await require("http")?null:null;
    return new Promise((resolve,reject)=>{
      const http=u.startsWith("https")?require("https"):require("http");
      http.get(u,(res)=>{
        let body="";
        res.on("data",c=>body+=c);
        res.on("end",()=>{
          try{resolve({ok:res.statusCode<400,status:res.statusCode,json:async()=>JSON.parse(body)});}
          catch(e){reject(e);}
        });
      }).on("error",reject);
    });
  }catch(e){throw e;}
};
globalThis.AbortSignal={timeout:()=>{}};
globalThis.setTimeout=setTimeout;globalThis.clearTimeout=clearTimeout;

// Load config
eval(F.readFileSync(P.join(D,"js","config.js"),"utf-8"));
o("API_BASE="+(globalThis.API_BASE||"UNDEFINED"));

// Pre-set state
globalThis.state={currentTranslation:"kjv",currentBook:{id:"gen"},currentChapter:1,lang:"zh"};

(async()=>{
l("\n-- RENDER PIPELINE TEST (real APIs) --\n");

// Step 1: Load api.js
var apiCode=F.readFileSync(P.join(D,"js","api.js"),"utf-8");
apiCode=apiCode.replace("class BibleAPI {","globalThis.BibleAPI = class {");
eval(apiCode);
o("api.js loaded");

// Step 2: Fetch REAL translations
try{
var trans=await BibleAPI.getTranslations();
o("getTranslations() = "+(Array.isArray(trans)?trans.length+" items":"NOT ARRAY: "+typeof trans));
if(Array.isArray(trans)&&trans.length>0){
  o("trans[0] = "+JSON.stringify(trans[0]));
  // Fill mock select
  var sel=document.getElementById("translationSelect");
  trans.forEach(function(t){
    var opt=document.createElement("option");
    opt.value=t.id;opt.text=t.name;opt.selected=(t.id==="kjv");
    sel.appendChild(opt);
  });
  o("translationSelect populated: "+sel.children.length+" options");
}else{x("translations empty or not array");}
}catch(e){x("getTranslations FAILED: "+(e.message||e));}

// Step 3: Fetch REAL books for KJV
try{
var booksResp=await BibleAPI.getBooks("kjv");
o("getBooks(kjv) type: "+typeof booksResp);
var books=booksResp.books||booksResp||[];
if(Array.isArray(books)&&books.length>0){
  o("books count: "+books.length);
  o("books[0] = "+JSON.stringify(books[0]).substring(0,80));
  // Fill mock bookList
  var bookList=document.getElementById("bookList");
  books.forEach(function(b){
    var div=document.createElement("div");
    div.textContent=b.name||b.id;
    bookList.appendChild(div);
  });
  o("bookList populated: "+bookList.children.length+" books");
}else{x("books empty or not array");}
}catch(e){x("getBooks FAILED: "+(e.message||e));}

// Step 4: Fetch REAL chapter
try{
var chapData=await BibleAPI.getChapter("kjv","gen","1");
o("getChapter(kjv,gen,1) type: "+typeof chapData);
var verses=chapData.verses||[];
o("verses count: "+verses.length);
if(verses.length>0){
  o("verse[0]: "+JSON.stringify(verses[0]).substring(0,100));
  // Simulate renderVerses
  state.verses=chapData;
  var container=document.getElementById("verseContent");
  var v=state.verses?(state.verses.verses||[]):[];
  v.forEach(function(vs){
    var div=document.createElement("div");
    div.innerHTML="<sup>"+vs.verse+"</sup> "+vs.text;
    container.appendChild(div);
  });
  o("verseContent populated: "+container.children.length+" verses");
}else{x("Chapter has 0 verses!");}
}catch(e){x("getChapter FAILED: "+(e.message||e));}

// Step 5: Test commentary sources
try{
var cmtSrcs=await BibleAPI.getCommentarySources("gen","1");
o("commentary sources: "+JSON.stringify(cmtSrcs));
}catch(e){x("getCommentarySources FAILED: "+(e.message||e));}

l("\n-- Results: "+p+" passed, "+f+" failed --\n");
process.exit(f>0?1:0);
})().catch(e=>{l("\nFATAL: "+(e.message||e)+"\n"+e.stack);process.exit(1);});