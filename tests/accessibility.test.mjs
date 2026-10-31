import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const html=await fs.readFile(new URL("../index.html",import.meta.url),"utf8");
const css=await fs.readFile(new URL("../styles.css",import.meta.url),"utf8");
const app=await fs.readFile(new URL("../app.js",import.meta.url),"utf8");

function luminance(hex){
  const values=hex.replace("#","").match(/../g).map(x=>parseInt(x,16)/255).map(c=>
    c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)
  );
  return 0.2126*values[0]+0.7152*values[1]+0.0722*values[2];
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b),hi=Math.max(x,y),lo=Math.min(x,y);
  return (hi+0.05)/(lo+0.05);
}

test("page has skip navigation and a main landmark target",()=>{
  assert.match(html,/class="skip-link"[^>]+href="#mainContent"/);
  assert.match(html,/<main[^>]+id="mainContent"/);
});

test("dialogs have accessible names",()=>{
  assert.match(html,/id="guideDialog"[^>]+aria-labelledby="guideTitle"/);
  assert.match(html,/id="visitorDialog"[^>]+aria-labelledby="vName"/);
  assert.match(html,/id="qrDialog"[^>]+aria-labelledby="qrTitle"/);
});

test("search control exposes results relationship",()=>{
  assert.match(html,/id="q"[^>]+type="search"/);
  assert.match(html,/id="q"[^>]+aria-controls="results"/);
  assert.match(html,/id="results"[^>]+aria-live="polite"/);
});

test("search results are rendered as keyboard-native buttons",()=>{
  assert.match(app,/document\.createElement\("button"\)/);
});

test("core touch targets enforce at least 44px",()=>{
  assert.match(css,/min-height:44px/);
});

test("focus-visible styling exists",()=>{
  assert.match(css,/:focus-visible/);
});

test("core text colours meet WCAG AA normal-text contrast",()=>{
  assert.ok(contrast("#16333a","#ffffff")>=4.5);
  assert.ok(contrast("#176879","#ffffff")>=4.5);
  assert.ok(contrast("#0f5362","#ffffff")>=4.5);
  assert.ok(contrast("#5d7076","#f3f7f8")>=4.5);
  assert.ok(contrast("#8b4b0d","#ffffff")>=4.5);
  assert.ok(contrast("#552b00","#fff4df")>=4.5);
});
