from pathlib import Path
import re,json,csv,io,urllib.request,concurrent.futures
root=Path(__file__).resolve().parents[2]
raw=(root/'src/data/balance/species/generation-01.ts').read_text(encoding='utf-8')
blocks=re.findall(r'generationOneSpeciesData\[SpeciesId\.(\w+)\] = \{([\s\S]*?)(?=\n  generationOneSpeciesData\[|\n  return )',raw)
url='https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv'
rows=csv.DictReader(io.StringIO(urllib.request.urlopen(url).read().decode()))
names={int(r['pokemon_species_id']):r['name'] for r in rows if r['local_language_id']=='3'}
enum=(root/'src/enums/species-id.ts').read_text(encoding='utf-8')
keys=re.findall(r'^  (\w+)(?: = \d+)?,',enum,re.M)[:151]
assert len(keys)==151
ids={k:i+1 for i,k in enumerate(keys)}
result=[];edges=[]
for key,body in blocks:
 if key not in ids:continue
 bodyhead=body.split('}),',1)[0]
 def num(field):return int(re.search(field+r': (\d+)',bodyhead).group(1))
 types=re.findall(r'^      type[12]: PokemonType\.(\w+)',bodyhead,re.M)
 ident=ids[key]
 base={k:num(field) for k,field in [('hp','baseHp'),('atk','baseAtk'),('def','baseDef'),('spa','baseSpatk'),('spd','baseSpdef'),('spe','baseSpd')]}
 result.append({'id':ident,'name':names[ident],'types':[t.lower() for t in types if t not in ['UNKNOWN','NONE']],'base':base,'minLevel':45 if sum(base.values())>=580 else 25 if sum(base.values())>=450 else 12 if sum(base.values())>=380 else 5})
 evo=body.split('evolutions:',1)[1].split('eggTier:',1)[0] if 'evolutions:' in body else ''
 for target,params in re.findall(r'new SpeciesEvolution\(\{\s*speciesId: SpeciesId\.(\w+)([^}]+)',evo):
  if target not in ids:continue
  match=re.search(r'level: (\d+)',params);level=int(match.group(1)) if match else 0
  edges.append((ident,ids[target],level or 25))
assert len(result)==151,len(result)
by={r['id']:r for r in result}
for _ in range(3):
 for parent,target,level in edges:by[target]['minLevel']=max(by[target]['minLevel'],level,by[parent]['minLevel']+1)
out=root/'forge/public/pokemon';out.mkdir(exist_ok=True)
def fetch(r):
 path=out/(str(r['id'])+'.png')
 if not path.exists():path.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+str(r['id'])+'.png',timeout=30).read())
 assert path.read_bytes().startswith(b'\x89PNG')
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(fetch,result))
(root/'forge/species.ts').write_text('// SPDX-License-Identifier: AGPL-3.0-only\n// Species stats: PokéRogue generation-01.ts. Korean names: PokeAPI. Sprites: see public/pokemon/SOURCES.md.\nexport const SPECIES = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(out/'SOURCES.md').write_text('''# Pokémon sprite sources

151 front sprites from https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon (files 1.png–151.png), retrieved 2026-10-28. Sprites belong to their respective Pokémon rights holders. PokeAPI sprite repository license: https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt

Korean names: https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_species_names.csv (language 3).

Base stats and types come from this fork's src/data/balance/species/generation-01.ts. Encounter minimum levels use evolution levels, or Lv.25 for trade/stone evolution and Lv.45 for legendary-grade species. These are encounter rules, not a complete evolution simulator.
''',encoding='utf-8')
print('Generated',len(result),'species and local sprites; early pool',len([r for r in result if r['minLevel']<=5]))
