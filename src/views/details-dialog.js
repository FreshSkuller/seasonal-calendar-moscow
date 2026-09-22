import { getElement } from '../shared/html.js';
import { productDetails } from '../components/product-details.js';
import { buildProductDetails } from '../application/product-details.js';

export class DetailsDialog {
  constructor(catalog) {
    this.catalog = catalog;
    this.dialog = getElement('detail-dialog');
    this.content = getElement('dialog-content');
    this.events = new AbortController();
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
    const model = buildProductDetails(this.catalog, id, month);
    this.content.innerHTML = productDetails(model, this.catalog);
    this.dialog.showModal();
    this.dialog.scrollTop = 0;
  }

  destroy() {
    this.dialog.close();
    this.events.abort();
  }
}
