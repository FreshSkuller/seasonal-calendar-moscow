import { getElement } from '../shared/html.js';
import { productDetails, homeAdvice } from '../components/product-details.js';
import { buildProductDetails } from '../application/product-details.js';
import copy from '../../content/ru.json' with { type: 'json' };
import { detailDesign } from '../config/detail-design.js';

export class DetailsDialog {
  constructor(catalog) {
    this.catalog = catalog;
    this.dialog = getElement('detail-dialog');
    this.content = getElement('dialog-content');
    this.events = new AbortController();
    this.content.addEventListener(
      'change',
      (event) => {
        const { name, value } = event.target;
        if (name === 'purchase-form' && ['whole', 'cut'].includes(value)) this.context.form = value;
        else if (name === 'purchase-readiness' && ['unknown', 'firm', 'ready'].includes(value)) {
          this.context.readiness = value === 'unknown' ? undefined : value;
        } else return;
        const scroll = this.dialog.scrollTop;
        const model = buildProductDetails(this.catalog, this.variantId, this.month, this.context);
        this.content.querySelector('[data-home-advice]').innerHTML = homeAdvice(
          model,
          this.catalog,
        );
        const readiness = this.content.querySelector('[data-readiness]');
        if (readiness) readiness.hidden = this.context.form === 'cut';
        this.content.querySelector('[data-purchase-status]').textContent =
          copy.details.purchase.updated;
        this.dialog.scrollTop = scroll;
      },
      { signal: this.events.signal },
    );
    this.dialog.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-close-dialog]')) this.dialog.close();
        if (event.target !== this.dialog) return;
        const bounds = this.dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          this.dialog.close();
      },
      { signal: this.events.signal },
    );
  }

  open(id, month) {
    this.variantId = id;
    this.month = month;
    this.context = { environment: 'home', form: 'whole' };
    const model = buildProductDetails(this.catalog, id, month, this.context);
    this.dialog.dataset.detailDesign = detailDesign(model.productId);
    this.content.innerHTML = productDetails(model, this.catalog);
    this.dialog.showModal();
    this.content.querySelector('#dialog-title').focus({ preventScroll: true });
    this.dialog.scrollTop = 0;
  }

  destroy() {
    this.dialog.close();
    this.events.abort();
  }
}
