// Vercel serverless function: GET /api/import?url=<recipe web page>
// Reads the page's schema.org Recipe data and converts it into The Weekly Board's format (4 portions).
// No API keys or paid services needed.

const RULES = [
  // things that look like another ingredient but are not (stop matching)
  [/rice (wine )?vinegar|rice noodles?|rice paper|coconut milk|coconut cream|chicken stock|beef stock|vegetable stock|fish stock|stock cube|bouillon|\bbroth\b/i, null],
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
function parseRecipeFromHtml(html, sourceUrl){
  const r = extractRecipeJson(html);
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
  if(cal == null) warnings.push('No nutrition info on the page, so macros are blank.');

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
