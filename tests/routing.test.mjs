import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function load(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}
const r=await load("js/routing.js");

test("findRoute returns the shortest validated graph path",()=>{
  const graph={A:["B","D"],B:["A","C"],C:["B","D"],D:["A","C"]};
  assert.deepEqual(r.findRoute(graph,"A","C"),["A","B","C"]);
});

test("findRoute returns null when no validated route exists",()=>{
  const graph={A:["B"],B:["A"],C:[]};
  assert.equal(r.findRoute(graph,"A","C"),null);
});

test("findRoute handles same-node routes",()=>{
  assert.deepEqual(r.findRoute({A:[]},"A","A"),["A"]);
});

test("resolveTargetNode respects explicit aliases",()=>{
  const graph={A:[],B:[]};
  assert.equal(r.resolveTargetNode({p:"MAIN"},{nodeAliases:{MAIN:"A"}},graph),"A");
});

test("resolveTargetNode respects explicit null aliases",()=>{
  const graph={A:[]};
  assert.equal(r.resolveTargetNode({p:"OFF"},{nodeAliases:{OFF:null}},graph),null);
});

test("resolveTargetNode can resolve a slash-separated mapped pavilion",()=>{
  const graph={A:[],B:[]};
  assert.equal(r.resolveTargetNode({p:"X/B"},{nodeAliases:{}},graph),"B");
});

test("resolveTargetNode never invents an unknown graph node",()=>{
  assert.equal(r.resolveTargetNode({p:"UNKNOWN"},{nodeAliases:{}},{A:[]}),null);
});

test('documented connector instructions compose only along complete directed paths',()=>{
  const edges={'A>B':{en:['Floor 1 from A to B']},'B>C':{en:['Basement from B to C']}};
  assert.deepEqual(r.routeInstructions(['A','B','C'],edges,'en'),['Floor 1 from A to B','Basement from B to C']);
  assert.equal(r.routeInstructions(['A','B','C'],edges,'fr'),null);
  assert.equal(r.routeInstructions(['C','B','A'],edges,'en'),null);
  assert.equal(r.routeInstructions(['A','B','D'],edges,'en'),null);
  assert.equal(r.routeInstructions(['A'],edges,'en'),null);
});

test('unknown endpoints and aliases cannot create a validated route',()=>{
  const graph={A:['missing'],B:[]};
  assert.equal(r.findRoute(graph,'missing','missing'),null);
  assert.equal(r.findRoute(graph,'A','missing'),null);
  assert.equal(r.findRoute(graph,'toString','A'),null);
  assert.equal(r.resolveTargetNode({p:'X'},{nodeAliases:{X:'missing'}},graph),null);
  assert.equal(r.resolveTargetNode({p:'toString'},{},graph),null);
  assert.equal(r.resolveTargetNode({p:'OFF/MAIN'},{nodeAliases:{OFF:null,MAIN:'B'}},graph),'B');
});

test('one untranslated connector falls back for the entire path',()=>{
  const edges={'A>B':{fr:['De A à B']},'B>C':{en:['From B to C']}};
  assert.equal(r.routeInstructions(['A','B','C'],edges,'fr'),null);
});
