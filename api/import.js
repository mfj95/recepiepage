// Vercel serverless function: GET /api/import?url=<recipe web page>
// Reads the page's schema.org Recipe data and converts it into The Weekly Board's format (4 portions).
// No API keys or paid services needed.

const RULES = [
  // things that look like another ingredient but are not (stop matching)
  [/rice (wine )?vinegar|rice noodles?|rice paper/i, null],
  [/chicken stock|beef stock|vegetable stock|fish stock|stock cube|stock pot|bouillon|\bbroth\b|\bstock\b/i, 'stock'],
  [/coconut milk|coconut cream/i, 'coconut_milk'],
  [/beef mince|minced beef|ground beef/i, 'beef_mince'],
  [/\bbacon\b|rashers?/i, 'bacon'],
  [/sausages?/i, 'sausages'],
  [/mozzarella/i, 'mozzarella'],
  [/cheddar/i, 'cheddar'],
  [/greek (style )?yogh?urt/i, 'greek_yogurt'],
  [/tofu/i, 'tofu'],
  [/curry paste|korma paste|tikka|massaman/i, 'curry_paste'],
  [/tomato (puree|paste)/i, 'tomato_puree'],
  [/(tin|tinned|can|canned|chopped|plum) tomatoes?|tomatoes? (tin|tinned|can|canned)|chopped tomato|passata/i, 'tinned_tomatoes'],
  [/kidney beans?|black beans?|cannellini|haricot|borlotti|mixed beans/i, 'tinned_beans'],
  [/lentils?/i, 'lentils'],
  [/\bcarrots?\b/i, 'carrot'],
  [/cauliflower/i, 'cauliflower'],
  [/jalape|chil+i(?! (flakes|powder))|\bchile\b|\bchillies\b/i, 'chilli'],
  [/avocado/i, 'avocado'],
  [/coriander|cilantro/i, 'coriander'],
  [/\bbasil\b/i, 'basil'],
  [/porridge oats|\boats\b/i, 'oats'],
  [/(plain|all[- ]purpose|self[- ]raising|wholemeal) flour|\bflour\b/i, 'flour'],
  [/spaghetti|fusilli|rigatoni|farfalle|linguine|\bpasta\b/i, 'pasta_penne'],
  [/smoked salmon/i, 'smoked_salmon'],
  [/\bsalmon\b/i, 'salmon_fillet'],
  [/\bcod\b/i, 'cod_fillet'],
  [/chicken (thigh|leg|drumstick)s?/i, 'chicken_thigh'],
  [/chicken/i, 'chicken_breast'],
  [/pork shoulder|pork butt/i, 'pork_shoulder'],
  [/pork (loin|chop|steak)s?|pork tenderloin/i, 'pork_loin'],
  [/sirloin|rump steak|ribeye|rib-eye|beef steak|\bsteaks?\b/i, 'beef_sirloin'],
  [/chorizo/i, 'chorizo'],
  [/halloumi/i, 'halloumi'],
  [/\bfeta\b/i, 'feta'],
  [/double cream|heavy cream/i, 'double_cream'],
  [/parmesan|parmigiano/i, 'parmesan'],
  [/peanut butter/i, 'peanut_butter'],
  [/butter ?beans?/i, 'butter_beans'],
  [/\bbutter\b/i, 'butter'],
  [/sweet potato/i, 'sweet_potato'],
  [/baby potato|new potato|\bpotatoes?\b/i, 'baby_potatoes'],
  [/courgette|zucchini/i, 'zucchini'],
  [/red onion/i, 'red_onion'],
  [/spring onion|scallion/i, 'spring_onion'],
  [/\bonions?\b/i, 'red_onion'],
  [/(bell|red|green|yellow|orange) peppers?/i, 'bell_pepper'],
  [/cherry tomato/i, 'cherry_tomatoes'],
  [/garlic powder|garlic granules/i, 'garlic_powder'],
  [/garlic/i, 'garlic'],
  [/\blemons?\b/i, 'lemon'],
  [/\blimes?\b/i, 'lime'],
  [/spinach/i, 'spinach'],
  [/asparagus/i, 'asparagus'],
  [/broccoli/i, 'broccoli'],
  [/red cabbage/i, 'red_cabbage'],
  [/chickpeas?/i, 'chickpeas'],
  [/tahini/i, 'tahini'],
  [/harissa/i, 'harissa'],
  [/tandoori/i, 'tandoori_spice'],
  [/gochujang/i, 'gochujang'],
  [/\brice\b/i, 'rice'],
  [/penne/i, 'pasta_penne'],
  [/tagliatelle/i, 'pasta_tagliatelle'],
  [/couscous/i, 'couscous'],
  [/tortillas?|\bwraps?\b/i, 'tortillas'],
  [/cashews?/i, 'cashews'],
  [/olive oil/i, 'olive_oil'],
  [/sesame oil/i, 'sesame_oil'],
  [/sesame seeds?/i, 'sesame_seeds'],
  [/soy sauce|tamari/i, 'soy_sauce'],
  [/bbq sauce|barbecue sauce/i, 'bbq_sauce'],
  [/red wine vinegar/i, 'red_wine_vinegar'],
  [/balsamic/i, 'balsamic_vinegar'],
  [/cider vinegar|apple cider vinegar/i, 'cider_vinegar'],
  [/paprika/i, 'smoked_paprika'],
  [/oregano/i, 'dried_oregano'],
  [/chil+i (flakes|powder)/i, 'chili_flakes'],
  [/\bginger\b/i, 'ginger'],
  [/\bdill\b/i, 'fresh_dill'],
  [/chives/i, 'chives'],
  [/parsley/i, 'parsley'],
  [/\bmint\b/i, 'mint'],
  [/cucumber/i, 'cucumber'],
  [/yogh?urt/i, 'yogurt'],
  [/\bhoney\b/i, 'honey'],
  [/cornflour|cornstarch|corn starch/i, 'cornstarch'],
  [/brown sugar/i, 'brown_sugar'],
  [/\beggs?\b/i, 'eggs'],
  [/\bmilk\b/i, 'milk'],
  [/thyme/i, 'thyme'],
  [/black pepper|ground pepper|\bsalt\b/i, 'salt'],
];

