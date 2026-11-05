const SITE='https://commbee-beta.onrender.com';
function trusted(value){try{return new URL(value).origin===SITE;}catch{return false;}}
function external(value){try{const u=new URL(value);return ['https:','mailto:'].includes(u.protocol);}catch{return false;}}
module.exports={SITE,trusted,external};
