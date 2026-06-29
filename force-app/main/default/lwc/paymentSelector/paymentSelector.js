import { LightningElement, api } from 'lwc';

export default class PaymentSelector extends LightningElement {
    @api frequency = 'onetime';
    @api paymentIntentResponse;

    _config;
    _enrichedConfig = null;

    @api
    get config() {
        return this._config;
    }
    set config(value) {
        this._config = value;
        this._enrichedConfig = this._buildConfig(value);
    }

    get enrichedConfigString() {
        return this._enrichedConfig ? JSON.stringify(this._enrichedConfig) : null;
    }

    get normalizedFrequency() {
        return (this.frequency ?? 'onetime').toLowerCase();
    }

    _buildConfig(value) {
        if (!value) return null;
        try {
            const input = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(input) || input.length === 0) return null;
            return input.map(m => this._enrich(m));
        } catch (e) {
            console.error('[paymentSelector] Failed to parse config:', e);
            return null;
        }
    }

    _enrich(m) {
        return {
            key: `${m.paymentProcessor}--${m.paymentMethod}`,
            name: m.paymentMethod,
            processor: m.paymentProcessor,
            processorPrettyName: m.paymentProcessor,
            processorFriendlyName: m.paymentProcessor,
            merchantAccount: m.target,
            merchantAccountGroup: 'static',
            target: m.target,
            displayLabel: m.displayLabel ?? m.paymentMethod,
            redirectInstruction: m.redirectInstruction ?? '',
            enabledOneTime: m.enabledOneTime ?? false,
            enabledRecurring: m.enabledRecurring ?? false,
            isDefaultOneTime: m.isDefaultOneTime ?? false,
            isDefaultRecurring: m.isDefaultRecurring ?? false,
            supportsRecurring: m.enabledRecurring ?? false,
            active: true,
            parameters: this._enrichParameters(m.parameters)
        };
    }

    _enrichParameters(parameters) {
        return (parameters ?? []).map(p => ({
            name: p.name,
            value: p.value ?? '',
            visibleToCustomer: p.visibleToCustomer ?? true,
            displayLabel: p.displayLabel ?? p.name,
            required: p.required ?? false,
            dataType: p.dataType ?? 'String',
            description: p.description ?? ''
        }));
    }

    handlePaymentMethodChanged(event) {
        this.dispatchEvent(new CustomEvent('paymentmethodchanged', {
            detail: event.detail,
            bubbles: true,
            composed: true
        }));
    }
}