const SHELLFISH = /\b(prawns?|shrimps?|crabs?|crab ?meat|lobsters?|mussels?|clams?|oysters?|scallops?|crayfish|crawfish|langoustines?|squid|calamari|octopus|cockles?|whelks?|abalone|shellfish|seafood|surimi|krill)\b/gi;

const FRAC = {'½':0.5,'⅓':1/3,'⅔':2/3,'¼':0.25,'¾':0.75,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875,'⅕':0.2};

// ---------- nutrition estimate (per 100 g: kcal, protein, carbs, fat) ----------
// k = macros per 100g, c = grams per whole item, d = grams per ml (liquids/pastes), cup = grams per 240 ml cup (solids)
// Order matters: the first match wins, so specific entries come before general ones.
const NUTR = [
  [/^(salt|.*\bsalt\b|.*black pepper|pepper|water|ice)\b/i, [0,0,0,0], {c:0,d:1}],
  [/stock|broth|bouillon/i, [5,0.5,0.5,0.2], {d:1}],
  [/cooked.*rice|rice.*cooked/i, [130,2.7,28,0.3], {cup:160}],
  [/\brice\b/i, [360,7,79,0.6], {cup:185}],
  [/cooked.*(pasta|noodles|spaghetti|penne)|(pasta|noodles).*cooked/i, [158,5.8,31,0.9], {cup:140}],
  [/pasta|penne|tagliatelle|spaghetti|fusilli|rigatoni|farfalle|linguine|noodles/i, [355,12.5,72,1.5], {cup:100}],
  [/couscous/i, [360,12.8,73,0.6], {cup:170}],
  [/quinoa/i, [368,14,64,6], {cup:170}],
  [/(cooked|pulled|shredded|rotisserie|leftover).*chicken|chicken.*(cooked|pulled|shredded)/i, [165,31,0,3.6], {cup:140}],
  [/chicken (thigh|leg|drumstick)/i, [177,19,0,11], {c:120}],
  [/chicken/i, [120,23,0,2.6], {c:175}],
  [/turkey/i, [150,19,0,8], {c:150}],
  [/beef mince|minced beef|ground beef|\bmince\b/i, [215,21,0,14], {}],
  [/steak|sirloin|rump|ribeye|flank|skirt/i, [160,22,0,8], {c:200}],
  [/pork (loin|chop|steak)|tenderloin/i, [140,22,0,5.5], {c:200}],
  [/pork/i, [210,18,0,15], {}],
  [/bacon|pancetta/i, [270,17,0,22], {c:25}],
  [/chorizo/i, [455,24,2,38], {c:60}],
  [/sausage/i, [300,13,3,26], {c:60}],
  [/smoked salmon/i, [180,25,0,8], {c:50}],
  [/salmon/i, [208,20,0,13], {c:150}],
  [/\bcod\b|haddock|white fish|sea bass|\bhake\b|pollock/i, [85,18,0,0.8], {c:150}],
  [/tuna/i, [116,26,0,1], {c:112}],
  [/\beggs?\b/i, [143,12.6,0.7,9.5], {c:50}],
  [/tofu/i, [144,15,3,9], {c:200}],
  [/halloumi/i, [320,22,2,25], {c:225}],
  [/feta/i, [264,14,4,21], {cup:150}],
  [/parmesan|parmigiano|pecorino/i, [431,38,4,29], {cup:100}],
  [/mozzarella/i, [280,22,2,22], {c:125}],
  [/cheddar|cheese/i, [400,25,1,33], {cup:100}],
  [/double cream|heavy cream|whipping cream/i, [345,2,3,36], {d:1}],
  [/cream/i, [190,3,4,19], {d:1}],
  [/greek.*yogh?urt|yogh?urt.*greek/i, [97,9,4,5], {d:1.05}],
  [/yogh?urt/i, [65,4.5,7,2.5], {d:1.05}],
  [/coconut milk|coconut cream/i, [197,2,3,21], {d:1}],
  [/\bmilk\b/i, [50,3.4,5,2], {d:1.03}],
  [/butter beans?|kidney beans?|black beans?|cannellini|haricot|borlotti|mixed beans|\bbeans\b/i, [100,7,17,0.5], {c:240,cup:180}],
  [/chickpeas?|garbanzo/i, [135,8,20,3], {c:240,cup:160}],
  [/lentils?/i, [116,9,20,0.4], {cup:190}],
  [/peanut butter/i, [590,25,20,50], {d:1.05}],
  [/\bbutter\b/i, [717,0.9,0.1,81], {d:0.95}],
  [/tahini/i, [595,17,21,54], {d:1}],
  [/olive oil|vegetable oil|sunflower oil|rapeseed oil|coconut oil|sesame oil|cooking oil|\boil\b/i, [884,0,0,100], {d:0.92}],
  [/mayo/i, [680,1,1,75], {d:0.95}],
  [/honey/i, [304,0.3,82,0], {d:1.4}],
  [/maple|syrup|agave/i, [260,0,67,0], {d:1.3}],
  [/brown sugar|sugar/i, [387,0,100,0], {cup:200}],
  [/corn ?flour|cornstarch|corn starch/i, [381,0.3,91,0.1], {cup:128}],
  [/flour/i, [364,10,76,1], {cup:120}],
  [/breadcrumbs?|panko/i, [395,13,72,5], {cup:110}],
  [/oats?\b|porridge/i, [380,13,65,7], {cup:90}],
  [/tortilla|\bwraps?\b/i, [310,8,52,7], {c:60}],
  [/bagel/i, [270,10,53,1.5], {c:95}],
  [/bread|bun\b|roll\b|pitta|naan/i, [255,9,49,3], {c:40}],
  [/cashews?/i, [553,18,30,44], {cup:140}],
  [/almonds?/i, [579,21,22,50], {cup:140}],
  [/peanuts?|walnuts?|pecans?|hazelnuts?|pistachios?|\bnuts?\b/i, [600,18,18,52], {cup:140}],
  [/sesame seeds?|seeds?/i, [573,18,23,50], {d:0.6,cup:145}],
  [/raisins?|sultanas?|dried (fruit|apricots?|cranberries)/i, [300,3,79,0.5], {cup:150}],
  [/olives?/i, [115,0.8,6,11], {c:4,cup:135}],
  [/soy sauce|tamari|liquid aminos/i, [60,8,5,0], {d:1.15}],
  [/fish sauce/i, [35,5,4,0], {d:1.2}],
  [/worcestershire/i, [78,0,19,0], {d:1.1}],
  [/bbq sauce|barbecue sauce|ketchup/i, [130,1,31,0.3], {d:1.2}],
  [/tomato (puree|paste)/i, [82,4.3,19,0.5], {d:1.1}],
  [/gochujang/i, [200,5,44,1.5], {d:1.2}],
  [/sriracha|hot sauce|sweet chil+i/i, [90,2,19,1], {d:1.1}],
  [/tandoori|tikka|curry paste|korma|masala paste|harissa|pesto|\bpaste\b/i, [130,3,12,8], {d:1.1}],
  [/mustard/i, [66,4,6,4], {d:1.05}],
  [/balsamic/i, [88,0.5,17,0], {d:1.1}],
  [/vinegar/i, [20,0,0.5,0], {d:1}],
  [/\bwine\b/i, [83,0.1,2.6,0], {d:1}],
  [/apple juice|cider|juice/i, [46,0.1,11,0], {d:1.04}],
  [/(tin|tinned|can|canned|chopped).*tomato|tomato.*(tin|tinned|can|canned|chopped)|passata/i, [21,1.2,4,0.2], {c:400,d:1.03}],
  [/cherry tomato/i, [18,0.9,3.9,0.2], {c:12,cup:150}],
  [/tomato/i, [18,0.9,3.9,0.2], {c:120,cup:180}],
  [/spinach/i, [23,2.9,3.6,0.4], {cup:30}],
  [/kale|chard|rocket|lettuce|salad leaves|cabbage|pak choi|bok choy/i, [25,1.8,5,0.3], {cup:60,c:300}],
  [/broccoli/i, [34,2.8,7,0.4], {c:300,cup:90}],
  [/cauliflower/i, [25,1.9,5,0.3], {c:500,cup:100}],
  [/courgette|zucchini/i, [17,1.2,3.1,0.3], {c:200,cup:120}],
  [/aubergine|eggplant/i, [25,1,6,0.2], {c:300,cup:80}],
  [/spring onion|scallion|green garlic|chives|leeks?/i, [32,1.8,7,0.2], {c:15,cup:100}],
  [/garlic powder|onion powder/i, [330,16,73,0.7], {d:0.6}],
  [/garlic/i, [149,6.4,33,0.5], {c:4,d:1}],
  [/ginger/i, [80,1.8,18,0.8], {c:25,d:0.9}],
  [/jalape|chil+i|chile|habanero|scotch bonnet/i, [29,1.9,6.5,0.4], {c:15}],
  [/pepper/i, [31,1,6,0.3], {c:150,cup:140}],
  [/onion/i, [40,1.1,9,0.1], {c:110,cup:160}],
  [/sweet potato/i, [86,1.6,20,0.1], {c:200,cup:130}],
  [/potato/i, [77,2,17,0.1], {c:150,cup:150}],
  [/carrots?/i, [41,0.9,10,0.2], {c:70,cup:130}],
  [/cucumber/i, [15,0.7,3.6,0.1], {c:300,cup:120}],
  [/asparagus/i, [20,2.2,3.9,0.1], {c:200,cup:130}],
  [/mushroom/i, [22,3.1,3.3,0.3], {c:20,cup:70}],
  [/avocado/i, [160,2,9,15], {c:150}],
  [/sweetcorn|corn\b/i, [86,3.3,19,1.4], {cup:150}],
  [/peas\b/i, [81,5.4,14,0.4], {cup:145}],
  [/green beans?|runner beans?|beans? green/i, [31,1.8,7,0.2], {cup:110}],
  [/parsley|coriander|cilantro|basil|mint|dill|tarragon|herbs?\b/i, [36,3,6,0.8], {cup:40}],
  [/lemon juice|lime juice/i, [22,0.4,6.9,0.2], {d:1.03}],
  [/lemon/i, [29,1.1,9,0.3], {c:60}],
  [/lime/i, [30,0.7,10,0.2], {c:40}],
  [/apples?\b/i, [52,0.3,14,0.2], {c:180,cup:125}],
  [/banana/i, [89,1.1,23,0.3], {c:120}],
  [/paprika|cumin|oregano|thyme|rosemary|turmeric|garam masala|cinnamon|cayenne|spice|seasoning|chil+i (flakes|powder)|bay lea/i, [280,12,50,10], {d:0.5}],
];
const COUNT_UNITS = {cloves: null, pinch: 0.4, handful: 20, bunch: 30, sprig: 1};

