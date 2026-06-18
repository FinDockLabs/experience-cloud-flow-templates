import { LightningElement, api, track } from 'lwc';

const PRESET_COUNT = 6;

const DEFAULT_AMOUNTS_ONE_TIME  = [25, 50, 100, 250, 500, 1000];
const DEFAULT_AMOUNTS_RECURRING = [5, 10, 25, 60, 125, 250];

const CURRENCIES = [
    { code: 'EUR', symbol: '€',   label: 'EUR — €' },
    { code: 'USD', symbol: '$',   label: 'USD — $' },
    { code: 'GBP', symbol: '£',   label: 'GBP — £' },
    { code: 'CAD', symbol: 'CA$', label: 'CAD — CA$' },
    { code: 'AUD', symbol: 'A$',  label: 'AUD — A$' },
    { code: 'CHF', symbol: 'CHF', label: 'CHF — CHF' },
    { code: 'SEK', symbol: 'kr',  label: 'SEK — kr' },
    { code: 'NOK', symbol: 'kr',  label: 'NOK — kr' },
    { code: 'DKK', symbol: 'kr',  label: 'DKK — kr' },
    { code: 'NZD', symbol: 'NZ$', label: 'NZD — NZ$' },
];

function makePresets(amountStr, defaults) {
    const amounts = amountStr
        ? String(amountStr).split(',').map(s => { const n = Number(s.trim()); return n > 0 ? n : ''; })
        : [...defaults];
    return Array.from({ length: PRESET_COUNT }, (_, i) => ({
        index:  i,
        key:    `p-${i}`,
        label:  `Preset ${i + 1}`,
        amount: amounts[i] !== undefined ? amounts[i] : ''
    }));
}

function toAmountString(presets) {
    return presets
        .filter(p => p.amount !== '' && Number(p.amount) > 0)
        .map(p => String(Number(p.amount)))
        .join(',');
}

export default class AmountAndFrequencyConfig extends LightningElement {
    @api builderContext;
    @api automaticOutputVariables;
    @api inputVariables;

    @track _presetsOneTime   = makePresets('', DEFAULT_AMOUNTS_ONE_TIME);
    @track _presetsRecurring = makePresets('', DEFAULT_AMOUNTS_RECURRING);
    @track _checkedCurrencies = ['EUR'];

    _showOneTime      = true;
    _showMonthly      = true;
    _defaultFrequency = 'oneTime';
    _minAmount        = 1;
    _maxAmount        = 0;
    _defaultCurrency  = 'EUR';

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    connectedCallback() {
        this._hydrate();
    }

    _hydrate() {
        const vars = Array.isArray(this.inputVariables) ? this.inputVariables : [];
        const get  = name => { const v = vars.find(x => x.name === name); return v != null ? v.value : null; };

        const freq1 = get('freq1Value') ?? 'oneTime';
        const freq2 = get('freq2Value') ?? 'recurring';
        this._showOneTime = !!freq1;
        this._showMonthly = !!freq2;

        this._defaultFrequency = get('defaultFrequency') ?? 'oneTime';
        this._minAmount        = get('minAmount')        ?? 1;
        this._maxAmount        = get('maxAmount')        ?? 0;
        this._defaultCurrency  = get('defaultCurrency')  ?? 'EUR';

        const rawCurrencies = get('availableCurrencies') ?? '';
        this._checkedCurrencies = rawCurrencies
            ? rawCurrencies.split(',').map(s => s.trim()).filter(Boolean)
            : ['EUR'];

        this._presetsOneTime   = makePresets(get('presetAmountsOneTime'), DEFAULT_AMOUNTS_ONE_TIME);
        this._presetsRecurring = makePresets(get('presetAmountsRecurring'), DEFAULT_AMOUNTS_RECURRING);
    }

    // ─── Template getters ─────────────────────────────────────────────────────

    get showOneTime() {
        return this._showOneTime;
    }

    get showMonthly() {
        return this._showMonthly;
    }

    get minAmount() {
        return this._minAmount;
    }

    get maxAmount() {
        return this._maxAmount === 0 ? '' : this._maxAmount;
    }

    // Frequency ───

    get oneTimeChipClass() {
        return `chip-btn${this._showOneTime ? ' chip-btn-active' : ''}`;
    }

    get monthlyChipClass() {
        return `chip-btn${this._showMonthly ? ' chip-btn-active' : ''}`;
    }

    get frequencyOptions() {
        const opts = [];
        if (this._showOneTime) opts.push({ label: 'One-time', value: 'oneTime' });
        if (this._showMonthly) opts.push({ label: 'Monthly',  value: 'recurring' });
        return opts;
    }

    get defaultFrequency() {
        return this._defaultFrequency;
    }

    get showDefaultFrequency() {
        return this._showOneTime && this._showMonthly;
    }

    get showBothFrequencies() {
        return this._showOneTime && this._showMonthly;
    }

    get frequencyError() {
        return !this._showOneTime && !this._showMonthly ? 'Enable at least one frequency.' : '';
    }

