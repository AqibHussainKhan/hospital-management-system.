const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function loader(overrides = {}, globals = {}) {
 const cache = new Map();
 return function load(file) {
  const filename = path.resolve(__dirname, '../..', file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const source = fs.readFileSync(filename,'utf8').replace(/import\.meta\.env/g,'TEST_ENV');
  const javascript = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports:{}};cache.set(filename,module);
  const localRequire = specifier => {
   if (specifier in overrides) return overrides[specifier];
   if(specifier.startsWith('.')) {
    const stem=path.resolve(path.dirname(filename),specifier);
    const target=[stem,stem+'.ts',stem+'.tsx'].find(p=>fs.existsSync(p));
    return load(path.relative(path.resolve(__dirname,'../..'),target));
   }
   return require(specifier);
  };
  const context={module,exports:module.exports,require:localRequire,console,Date,JSON,Map,Set,Error,Number,String,Array,Object,Promise,Intl,URL,setTimeout,clearTimeout,TEST_ENV:{VITE_HMS_DATA_MODE:'local'},...globals};
  vm.runInNewContext(javascript,context,{filename});
  return module.exports;
 };
};