function nutritionLookup(name){
  for(const e of NUTR){ if(e[0].test(name)) return e; }
  return null;
}
function gramsFor(ing, e){
  const o = e[2] || {};
  const a = ing.a, u = ing.u || '';
  if(u === 'g') return a;
  if(u === 'kg') return a * 1000;
  let ml = null;
  if(u === 'ml') ml = a;
  else if(u === 'tsp') ml = a * 5;
  else if(u === 'tbsp') ml = a * 15;
  if(ml !== null){
    if(o.d != null) return ml * o.d;
    if(o.cup != null) return ml * o.cup / 240;
    return ml * 0.6;
  }
  if(u === 'cloves') return o.c ? a * o.c : a * 4;
  if(COUNT_UNITS[u] != null) return a * COUNT_UNITS[u];
  if(u === '' && o.c != null) return a * o.c;
  return null;
}
// ingredients are already scaled to `servings` portions; returns per-portion macros or null
function estimateMacros(ingredients, servings){
  let kcal = 0, p = 0, c = 0, f = 0, matched = 0;
  const missing = [];
  for(const ing of ingredients){
    const e = nutritionLookup(ing.n);
    const g = e ? gramsFor(ing, e) : null;
    if(!e || g == null){ missing.push(ing.n); continue; }
    matched++;
    const k = e[1];
    kcal += g * k[0] / 100; p += g * k[1] / 100; c += g * k[2] / 100; f += g * k[3] / 100;
  }
  if(!ingredients.length || matched / ingredients.length < 0.6) return {macros: null, matched, total: ingredients.length, missing};
  const per = x => x / servings;
  return {
    macros: {cal: Math.round(per(kcal) / 5) * 5, prot: Math.round(per(p)), carb: Math.round(per(c)), fat: Math.round(per(f))},
    matched, total: ingredients.length, missing
  };
}

