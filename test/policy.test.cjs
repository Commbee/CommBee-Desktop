const {test}=require('node:test');const assert=require('node:assert/strict');
const {trusted,external}=require('../policy.cjs');
test('only the exact HTTPS CommBee origin is trusted',()=>{
  for(const value of ['https://commbee-beta.onrender.com/','https://commbee-beta.onrender.com/#roombee-invite=abc'])assert.equal(trusted(value),true);
  for(const value of ['https://commbee-beta.onrender.com.evil.test','http://commbee-beta.onrender.com','https://commbee-beta.onrender.com@evil.test','javascript:alert(1)','file:///etc/passwd','invalid'])assert.equal(trusted(value),false);
});
test('external navigation cannot launch arbitrary native protocols',()=>{
  assert.equal(external('https://github.com/Commbee/CommBee-Desktop/releases'),true);
  assert.equal(external('mailto:hello@example.com'),true);
  for(const value of ['file:///secret','javascript:alert(1)','powershell:run','cmd:run','data:text/html,test','commbee-capture://open'])assert.equal(external(value),false);
});
