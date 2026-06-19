import { LightningElement, api, track } from 'lwc';
import CURRENCY from '@salesforce/i18n/currency';

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

    _showOneTime      = true;
    _showMonthly      = true;
    _defaultFrequency = 'oneTime';
    _minAmount        = 1;
    _maxAmount        = 0;
    _defaultCurrency  = '';
    _frequencyOpen    = true;

    get frequencyOpen() {
        return this._frequencyOpen;
    }

    get frequencyChevronName() {
        return this._frequencyOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }

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

    get presetsOneTime() {
        return this._presetsOneTime;
    }

    get presetsRecurring() {
        return this._presetsRecurring;
    }

    get minMaxError() {
        const min = Number(this._minAmount) || 0;
        const max = Number(this._maxAmount) || 0;
        return max > 0 && min > max ? 'Minimum cannot be greater than maximum.' : '';
    }

    get presetCurrencySymbol() {
        if (!this._defaultCurrency || this._defaultCurrency.includes('{')) {
            return '';
        }
        return this._getCurrencySymbol(this._defaultCurrency);
    }

    connectedCallback() {
        this._hydrate();
        // Автоматически связываем LWC с пикером валюты во Flow при инициализации
        this._autoBindCurrency();
    }

    handleToggleFrequency() {
        this._frequencyOpen = !this._frequencyOpen;
    }

    handleShowOneTimeChange(event) {
        this._showOneTime = event.target.checked;
        if (!this._showOneTime && this._defaultFrequency === 'oneTime') this._defaultFrequency = 'recurring';
        this._emitFrequencyConfig();
    }

    handleShowMonthlyChange(event) {
        this._showMonthly = event.target.checked;
        if (!this._showMonthly && this._defaultFrequency === 'recurring') this._defaultFrequency = 'oneTime';
        this._emitFrequencyConfig();
    }

    handleDefaultFrequencyChange(event) {
        this._defaultFrequency = event.detail.value;
        this._emit('defaultFrequency', this._defaultFrequency);
    }

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

    _sanitizePresetAmount(event) {
        const raw = event.target.value;
        if (raw === '') return '';
        const num = Number(raw);
        if (num < 0) { event.target.value = ''; return ''; }
        return num;
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
        const rawCurrency = get('defaultCurrency') ?? '';
        this._defaultCurrency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : (CURRENCY || '');

        this._presetsOneTime   = makePresets(get('presetAmountsOneTime'),   DEFAULT_AMOUNTS_ONE_TIME);
        this._presetsRecurring = makePresets(get('presetAmountsRecurring'), DEFAULT_AMOUNTS_RECURRING);
    }

    _autoBindCurrency() {
        if (!this.builderContext || !this.builderContext.screenComponents) return;

        const picker = this.builderContext.screenComponents.find(comp => {
            const name = (comp.name || '').toLowerCase();
            return name === 'currencypicklist' || name === 'selectedcurrency';
        });

        if (picker) {
            if (picker.value && typeof picker.value === 'string' && !picker.value.includes('{')) {
                this._defaultCurrency = picker.value;
            }

            this._emit('defaultCurrency', picker.name, 'Expression');
        }
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

    _getCurrencySymbol(code) {
        if (!code) return '';
        try {
            const parts = new Intl.NumberFormat('en-US', {
                style: 'currency', currency: code, minimumFractionDigits: 0
            }).formatToParts(0);
            const sym = parts.find(p => p.type === 'currency');
            return sym ? sym.value : code;
        } catch {
            return code;
        }
    }

    _emit(name, newValue, newValueDataType = 'String') {
        this.dispatchEvent(new CustomEvent('configuration_editor_input_value_changed', {
            bubbles: true, composed: true,
            detail: { name, newValue, newValueDataType }
        }));
    }
}