    // Presets ───

    get presetsOneTime() {
        return this._presetsOneTime;
    }

    get presetsRecurring() {
        return this._presetsRecurring;
    }

    // Other amount ───

    get minMaxError() {
        const min = Number(this._minAmount) || 0;
        const max = Number(this._maxAmount) || 0;
        return max > 0 && min > max ? 'Minimum cannot be greater than maximum.' : '';
    }

    // Currency ───

    get currencyList() {
        return CURRENCIES.map(c => ({
            ...c,
            isChecked: this._checkedCurrencies.includes(c.code),
            chipClass: `chip-btn${this._checkedCurrencies.includes(c.code) ? ' chip-btn-active' : ''}`
        }));
    }

    get defaultCurrency() { return this._defaultCurrency; }

    get defaultCurrencyOptions() {
        return CURRENCIES
            .filter(c => this._checkedCurrencies.includes(c.code))
            .map(c => ({ label: c.label, value: c.code }));
    }

    get currencyError() {
        return this._checkedCurrencies.length === 0 ? 'Select at least one currency.' : '';
    }

    // ─── Frequency handlers ───────────────────────────────────────────────────

    handleShowOneTimeChange() {
        this._showOneTime = !this._showOneTime;
        if (!this._showOneTime && this._defaultFrequency === 'oneTime') {
            this._defaultFrequency = 'recurring';
        }
        this._emitFrequencyConfig();
    }

    handleShowMonthlyChange() {
        this._showMonthly = !this._showMonthly;
        if (!this._showMonthly && this._defaultFrequency === 'recurring') {
            this._defaultFrequency = 'oneTime';
        }
        this._emitFrequencyConfig();
    }

    handleDefaultFrequencyChange(event) {
        this._defaultFrequency = event.detail.value;
        this._emit('defaultFrequency', this._defaultFrequency);
    }

    _emitFrequencyConfig() {
        if (this._showOneTime && this._showMonthly) {
            this._emit('freq1Value', 'oneTime');
            this._emit('freq2Value', 'recurring');
            this._emit('showFrequencyToggle', true, 'Boolean');
        } else if (this._showOneTime) {
            this._emit('freq1Value', 'oneTime');
            this._emit('freq2Value', '');
            this._emit('showFrequencyToggle', false, 'Boolean');
        } else if (this._showMonthly) {
            this._emit('freq1Value', 'recurring');
            this._emit('freq2Value', '');
            this._emit('showFrequencyToggle', false, 'Boolean');
        }
        this._emit('defaultFrequency', this._defaultFrequency);
    }

    // ─── Preset amount handlers ────────────────────────────────────────────────

    handlePresetOTAmountChange(event) {
        const idx = Number(event.target.dataset.index);
        this._presetsOneTime = this._presetsOneTime.map((p, i) =>
            i === idx ? { ...p, amount: event.target.value !== '' ? Number(event.target.value) : '' } : p
        );
        this._emit('presetAmountsOneTime', toAmountString(this._presetsOneTime));
    }

    handlePresetRecAmountChange(event) {
        const idx = Number(event.target.dataset.index);
        this._presetsRecurring = this._presetsRecurring.map((p, i) =>
            i === idx ? { ...p, amount: event.target.value !== '' ? Number(event.target.value) : '' } : p
        );
        this._emit('presetAmountsRecurring', toAmountString(this._presetsRecurring));
    }

    // ─── Other amount handlers ────────────────────────────────────────────────

    handleMinAmountChange(event) {
        const val = parseInt(event.target.value, 10);
        if (!isNaN(val) && val >= 0) {
            this._minAmount = val;
            this._emit('minAmount', val, 'Number');
        }
    }

    handleMaxAmountChange(event) {
        const val = parseInt(event.target.value, 10);
        if (!isNaN(val) && val >= 0) {
            this._maxAmount = val;
            this._emit('maxAmount', val, 'Number');
        }
    }

    // ─── Currency handlers ────────────────────────────────────────────────────

    handleCurrencyToggle(event) {
        const code      = event.currentTarget.dataset.code;
        const isChecked = this._checkedCurrencies.includes(code);
        this._checkedCurrencies = isChecked
            ? this._checkedCurrencies.filter(c => c !== code)
            : [...this._checkedCurrencies, code];

        if (!this._checkedCurrencies.includes(this._defaultCurrency) && this._checkedCurrencies.length > 0) {
            this._defaultCurrency = this._checkedCurrencies[0];
            this._emit('defaultCurrency', this._defaultCurrency);
        }

        this._emit('availableCurrencies', this._checkedCurrencies.join(','));
    }

    handleDefaultCurrencyChange(event) {
        this._defaultCurrency = event.detail.value;
        this._emit('defaultCurrency', this._defaultCurrency);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    _emit(name, newValue, newValueDataType = 'String') {
        this.dispatchEvent(new CustomEvent('configuration_editor_input_value_changed', {
            bubbles: true, composed: true,
            detail: { name, newValue, newValueDataType }
        }));
    }
}