// ---------- helpers ----------
function decodeEntities(s){
  return String(s)
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|frac12|frac14|frac34|deg);/g, (m, e) =>
      ({amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', frac12:'½', frac14:'¼', frac34:'¾', deg:'°'}[e]));
}
function clean(s){
  return decodeEntities(String(s == null ? '' : s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function canonicalKey(name){
  for(const [re, key] of RULES){
    if(re.test(name)) return key; // null means "do not guess"
  }
  return null;
}
function slug(s){
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
}

// ---------- fetching (with basic safety checks) ----------
function isBlockedHost(h){
  h = String(h).toLowerCase();
  if(h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if(h.startsWith('[') || h.includes(':')) return true; // no IPv6 literals
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if(m){
    const a = +m[1], b = +m[2];
    if(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return true;
  }
  return false;
}

async function fetchHtml(startUrl){
  let current = startUrl;
  for(let hop = 0; hop < 4; hop++){
    const u = new URL(current);
    if(!/^https?:$/.test(u.protocol)) throw new Error('BAD_URL');
    if(isBlockedHost(u.hostname)) throw new Error('BLOCKED');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let resp;
    try{
      resp = await fetch(u.toString(), {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-GB,en;q=0.9'
        }
      });
    } finally { clearTimeout(timer); }
    if([301, 302, 303, 307, 308].includes(resp.status)){
      const loc = resp.headers.get('location');
      if(!loc) throw new Error('FETCH_FAILED');
      current = new URL(loc, u).toString();
      continue;
    }
    if(resp.status >= 400) throw new Error('HTTP_' + resp.status);
    const type = (resp.headers.get('content-type') || '').toLowerCase();
    if(type && !/html|xml/.test(type)) throw new Error('NOT_HTML');
    const text = await resp.text();
    return text.slice(0, 3000000);
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

// ---------- reading the recipe data ----------
function findRecipes(node, out){
  if(!node) return out;
  if(Array.isArray(node)){ node.forEach(n => findRecipes(n, out)); return out; }
  if(typeof node === 'object'){
    const t = node['@type'];
    const isRecipe = t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
    if(isRecipe) out.push(node);
    if(node['@graph']) findRecipes(node['@graph'], out);
    if(node.mainEntity) findRecipes(node.mainEntity, out);
  }
  return out;
}

function extractRecipeJson(html){
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const found = [];
  while((m = re.exec(html)) !== null){
    try{
      const data = JSON.parse(m[1].trim());
      findRecipes(data, found);
    }catch(e){ /* ignore broken blocks */ }
  }
  return found[0] || null;
}

function flattenInstructions(node, out){
  if(!node) return out;
  if(typeof node === 'string'){
    const s = clean(node);
    if(s) out.push(s);
    return out;
  }
  if(Array.isArray(node)){ node.forEach(n => flattenInstructions(n, out)); return out; }
  if(typeof node === 'object'){
    if(node.itemListElement) return flattenInstructions(node.itemListElement, out);
    const s = clean(node.text || node.name || '');
    if(s) out.push(s);
  }
  return out;
}

function parseDurationMinutes(iso){
  if(!iso || typeof iso !== 'string') return 0;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if(!m) return 0;
  return (+(m[1] || 0)) * 1440 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}
function formatMinutes(mins){
  if(!mins) return '';
  if(mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60), r = mins % 60;
  return r ? (h + ' hr ' + r + ' min') : (h + ' hr');
}

function parseNumber(v){
  if(v == null) return null;
  const m = String(v).replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// ---------- ingredient lines ----------
function parseIngredient(rawLine){
  let s = clean(rawLine);
  if(!s || /:$/.test(s)) return null;
  s = s.replace(/(\d+)\s*([½⅓⅔¼¾⅛⅜⅝⅞⅕])/g, (m, n, f) => String(+n + FRAC[f]));
  s = s.replace(/([½⅓⅔¼¾⅛⅜⅝⅞⅕])/g, (m, f) => String(FRAC[f]));
  const original = s;

  let qty = null, unit = '', rest = s;
  let m;
  if((m = rest.match(/^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b\s*/i))){
    qty = parseFloat(m[1]) * parseFloat(m[2]); unit = m[3].toLowerCase(); rest = rest.slice(m[0].length);
  } else if((m = rest.match(/^(\d+)\s+(\d+)\/(\d+)\s*/))){
    qty = parseFloat(m[1]) + parseFloat(m[2]) / parseFloat(m[3]); rest = rest.slice(m[0].length);
  } else if((m = rest.match(/^(\d+)\/(\d+)\s*/))){
    qty = parseFloat(m[1]) / parseFloat(m[2]); rest = rest.slice(m[0].length);
  } else if((m = rest.match(/^(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*/i))){
    const a = parseFloat(m[1].replace(',', '.'));
    const b = m[2] ? parseFloat(m[2].replace(',', '.')) : null;
    qty = b ? Math.max(a, b) : a; rest = rest.slice(m[0].length);
  }

  if(qty !== null) rest = rest.replace(/^(heaping|heaped|scant|level|generous|rounded|large|small|medium)\s+(?=(cups?|tsps?|tbsps?|teaspoons?|tablespoons?|handfuls?)\b)/i, '');
  if(qty !== null && unit === ''){
    const UNITS = [
      [/^(kg|kilograms?|kilos?)\b\.?\s*/i, 'kg', 1],
      [/^(g|grams?)\b\.?\s*/i, 'g', 1],
      [/^(ml|millilit(?:re|er)s?)\b\.?\s*/i, 'ml', 1],
      [/^(l|lit(?:re|er)s?)\b\.?\s*/i, 'ml', 1000],
      [/^(tsps?|teaspoons?)\b\.?\s*/i, 'tsp', 1],
      [/^(tbsps?|tbs|tablespoons?)\b\.?\s*/i, 'tbsp', 1],
      [/^(cups?)\b\.?\s*/i, 'ml', 240],
      [/^(fl\.? ?oz)\b\.?\s*/i, 'ml', 29.6],
      [/^(oz|ounces?)\b\.?\s*/i, 'g', 28.35],
      [/^(lbs?|pounds?)\b\.?\s*/i, 'g', 453.6],
      [/^(cloves?)\b\s*(of\s+)?/i, 'cloves', 1],
      [/^(pinch(?:es)?)\b\s*(of\s+)?/i, 'pinch', 1],
      [/^(handfuls?)\b\s*(of\s+)?/i, 'handful', 1],
      [/^(bunch(?:es)?)\b\s*(of\s+)?/i, 'bunch', 1],
      [/^(sprigs?)\b\s*(of\s+)?/i, 'sprig', 1],
    ];
    for(const [re, u, mult] of UNITS){
      const um = rest.match(re);
      if(um){ unit = u; qty = qty * mult; rest = rest.slice(um[0].length); break; }
    }
    // tins/cans/slices etc. stay as counts but keep the word in the name
    if(unit === ''){
      const cm = rest.match(/^(cans?|tins?|slices?|sticks?|stalks?|heads?|packs?|packets?)\b\s*(of\s+)?/i);
      if(cm){ rest = cm[1].toLowerCase() + ' of ' + rest.slice(cm[0].length); }
    }
  }

  rest = rest.replace(/^\/\s*\d+(?:\.\d+)?\s*(oz|g|ml|lb)\b\s*/i, '');   // "400g/14oz"
  rest = rest.replace(/^\([^)]*\)\s*/, '');                                // "(7oz)"
  rest = rest.replace(/^of\s+/i, '').replace(/[.;]+$/, '').trim();
  if(!rest) rest = original;

  const key = canonicalKey(rest + ' ' + original);

  if(qty === null){
    const fm = original.match(/^(?:a|an|some)?\s*(handful|bunch|pinch|sprig)(?:es)?\s+(?:of\s+)?(.*)$/i);
    if(fm && fm[2]){
      const nm = fm[2].replace(/[.;]+$/, '').trim() || original;
      const k2 = canonicalKey(nm + ' ' + original);
      return {a: 1, u: fm[1].toLowerCase(), n: nm, k: k2 || ('other_' + slug(nm))};
    }
    if(/salt|pepper/i.test(original) && key === 'salt') return {a: 1, u: 'tsp', n: rest, k: 'salt'};
    return {a: 1, u: '', n: rest, k: key || ('other_' + slug(rest))};
  }
  return {a: qty, u: unit, n: rest, k: key || ('other_' + slug(rest))};
}

function scaleAmount(a, factor, unit){
  let v = a * factor;
  if(unit === 'g' || unit === 'ml') v = v >= 100 ? Math.round(v / 5) * 5 : Math.round(v);
  else if(unit === 'kg') v = Math.round(v * 20) / 20;
  else if(unit === 'tsp' || unit === 'tbsp') v = Math.round(v * 4) / 4;
  else v = Math.round(v * 2) / 2;
  if(v <= 0) v = unit === 'g' || unit === 'ml' ? 1 : 0.5;
  return v;
}

function guessMethod(text){
  if(/air[- ]?fr(y|ier)/i.test(text)) return 'airfryer';
  if(/barbecue|bbq|griddle|\bgrill/i.test(text)) return 'bbq';
  if(/\boven\b|roast|bake|traybake|tray bake/i.test(text)) return 'oven';
  return 'stovetop';
}
function guessProtein(text){
  const list = [
    [/chicken/i, 'Chicken'], [/turkey/i, 'Turkey'], [/beef|steak|mince/i, 'Beef'], [/pork|bacon|sausage/i, 'Pork'],
    [/lamb/i, 'Lamb'], [/salmon/i, 'Salmon'], [/\bcod\b|haddock|fish|tuna|trout|sea bass/i, 'Fish'],
    [/halloumi|paneer/i, 'Cheese (veggie)'], [/tofu|tempeh/i, 'Tofu (veggie)'],
    [/chickpea|lentil|bean/i, 'Beans/lentils (veggie)'], [/\beggs?\b/i, 'Eggs']
  ];
  for(const [re, name] of list){ if(re.test(text)) return name; }
  return 'Mixed';
}

// ---------- main conversion ----------
// Fallback for blog-style pages with no schema.org recipe data:
// find an "Ingredients" heading and an "Instructions" heading and read the lists under them.
function extractRecipeFromText(html){
  let h = String(html).replace(/<(script|style|noscript|nav|footer|form|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  const blocks = [];
  const re = /<(h[1-6]|li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while((m = re.exec(h))){
    const tag = m[1].toLowerCase();
    const text = clean(decodeEntities(m[2].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')));
    if(text) blocks.push({tag, text});
  }
  const isIngHead = t => /^(the )?ingredients?\b[\s:]*$/i.test(t) || /^ingredients?\s+(for|list)\b/i.test(t);
  const isInstrHead = t => /^(instructions?|directions?|method|steps?|preparation|how to make( it)?)\b[\s:]*$/i.test(t);
  const isStopHead = t => /^(notes?|recipe notes?|tips?|nutrition|equipment|storage|faqs?|related|you may also like|more recipes|did you make|share|subscribe|join)\b/i.test(t) || /\b(comments?|reader interactions|leave a (reply|comment)|reviews?|ratings?|you might also like|more from)\b/i.test(t);
  const isHead = b => /^h[1-6]$/.test(b.tag);

  for(let i = 0; i < blocks.length; i++){
    if(!isHead(blocks[i]) || !isIngHead(blocks[i].text)) continue;
    const ings = [];
    let j = i + 1;
    for(; j < blocks.length; j++){
      const b = blocks[j];
      if(isHead(b) && (isInstrHead(b.text) || isStopHead(b.text))) break;
      if(b.tag === 'li' && b.text.length < 200) ings.push(b.text);
      if(ings.length > 60) break;
    }
    if(ings.length < 2) continue;
    // find instructions after the ingredients
    let k = j;
    while(k < blocks.length && !(isHead(blocks[k]) && isInstrHead(blocks[k].text))) k++;
    if(k >= blocks.length) continue;
    const steps = [];
    const lis = [];
    const lvl = t => parseInt(t.tag.slice(1), 10);
    const instrLvl = lvl(blocks[k]);
    for(let q = k + 1; q < blocks.length; q++){
      const b = blocks[q];
      if(isHead(b) && (isStopHead(b.text) || lvl(b) <= instrLvl)) break;
      if(isHead(b)) continue;
      if(b.text.length > 700) continue;
      if(b.text.length < 15) continue;
      if(b.tag === 'li') lis.push(b.text);
      steps.push(b.text);
      if(steps.length > 40) break;
    }
    const finalSteps = (lis.length >= 2 ? lis : steps).slice(0, 30);
    if(!finalSteps.length) continue;

    let name = '';
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if(og) name = decodeEntities(og[1]);
    if(!name){ const h1 = blocks.find(b => b.tag === 'h1'); if(h1) name = h1.text; }
    name = clean(name.replace(/\s*[\|–—-]\s*[^|–—-]*$/, '')) || 'Imported recipe';

    const ctx = blocks.slice(Math.max(0, i - 5), k + 1).map(b => b.text).join(' ');
    const ym = ctx.match(/\b(?:serves|servings?|makes|yield)\b[:\s]*(\d+)/i) || ctx.match(/\b(\d+)\s+servings?\b/i);
    return {
      name,
      recipeIngredient: ings,
      recipeInstructions: finalSteps,
      recipeYield: ym ? ym[1] : '',
      _fromText: true
    };
  }
  return null;
}

function parseRecipeFromHtml(html, sourceUrl){
  const r = extractRecipeJson(html) || extractRecipeFromText(html);
  if(!r) return null;

  const title = clean(r.name || 'Imported recipe').slice(0, 100);
  const lines = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : (r.recipeIngredient ? [r.recipeIngredient] : []))
    .map(parseIngredient).filter(Boolean);
  const steps = flattenInstructions(r.recipeInstructions, []);
  if(!lines.length || !steps.length) return null;

  const yieldText = Array.isArray(r.recipeYield) ? r.recipeYield.join(' ') : String(r.recipeYield == null ? '' : r.recipeYield);
  let originalServings = parseNumber(yieldText);
  const warnings = [];
  if(!originalServings || originalServings < 1){
    originalServings = 4;
    warnings.push('The page did not say how many it serves, so amounts are shown as written.');
  }
  const factor = 4 / originalServings;
  if(originalServings !== 4) warnings.push('Original serves ' + originalServings + ', scaled to 4.');

  const ingredients = lines.map(l => ({
    a: scaleAmount(l.a, factor, l.u),
    u: l.u,
    n: l.n,
    k: l.k
  }));

  const nut = r.nutrition || {};
  const cal = parseNumber(nut.calories);
  const macros = {
    cal: cal != null ? Math.round(cal) : '—',
    prot: parseNumber(nut.proteinContent) != null ? Math.round(parseNumber(nut.proteinContent)) : '—',
    carb: parseNumber(nut.carbohydrateContent) != null ? Math.round(parseNumber(nut.carbohydrateContent)) : '—',
    fat: parseNumber(nut.fatContent) != null ? Math.round(parseNumber(nut.fatContent)) : '—'
  };
  let macrosEstimated = false;
  if(cal == null){
    const est = estimateMacros(ingredients, 4);
    if(est.macros){
      Object.assign(macros, est.macros);
      macrosEstimated = true;
      warnings.push('Calories and macros are estimated from ' + est.matched + ' of ' + est.total + ' ingredients (about 10-15% either way).');
    } else {
      warnings.push('No nutrition info on the page and too few ingredients recognised to estimate, so macros are blank.');
    }
  }
  if(r._fromText) warnings.push('This page had no recipe card, so it was read from the page text. Please check amounts.');

  const totalMins = parseDurationMinutes(r.totalTime) || (parseDurationMinutes(r.cookTime) + parseDurationMinutes(r.prepTime));
  const allText = title + ' ' + lines.map(l => l.n).join(' ') + ' ' + steps.join(' ');

  const unknown = ingredients.filter(i => i.k.startsWith('other_')).length;
  if(unknown) warnings.push(unknown + ' ingredient' + (unknown > 1 ? 's have' : ' has') + ' no price data.');

  const shellfishFound = Array.from(new Set((allText.match(SHELLFISH) || []).map(s => s.toLowerCase())));

  let host = '';
  try{ host = new URL(sourceUrl).hostname.replace(/^www\./, ''); }catch(e){ host = sourceUrl; }

  const recipe = {
    id: 'import-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    title,
    method: guessMethod(allText),
    protein: guessProtein(title + ' ' + lines.map(l => l.n).join(' ')),
    baseServings: 4,
    time: formatMinutes(totalMins),
    macros,
    ingredients,
    steps,
    macrosEstimated,
    note: 'Imported from ' + host + '. Check amounts before cooking.',
    source: sourceUrl,
    imported: true
  };
  return {recipe, warnings, shellfish: shellfishFound};
}

// ---------- the endpoint ----------
const FRIENDLY = {
  BAD_URL: 'That does not look like a web link. It should start with https://',
  BLOCKED: 'That link cannot be imported.',
  NOT_HTML: 'That link is not a web page.',
  TOO_MANY_REDIRECTS: 'That link redirected too many times.',
  FETCH_FAILED: 'Could not open that page.'
};

async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  let url = req.query && req.query.url;
  if(Array.isArray(url)) url = url[0];
  if(!url){
    try{ url = new URL(req.url, 'http://localhost').searchParams.get('url'); }catch(e){ url = null; }
  }
  if(!url) return res.status(400).json({ok: false, error: 'Paste a recipe link first.'});

  try{
    const u = new URL(String(url).trim());
    if(!/^https?:$/.test(u.protocol)) throw new Error('BAD_URL');
    if(isBlockedHost(u.hostname)) throw new Error('BLOCKED');
    const html = await fetchHtml(u.toString());
    const result = parseRecipeFromHtml(html, u.toString());
    if(!result){
      return res.status(422).json({ok: false, error: 'Could not find a recipe on that page. Many big recipe sites work, but some blogs and paywalled pages do not. You can add it by hand instead.'});
    }
    return res.status(200).json({ok: true, ...result});
  }catch(e){
    const code = e && e.message;
    if(FRIENDLY[code]) return res.status(400).json({ok: false, error: FRIENDLY[code]});
    if(/^HTTP_(401|403|429)$/.test(code || '')) return res.status(502).json({ok: false, error: 'That site would not let the importer read the page. Try another site, or add the recipe by hand.'});
    if(/^HTTP_/.test(code || '')) return res.status(502).json({ok: false, error: 'That page could not be loaded (' + code.replace('HTTP_', 'error ') + ').'});
    if(e && e.name === 'AbortError') return res.status(504).json({ok: false, error: 'That page took too long to load.'});
    if(e instanceof TypeError) return res.status(400).json({ok: false, error: FRIENDLY.BAD_URL});
    return res.status(502).json({ok: false, error: 'Could not read that page.'});
  }
}

module.exports = handler;
// exposed for testing
module.exports.parseRecipeFromHtml = parseRecipeFromHtml;
module.exports.parseIngredient = parseIngredient;
module.exports.isBlockedHost = isBlockedHost;
module.exports.estimateMacros = estimateMacros;
