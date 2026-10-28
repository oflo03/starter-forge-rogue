from pathlib import Path
import re,hashlib,json
source=Path(__file__).resolve().parents[3]/'starter-forge'
out=Path(__file__).resolve().parents[1]/'vendor'
modules={'rankups':{},'original-environments':{},'arsenal':{},'fan-content':{},'environments':{'ORIGINALS':'original-environments'},'catalog':{'RANKUPS':'rankups','ENVIRONMENT_RULES':'environments','ORIGINAL_ENVIRONMENTS':'original-environments','ARSENAL':'arsenal','FAN':'fan-content'},'engine':{}}
manifest={}
for name,deps in modules.items():
 raw=(source/(name+'.js')).read_text(encoding='utf-8');manifest[name]=hashlib.sha256(raw.encode()).hexdigest()
 match=re.search(r'\}\)\(typeof globalThis[\s\S]*?,\s*function\s*\([^)]*\)\s*\{',raw)
 if not match:raise Exception('UMD factory not found: '+name)
 body=raw[match.end():].rstrip();assert body.endswith('});');body=body[:-3]
 imports=''
 for symbol,module in deps.items():
  imports+=f"import {symbol} from './{module}.js';\n"
  body=re.sub(r'^\s*const '+symbol+r'\s*=.*?;\s*$', '',body,flags=re.M)
 if name=='engine':imports+="import Catalog from './catalog.js';\nconst root={StarterCatalog:Catalog};\n"
 (out/(name+'.js')).write_text('// Starter Forge maker v1.10.0 snapshot. See ../MAKER_SOURCE.json.\n'+imports+'const api=(()=>{'+body+'})();\nexport default api;\n',encoding='utf-8')
(out.parent/'MAKER_SOURCE.json').write_text(json.dumps({'source':'../starter-forge','version':'1.10.0','sha256':manifest},indent=2),encoding='utf-8')
print('Synced maker rules as ES modules:',len(modules))
