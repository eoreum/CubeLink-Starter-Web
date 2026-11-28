// Conservative evidence-driven expansion, independent of product names.
// Only explicit pin-role tables and explicit 5V compatibility statements qualify.
export function derivePartProfile(text){
 const lines=String(text||'').slice(0,120000).split(/\r?\n/);
 const roles={};
 const evidence=[];
 let supply=false,conflict=false;
 for(const raw of lines){
  const line=raw.trim().slice(0,300);
  if(/\b(?:3\.3\s*V\s*only|not\s+5\s*V|5\s*V\s+intolerant|do\s+not\s+use\s+5\s*V)\b/i.test(line))conflict=true;
  if(/\b5\s*V\s+(?:logic compatible|logic and power compatible|power and logic compatible)\b/i.test(line)){supply=true;evidence.push(line)}
  const match=line.match(/^\|\s*([A-Za-z0-9_+-]{1,24})\s*\|\s*(5\s*V power input|ground|analog output|digital output)\s*\|$/i);
  if(!match)continue;
  const role=/power input/i.test(match[2])?'power':/^ground$/i.test(match[2])?'ground':/analog/i.test(match[2])?'analog':'digital';
  if(roles[role]&&roles[role]!==match[1])conflict=true;
  roles[role]=match[1];evidence.push(line);
 }
 const signal=roles.analog||roles.digital;
 if(conflict||!supply||!roles.power||!roles.ground||!signal||(roles.analog&&roles.digital)||new Set([roles.power,roles.ground,signal]).size!==3)return null;
 return {type:roles.analog?'analog':'digitalModule',terminals:[roles.power,roles.ground,signal],pinMap:{power:roles.power,ground:roles.ground,signal,supply:'5V'},evidence:evidence.join('\n').slice(0,3000)};
}
