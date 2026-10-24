/**
 * Model Fallback & Resiliency Utility for Google Gemini API.
 * Manages primary and fallback model sequences across OCR, Meter inspection,
 * and Dispute Letter generation paths.
 * 
 * Supports per-model quota recovery (HTTP 429 / RESOURCE_EXHAUSTED) and timeouts,
 * vision-capability filtering, and single-pass iteration (no infinite loops).
 */

export const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
export const DEFAULT_FALLBACK_MODELS = 'gemini-3-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite';

/**
 * Known non-vision architectures that do not support image/multimodal input.
 */
const NON_VISION_PATTERNS = [
  /gemma/i,
  /embedding/i,
  /tts/i,
  /transcribe/i,
  /imagen/i,
  /lyria/i,
  /^text-/i
];

/**
 * Checks whether a given model name supports image/multimodal inputs.
 * 
 * @param {string} modelName
 * @returns {boolean}
 */
export function isVisionModel(modelName) {
  if (!modelName || typeof modelName !== 'string') return false;
  const name = modelName.trim();
  for (const pattern of NON_VISION_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  // Standard Gemini flash, pro, and multimodal models accept images
  return /gemini/i.test(name);
}

/**
 * Returns the ordered, deduplicated list of candidate models.
 * If isVision is true, skips models that cannot accept image inputs.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.isVision=false]
 * @param {string} [options.primaryModel]
 * @param {string} [options.fallbackModels]
 * @returns {string[]}
 */
export function getModelList({ isVision = false, primaryModel, fallbackModels } = {}) {
  const primary = (primaryModel || process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL).trim();
  const fallbackStr = (fallbackModels || process.env.GEMINI_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS).trim();
  
  const fallbacks = fallbackStr
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  const combined = [primary, ...fallbacks];
  // Deduplicate while preserving sequence
  const uniqueModels = [...new Set(combined)];

  if (isVision) {
    return uniqueModels.filter(isVisionModel);
  }
  return uniqueModels;
}

/**
 * Checks whether an error is caused by quota exhaustion (HTTP 429 / RESOURCE_EXHAUSTED),
 * rate limits, or timeouts.
 * 
 * @param {Error|Object} err
 * @returns {boolean}
 */
export function isQuotaOrTimeoutError(err) {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  if (status === 429 || status === 'RESOURCE_EXHAUSTED') return true;
  const msg = String(err.message || err);
  return /429|RESOURCE_EXHAUSTED|quota|rate\s*limit|exhausted|timed?\s*out|timeout/i.test(msg);
}

/**
 * Checks whether an error should trigger a fallback attempt to the next model.
 * Triggers on 429, RESOURCE_EXHAUSTED, timeout, and temporary unavailability (503/404).
 * 
 * @param {Error|Object} err
 * @returns {boolean}
 */
export function isRetryableModelError(err) {
  if (!err) return false;
  if (isQuotaOrTimeoutError(err)) return true;
  const status = err.status || err.code || err.statusCode;
  if (status === 503 || status === 'UNAVAILABLE' || status === 404 || status === 'NOT_FOUND') return true;
  const msg = String(err.message || err);
  return /503|UNAVAILABLE|high\s+demand|not\s+found|no\s+longer\s+available/i.test(msg);
}

/**
 * Executes a Gemini request function across the model fallback list.
 * Tries each model once, stops after the list is exhausted, and logs the serving model.
 * 
 * @param {Object} options
 * @param {Function} options.execute - Async function (modelName: string) => Promise<any>
 * @param {boolean} [options.isVision=false] - Whether the call requires vision/image capability
 * @param {number} [options.timeoutMs=20000] - Per-model timeout in milliseconds
 * @param {string} [options.label='Gemini'] - Context label for logging
 * @param {string[]} [options.overrideModels] - Optional explicit model list (for testing)
 * @returns {Promise<{ result: any, model: string }>}
 */
export async function executeWithModelFallback({
  execute,
  isVision = false,
  timeoutMs = 20000,
  label = 'Gemini',
  overrideModels = null
}) {
  const models = overrideModels || getModelList({ isVision });
  if (models.length === 0) {
    throw new Error(`No available ${isVision ? 'vision ' : ''}models configured.`);
  }

  let lastError = null;
  let encounteredQuota = false;

  for (const model of models) {
    try {
      const callPromise = execute(model);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} call timed out after ${Math.round(timeoutMs / 1000)}s on model ${model}`)),
          timeoutMs
        )
      );

      const result = await Promise.race([callPromise, timeoutPromise]);
      // Successfully served: log only model name, never keys
      console.log(`[${label}] Served by model: ${model}`);
      return { result, model };

    } catch (err) {
      lastError = err;
      if (isQuotaOrTimeoutError(err)) {
        encounteredQuota = true;
      }
      console.warn(`[${label}] Model ${model} failed: ${err.message || err}. Retrying with next fallback model...`);

      // If error is clearly client-side bad request (not model/quota/timeout), do not blindly continue
      if (!isRetryableModelError(err) && (err.status === 400 || err.statusCode === 400)) {
        throw err;
      }
    }
  }

  // All models in list exhausted
  if (encounteredQuota) {
    const quotaErr = new Error('The AI reader is busy right now. Please try again later or enter the values manually.');
    quotaErr.isQuota = true;
    quotaErr.originalError = lastError;
    throw quotaErr;
  }

  const err = new Error(lastError?.message || 'Could not read this file. Please enter the values manually.');
  err.originalError = lastError;
  throw err;
}
