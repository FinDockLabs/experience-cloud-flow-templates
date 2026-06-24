import { createElement } from 'lwc';
import AmountAndFrequencyConfig from 'c/amountAndFrequencyConfig';

// @salesforce/i18n/currency resolves to 'USD' in the jest-transformer, so
// CURRENCY = 'USD' and presetCurrencySymbol falls back to '$' for non-ISO values.

function createComponent(props = {}) {
    const element = createElement('c-amount-and-frequency-config', { is: AmountAndFrequencyConfig });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

function getCurrencySymbol(element) {
    const span = element.shadowRoot.querySelector('.amount-symbol');
    return span ? span.textContent : null;
}

function dispatchCurrencyChange(element, newValue, newValueDataType = 'String') {
    const flowInput = element.shadowRoot.querySelector('cpm-flow-variable-input');
    flowInput.dispatchEvent(
        new CustomEvent('valuechange', {
            detail: { newValue, newValueDataType }
        })
    );
}

describe('c-amount-and-frequency-config', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    // ── presetCurrencySymbol ─────────────────────────────────────────────────
    describe('presetCurrencySymbol', () => {
        // CURRENCY stub = 'USD' → '$'
        it('shows org currency symbol when no currency is configured', async () => {
            const element = createComponent();
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('$');
        });

        it('shows EUR symbol when EUR is configured as a hardcoded ISO code', async () => {
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'EUR', valueDataType: 'String' }
                ]
            });
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('€');
        });

        it('shows GBP symbol when GBP is configured', async () => {
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'GBP', valueDataType: 'String' }
                ]
            });
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('£');
        });

        it('falls back to org currency symbol when a flow variable reference is configured', async () => {
            // flowVariableInput strips {!…} and dispatches the bare name; _hydrate receives
            // the bare name (e.g. 'SelectedCurrency') which is not a valid ISO-4217 code.
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'SelectedCurrency', valueDataType: 'reference' }
                ]
            });
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('$');
        });
    });

    // ── handleCurrencyChange ─────────────────────────────────────────────────
    describe('handleCurrencyChange', () => {
        it('normalises a lowercase ISO code to uppercase and emits the event', async () => {
            const element = createComponent();
            await Promise.resolve();

            const emitted = [];
            element.addEventListener('configuration_editor_input_value_changed', (evt) => {
                if (evt.detail.name === 'defaultCurrency') emitted.push(evt.detail);
            });

            dispatchCurrencyChange(element, 'eur');
            await Promise.resolve();

            expect(emitted).toHaveLength(1);
            expect(emitted[0].newValue).toBe('EUR');
            expect(emitted[0].newValueDataType).toBe('String');
        });

        it('normalises mixed-case ISO code to uppercase', async () => {
            const element = createComponent();
            await Promise.resolve();

            const emitted = [];
            element.addEventListener('configuration_editor_input_value_changed', (evt) => {
                if (evt.detail.name === 'defaultCurrency') emitted.push(evt.detail);
            });

            dispatchCurrencyChange(element, 'Usd');
            await Promise.resolve();

            expect(emitted[0].newValue).toBe('USD');
        });

        it('does not uppercase a flow variable reference', async () => {
            const element = createComponent();
            await Promise.resolve();

            const emitted = [];
            element.addEventListener('configuration_editor_input_value_changed', (evt) => {
                if (evt.detail.name === 'defaultCurrency') emitted.push(evt.detail);
            });

            dispatchCurrencyChange(element, 'SelectedCurrency', 'reference');
            await Promise.resolve();

            expect(emitted[0].newValue).toBe('SelectedCurrency');
            expect(emitted[0].newValueDataType).toBe('reference');
        });

        it('updates the displayed currency symbol after a hardcoded code is entered', async () => {
            const element = createComponent();
            await Promise.resolve();

            dispatchCurrencyChange(element, 'jpy');
            await Promise.resolve();

            // JPY uses '¥'
            expect(getCurrencySymbol(element)).toBe('¥');
        });

        it('falls back to org currency symbol after a flow variable is selected', async () => {
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'EUR', valueDataType: 'String' }
                ]
            });
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('€');

            dispatchCurrencyChange(element, 'MyCurrencyVar', 'reference');
            await Promise.resolve();

            expect(getCurrencySymbol(element)).toBe('$');
        });
    });

    // ── hydration ────────────────────────────────────────────────────────────
    describe('hydration from inputVariables', () => {
        it('restores a hardcoded currency string from inputVariables', async () => {
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'CHF', valueDataType: 'String' }
                ]
            });
            await Promise.resolve();
            // CHF uses 'CHF' as narrow symbol in en-US locale
            expect(getCurrencySymbol(element)).not.toBe('$');
        });

        it('hydrates only once — a second inputVariables assignment is ignored', async () => {
            const element = createComponent({
                inputVariables: [
                    { name: 'defaultCurrency', value: 'EUR', valueDataType: 'String' }
                ]
            });
            await Promise.resolve();
            expect(getCurrencySymbol(element)).toBe('€');

            // Second assignment after _hydrated = true must be a no-op
            element.inputVariables = [
                { name: 'defaultCurrency', value: 'GBP', valueDataType: 'String' }
            ];
            await Promise.resolve();
            // Still EUR because _hydrate() was not called again
            expect(getCurrencySymbol(element)).toBe('€');
        });
    });
});
