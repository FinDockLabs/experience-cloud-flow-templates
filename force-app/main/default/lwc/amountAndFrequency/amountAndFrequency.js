import { LightningElement, api, wire } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { labels } from './amountAndFrequencyLabels';
import getCurrencyContext from '@salesforce/apex/CurrencyService.getCurrencyContext';

const DEFAULT_AMOUNTS_ONE_TIME  = '25,50,100,250,500,1000';
const DEFAULT_AMOUNTS_RECURRING = '5,10,25,60,125,250';
const DEFAULT_FREQ_1_VALUE      = 'oneTime';
const DEFAULT_FREQ_2_VALUE      = 'recurring';
// Module-level counter ensures unique DOM IDs when multiple instances are on the same page.
let _nextInstanceId = 0;

export default class AmountAndFrequency extends LightningElement {
    _instanceId = ++_nextInstanceId;
    _frequency = DEFAULT_FREQ_1_VALUE;
    _selectedPreset = null;
    _customAmount = '';
    _selectedCurrency = '';
    _validationError = '';
    _orgCurrencies = null;
    _orgDefault = null;
    _userCurrency = null;
    _currencySelectedExplicitly = false;
    _wiredResolved= false;

    labels = labels;

    // ─── Frequency configuration ─────────────────────────────────────────────

    @api freq1Value = DEFAULT_FREQ_1_VALUE;
    @api freq1Label = '';
    @api freq2Value = DEFAULT_FREQ_2_VALUE;
    @api freq2Label = '';
    @api showFrequencyToggle = false;

    @api presetAmountsOneTime  = DEFAULT_AMOUNTS_ONE_TIME;
    @api presetAmountsRecurring = DEFAULT_AMOUNTS_RECURRING;
    @api impactNarrativesOneTime  = '';
    @api impactNarrativesRecurring = '';

    @api minAmount = 1;
    @api maxAmount = null;

    // ─── Currency ─────────────────────────────────────────────────────────────

    @api availableCurrencies = '';
    @api defaultCurrency = '';
    /** Pre-selects a frequency when the component first renders, e.g. 'recurring'. */
    @api defaultFrequency = '';
    /**
     * Controls how the active currency list and default are resolved.
     * 'config'  — use availableCurrencies + defaultCurrency from CPE (default).
     * 'user'    — auto-detect from the running user's DefaultCurrencyIsoCode; org currencies as list.
     * 'flow'    — org currencies as list; defaultCurrency supplied via a Flow variable.
     */
    @api currencySource = 'config';

    // ─── Flow output: frequency ───────────────────────────────────────────────
    @api
    get frequency() {
        return this._frequency;
    }
    set frequency(value) {
        this._frequency = value || DEFAULT_FREQ_1_VALUE;
    }

    @api
    get amount() {
        if (this._customAmount !== '') {
            const n = Number(this._customAmount);
            return isNaN(n) ? null : n;
        }
        return this._selectedPreset;
    }

    @api
    get amountOneTime() {
        if (this._frequency !== 'oneTime') return null;
        return this.amount;
    }

    @api
    get amountRecurring() {
        if (this._frequency !== 'recurring') return null;
        return this.amount;
    }

