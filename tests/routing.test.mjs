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
