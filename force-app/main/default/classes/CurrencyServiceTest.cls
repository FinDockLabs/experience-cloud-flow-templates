@IsTest
private class CurrencyServiceTest {

    // ─── getCurrencyContext ───────────────────────────────────────────────────

    @IsTest
    static void getCurrencyContext_returnsPopulatedContext() {
        Test.startTest();
        CurrencyService.CurrencyContext ctx = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Assert.isNotNull(ctx,                'CurrencyContext must not be null');
        Assert.isNotNull(ctx.orgCurrencies,  'orgCurrencies must not be null');
        Assert.isTrue(ctx.orgCurrencies.size() > 0, 'orgCurrencies must not be empty');
        Assert.isFalse(String.isBlank(ctx.orgDefault),    'orgDefault must not be blank');
        Assert.isFalse(String.isBlank(ctx.userCurrency),  'userCurrency must not be blank');
    }

    @IsTest
    static void getCurrencyContext_orgDefaultIsInOrgCurrencies() {
        Test.startTest();
        CurrencyService.CurrencyContext ctx = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Assert.isTrue(
            ctx.orgCurrencies.contains(ctx.orgDefault),
            'orgDefault must be present in orgCurrencies: ' + ctx.orgDefault
        );
    }

    @IsTest
    static void getCurrencyContext_userCurrencyIsInOrgCurrencies() {
        Test.startTest();
        CurrencyService.CurrencyContext ctx = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Assert.isTrue(
            ctx.orgCurrencies.contains(ctx.userCurrency),
            'userCurrency must be present in orgCurrencies: ' + ctx.userCurrency
        );
    }

    @IsTest
    static void getCurrencyContext_noDuplicateIsoCodes() {
        Test.startTest();
        CurrencyService.CurrencyContext ctx = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Set<String> unique = new Set<String>(ctx.orgCurrencies);
        Assert.areEqual(
            ctx.orgCurrencies.size(),
            unique.size(),
            'orgCurrencies must not contain duplicate codes'
        );
    }

    // userCurrency is derived from UserInfo.getDefaultCurrency() (no User SOQL),
    // so it always equals orgDefault regardless of org type or user type.
    @IsTest
    static void getCurrencyContext_userCurrencyEqualsOrgDefault() {
        Test.startTest();
        CurrencyService.CurrencyContext ctx = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Assert.areEqual(
            ctx.orgDefault,
            ctx.userCurrency,
            'userCurrency must equal orgDefault (both come from UserInfo.getDefaultCurrency())'
        );
    }

    // ─── getOrgCurrencies ─────────────────────────────────────────────────────

    @IsTest
    static void getOrgCurrencies_returnsNonEmptyList() {
        Test.startTest();
        List<String> currencies = CurrencyService.getOrgCurrencies();
        Test.stopTest();

        Assert.isNotNull(currencies, 'Currency list must not be null');
        Assert.isTrue(currencies.size() > 0, 'Currency list must not be empty');
    }

    @IsTest
    static void getOrgCurrencies_allCodesAreValidIso4217() {
        Test.startTest();
        List<String> currencies = CurrencyService.getOrgCurrencies();
        Test.stopTest();

        for (String code : currencies) {
            Assert.isTrue(
                String.isNotBlank(code) && code.length() == 3,
                'Each code must be a 3-character ISO 4217 string, got: "' + code + '"'
            );
        }
    }

    // Single-currency org: list must contain exactly the org default.
    @IsTest
    static void getOrgCurrencies_singleCurrencyOrg_returnsOrgDefaultOnly() {
        if (UserInfo.isMultiCurrencyOrganization()) {
            return; // not applicable
        }

        Test.startTest();
        List<String> currencies = CurrencyService.getOrgCurrencies();
        Test.stopTest();

        Assert.areEqual(1, currencies.size(), 'Single-currency org must return exactly one code');
        Assert.areEqual(
            UserInfo.getDefaultCurrency(),
            currencies[0],
            'The single code must be the org default currency'
        );
    }

    // Multi-currency org: list must contain at least the org default.
    @IsTest
    static void getOrgCurrencies_multiCurrencyOrg_containsOrgDefault() {
        if (!UserInfo.isMultiCurrencyOrganization()) {
            return; // not applicable
        }

        Test.startTest();
        List<String> currencies = CurrencyService.getOrgCurrencies();
        Test.stopTest();

        Assert.isTrue(
            currencies.contains(UserInfo.getDefaultCurrency()),
            'Multi-currency org list must contain the org default currency'
        );
    }

    // ─── Exception path: getCurrencyContext survives unexpected failures ───────

    @IsTest
    static void getCurrencyContext_calledTwice_returnsSameOrgDefault() {
        // Verifies stable output across multiple calls (cacheable contract).
        Test.startTest();
        CurrencyService.CurrencyContext first  = CurrencyService.getCurrencyContext();
        CurrencyService.CurrencyContext second = CurrencyService.getCurrencyContext();
        Test.stopTest();

        Assert.areEqual(
            first.orgDefault,
            second.orgDefault,
            'Repeated calls must return the same orgDefault'
        );
        Assert.areEqual(
            first.userCurrency,
            second.userCurrency,
            'Repeated calls must return the same userCurrency'
        );
    }
}
