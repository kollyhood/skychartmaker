/**
 * Skysix Display — Product Card render template.
 *
 * Framework-agnostic contract shared by Remote (preview) and Renderer (live
 * TV). `renderCard(payload, options)` is a pure function: given a payload
 * object it returns an HTML string and does nothing else — no DOM writes,
 * no fetch, no timers. The caller owns mounting (e.g.
 * `mount.innerHTML = renderCard(payload)`) and owns loading card.css.
 *
 * Payload shape (all keys required, values may be null where noted):
 *   {
 *     product_name: string,
 *     unit: string,
 *     price: number,
 *     image_url: string | null,
 *     offer_text: string | null,
 *     discount_percent: number | null,
 *     business_name: string,
 *     business_phone: string | null,
 *     updated_at: string,            // ISO timestamp, not rendered today
 *   }
 *
 * options: { variant?: 'burst' | 'banner' | 'block' } — defaults to 'burst'.
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// Manual Indian-style digit grouping (e.g. 12,34,567) so we don't depend on
// Intl locale data, which is inconsistently bundled on constrained Android
// TV / Firestick browsers.
function groupIndianDigits(digits) {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

function formatPrice(price) {
  if (typeof price !== 'number' || Number.isNaN(price)) return '—';
  const rounded = Math.round(price * 100) / 100;
  const isWhole = Number.isInteger(rounded);
  const [intPart, fracPart] = Math.abs(rounded).toFixed(isWhole ? 0 : 2).split('.');
  const sign = rounded < 0 ? '-' : '';
  return `₹${sign}${groupIndianDigits(intPart)}${fracPart ? '.' + fracPart : ''}`;
}

function formatDiscountLabel(discountPercent) {
  return `${Math.round(discountPercent)}% OFF`;
}

function renderMedia(imageUrl, altText) {
  if (imageUrl) {
    return `<img class="card__image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText || 'Product')}" loading="lazy" />`;
  }
  return `
    <div class="card__image-placeholder">
      <svg class="card__placeholder-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect x="6" y="12" width="52" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="3"></rect>
        <circle cx="21" cy="27" r="5" fill="currentColor"></circle>
        <path d="M10 47 L25 31 L35 41 L45 29 L56 47 Z" fill="currentColor" opacity="0.5"></path>
      </svg>
      <span class="card__placeholder-label">No image</span>
    </div>`;
}

function renderFooter(businessName, businessPhone) {
  return `
    <div class="card__footer">
      <span class="card__footer-business">${escapeHtml(businessName)}</span>
      ${businessPhone ? `<span class="card__footer-phone">${escapeHtml(businessPhone)}</span>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Variant: Burst — split media/info layout, price in a starburst medallion
// ---------------------------------------------------------------------------

function renderBurst(data) {
  const { productName, unit, price, imageUrl, offerText, discountPercent, businessName, businessPhone, updatedAt } = data;

  const discountBadge = discountPercent !== null
    ? `<div class="card__burst-badge"><span class="card__burst-badge-value">${escapeHtml(formatDiscountLabel(discountPercent))}</span></div>`
    : '';
  const offerChip = offerText
    ? `<div class="card__offer-chip-burst"><span>${escapeHtml(offerText)}</span></div>`
    : '';

  return `
    <div class="card card--burst" data-updated-at="${escapeHtml(updatedAt)}">
      <div class="card__media-burst">
        ${renderMedia(imageUrl, productName)}
        ${discountBadge}
      </div>
      <div class="card__info-burst">
        <div class="card__unit-burst">${escapeHtml(unit)}</div>
        <h1 class="card__name-burst">${escapeHtml(productName)}</h1>
        <div class="card__price-medallion">
          <span class="card__price-medallion-value">${escapeHtml(formatPrice(price))}</span>
        </div>
        ${offerChip}
      </div>
      ${renderFooter(businessName, businessPhone)}
    </div>`;
}

// ---------------------------------------------------------------------------
// Variant: Banner — stacked media / name / full-width price banner
// ---------------------------------------------------------------------------

function renderBanner(data) {
  const { productName, unit, price, imageUrl, offerText, discountPercent, businessName, businessPhone, updatedAt } = data;

  const ribbon = discountPercent !== null
    ? `<div class="card__ribbon-banner"><span>${escapeHtml(formatDiscountLabel(discountPercent))}</span></div>`
    : '';
  const offerLine = offerText
    ? `<div class="card__offer-banner"><span>${escapeHtml(offerText)}</span></div>`
    : '';

  return `
    <div class="card card--banner" data-updated-at="${escapeHtml(updatedAt)}">
      <div class="card__media-banner">
        ${renderMedia(imageUrl, productName)}
        ${ribbon}
      </div>
      <h1 class="card__name-banner">${escapeHtml(productName)}</h1>
      <div class="card__price-banner">
        <div class="card__price-banner-main">
          <span class="card__price-banner-value">${escapeHtml(formatPrice(price))}</span>
          <span class="card__unit-banner">/ ${escapeHtml(unit)}</span>
        </div>
        ${offerLine}
      </div>
      ${renderFooter(businessName, businessPhone)}
    </div>`;
}

// ---------------------------------------------------------------------------
// Variant: Block — solid accent side panel, plain oversized price text
// ---------------------------------------------------------------------------

function renderBlock(data) {
  const { productName, unit, price, imageUrl, offerText, discountPercent, businessName, businessPhone, updatedAt } = data;

  const discountPill = discountPercent !== null
    ? `<div class="card__discount-pill-block"><span>${escapeHtml(formatDiscountLabel(discountPercent))}</span></div>`
    : '';
  const offerLine = offerText
    ? `<div class="card__offer-block"><span>${escapeHtml(offerText)}</span></div>`
    : '';

  return `
    <div class="card card--block" data-updated-at="${escapeHtml(updatedAt)}">
      <div class="card__top-block">
        <div class="card__accent-block">
          ${discountPill}
          <div class="card__price-block">
            <span class="card__price-block-value">${escapeHtml(formatPrice(price))}</span>
            <span class="card__unit-block">${escapeHtml(unit)}</span>
          </div>
          ${offerLine}
        </div>
        <div class="card__main-block">
          <div class="card__media-block">${renderMedia(imageUrl, productName)}</div>
          <h1 class="card__name-block">${escapeHtml(productName)}</h1>
        </div>
      </div>
      ${renderFooter(businessName, businessPhone)}
    </div>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const RENDERERS = { burst: renderBurst, banner: renderBanner, block: renderBlock };

export const CARD_VARIANTS = [
  { id: 'burst', label: 'Burst — starburst price medallion' },
  { id: 'banner', label: 'Banner — full-width price strip' },
  { id: 'block', label: 'Block — accent side panel' },
];

function normalizePayload(payload) {
  const p = payload || {};
  return {
    productName: typeof p.product_name === 'string' ? p.product_name : '',
    unit: typeof p.unit === 'string' ? p.unit : '',
    price: typeof p.price === 'number' && !Number.isNaN(p.price) ? p.price : null,
    imageUrl: typeof p.image_url === 'string' && p.image_url.trim() ? p.image_url : null,
    offerText: typeof p.offer_text === 'string' && p.offer_text.trim() ? p.offer_text : null,
    discountPercent: typeof p.discount_percent === 'number' && !Number.isNaN(p.discount_percent) ? p.discount_percent : null,
    businessName: typeof p.business_name === 'string' ? p.business_name : '',
    businessPhone: typeof p.business_phone === 'string' && p.business_phone.trim() ? p.business_phone : null,
    updatedAt: typeof p.updated_at === 'string' ? p.updated_at : '',
  };
}

/**
 * @param {object} payload - see PAYLOAD SCHEMA above.
 * @param {{ variant?: 'burst' | 'banner' | 'block' }} [options]
 * @returns {string} HTML string for the card. Caller decides how to mount it.
 */
export function renderCard(payload, options) {
  const variant = options && RENDERERS[options.variant] ? options.variant : 'burst';
  return RENDERERS[variant](normalizePayload(payload));
}
