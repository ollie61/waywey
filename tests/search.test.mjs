import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const s=await load("js/search.js");

const official={en:"Urology",fr:"Urologie",p:"E",loc:"E-959",aliases:["prostate clinic"],status:"official"};
const verify={en:"Urology legacy location",fr:"Ancien emplacement urologie",p:"E",loc:"E-941",aliases:["urology old"],status:"verify"};

test("normalizes accents without damaging multilingual scripts",()=>{
  assert.equal(s.norm("Hôpital général"),"hopital general");
  assert.equal(s.norm("נוירולוגיה"),"נוירולוגיה");
  assert.equal(s.norm("أعصاب"),s.norm("أعصاب"));
});

test("exact canonical name ranks strongly",()=>{
  assert.ok(s.score(official,"urology")>=130);
});

test("exact aliases are first-class search terms",()=>{
  assert.ok(s.score(official,"prostate clinic")>=125);
});

test("room numbers match with or without punctuation",()=>{
  assert.ok(s.score(official,"E-959")>=150);
  assert.ok(s.score(official,"E959")>=150);
});

test("conservative fuzzy matching tolerates common typos",()=>{
  assert.ok(s.score(official,"urolgy")>0);
  assert.equal(s.score(official,"xyz"),0);
});

test("official status breaks otherwise-equivalent ties",()=>{
  const a={...official,en:"Cardiology",loc:"",aliases:[]};
  const b={...a,status:"verify"};
  assert.ok(s.score(a,"cardiology")>s.score(b,"cardiology"));
});

test("strong Verify match still beats unrelated official fuzzy result",()=>{
  const exactVerify={en:"Neurology",p:"A",loc:"A-1",aliases:[],status:"verify"};
  const fuzzyOfficial={en:"Neurological Lab",p:"B",loc:"B-1",aliases:[],status:"official"};
  assert.ok(s.score(exactVerify,"neurology")>s.score(fuzzyOfficial,"neurology"));
});

test("rankResults is stable for equal scores",()=>{
  const a={en:"Alpha Clinic",p:"A",loc:"",aliases:[],status:"official"};
  const b={en:"Alpha Service",p:"B",loc:"",aliases:[],status:"official"};
  const ranked=s.rankResults([a,b],"alpha",12);
  assert.equal(ranked[0][0],a);
  assert.equal(ranked[1][0],b);
});

test("query language detection preserves Hebrew Arabic and English behaviour",()=>{
  assert.equal(s.inferQueryLanguage("נוירולוגיה",{},["he","en","ar"],"en"),"he");
  assert.equal(s.inferQueryLanguage("أعصاب",{},["he","en","ar"],"he"),"ar");
  assert.equal(s.inferQueryLanguage("neurology",{},["he","en","ar"],"he"),"en");
});
