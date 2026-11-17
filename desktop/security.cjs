const path=require('node:path');
const APP_ORIGIN='cubelink://app';
function trusted(url){try{const parsed=new URL(url);return parsed.protocol==='cubelink:'&&parsed.hostname==='app'&&!parsed.username&&!parsed.password&&!parsed.port}catch{return false}}
function resourcePath(root,url){if(!trusted(url))throw Error('Untrusted app origin');const pathname=decodeURIComponent(new URL(url).pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const relative=path.relative(root,file);if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('Invalid resource path');return file;}
const ROUTES=Object.freeze({'/health':'GET','/session':'GET','/ports':'GET','/compile':'POST','/upload':'POST','/firmware/check':'POST','/firmware/ensure':'POST'});
module.exports={APP_ORIGIN,trusted,resourcePath,ROUTES};
