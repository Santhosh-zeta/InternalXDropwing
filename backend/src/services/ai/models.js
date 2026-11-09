/**
 * Model selection. The wanted model is AI_MODEL or the provider default. If the
 * account's model list is available and does not contain it, the best available
 * model is picked by PREFERENCES and logged. A failing list call (bad key, a
 * gateway without /models) never blocks: the wanted model is used as is.
 */
const { PREFERENCES, EXCLUDE, MODEL_CACHE_MS, MODEL_CACHE_FAIL_MS } = require('./constants');

/** Best id for `provider` among `ids`, or null. */
const pickBest = (provider, ids) => {
  const usable = ids.filter((id) => typeof id === 'string' && !EXCLUDE.test(id));
  for (const prefix of PREFERENCES[provider] || []) {
    const hits = usable.filter((id) => id.startsWith(prefix));
    if (hits.length) {
      // Prefer stable ids over previews, then the shortest (no -mini / date suffix), then the newest name.
      hits.sort((a, b) => (/preview|exp/.test(a) - /preview|exp/.test(b)) || a.length - b.length || (a < b ? 1 : -1));
      return hits[0];
    }
  }
  return null;
};

const cache = new Map(); // key -> { model, until }

/** Resolve the model to use. `p` = { name, wantedModel, cacheKey, listModels }. */
const resolveModel = async (p) => {
  const key = `${p.name}|${p.cacheKey}|${p.wantedModel}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) { p.resolved = hit.model; return hit.model; }

  let model = p.wantedModel;
  let ttl = MODEL_CACHE_MS;
  try {
    const ids = await p.listModels();
    if (ids.length > 0 && !ids.includes(p.wantedModel)) {
      const best = pickBest(p.name, ids);
      if (best) {
        model = best;
        console.warn(`[ai] model "${p.wantedModel}" is not available for this ${p.name} account; using "${best}"`);
      } else {
        console.warn(`[ai] model "${p.wantedModel}" is not in this ${p.name} account's list and no preferred model was found; trying it anyway`);
      }
    }
  } catch (err) {
    ttl = MODEL_CACHE_FAIL_MS;
    console.warn(`[ai] could not list ${p.name} models (${err.kind || 'error'}); using "${p.wantedModel}"`);
  }
  cache.set(key, { model, until: Date.now() + ttl });
  p.resolved = model;
  return model;
};

const clearModelCache = () => cache.clear();

module.exports = { pickBest, resolveModel, clearModelCache };
