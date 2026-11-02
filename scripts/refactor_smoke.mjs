#!/usr/bin/env node
// Lightweight regression checks for the v0.2 modularisation.
// These are intentionally dependency-free and do not require a browser.

import fs from "node:fs/promises";

async function loadModule(path){
  const source=await fs.readFile(new URL("../"+path,import.meta.url),"utf8");
  return import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const search=await loadModule("js/search.js");
const routing=await loadModule("js/routing.js");
const ui=await loadModule("js/ui.js");

assert(search.norm("Hôpital général") === "hopital general","accent normalization changed");
assert(search.score({en:"Urology",fr:"Urologie",loc:"E-959",aliases:["prostate"]},"urology") >= 100,"exact search ranking changed");
assert(search.score({en:"Urology",fr:"Urologie",loc:"E-959",aliases:["prostate"]},"E-959") > 0,"room-number search changed");
assert(search.inferQueryLanguage("נוירולוגיה",{},["he","en","ar"],"en") === "he","Hebrew query detection changed");
assert(search.inferQueryLanguage("أعصاب",{},["he","en","ar"],"he") === "ar","Arabic query detection changed");
assert(search.inferQueryLanguage("neurology",{},["he","en","ar"],"he") === "en","English query detection changed");

const graph={A:["B"],B:["A","C"],C:["B"],D:[]};
assert(JSON.stringify(routing.findRoute(graph,"A","C")) === JSON.stringify(["A","B","C"]),"BFS route changed");
assert(routing.findRoute(graph,"A","D") === null,"missing routes must remain null");
assert(routing.resolveTargetNode({p:"OFF"},{nodeAliases:{OFF:null}},graph) === null,"explicit unmapped alias changed");
assert(routing.resolveTargetNode({p:"C"},{nodeAliases:{}},graph) === "C","direct target-node resolution changed");

assert(ui.destinationName({en:"Emergency",he:"מיון"},"he") === "מיון","localized destination naming changed");
assert(ui.appIsRtl("he") && ui.appIsRtl("ar") && !ui.appIsRtl("en"),"RTL detection changed");
assert(ui.locationFor({loc:"Floor 3"},"he") === "קומה 3","Hebrew floor localization changed");
assert(ui.locationFor({loc:"Floor 3"},"ar") === "الطابق 3","Arabic floor localization changed");

console.log("Modularisation smoke checks passed.");