    @api
    get selectedCurrency() {
        return this._selectedCurrency;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    get _locale() {
        try {
            return navigator.language || 'en-US';
        } catch {
            return 'en-US';
        }
    }

    get _symbolInfo() {
        return this.getCurrencySymbolInfo(this._selectedCurrency, this._locale);
    }

    // ─── Template getters ─────────────────────────────────────────────────────
    get frequencyGroupName() {
        return `frequency-${this._instanceId}`;
    }

    get presetName() {
        return `preset-${this._instanceId}`;
    }

    get frequencyOnceId() {
        return `freq-1-${this._instanceId}`;
    }

    get frequencyMonthlyId() {
        return `freq-2-${this._instanceId}`;
    }

    get customAmountId() {
        return `custom-amount-${this._instanceId}`;
    }

    get customAmountErrorId() {
        return `custom-amount-error-${this._instanceId}`;
    }

    get displayFreq1Label() {
        return this.freq1Label || this.labels.ec_label_give_once;
    }

    get displayFreq2Label() {
        return this.freq2Label || this.labels.ec_label_monthly;
    }

    get isFreq1Selected() {
        return this._frequency === this.freq1Value;
    }

    get isFreq2Selected() {
        return this._frequency === this.freq2Value;
    }

    get showMonthlyIcon() {
        return this.freq2Value === DEFAULT_FREQ_2_VALUE;
    }

    get showPresets() {
        const p = this._resolveActivePresets();
        return p !== null && p.length > 0;
    }

    get presetAmountOptions() {
        const presets    = this._resolveActivePresets() || [];
        const narratives = this._resolveActiveNarratives();
        return presets.map((amount, idx) => ({
            value: amount,
            label: this.formatPresetAmount(amount, this._selectedCurrency, this._locale),
            inputId: `${this._instanceId}-preset-${amount}`,
            narrative: narratives[idx] || '',
            isSelected: this._selectedPreset === amount && this._customAmount === ''
        }));
    }

    get selectedPresetNarrative() {
        if (this._customAmount !== '' || this._selectedPreset === null) return '';
        const opt = this.presetAmountOptions.find(o => o.isSelected);
        return opt ? opt.narrative : '';
    }

    // Resolves the final currency list based on currencySource, org data, and CPE whitelist.
    get _effectiveCurrencies() {
        const org = this._orgCurrencies;
        const cpe = this.parseCurrencies(this.availableCurrencies);

        if (this.currencySource === 'config') {
            const base = cpe.length > 0 ? cpe : (org || []);
            return org ? base.filter(c => org.includes(c)) : base;
        }

        // 'user' or 'flow': org is the source of truth; CPE list acts as optional whitelist.
        const base = org || (cpe.length > 0 ? cpe : []);
        return cpe.length > 0 ? base.filter(c => cpe.includes(c)) : base;
    }

    get currencyConfigError() {
        if (!this._wiredResolved) return '';
        return this._effectiveCurrencies.length === 0
            ? this.labels.ec_label_currency_not_configured
            : '';
    }

    get hasCurrencyError() {
        return !!this.currencyConfigError;
    }

    get currencyOptions() {
        const list = this._effectiveCurrencies;
        return list.map(c => ({ value: c, label: c, isSelected: c === this._selectedCurrency }));
    }

    get showCurrencySelector() {
        return this.currencyOptions.length > 1;
    }

    get currencySymbol() {
        return this._symbolInfo.symbol;
    }

    get isCurrencyPrefix() {
        return this._symbolInfo.position === 'prefix';
    }

    get isCurrencySuffix() {
        return this._symbolInfo.position === 'suffix';
    }

    get singleCurrencyCode() {
        return this._selectedCurrency;
    }

    get customAmountMin() {
        return Number(this.minAmount) || 1;
    }

    get customAmountMax() {
        const n = Number(this.maxAmount);
        return n > 0 ? n : null;
    }

    get validationError() {
        return this._validationError;
    }

    get hasValidationError() {
        return !!this._validationError;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    connectedCallback() {
        // 'user' mode: leave _selectedCurrency empty until wire data arrives,
        // unless sessionStorage or URL params provide a value.
        if (this.currencySource !== 'user') {
            this._selectedCurrency = this.defaultCurrency || '';
        }
        if (this.defaultFrequency) {
            this._frequency = this.defaultFrequency;
        }
        this._restoreState();
        this._applyQueryParams();
    }

    disconnectedCallback() {
        // Persist selection so it survives Flow back-navigation (component remount).
        this._saveState();
    }

    // ─── Wire: org currency context ───────────────────────────────────────────
    @wire(getCurrencyContext)
    _wiredCurrency({ data, error }) {
        this._wiredResolved = true;

        if (error) {
            // Apex unavailable (e.g. class not yet granted to Guest User Profile).
            // Degrade to CPE-configured list; leave currency empty if nothing is configured.
            const cpeCurrencies = this.parseCurrencies(this.availableCurrencies);
            this._orgCurrencies = cpeCurrencies.length > 0 ? cpeCurrencies
                                : (this.defaultCurrency    ? [this.defaultCurrency] : []);
            this._orgDefault    = this.defaultCurrency || '';
            this._userCurrency  = this.defaultCurrency || '';
            if (!this._currencySelectedExplicitly) {
                const effective = this._effectiveCurrencies;
                if (effective.length > 0) {
                    this._selectedCurrency = effective[0];
                    this._dispatchChange();
                }
            }
            return;
        }

        if (!data) return;

        this._orgCurrencies = data.orgCurrencies || [];
        this._orgDefault    = data.orgDefault    || '';
        this._userCurrency  = data.userCurrency  || this._orgDefault;

        if (this.currencySource === 'user' && !this._currencySelectedExplicitly) {
            const candidate = this._userCurrency;
            if (candidate && this._effectiveCurrencies.includes(candidate)) {
                this._selectedCurrency = candidate;
                this._dispatchChange();
            }
        }

        const effective = this._effectiveCurrencies;
        if (effective.length > 0 && !effective.includes(this._selectedCurrency)) {
            this._selectedCurrency = effective[0];
            this._currencySelectedExplicitly = false;
            this._dispatchChange();
        }
    }

    _storageKey() {
        try {
            return `af-state-${window.location.pathname}`;
        } catch {
            return 'af-state';
        }
    }

    _saveState() {
        try {
            sessionStorage.setItem(this._storageKey(), JSON.stringify({
                frequency:        this._frequency,
                selectedPreset:   this._selectedPreset,
                customAmount:     this._customAmount,
                selectedCurrency: this._selectedCurrency
            }));
        } catch { /* sessionStorage unavailable */ }
    }

    _restoreState() {
        try {
            const raw = sessionStorage.getItem(this._storageKey());
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.frequency)                     this._frequency        = s.frequency;
            if (s.selectedPreset !== undefined)  this._selectedPreset   = s.selectedPreset;
            if (s.customAmount   !== undefined)  this._customAmount     = s.customAmount;
            if (s.selectedCurrency) {
                this._selectedCurrency           = s.selectedCurrency;
                this._currencySelectedExplicitly = true;
            }
        } catch { /* ignore parse errors */ }
    }

    _applyQueryParams() {
        try {
            const params     = new URLSearchParams(window.location.search);
            const qAmount    = params.get('amount');
            const qFrequency = params.get('frequency');
            const qCurrency  = params.get('currency');

            if (qFrequency) this._frequency = qFrequency;
            if (qCurrency)  this._selectedCurrency = qCurrency.toUpperCase();

            if (qAmount) {
                const num    = Number(qAmount);
                const presets = this._resolveActivePresets();
                if (!isNaN(num) && num > 0) {
                    if (presets && presets.includes(num)) {
                        this._selectedPreset = num;
                    } else {
                        this._customAmount = String(num);
                    }
                }
            }
        } catch {
            // window.location is unavailable in SSR / test environments — skip silently.
        }
    }

    // ─── Event handlers ───────────────────────────────────────────────────────

    handleFrequencyChange(event) {
        this._frequency = event.target.value;
        this._selectedPreset  = null;
        this._customAmount    = '';
        this._validationError = '';
        this._dispatchChange();
    }

    handlePresetAmountSelect(event) {
        this._selectedPreset = Number(event.target.value);
        this._customAmount = '';
        this._validationError = '';
        this._dispatchChange();
    }

    handleCustomAmountInput(event) {
        const val = event.target.value;
        this._customAmount = val;
        this._selectedPreset  = val !== '' ? null : this._selectedPreset;
        this._validateAmount(Number(val));
        this._dispatchChange();
    }

    handleCurrencyChange(event) {
        this._selectedCurrency           = event.target.value;
        this._currencySelectedExplicitly = true;
        this._dispatchChange();
    }

    _validateAmount(num) {
        if (this._customAmount === '') {
            this._validationError = '';
            return;
        }
        const min = this.customAmountMin;
        const max = this.customAmountMax;
        if (isNaN(num) || num < min) {
            this._validationError = this.labels.ec_label_amount_min_error.replace(
                '{0}',
                this.formatPresetAmount(min, this._selectedCurrency, this._locale)
            );
        } else if (max !== null && num > max) {
            this._validationError = this.labels.ec_label_amount_max_error.replace(
                '{0}',
                this.formatPresetAmount(max, this._selectedCurrency, this._locale)
            );
        } else {
            this._validationError = '';
        }
    }

    _dispatchChange() {
        const detail = {
            frequency:        this._frequency,
            amount:           this.amount,
            amountOneTime:    this.amountOneTime,
            amountRecurring:  this.amountRecurring,
            selectedCurrency: this._selectedCurrency
        };

        // Parent LWC components listen with onamountfrequencychange={handler}.
        this.dispatchEvent(new CustomEvent('amountfrequencychange', { detail }));

        // Flow attribute change events are no-ops when not inside a Flow screen.
        this.dispatchEvent(new FlowAttributeChangeEvent('frequency', detail.frequency));
        this.dispatchEvent(new FlowAttributeChangeEvent('amount', detail.amount));
        this.dispatchEvent(new FlowAttributeChangeEvent('amountOneTime', detail.amountOneTime));
        this.dispatchEvent(new FlowAttributeChangeEvent('amountRecurring', detail.amountRecurring));
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedCurrency', detail.selectedCurrency));
    }

    parseAmounts(raw) {
        if (!raw || !String(raw).trim()) return null;
        const parsed = String(raw)
            .split(',')
            .map(s => Number(s.trim()))
            .filter(n => !isNaN(n) && n > 0);
        return parsed.length > 0 ? parsed : null;
    }

    parseNarratives(raw) {
        if (!raw || !String(raw).trim()) return [];
        return String(raw).split(';').map(s => s.trim());
    }

    parseCurrencies(raw) {
        if (!raw || !String(raw).trim()) return [];
        return String(raw)
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
    }

    _resolveActivePresets() {
        const raw = this._frequency === this.freq2Value
            ? this.presetAmountsRecurring
            : this.presetAmountsOneTime;
        return this.parseAmounts(raw);
    }

    _resolveActiveNarratives() {
        const raw = this._frequency === this.freq2Value
            ? this.impactNarrativesRecurring
            : this.impactNarrativesOneTime;
        return this.parseNarratives(raw);
    }

    // Returns the currency symbol and whether it is a prefix or suffix for the given locale.
    getCurrencySymbolInfo(currencyCode, locale) {
        try {
            const parts = new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).formatToParts(0);
            const currencyIdx = parts.findIndex(p => p.type === 'currency');
            const integerIdx = parts.findIndex(p => p.type === 'integer');
            const symbol = parts[currencyIdx] ? parts[currencyIdx].value : currencyCode;
            const position = currencyIdx < integerIdx ? 'prefix' : 'suffix';
            return {symbol, position};
        } catch {
            return {symbol: currencyCode, position: 'prefix'};
        }
    }

    formatPresetAmount(amount, currencyCode, locale) {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } catch {
            return `${currencyCode} ${amount}`;
        }
    }
}
