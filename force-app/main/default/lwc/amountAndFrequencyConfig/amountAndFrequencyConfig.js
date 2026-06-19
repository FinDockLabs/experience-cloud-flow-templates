import { LightningElement, api, track, wire } from 'lwc';
import getCurrencyContext from '@salesforce/apex/CurrencyService.getCurrencyContext';

const PRESET_COUNT = 6;

const DEFAULT_AMOUNTS_ONE_TIME  = [25, 50, 100, 250, 500, 1000];
const DEFAULT_AMOUNTS_RECURRING = [5, 10, 25, 60, 125, 250];

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
    @track _checkedCurrencies = [];

    _showOneTime      = true;
    _showMonthly      = true;
    _defaultFrequency = 'oneTime';
    _minAmount        = 1;
    _maxAmount        = 0;
    @track _defaultCurrency  = '';
    _currencySource    = 'config';
    _wiredCurrencies   = [];
    _isMultiCurrency   = false;
    _orgDefault        = '';

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    connectedCallback() {
        this._hydrate();
    }

    // ─── Wire: org currency context ───────────────────────────────────────────

    @wire(getCurrencyContext)
    _handleCurrencies({ data, error }) {
        if (error || !data) return;

        this._wiredCurrencies = data.orgCurrencies || [];
        this._isMultiCurrency = this._wiredCurrencies.length > 1;
        this._orgDefault      = data.orgDefault || '';

        if (!this._isMultiCurrency) {
            // Single-currency org: auto-apply the only currency, no admin selection needed.
            const code = this._wiredCurrencies[0] || data.orgDefault;
            if (code) {
                this._checkedCurrencies = [code];
                this._defaultCurrency   = code;
                this._emit('availableCurrencies', code);
                this._emit('defaultCurrency',     code);
            }
            return;
        }

        // Multi-currency: validate any previously saved selection against live org currencies.
        if (this._checkedCurrencies.length > 0) {
            const valid = this._checkedCurrencies.filter(c => this._wiredCurrencies.includes(c));
            if (valid.length !== this._checkedCurrencies.length) {
                this._checkedCurrencies = valid;
                this._emit('availableCurrencies', valid.join(','));
            }
        } else if (this._currencySource === 'config') {
            // First-time setup in config mode: pre-select all org currencies.
            this._checkedCurrencies = [...this._wiredCurrencies];
            this._emit('availableCurrencies', this._checkedCurrencies.join(','));
        }

        // Ensure default currency is still active in this org.
        if (!this._defaultCurrency || !this._wiredCurrencies.includes(this._defaultCurrency)) {
            this._defaultCurrency = this._checkedCurrencies[0] || this._wiredCurrencies[0] || '';
            if (this._defaultCurrency) this._emit('defaultCurrency', this._defaultCurrency);
        }
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
        this._defaultCurrency  = get('defaultCurrency')  ?? '';
        this._currencySource   = get('currencySource')   ?? 'config';

        const rawCurrencies = get('availableCurrencies') ?? '';
        this._checkedCurrencies = rawCurrencies
            ? rawCurrencies.split(',').map(s => s.trim()).filter(Boolean)
            : [];

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

    get currencySource() { return this._currencySource; }

    get currencySourceOptions() {
        return [
            { label: 'Fixed (configured here)',         value: 'config' },
            { label: 'Running user\'s currency (Apex)', value: 'user'   },
            { label: 'Flow variable (bind below)',       value: 'flow'   }
        ];
    }

    get isUserCurrencySource() {
        return this._currencySource === 'user';
    }

    // True while the wire hasn't responded yet.
    get isLoadingCurrencies() {
        return this._wiredCurrencies.length === 0;
    }

    // Org has exactly one active currency — no selection needed.
    get isSingleCurrency() {
        return !this._isMultiCurrency && this._wiredCurrencies.length > 0;
    }

    get singleCurrencyCode() {
        return this._wiredCurrencies[0] || '';
    }

    // Selectable chips — only in config mode (admin chooses a fixed subset).
    get showCurrencySelector() {
        return this._isMultiCurrency && this._currencySource === 'config';
    }

    // Read-only badges — flow mode shows all org currencies; admin binds default via Flow variable.
    get showFlowCurrencyInfo() {
        return this._isMultiCurrency && this._currencySource === 'flow';
    }

    get currencyChipLabel() {
        return this._currencySource === 'config'
            ? 'Select which currencies will be offered on this form.'
            : 'Optional whitelist — leave all unchecked to show all org currencies.';
    }

    get showDefaultCurrencyPicker() {
        return this._isMultiCurrency &&
            (this._currencySource === 'config' || this._currencySource === 'flow');
    }

    get currencyList() {
        return this._wiredCurrencies.map(code => ({
            code,
            label:     this._getCurrencyLabel(code),
            isChecked: this._checkedCurrencies.includes(code),
            chipClass: `chip-btn${this._checkedCurrencies.includes(code) ? ' chip-btn-active' : ''}`
        }));
    }

    get defaultCurrency() { return this._defaultCurrency; }

    get defaultCurrencyOptions() {
        const source = this._checkedCurrencies.length > 0
            ? this._checkedCurrencies
            : this._wiredCurrencies;
        return source.map(code => ({ label: this._getCurrencyLabel(code), value: code }));
    }

    // Only required in multi-currency + config mode; other modes don't mandate a selection.
    get currencyError() {
        if (!this._isMultiCurrency || this._currencySource !== 'config') return '';
        return this._checkedCurrencies.length === 0 ? 'Select at least one currency.' : '';
    }

    // Symbol shown next to preset amount inputs.
    // In 'user' mode _defaultCurrency is not configured, so fall back to the org default.
    get presetCurrencySymbol() {
        return this._getCurrencySymbol(this._defaultCurrency || this._orgDefault);
    }

    _getCurrencySymbol(code) {
        if (!code) return '';
        try {
            const parts = new Intl.NumberFormat(navigator.language || 'en-US', {
                style: 'currency', currency: code, minimumFractionDigits: 0
            }).formatToParts(0);
            const sym = parts.find(p => p.type === 'currency');
            return sym ? sym.value : code;
        } catch {
            return code;
        }
    }

    _getCurrencyLabel(code) {
        const sym = this._getCurrencySymbol(code);
        return sym && sym !== code ? `${code} — ${sym}` : code;
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
        const idx    = Number(event.target.dataset.index);
        const amount = this._sanitizePresetAmount(event);
        this._presetsOneTime = this._presetsOneTime.map((p, i) => i === idx ? { ...p, amount } : p);
        this._emit('presetAmountsOneTime', toAmountString(this._presetsOneTime));
    }

    handlePresetRecAmountChange(event) {
        const idx    = Number(event.target.dataset.index);
        const amount = this._sanitizePresetAmount(event);
        this._presetsRecurring = this._presetsRecurring.map((p, i) => i === idx ? { ...p, amount } : p);
        this._emit('presetAmountsRecurring', toAmountString(this._presetsRecurring));
    }

    // Returns the sanitized amount value: empty string, or a positive number.
    // Negative input is cleared immediately so the field resets to empty.
    _sanitizePresetAmount(event) {
        const raw = event.target.value;
        if (raw === '') return '';
        const num = Number(raw);
        if (num < 0) {
            event.target.value = '';
            return '';
        }
        return num;
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

    handleCurrencySourceChange(event) {
        this._currencySource = event.detail.value;
        this._emit('currencySource', this._currencySource);
        // In flow/user mode the runtime uses org currencies directly;
        // clear the CPE-managed list so it doesn't act as an unintended filter.
        if (this._currencySource !== 'config') {
            this._checkedCurrencies = [];
            this._emit('availableCurrencies', '');
        }
    }

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
