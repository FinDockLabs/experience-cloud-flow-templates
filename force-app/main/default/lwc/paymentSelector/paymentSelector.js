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
            // Option 3: nested [{name, processors:[]}] — detected by processors array on first entry
            if (Array.isArray(input[0]?.processors)) {
                return this._enrichFromV3(input);
            }
            // Option 1: flat [{name, processor, merchantAccount, ...}]
            return input.map(m => this._enrichFromV1(m));
        } catch (e) {
            console.error('[paymentSelector] Failed to parse config:', e);
            return null;
        }
    }

    // Option 1: flat array entry → enriched selector entry
    _enrichFromV1(m) {
        return {
            key: `${m.processor}--${m.name}`,
            name: m.name,
            processor: m.processor,
            processorPrettyName: m.processorPrettyName ?? m.processor,
            processorFriendlyName: m.processorFriendlyName ?? m.processor,
            merchantAccount: m.merchantAccount,
            merchantAccountGroup: 'static',
            target: m.merchantAccount,
            displayLabel: m.displayLabel ?? m.name,
            redirectInstruction: m.redirectInstruction ?? '',
            enabledOneTime: m.enabledOneTime ?? false,
            enabledRecurring: m.enabledRecurring ?? false,
            isDefaultOneTime: m.isDefaultOneTime ?? false,
            isDefaultRecurring: m.isDefaultRecurring ?? false,
            // Derived — risk: developer must not set enabledRecurring:true if PSP doesn't support it
            supportsRecurring: m.enabledRecurring ?? false,
            active: true,
            parameters: this._enrichParameters(m.parameters)
        };
    }

    // Option 3: nested [{name, processors:[]}] → flat list of enriched selector entries
    _enrichFromV3(paymentMethods) {
        const result = [];
        for (const method of paymentMethods) {
            for (const processor of (method.processors ?? [])) {
                result.push({
                    key: `${processor.name}--${method.name}`,
                    name: method.name,
                    processor: processor.name,
                    processorPrettyName: processor.name,
                    processorFriendlyName: processor.name,
                    merchantAccount: processor.merchantAccount,
                    merchantAccountGroup: 'static',
                    target: processor.merchantAccount,
                    displayLabel: processor.displayLabel ?? method.name,
                    redirectInstruction: processor.redirectInstruction ?? '',
                    enabledOneTime: processor.enabledOneTime ?? false,
                    enabledRecurring: processor.enabledRecurring ?? false,
                    isDefaultOneTime: processor.isDefaultOneTime ?? false,
                    isDefaultRecurring: processor.isDefaultRecurring ?? false,
                    // Explicit from config — safer than deriving from enabledRecurring
                    supportsRecurring: processor.supportsRecurring ?? processor.enabledRecurring ?? false,
                    active: true,
                    parameters: this._enrichParameters(processor.parameters)
                });
            }
        }
        return result;
    }

    _enrichParameters(parameters) {
        return (parameters ?? []).map(p => ({
            name: p.name,
            value: p.value ?? '',
            visibleToCustomer: p.visibleToCustomer ?? true,
            displayLabel: p.displayLabel ?? p.name,
            required: p.required ?? false,
            dataType: p.dataType ?? p.data_type ?? 'String',
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
