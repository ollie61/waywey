import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
const guides=JSON.parse(await fs.readFile(new URL('../hospitals/hadassah-ein-kerem/guide.json',import.meta.url),'utf8'));
const functionSource=source.slice(source.indexOf('function renderQuickGuide('),source.indexOf('function openQuickGuide('));
test('all four Hadassah guides render in their own language without changing ambassador language',()=>{
 const elements={guideDialog:{},guideTitle:{},guideContent:{querySelectorAll:()=>[]},closeGuide:{setAttribute(){}}};
 const context={QUICK_GUIDE:guides,appLang:'he',LANGUAGE_NAMES:{},APP_UI:{},appIsRtl:l=>['he','ar'].includes(l),$:id=>elements[id]};
 vm.createContext(context);vm.runInContext(functionSource,context);
 for(const lang of ['en','fr','he','ar']){
  vm.runInContext(`renderQuickGuide('${lang}')`,context);
  assert.equal(elements.guideTitle.textContent,guides[lang].title);
  assert.equal(elements.guideDialog.lang,lang);
  assert.equal(elements.guideDialog.dir,['he','ar'].includes(lang)?'rtl':'ltr');
  assert.match(elements.guideContent.innerHTML,/data-guide-lang="fr"/);
  assert.equal(context.appLang,'he');
 }
});
